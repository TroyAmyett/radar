import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { resolveAuth, unauthorizedResponse } from '@/lib/auth';
import { getVideoTranscript } from '@/lib/youtube-transcript';
import { summarizeTranscript } from '@/lib/gemini';

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

// Decode HTML entities from YouTube API/RSS responses
function decodeHtmlEntities(text: string): string {
  if (!text) return text;
  const entities: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&#x27;': "'",
    '&#x2F;': '/',
    '&#47;': '/',
    '&apos;': "'",
    '&nbsp;': ' ',
  };
  return text.replace(/&(?:#\d+|#x[\da-f]+|\w+);/gi, (match) => {
    // Check named/numeric entities
    if (entities[match]) return entities[match];
    // Handle numeric entities like &#123;
    if (match.startsWith('&#x')) {
      return String.fromCharCode(parseInt(match.slice(3, -1), 16));
    }
    if (match.startsWith('&#')) {
      return String.fromCharCode(parseInt(match.slice(2, -1), 10));
    }
    return match;
  });
}

interface RSSVideo {
  videoId: string;
  title: string;
  description: string;
  thumbnail: string;
  channelTitle: string;
  publishedAt: string;
}

// Parse YouTube RSS/Atom feed
function parseYouTubeRSS(xml: string): RSSVideo[] {
  const videos: RSSVideo[] = [];

  // Extract channel title from feed
  const channelMatch = xml.match(/<name>([^<]+)<\/name>/);
  const channelTitle = channelMatch ? decodeHtmlEntities(channelMatch[1]) : '';

  // Find all entry elements
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
  let match;

  while ((match = entryRegex.exec(xml)) !== null) {
    const entry = match[1];

    // Extract video ID
    const videoIdMatch = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/);
    if (!videoIdMatch) continue;

    // Extract title
    const titleMatch = entry.match(/<title>([^<]+)<\/title>/);

    // Extract published date
    const publishedMatch = entry.match(/<published>([^<]+)<\/published>/);

    // Extract description from media:description
    const descMatch = entry.match(/<media:description>([^<]*)<\/media:description>/);

    // Extract thumbnail - use maxresdefault if available
    const videoId = videoIdMatch[1];
    const thumbnail = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

    videos.push({
      videoId,
      title: titleMatch ? decodeHtmlEntities(titleMatch[1]) : '',
      description: descMatch ? decodeHtmlEntities(descMatch[1]) : '',
      thumbnail,
      channelTitle,
      publishedAt: publishedMatch ? publishedMatch[1] : new Date().toISOString(),
    });
  }

  return videos;
}

// Content older than 30 days is not considered current news
const CONTENT_MAX_AGE_DAYS = 30;

