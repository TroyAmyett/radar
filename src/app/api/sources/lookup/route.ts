import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, getAccountId } from '@/lib/supabase';

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

// CORS headers
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

interface SourceInfo {
  type: 'youtube' | 'rss' | 'twitter' | 'polymarket';
  name: string;
  url: string;
  imageUrl?: string;
  description?: string;
  channelId?: string;
  username?: string;
  feedUrl?: string;
  subscriberCount?: number;
  suggestedTopicId?: string;
  // Polymarket-specific
  polymarketTags?: string[];
  polymarketExcludeSports?: boolean;
}

interface Topic {
  id: string;
  name: string;
  keywords?: string[];
}

// Suggest a topic based on source title and description
async function suggestTopic(title: string, description?: string): Promise<string | undefined> {
  const accountId = getAccountId();

  // Fetch all topics for the account
  const { data: topics } = await supabaseAdmin
    .from('topics')
    .select('id, name')
    .eq('account_id', accountId);

  if (!topics || topics.length === 0) return undefined;

  // Combine title and description for matching
  const textToMatch = `${title} ${description || ''}`.toLowerCase();

  // Score each topic based on how well it matches
  let bestMatch: { topicId: string; score: number } | null = null;

  for (const topic of topics as Topic[]) {
    const topicName = topic.name.toLowerCase();
    let score = 0;

    // Check if topic name appears in the text
    if (textToMatch.includes(topicName)) {
      score += 10;
    }

    // Check individual words from topic name
    const topicWords = topicName.split(/\s+/).filter(w => w.length > 2);
    for (const word of topicWords) {
      if (textToMatch.includes(word)) {
        score += 3;
      }
    }

    // Common keyword associations
    const keywordMap: Record<string, string[]> = {
      'salesforce': ['crm', 'sfdc', 'apex', 'lightning', 'trailhead', 'dreamforce'],
      'agentforce': ['agent', 'agentic', 'ai agent', 'autonomous'],
      'ai': ['artificial intelligence', 'machine learning', 'ml', 'gpt', 'llm', 'claude', 'openai', 'gemini'],
      'crypto': ['bitcoin', 'ethereum', 'blockchain', 'web3', 'defi', 'nft', 'cryptocurrency'],
      'youtube': ['video', 'channel', 'creator'],
      'partners': ['partner', 'isv', 'si', 'appexchange', 'consulting'],
      'competitors': ['competitor', 'competition', 'market', 'dynamics', 'hubspot', 'zoho'],
    };

    // Check keyword associations
    for (const [key, keywords] of Object.entries(keywordMap)) {
      if (topicName.includes(key)) {
        for (const keyword of keywords) {
          if (textToMatch.includes(keyword)) {
            score += 2;
          }
        }
      }
    }

    if (score > 0 && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { topicId: topic.id, score };
    }
  }

  return bestMatch?.topicId;
}

// Decode HTML entities from API responses
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
    '&raquo;': '»',
    '&laquo;': '«',
    '&ndash;': '–',
    '&mdash;': '—',
    '&copy;': '©',
    '&reg;': '®',
    '&trade;': '™',
    '&hellip;': '…',
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

    if (normalizedUrl.includes('polymarket.com')) {
      return await lookupPolymarket(url);
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

  const channelName = decodeHtmlEntities(channel.snippet.title);
  const channelDescription = decodeHtmlEntities(channel.snippet.description)?.substring(0, 300);

  // Suggest a topic based on channel name and description
  const suggestedTopicId = await suggestTopic(channelName, channelDescription);

  const result: SourceInfo = {
    type: 'youtube',
    name: channelName,
    url: `https://www.youtube.com/channel/${channelId}`,
    imageUrl: channel.snippet.thumbnails?.high?.url ||
              channel.snippet.thumbnails?.medium?.url ||
              channel.snippet.thumbnails?.default?.url,
    description: channelDescription,
    channelId: channelId,
    subscriberCount: parseInt(channel.statistics?.subscriberCount || '0'),
    suggestedTopicId,
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

  // Skip common Twitter/X pages that aren't user profiles
  const reservedUsernames = ['home', 'explore', 'search', 'notifications', 'messages', 'settings', 'i', 'compose'];
  if (reservedUsernames.includes(username.toLowerCase())) {
    return NextResponse.json(
      { error: 'Please provide a Twitter/X profile URL (e.g., https://x.com/username)' },
      { status: 400 }
    );
  }

  // Use RSS.app to get Twitter feed as RSS (free tier)
  // RSS.app format: https://rss.app/feeds/v1.1/twitter/{username}.xml
  const rssAppFeedUrl = `https://rss.app/feeds/v1.1/twitter/${username}.xml`;

  // Try to validate the feed exists and get profile info
  try {
    const feedResponse = await fetch(rssAppFeedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Radar Feed Discoverer)',
        'Accept': 'application/rss+xml, application/xml, text/xml',
      },
    });

    if (feedResponse.ok) {
      const feedText = await feedResponse.text();

      // Extract profile info from feed
      let displayName = `@${username}`;
      let description = '';
      let imageUrl = '';

      // Try to extract title (usually includes display name)
      const titleMatch = feedText.match(/<title>(?:<!\[CDATA\[)?([^\]<]+)(?:\]\]>)?<\/title>/i);
      if (titleMatch) {
        displayName = decodeHtmlEntities(titleMatch[1].trim());
      }

      // Try to extract description
      const descMatch = feedText.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i);
      if (descMatch) {
        description = decodeHtmlEntities(descMatch[1].trim()).substring(0, 300);
      }

      // Try to extract image
      const imageMatch = feedText.match(/<image>[\s\S]*?<url>([^<]+)<\/url>[\s\S]*?<\/image>/i);
      if (imageMatch) {
        imageUrl = imageMatch[1].trim();
      }

      // Suggest a topic based on profile
      const suggestedTopicId = await suggestTopic(displayName, description);

      const result: SourceInfo = {
        type: 'rss', // Store as RSS type since we're using RSS.app
        name: displayName,
        url: `https://x.com/${username}`,
        feedUrl: rssAppFeedUrl,
        imageUrl: imageUrl || undefined,
        description: description || `Posts from @${username} on X/Twitter`,
        username: username,
        suggestedTopicId,
      };

      return NextResponse.json(result, { headers: CORS_HEADERS });
    }
  } catch (error) {
    console.error('RSS.app feed fetch error:', error);
  }

  // If RSS.app feed doesn't work, still return info but as twitter type
  // This lets the user know it was detected but may not work
  const result: SourceInfo = {
    type: 'twitter',
    name: `@${username}`,
    url: `https://x.com/${username}`,
    username: username,
    description: 'Twitter/X profile - RSS feed not available. X API requires paid subscription ($100/month).',
  };

  return NextResponse.json(result, { headers: CORS_HEADERS });
}

