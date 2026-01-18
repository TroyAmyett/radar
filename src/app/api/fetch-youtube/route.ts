import { NextRequest, NextResponse } from 'next/server';
import { supabase, getAccountId } from '@/lib/supabase';
import { getVideoTranscript } from '@/lib/youtube-transcript';
import { summarizeTranscript } from '@/lib/gemini';

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

// Decode HTML entities from YouTube API responses
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

interface YouTubeVideo {
  id: { videoId: string };
  snippet: {
    title: string;
    description: string;
    thumbnails: {
      high?: { url: string };
      medium?: { url: string };
      default?: { url: string };
    };
    channelTitle: string;
    publishedAt: string;
  };
}

interface YouTubeVideoDetails {
  id: string;
  contentDetails: {
    duration: string;
  };
}

export async function POST(request: NextRequest) {
  const accountId = getAccountId();
  const body = await request.json();
  const sourceId = body.source_id;

  if (!YOUTUBE_API_KEY) {
    return NextResponse.json(
      { error: 'YouTube API key not configured' },
      { status: 500 }
    );
  }

  // Get YouTube sources
  let query = supabase
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
  };

  for (const source of sources || []) {
    try {
      let channelId = source.channel_id;

      // If no channel_id, try to extract from URL
      if (!channelId) {
        channelId = await extractChannelId(source.url);
        if (channelId) {
          // Update source with channel_id
          await supabase
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

      // Fetch videos from channel
      const searchUrl = `https://www.googleapis.com/youtube/v3/search?key=${YOUTUBE_API_KEY}&channelId=${channelId}&part=snippet&type=video&order=date&maxResults=10`;
      const searchResponse = await fetch(searchUrl);
      const searchData = await searchResponse.json();

      if (searchData.error) {
        results.failed++;
        results.errors.push(`${source.name}: ${searchData.error.message}`);
        continue;
      }

      const videos: YouTubeVideo[] = searchData.items || [];
      const videoIds = videos.map((v) => v.id.videoId).join(',');

      // Get video details for duration
      let durations: Record<string, number> = {};
      if (videoIds) {
        const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?key=${YOUTUBE_API_KEY}&id=${videoIds}&part=contentDetails`;
        const detailsResponse = await fetch(detailsUrl);
        const detailsData = await detailsResponse.json();

        durations = (detailsData.items || []).reduce(
          (acc: Record<string, number>, video: YouTubeVideoDetails) => {
            acc[video.id] = parseDuration(video.contentDetails.duration);
            return acc;
          },
          {}
        );
      }

      for (const video of videos) {
        const externalId = video.id.videoId;

        // Check if already exists
        const { data: existing } = await supabase
          .from('content_items')
          .select('id')
          .eq('account_id', accountId)
          .eq('external_id', externalId)
          .single();

        if (existing) continue;

        const decodedTitle = decodeHtmlEntities(video.snippet.title);
        const decodedDescription = decodeHtmlEntities(video.snippet.description);
        const decodedAuthor = decodeHtmlEntities(video.snippet.channelTitle);

        // Try to fetch transcript and generate AI summary
        let summary = decodedDescription?.substring(0, 300);
        let fullContent = decodedDescription;

        try {
          const transcript = await getVideoTranscript(externalId);
          if (transcript) {
            // Store full transcript in content field
            fullContent = transcript;

            // Generate AI summary from transcript
            const aiSummary = await summarizeTranscript(transcript, decodedTitle);
            if (aiSummary) {
              summary = aiSummary;
            }
          }
        } catch (error) {
          console.error(`Failed to process transcript for ${externalId}:`, error);
          // Fall back to YouTube description - already set above
        }

        const { error: insertError } = await supabase
          .from('content_items')
          .insert({
            account_id: accountId,
            source_id: source.id,
            topic_id: source.topic_id,
            type: 'video',
            title: decodedTitle,
            summary: summary,
            content: fullContent,
            url: `https://www.youtube.com/watch?v=${externalId}`,
            thumbnail_url:
              video.snippet.thumbnails.high?.url ||
              video.snippet.thumbnails.medium?.url ||
              video.snippet.thumbnails.default?.url,
            author: decodedAuthor,
            published_at: video.snippet.publishedAt,
            duration: durations[externalId] || null,
            external_id: externalId,
          });

        if (insertError) {
          console.error('Failed to insert video:', insertError);
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

      // Otherwise, we'd need to resolve the handle/username to a channel ID
      // For now, try to use the YouTube API to resolve
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
          console.error('Failed to resolve channel:', err);
        }
      }
    }
  }

  return null;
}

function parseDuration(duration: string): number {
  // Parse ISO 8601 duration format (PT1H2M3S)
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;

  const hours = parseInt(match[1] || '0');
  const minutes = parseInt(match[2] || '0');
  const seconds = parseInt(match[3] || '0');

  return hours * 3600 + minutes * 60 + seconds;
}