export async function POST(request: NextRequest) {
  const body = await request.json();
  let accountId: string;
  if (body.account_id) {
    accountId = body.account_id;
  } else {
    const auth = await resolveAuth();
    if (!auth) return unauthorizedResponse();
    accountId = auth.accountId;
  }
  const sourceId = body.source_id;

  // Calculate cutoff date for filtering old content
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - CONTENT_MAX_AGE_DAYS);

  // Get YouTube sources
  let query = supabaseAdmin
    .from('sources')
    .select('*')
    .eq('account_id', accountId)
    .eq('type', 'youtube');

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
    method: 'rss', // Track which method was used
  };

  for (const source of sources || []) {
    try {
      let channelId = source.channel_id;

      // If no channel_id, try to extract from URL
      if (!channelId) {
        channelId = await extractChannelId(source.url);
        if (channelId) {
          // Update source with channel_id for future fetches
          await supabaseAdmin
            .from('sources')
            .update({ channel_id: channelId })
            .eq('id', source.id);
        }
      }

      if (!channelId) {
        results.failed++;
        results.errors.push(`${source.name}: Could not determine channel ID`);
        continue;
      }

      // Fetch RSS feed (zero API quota!)
      const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
      const rssResponse = await fetch(rssUrl, {
        headers: {
          'User-Agent': 'Radar Intelligence Dashboard',
        },
      });

      if (!rssResponse.ok) {
        results.failed++;
        results.errors.push(`${source.name}: RSS feed returned ${rssResponse.status}`);
        continue;
      }

      const rssXml = await rssResponse.text();
      const videos = parseYouTubeRSS(rssXml);

      // RSS typically returns 15 most recent videos
      for (const video of videos.slice(0, 10)) {
        // Skip videos older than 30 days - not considered current news
        if (video.publishedAt) {
          const publishedDate = new Date(video.publishedAt);
          if (publishedDate < cutoffDate) {
            continue;
          }
        }

        const externalId = video.videoId;

        // Check if already exists
        const { data: existing } = await supabaseAdmin
          .from('content_items')
          .select('id')
          .eq('account_id', accountId)
          .eq('external_id', externalId)
          .maybeSingle();

        if (existing) continue;

        // Try to fetch transcript and generate AI summary
        let summary = video.description?.substring(0, 300);
        let fullContent = video.description;

        try {
          const transcript = await getVideoTranscript(externalId);
          if (transcript) {
            // Store full transcript in content field
            fullContent = transcript;

            // Generate AI summary from transcript
            const aiSummary = await summarizeTranscript(transcript, video.title);
            if (aiSummary) {
              summary = aiSummary;
            }
          }
        } catch (error) {
          console.error(`Failed to process transcript for ${externalId}:`, error);
          // Fall back to YouTube description - already set above
        }

        const { error: insertError } = await supabaseAdmin
          .from('content_items')
          .insert({
            account_id: accountId,
            source_id: source.id,
            topic_id: source.topic_id,
            type: 'video',
            title: video.title,
            summary: summary,
            content: fullContent,
            url: `https://www.youtube.com/watch?v=${externalId}`,
            thumbnail_url: video.thumbnail,
            author: video.channelTitle,
            published_at: video.publishedAt,
            duration: null, // RSS doesn't include duration - could fetch via API if needed
            external_id: externalId,
          });

        if (insertError) {
          console.error('Failed to insert video:', insertError);
        } else {
          results.items++;
        }
      }

      // Update last_fetched_at
      await supabaseAdmin
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

async function extractChannelId(url: string): Promise<string | null> {
  // Extract channel ID from various YouTube URL formats
  const patterns = [
    /youtube\.com\/channel\/([a-zA-Z0-9_-]+)/,
    /youtube\.com\/@([a-zA-Z0-9_-]+)/,
    /youtube\.com\/c\/([a-zA-Z0-9_-]+)/,
    /youtube\.com\/user\/([a-zA-Z0-9_-]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      const identifier = match[1];

      // If it's already a channel ID (starts with UC), return it
      if (identifier.startsWith('UC')) {
        return identifier;
      }

      // Method 1: Scrape the channel page to get channel ID (no API quota)
      try {
        const channelPageUrl = url.includes('youtube.com') ? url : `https://www.youtube.com/@${identifier}`;
        const pageResponse = await fetch(channelPageUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        });

        if (pageResponse.ok) {
          const html = await pageResponse.text();
          // YouTube embeds channel ID in multiple places in the HTML
          const channelIdPatterns = [
            /"channelId":"(UC[a-zA-Z0-9_-]+)"/,
            /channel_id=([^"&]+)/,
            /<link rel="canonical" href="https:\/\/www\.youtube\.com\/channel\/(UC[a-zA-Z0-9_-]+)">/,
            /browseId":"(UC[a-zA-Z0-9_-]+)"/,
          ];

          for (const cidPattern of channelIdPatterns) {
            const cidMatch = html.match(cidPattern);
            if (cidMatch && cidMatch[1]?.startsWith('UC')) {
              console.log(`Resolved ${identifier} to ${cidMatch[1]} via page scrape`);
              return cidMatch[1];
            }
          }
        }
      } catch (err) {
        console.error('Failed to scrape channel page:', err);
      }

      // Method 2: Fallback to API if scraping failed (costs 1 quota unit)
      if (YOUTUBE_API_KEY) {
        try {
          // Try resolving as handle
          const handleUrl = `https://www.googleapis.com/youtube/v3/channels?key=${YOUTUBE_API_KEY}&forHandle=${identifier}&part=id`;
          const handleResponse = await fetch(handleUrl);
          const handleData = await handleResponse.json();
          if (handleData.items?.[0]?.id) {
            return handleData.items[0].id;
          }

          // Try resolving as username
          const userUrl = `https://www.googleapis.com/youtube/v3/channels?key=${YOUTUBE_API_KEY}&forUsername=${identifier}&part=id`;
          const userResponse = await fetch(userUrl);
          const userData = await userResponse.json();
          if (userData.items?.[0]?.id) {
            return userData.items[0].id;
          }
        } catch (err) {
          console.error('Failed to resolve channel via API:', err);
        }
      }
    }
  }

  return null;
}