// Common RSS feed URL patterns to try
const FEED_PATTERNS = [
  '/feed/',
  '/feed',
  '/rss/',
  '/rss',
  '/feed.xml',
  '/rss.xml',
  '/atom.xml',
  '/index.xml',
  '/feeds/posts/default', // Blogger
  '?feed=rss2', // WordPress
];

interface DiscoveredFeed {
  url: string;
  title?: string;
  type: 'rss' | 'atom';
}

interface DiscoveryResult {
  feeds: DiscoveredFeed[];
  pageTitle?: string;
}

async function discoverFeeds(inputUrl: string): Promise<DiscoveryResult> {
  const feeds: DiscoveredFeed[] = [];
  let pageTitle: string | undefined;

  // Normalize the URL
  let baseUrl: URL;
  try {
    baseUrl = new URL(inputUrl);
  } catch {
    return { feeds: [], pageTitle: undefined };
  }

  // First, check if the input URL itself is a feed
  const directFeed = await checkIfFeed(inputUrl);
  if (directFeed) {
    feeds.push(directFeed);
    return { feeds, pageTitle: directFeed.title };
  }

  // Fetch the page and look for feed links in HTML
  try {
    const response = await fetch(inputUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Radar Feed Discoverer)',
        'Accept': 'text/html,application/xhtml+xml',
      },
    });

    if (response.ok) {
      const html = await response.text();

      // Extract page title
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      if (titleMatch) {
        pageTitle = titleMatch[1].trim();
      }

      // Find RSS/Atom links in the HTML
      const linkFeeds = extractFeedLinks(html, baseUrl);
      for (const feed of linkFeeds) {
        if (!feeds.some(f => f.url === feed.url)) {
          feeds.push(feed);
        }
      }
    }
  } catch (error) {
    console.error('Error fetching page:', error);
  }

  // If no feeds found via HTML, try common patterns
  if (feeds.length === 0) {
    // Build base path (preserve category/path if present)
    const basePath = baseUrl.pathname.endsWith('/')
      ? baseUrl.pathname.slice(0, -1)
      : baseUrl.pathname;

    // Try patterns on the current path first
    for (const pattern of FEED_PATTERNS) {
      const feedUrl = `${baseUrl.origin}${basePath}${pattern}`;
      const feed = await checkIfFeed(feedUrl);
      if (feed) {
        feeds.push(feed);
        break; // Found one, stop trying
      }
    }

    // If still nothing, try patterns on root
    if (feeds.length === 0 && basePath !== '') {
      for (const pattern of FEED_PATTERNS) {
        const feedUrl = `${baseUrl.origin}${pattern}`;
        const feed = await checkIfFeed(feedUrl);
        if (feed) {
          feeds.push(feed);
          break;
        }
      }
    }
  }

  return { feeds, pageTitle };
}

