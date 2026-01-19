import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, getAccountId } from '@/lib/supabase';
import Parser from 'rss-parser';

const parser = new Parser({
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
    ],
  },
});

export async function POST(request: NextRequest) {
  const accountId = getAccountId();
  const body = await request.json();
  const sourceId = body.source_id;

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
      const feed = await parser.parseURL(source.url);
      const items = feed.items.slice(0, 20); // Limit to 20 most recent items

      for (const item of items) {
        // Check if item already exists
        const externalId = item.guid || item.link;
        const { data: existing } = await supabaseAdmin
          .from('content_items')
          .select('id')
          .eq('account_id', accountId)
          .eq('external_id', externalId)
          .single();

        if (existing) continue;

        // Extract thumbnail from various RSS formats
        const thumbnailUrl = extractThumbnail(item);

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
  const contentToCheck = item['content:encoded'] || item.content || item.description || item.summary;
  if (typeof contentToCheck === 'string') {
    // Try to find src attribute in img tag - handle various quote styles and spacing
    const imgMatch = contentToCheck.match(/<img[^>]+src\s*=\s*["']([^"']+)["']/i);
    if (imgMatch && imgMatch[1]) {
      return imgMatch[1];
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
