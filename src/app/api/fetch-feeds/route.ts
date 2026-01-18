import { NextRequest, NextResponse } from 'next/server';
import { supabase, getAccountId } from '@/lib/supabase';
import Parser from 'rss-parser';

const parser = new Parser({
  timeout: 10000,
  headers: {
    'User-Agent': 'Radar Intelligence Dashboard',
  },
});

export async function POST(request: NextRequest) {
  const accountId = getAccountId();
  const body = await request.json();
  const sourceId = body.source_id;

  // Get the source
  let query = supabase
    .from('sources')
    .select('*')
    .eq('account_id', accountId)
    .eq('type', 'rss');

  if (sourceId) {
    query = query.eq('id', sourceId);
  }

  const { data: sources, error: sourcesError } = await query;

  if (sourcesError) {
    return NextResponse.json({ error: sourcesError.message }, { status: 500 });
  }

  const results = {
    success: 0,
    failed: 0,
    items: 0,
    errors: [] as string[],
  };

  for (const source of sources || []) {
    try {
      const feed = await parser.parseURL(source.url);
      const items = feed.items.slice(0, 20); // Limit to 20 most recent items

      for (const item of items) {
        // Check if item already exists
        const externalId = item.guid || item.link;
        const { data: existing } = await supabase
          .from('content_items')
          .select('id')
          .eq('account_id', accountId)
          .eq('external_id', externalId)
          .single();

        if (existing) continue;

        // Insert new item
        const { error: insertError } = await supabase
          .from('content_items')
          .insert({
            account_id: accountId,
            source_id: source.id,
            topic_id: source.topic_id,
            type: 'article',
            title: item.title || 'Untitled',
            summary: item.contentSnippet || item.content?.substring(0, 300),
            content: item.content,
            url: item.link || '',
            thumbnail_url: item.enclosure?.url || extractImageFromContent(item.content),
            author: item.creator || item.author,
            published_at: item.pubDate ? new Date(item.pubDate).toISOString() : null,
            external_id: externalId,
            metadata: {
              categories: item.categories,
            },
          });

        if (insertError) {
          console.error('Failed to insert item:', insertError);
        } else {
          results.items++;
        }
      }

      // Update last_fetched_at
      await supabase
        .from('sources')
        .update({ last_fetched_at: new Date().toISOString() })
        .eq('id', source.id);

      results.success++;
    } catch (err) {
      results.failed++;
      results.errors.push(`${source.name}: ${(err as Error).message}`);
    }
  }

  return NextResponse.json(results);
}

function extractImageFromContent(content?: string): string | null {
  if (!content) return null;

  // Try to extract image from content
  const imgMatch = content.match(/<img[^>]+src="([^">]+)"/);
  if (imgMatch) {
    return imgMatch[1];
  }

  // Try to extract from media:content
  const mediaMatch = content.match(/url="([^"]+\.(jpg|jpeg|png|gif|webp)[^"]*)"/i);
  if (mediaMatch) {
    return mediaMatch[1];
  }

  return null;
}