function extractFeedLinks(html: string, baseUrl: URL): DiscoveredFeed[] {
  const feeds: DiscoveredFeed[] = [];

  // Match <link> tags with type="application/rss+xml" or type="application/atom+xml"
  const linkRegex = /<link[^>]+(?:type=["']application\/(?:rss|atom)\+xml["'])[^>]*>/gi;
  const matches = Array.from(html.matchAll(linkRegex));

  for (const match of matches) {
    const linkTag = match[0];

    // Extract href
    const hrefMatch = linkTag.match(/href=["']([^"']+)["']/i);
    if (!hrefMatch) continue;

    let feedUrl = hrefMatch[1];

    // Make absolute URL if relative
    if (feedUrl.startsWith('/')) {
      feedUrl = `${baseUrl.origin}${feedUrl}`;
    } else if (!feedUrl.startsWith('http')) {
      feedUrl = new URL(feedUrl, baseUrl.origin).href;
    }

    // Extract title if present
    const titleMatch = linkTag.match(/title=["']([^"']+)["']/i);
    const title = titleMatch ? titleMatch[1] : undefined;

    // Determine type
    const type = linkTag.includes('atom') ? 'atom' : 'rss';

    feeds.push({ url: feedUrl, title, type });
  }

  return feeds;
}

async function checkIfFeed(url: string): Promise<DiscoveredFeed | null> {
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Radar Feed Discoverer)',
        'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml',
      },
    });

    if (!response.ok) return null;

    const contentType = response.headers.get('content-type') || '';
    const text = await response.text();

    // Check if it's XML
    if (!text.trim().startsWith('<?xml') && !text.trim().startsWith('<rss') && !text.trim().startsWith('<feed')) {
      // Not XML-ish content
      if (!contentType.includes('xml')) {
        return null;
      }
    }

    // Determine feed type and extract title
    const isAtom = text.includes('<feed') && text.includes('xmlns="http://www.w3.org/2005/Atom"');
    const isRss = text.includes('<rss') || text.includes('<channel>');

    if (!isAtom && !isRss) return null;

    // Extract feed title
    let title: string | undefined;
    if (isAtom) {
      const titleMatch = text.match(/<feed[^>]*>[\s\S]*?<title[^>]*>([^<]+)<\/title>/i);
      title = titleMatch ? titleMatch[1].trim() : undefined;
    } else {
      const titleMatch = text.match(/<channel>[\s\S]*?<title>(?:<!\[CDATA\[)?([^\]<]+)(?:\]\]>)?<\/title>/i);
      title = titleMatch ? titleMatch[1].trim() : undefined;
    }

    return {
      url,
      title,
      type: isAtom ? 'atom' : 'rss',
    };
  } catch {
    return null;
  }
}

async function lookupRSS(url: string): Promise<NextResponse> {
  // Discover RSS feeds directly (no HTTP self-call)
  const discoverData = await discoverFeeds(url);

  if (!discoverData.feeds?.length) {
    return NextResponse.json(
      { error: 'No RSS feed found at this URL' },
      { status: 404, headers: CORS_HEADERS }
    );
  }

  const feed = discoverData.feeds[0];
  const feedName = decodeHtmlEntities(feed.title || discoverData.pageTitle || 'RSS Feed');

  // Suggest a topic based on feed name and page title
  const suggestedTopicId = await suggestTopic(feedName, discoverData.pageTitle);

  const result: SourceInfo = {
    type: 'rss',
    name: feedName,
    url: url,
    feedUrl: feed.url,
    suggestedTopicId,
  };

  return NextResponse.json(result, { headers: CORS_HEADERS });
}

async function lookupPolymarket(url: string): Promise<NextResponse> {
  // Check if it's a specific event/market URL or the main site
  const eventMatch = url.match(/polymarket\.com\/event\/([^/?]+)/);

  if (eventMatch) {
    // Specific event - fetch its details
    const slug = eventMatch[1];
    try {
      const res = await fetch(`https://gamma-api.polymarket.com/events?slug=${slug}`);
      const events = await res.json();

      if (events && events.length > 0) {
        const event = events[0];
        return NextResponse.json({
          type: 'polymarket',
          name: event.title,
          url: `https://polymarket.com/event/${slug}`,
          imageUrl: event.image,
          description: event.description?.substring(0, 300),
        } as SourceInfo, { headers: CORS_HEADERS });
      }
    } catch (error) {
      console.error('Polymarket event lookup error:', error);
    }
  }

  // Main Polymarket URL or browse - offer to add as a feed
  // Default to trending non-sports markets
  const result: SourceInfo = {
    type: 'polymarket',
    name: 'Polymarket - Trending Markets',
    url: 'https://polymarket.com',
    imageUrl: 'https://polymarket.com/icons/favicon-196x196.png',
    description: 'Prediction markets for politics, finance, geopolitics, and more. Sports excluded by default.',
    polymarketTags: ['trending'],
    polymarketExcludeSports: true,
  };

  return NextResponse.json(result, { headers: CORS_HEADERS });
}
