import { NextRequest, NextResponse } from 'next/server';

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

// CORS headers
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

interface SourceInfo {
  type: 'youtube' | 'rss' | 'twitter';
  name: string;
  url: string;
  imageUrl?: string;
  description?: string;
  channelId?: string;
  username?: string;
  feedUrl?: string;
  subscriberCount?: number;
}

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
    if (entities[match]) return entities[match];
    if (match.startsWith('&#x')) {
      return String.fromCharCode(parseInt(match.slice(3, -1), 16));
    }
    if (match.startsWith('&#')) {
      return String.fromCharCode(parseInt(match.slice(2, -1), 10));
    }
    return match;
  });
}

export async function POST(request: NextRequest) {
  const { url } = await request.json();

  if (!url) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400, headers: CORS_HEADERS });
  }

  try {
    const normalizedUrl = url.trim().toLowerCase();

    // Detect source type from URL
    if (normalizedUrl.includes('youtube.com') || normalizedUrl.includes('youtu.be')) {
      return await lookupYouTube(url);
    }

    if (normalizedUrl.includes('twitter.com') || normalizedUrl.includes('x.com')) {
      return await lookupTwitter(url);
    }

    // Default: try RSS discovery
    return await lookupRSS(url);
  } catch (error) {
    console.error('Source lookup error:', error);
    return NextResponse.json(
      { error: 'Failed to lookup source' },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

// Handle OPTIONS for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: CORS_HEADERS,
  });
}

async function lookupYouTube(url: string): Promise<NextResponse> {
  if (!YOUTUBE_API_KEY) {
    return NextResponse.json(
      { error: 'YouTube API not configured' },
      { status: 500 }
    );
  }

  // Extract channel identifier from URL
  const patterns = [
    { regex: /youtube\.com\/channel\/([a-zA-Z0-9_-]+)/, type: 'id' },
    { regex: /youtube\.com\/@([a-zA-Z0-9_-]+)/, type: 'handle' },
    { regex: /youtube\.com\/c\/([a-zA-Z0-9_-]+)/, type: 'custom' },
    { regex: /youtube\.com\/user\/([a-zA-Z0-9_-]+)/, type: 'user' },
  ];

  let channelId: string | null = null;
  let identifier: string | null = null;
  let identifierType: string | null = null;

  for (const pattern of patterns) {
    const match = url.match(pattern.regex);
    if (match) {
      identifier = match[1];
      identifierType = pattern.type;
      if (pattern.type === 'id') {
        channelId = identifier;
      }
      break;
    }
  }

  if (!identifier) {
    return NextResponse.json(
      { error: 'Could not extract channel from YouTube URL' },
      { status: 400 }
    );
  }

  // Resolve handle/username to channel ID if needed
  if (!channelId) {
    if (identifierType === 'handle') {
      const handleUrl = `https://www.googleapis.com/youtube/v3/channels?key=${YOUTUBE_API_KEY}&forHandle=${identifier}&part=id`;
      const handleRes = await fetch(handleUrl);
      const handleData = await handleRes.json();
      channelId = handleData.items?.[0]?.id;
    }

    if (!channelId && (identifierType === 'user' || identifierType === 'custom')) {
      const userUrl = `https://www.googleapis.com/youtube/v3/channels?key=${YOUTUBE_API_KEY}&forUsername=${identifier}&part=id`;
      const userRes = await fetch(userUrl);
      const userData = await userRes.json();
      channelId = userData.items?.[0]?.id;
    }

    // If still no channel ID, try search as last resort
    if (!channelId) {
      const searchUrl = `https://www.googleapis.com/youtube/v3/search?key=${YOUTUBE_API_KEY}&q=${identifier}&type=channel&part=snippet&maxResults=1`;
      const searchRes = await fetch(searchUrl);
      const searchData = await searchRes.json();
      channelId = searchData.items?.[0]?.id?.channelId;
    }
  }

  if (!channelId) {
    return NextResponse.json(
      { error: 'Could not find YouTube channel' },
      { status: 404 }
    );
  }

  // Fetch channel details
  const detailsUrl = `https://www.googleapis.com/youtube/v3/channels?key=${YOUTUBE_API_KEY}&id=${channelId}&part=snippet,statistics`;
  const detailsRes = await fetch(detailsUrl);
  const detailsData = await detailsRes.json();

  const channel = detailsData.items?.[0];
  if (!channel) {
    return NextResponse.json(
      { error: 'Channel not found' },
      { status: 404 }
    );
  }

  const result: SourceInfo = {
    type: 'youtube',
    name: decodeHtmlEntities(channel.snippet.title),
    url: `https://www.youtube.com/channel/${channelId}`,
    imageUrl: channel.snippet.thumbnails?.high?.url ||
              channel.snippet.thumbnails?.medium?.url ||
              channel.snippet.thumbnails?.default?.url,
    description: decodeHtmlEntities(channel.snippet.description)?.substring(0, 300),
    channelId: channelId,
    subscriberCount: parseInt(channel.statistics?.subscriberCount || '0'),
  };

  return NextResponse.json(result, { headers: CORS_HEADERS });
}

async function lookupTwitter(url: string): Promise<NextResponse> {
  // Extract username from URL
  const match = url.match(/(?:twitter\.com|x\.com)\/([a-zA-Z0-9_]+)/);

  if (!match) {
    return NextResponse.json(
      { error: 'Could not extract username from Twitter/X URL' },
      { status: 400 }
    );
  }

  const username = match[1];

  // Note: Twitter API requires authentication and is paid
  // For now, return basic info that user can verify
  const result: SourceInfo = {
    type: 'twitter',
    name: `@${username}`,
    url: `https://x.com/${username}`,
    username: username,
    description: 'Twitter/X profile - name will be updated when content is fetched',
  };

  return NextResponse.json(result, { headers: CORS_HEADERS });
}

async function lookupRSS(url: string): Promise<NextResponse> {
  // Try to discover RSS feeds from the URL
  const discoverRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/rss/discover`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });

  const discoverData = await discoverRes.json();

  if (!discoverRes.ok || !discoverData.feeds?.length) {
    // Check if the URL itself is a feed
    try {
      const feedRes = await fetch(url, {
        headers: { 'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml' }
      });
      const feedText = await feedRes.text();

      if (feedText.includes('<rss') || feedText.includes('<feed') || feedText.includes('<channel>')) {
        // It's a direct feed URL - extract title
        const titleMatch = feedText.match(/<title[^>]*>([^<]+)<\/title>/i);
        const title = titleMatch ? decodeHtmlEntities(titleMatch[1]) : 'RSS Feed';

        const result: SourceInfo = {
          type: 'rss',
          name: title,
          url: url,
          feedUrl: url,
        };
        return NextResponse.json(result, { headers: CORS_HEADERS });
      }
    } catch {
      // Not a valid feed
    }

    return NextResponse.json(
      { error: 'No RSS feed found at this URL' },
      { status: 404 }
    );
  }

  const feed = discoverData.feeds[0];
  const result: SourceInfo = {
    type: 'rss',
    name: feed.title || discoverData.pageTitle || 'RSS Feed',
    url: url,
    feedUrl: feed.url,
  };

  return NextResponse.json(result, { headers: CORS_HEADERS });
}
