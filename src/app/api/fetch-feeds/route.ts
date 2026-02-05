import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { resolveAuth, unauthorizedResponse } from '@/lib/auth';
import Parser from 'rss-parser';

// Custom RSS item type that includes both standard and custom fields
type CustomItem = {
  'media:content'?: unknown;
  'media:thumbnail'?: unknown;
  'media:group'?: unknown;
  enclosure?: unknown;
  image?: unknown;
  'content:encoded'?: string;
  // Standard fields that rss-parser provides
  title?: string;
  link?: string;
  guid?: string;
  pubDate?: string;
  creator?: string;
  content?: string;
  contentSnippet?: string;
  categories?: string[];
  isoDate?: string;
};

const parser: Parser<unknown, CustomItem> = new Parser({
  timeout: 10000,
  headers: {
    'User-Agent': 'Radar Intelligence Dashboard',
  },
  customFields: {
    item: [
      ['media:content', 'media:content', { keepArray: true }],
      ['media:thumbnail', 'media:thumbnail'],
      ['media:group', 'media:group'],
      ['enclosure', 'enclosure'],
      ['image', 'image'],
      ['content:encoded', 'content:encoded'],
    ],
  },
});

// Sanitize XML to fix common invalid entity issues
function sanitizeXml(xml: string): string {
  // Replace common unescaped HTML entities that break XML parsing
  return xml
    .replace(/&nbsp;/g, '&#160;')
    .replace(/&ldquo;/g, '&#8220;')
    .replace(/&rdquo;/g, '&#8221;')
    .replace(/&lsquo;/g, '&#8216;')
    .replace(/&rsquo;/g, '&#8217;')
    .replace(/&mdash;/g, '&#8212;')
    .replace(/&ndash;/g, '&#8211;')
    .replace(/&hellip;/g, '&#8230;')
    .replace(/&bull;/g, '&#8226;')
    .replace(/&copy;/g, '&#169;')
    .replace(/&reg;/g, '&#174;')
    .replace(/&trade;/g, '&#8482;')
    .replace(/&euro;/g, '&#8364;')
    .replace(/&pound;/g, '&#163;')
    // Remove other invalid XML characters (control chars except tab, newline, carriage return)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}

// Content older than 30 days is not considered current news
const CONTENT_MAX_AGE_DAYS = 30;

export async function POST(request: NextRequest) {
  const body = await request.json();
  // Use account_id from body (cron job) or resolve from session
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

  // Get the source
  let query = supabaseAdmin
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
      // Fetch and sanitize XML to handle malformed feeds
      let feed;
      try {
        feed = await parser.parseURL(source.url);
      } catch (parseErr) {
        // If direct parsing fails, try fetching and sanitizing the XML first
        const response = await fetch(source.url, {
          headers: { 'User-Agent': 'Radar Intelligence Dashboard' },
          signal: AbortSignal.timeout(10000),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const rawXml = await response.text();
        const sanitizedXml = sanitizeXml(rawXml);
        feed = await parser.parseString(sanitizedXml);
      }
      const items = feed.items.slice(0, 20); // Limit to 20 most recent items

      for (const item of items) {
        // Skip items older than 30 days - not considered current news
        if (item.pubDate) {
          const publishedDate = new Date(item.pubDate);
          if (publishedDate < cutoffDate) {
            continue;
          }
        }

        // Check if item already exists
        const externalId = item.guid || item.link;
        const { data: existing } = await supabaseAdmin
          .from('content_items')
          .select('id, thumbnail_url')
          .eq('account_id', accountId)
          .eq('external_id', externalId)
          .single();

        // Extract thumbnail from various RSS formats
        let thumbnailUrl = extractThumbnail(item);

        // If no thumbnail found in RSS, try fetching og:image from the article
        if (!thumbnailUrl && item.link) {
          thumbnailUrl = await fetchOgImage(item.link);
        }

        if (existing) {
          // Update thumbnail if missing
          if (!existing.thumbnail_url && thumbnailUrl) {
            await supabaseAdmin
              .from('content_items')
              .update({ thumbnail_url: thumbnailUrl })
              .eq('id', existing.id);
          }
          continue;
        }

        // Insert new item
        const { error: insertError } = await supabaseAdmin
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
            thumbnail_url: thumbnailUrl,
            author: item.creator || null,
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

      // Update last_fetched_at and clear error state
      await supabaseAdmin
        .from('sources')
        .update({
          last_fetched_at: new Date().toISOString(),
          metadata: {
            ...(source.metadata as Record<string, unknown> || {}),
            last_error: null,
            consecutive_failures: 0,
            last_successful_fetch: new Date().toISOString(),
          },
        })
        .eq('id', source.id);

      results.success++;
    } catch (err) {
      const errorMsg = (err as Error).message;
      const prevMeta = (source.metadata as Record<string, unknown>) || {};
      const prevFailures = (typeof prevMeta.consecutive_failures === 'number' ? prevMeta.consecutive_failures : 0);

      // Track error in source metadata
      await supabaseAdmin
        .from('sources')
        .update({
          metadata: {
            ...prevMeta,
            last_error: errorMsg,
            last_error_at: new Date().toISOString(),
            consecutive_failures: prevFailures + 1,
          },
        })
        .eq('id', source.id);

      results.failed++;
      results.errors.push(`${source.name}: ${errorMsg}`);
    }
  }

  return NextResponse.json(results);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractThumbnail(item: any): string | null {
  // Helper to check if URL looks like an image
  const isImageUrl = (url: string) => {
    if (!url || typeof url !== 'string') return false;
    // Match common image extensions or common CDN patterns
    return url.match(/\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i) ||
           url.includes('/images/') ||
           url.includes('/img/') ||
           url.includes('/media/') ||
           url.includes('wp-content/uploads');
  };

  // 1. Check enclosure (podcast/media RSS)
  if (item.enclosure?.url && isImageUrl(item.enclosure.url)) {
    return item.enclosure.url;
  }
  // Also check enclosure as object with $ property
  if (item.enclosure?.['$']?.url && isImageUrl(item.enclosure['$'].url)) {
    return item.enclosure['$'].url;
  }

  // 2. Check media:thumbnail (Media RSS) - various formats
  if (item['media:thumbnail']) {
    const thumb = item['media:thumbnail'];
    if (thumb?.['$']?.url) return thumb['$'].url;
    if (thumb?.url) return thumb.url;
    if (typeof thumb === 'string') return thumb;
  }

  // 3. Check media:content (Media RSS)
  if (item['media:content']) {
    const mediaContent = Array.isArray(item['media:content'])
      ? item['media:content']
      : [item['media:content']];
    for (const media of mediaContent) {
      const url = media?.['$']?.url || media?.url;
      if (url && isImageUrl(url)) {
        return url;
      }
    }
  }

  // 4. Check media:group (YouTube and others)
  if (item['media:group']) {
    const group = item['media:group'];
    if (group['media:thumbnail']?.['$']?.url) {
      return group['media:thumbnail']['$'].url;
    }
    if (group['media:content']?.[0]?.['$']?.url) {
      const url = group['media:content'][0]['$'].url;
      if (isImageUrl(url)) return url;
    }
  }

  // 5. Check image field (some feeds use this)
  if (item.image) {
    if (typeof item.image === 'string') return item.image;
    if (item.image?.url) return item.image.url;
    if (item.image?.['$']?.url) return item.image['$'].url;
  }

  // 6. Check content:encoded or description for <img> tags
  // Skip small images like avatars - look for larger featured images
  const contentToCheck = item['content:encoded'] || item.content || item.description || item.summary;
  if (typeof contentToCheck === 'string') {
    // Find all img tags and filter out likely avatars/small images
    const imgRegex = /<img[^>]+src\s*=\s*["']([^"']+)["'][^>]*>/gi;
    let match;
    while ((match = imgRegex.exec(contentToCheck)) !== null) {
      const imgTag = match[0];
      const imgUrl = match[1];

      // Skip if URL looks like an avatar or profile image
      if (imgUrl.match(/avatar|profile|author|gravatar|user[-_]?image|photo[-_]?\d+x\d+/i)) {
        continue;
      }

      // Check for width/height attributes - skip small images (likely avatars)
      const widthMatch = imgTag.match(/width\s*=\s*["']?(\d+)/i);
      const heightMatch = imgTag.match(/height\s*=\s*["']?(\d+)/i);
      if (widthMatch && heightMatch) {
        const width = parseInt(widthMatch[1]);
        const height = parseInt(heightMatch[1]);
        // Skip images smaller than 200x200 (likely avatars/icons)
        if (width < 200 || height < 200) {
          continue;
        }
      }

      // This looks like a real content image
      return imgUrl;
    }
  }

  // 7. Check for og:image in content (rare but possible)
  if (typeof contentToCheck === 'string') {
    const ogMatch = contentToCheck.match(/property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
    if (ogMatch) {
      return ogMatch[1];
    }
  }

  return null;
}

// Fetch og:image from the actual article page
async function fetchOgImage(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Radar Intelligence Dashboard',
      },
    });
    clearTimeout(timeout);

    if (!response.ok) return null;

    // Only read first 50KB to find meta tags (they're in <head>)
    const reader = response.body?.getReader();
    if (!reader) return null;

    let html = '';
    const decoder = new TextDecoder();

    while (html.length < 50000) {
      const { done, value } = await reader.read();
      if (done) break;
      html += decoder.decode(value, { stream: true });

      // Check if we've passed </head> - no need to read more
      if (html.includes('</head>')) break;
    }
    reader.cancel();

    // Look for og:image meta tag
    const ogMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
                   html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
    if (ogMatch) {
      return ogMatch[1];
    }

    // Fallback to twitter:image
    const twitterMatch = html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i) ||
                        html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i);
    if (twitterMatch) {
      return twitterMatch[1];
    }

    return null;
  } catch {
    return null;
  }
}
