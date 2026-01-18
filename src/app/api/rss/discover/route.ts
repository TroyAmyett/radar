import { NextRequest, NextResponse } from 'next/server';

interface DiscoveredFeed {
  url: string;
  title?: string;
  type: 'rss' | 'atom';
}

interface DiscoveryResult {
  feeds: DiscoveredFeed[];
  pageTitle?: string;
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

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    const result = await discoverFeeds(url);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Feed discovery error:', error);
    return NextResponse.json(
      { error: 'Failed to discover feeds' },
      { status: 500 }
    );
  }
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
