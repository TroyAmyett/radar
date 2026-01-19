import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, getAccountId } from '@/lib/supabase';

const GAMMA_API = 'https://gamma-api.polymarket.com';

// Sports-related tag patterns to filter out
const SPORTS_PATTERNS = [
  /\bnba\b/i, /\bnfl\b/i, /\bnhl\b/i, /\bmlb\b/i, /\bmls\b/i,
  /\bncaa\b/i, /\bcbb\b/i, /\bcfb\b/i,
  /basketball/i, /football/i, /baseball/i, /hockey/i, /soccer/i,
  /tennis/i, /golf/i, /boxing/i, /mma\b/i, /ufc\b/i,
  /olympics/i, /world cup/i, /super bowl/i,
  /lakers/i, /celtics/i, /warriors/i, /bulls/i, /heat/i,
  /yankees/i, /dodgers/i, /patriots/i, /chiefs/i,
  /motorsport/i, /f1\b/i, /formula 1/i, /nascar/i,
  /premier league/i, /la liga/i, /bundesliga/i, /serie a/i,
];

interface PolymarketEvent {
  id: string;
  slug: string;
  title: string;
  description?: string;
  image?: string;
  startDate?: string;
  endDate?: string;
  volume?: string;
  volume24hr?: string;
  liquidity?: string;
  active?: boolean;
  closed?: boolean;
  markets?: PolymarketMarket[];
  tags?: { id: string; slug: string; label: string }[];
}

interface PolymarketMarket {
  id: string;
  question: string;
  outcomes: string[];
  outcomePrices: string[];
}

function isSportsEvent(event: PolymarketEvent): boolean {
  const textToCheck = `${event.title} ${event.description || ''}`;
  return SPORTS_PATTERNS.some(pattern => pattern.test(textToCheck));
}

function formatOdds(event: PolymarketEvent): string {
  if (!event.markets || event.markets.length === 0) return '';

  const market = event.markets[0];
  if (!market.outcomes || !market.outcomePrices) return '';

  // Format odds for display
  const oddsDisplay = market.outcomes.map((outcome, i) => {
    const price = parseFloat(market.outcomePrices[i] || '0');
    const percentage = Math.round(price * 100);
    return `${outcome}: ${percentage}%`;
  }).join(' | ');

  return oddsDisplay;
}

function formatVolume(volume: string | undefined): string {
  if (!volume) return '';
  const num = parseFloat(volume);
  if (num >= 1000000) return `$${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `$${(num / 1000).toFixed(0)}K`;
  return `$${num.toFixed(0)}`;
}

export async function POST(request: NextRequest) {
  const accountId = getAccountId();

  try {
    const body = await request.json().catch(() => ({}));
    const sourceId = body.source_id;

    // Get Polymarket sources
    let sourcesQuery = supabaseAdmin
      .from('sources')
      .select('*')
      .eq('account_id', accountId)
      .eq('type', 'polymarket')
      .eq('is_active', true);

    if (sourceId) {
      sourcesQuery = sourcesQuery.eq('id', sourceId);
    }

    const { data: sources, error: sourcesError } = await sourcesQuery;

    if (sourcesError) {
      console.error('Failed to fetch Polymarket sources:', sourcesError);
      return NextResponse.json({ error: 'Failed to fetch sources' }, { status: 500 });
    }

    if (!sources || sources.length === 0) {
      return NextResponse.json({ message: 'No Polymarket sources to fetch' });
    }

    let totalFetched = 0;
    let totalInserted = 0;

    for (const source of sources) {
      try {
        // Fetch trending events from Polymarket
        const eventsRes = await fetch(
          `${GAMMA_API}/events?active=true&closed=false&limit=50&order=volume24hr&ascending=false`,
          {
            headers: {
              'User-Agent': 'Radar Intelligence Dashboard',
            },
          }
        );

        if (!eventsRes.ok) {
          console.error(`Failed to fetch Polymarket events: ${eventsRes.status}`);
          continue;
        }

        const events: PolymarketEvent[] = await eventsRes.json();
        totalFetched += events.length;

        // Get filter preferences from metadata
        const metadata = source.metadata as {
          polymarketExcludeSports?: boolean;
          polymarketKeywords?: string[];
          polymarketCategories?: string[];
        } | null;

        const excludeSports = metadata?.polymarketExcludeSports !== false;
        const keywords = metadata?.polymarketKeywords || [];
        const categories = metadata?.polymarketCategories || [];

        // Filter events based on preferences
        let filteredEvents = events;

        // Filter out sports if configured
        if (excludeSports) {
          filteredEvents = filteredEvents.filter(event => !isSportsEvent(event));
        }

        // Filter by keywords if any are specified
        if (keywords.length > 0) {
          filteredEvents = filteredEvents.filter(event => {
            const textToCheck = `${event.title} ${event.description || ''}`.toLowerCase();
            return keywords.some(keyword => textToCheck.includes(keyword.toLowerCase()));
          });
        }

        // Filter by categories if any are specified
        if (categories.length > 0) {
          filteredEvents = filteredEvents.filter(event => {
            // Check event tags against selected categories
            const eventTags = event.tags?.map(t => t.slug.toLowerCase()) || [];
            const eventText = `${event.title} ${event.description || ''}`.toLowerCase();

            return categories.some(cat => {
              // Match by tag or by text content
              return eventTags.some(tag => tag.includes(cat)) ||
                     eventText.includes(cat);
            });
          });
        }

        for (const event of filteredEvents) {
          // Check if we already have this event
          const { data: existing } = await supabaseAdmin
            .from('content_items')
            .select('id')
            .eq('account_id', accountId)
            .eq('external_id', `polymarket:${event.id}`)
            .single();

          if (existing) {
            // Update odds if they changed
            const oddsString = formatOdds(event);
            await supabaseAdmin
              .from('content_items')
              .update({
                summary: oddsString,
                metadata: {
                  volume: event.volume,
                  volume24hr: event.volume24hr,
                  liquidity: event.liquidity,
                  markets: event.markets,
                  lastUpdated: new Date().toISOString(),
                },
              })
              .eq('id', existing.id);
            continue;
          }

          // Insert new prediction market
          const oddsString = formatOdds(event);
          const volumeDisplay = formatVolume(event.volume);

          const { error: insertError } = await supabaseAdmin
            .from('content_items')
            .insert({
              account_id: accountId,
              source_id: source.id,
              topic_id: source.topic_id,
              type: 'prediction',
              title: event.title,
              summary: oddsString,
              content: event.description,
              url: `https://polymarket.com/event/${event.slug}`,
              thumbnail_url: event.image,
              author: volumeDisplay ? `${volumeDisplay} volume` : 'Polymarket',
              published_at: event.startDate || new Date().toISOString(),
              external_id: `polymarket:${event.id}`,
              metadata: {
                volume: event.volume,
                volume24hr: event.volume24hr,
                liquidity: event.liquidity,
                markets: event.markets,
                tags: event.tags,
                endDate: event.endDate,
              },
            });

          if (insertError) {
            console.error('Failed to insert Polymarket event:', insertError);
          } else {
            totalInserted++;
          }
        }

        // Update last fetched timestamp
        await supabaseAdmin
          .from('sources')
          .update({ last_fetched_at: new Date().toISOString() })
          .eq('id', source.id);

      } catch (error) {
        console.error(`Error processing Polymarket source ${source.id}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      fetched: totalFetched,
      inserted: totalInserted,
    });

  } catch (error) {
    console.error('Polymarket fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch Polymarket data' }, { status: 500 });
  }
}
