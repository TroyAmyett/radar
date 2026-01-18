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

        // Extract thumbnail from various RSS formats
        const thumbnailUrl = extractThumbnail(item);

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

function extractThumbnail(item: any): string | null {
  // 1. Check enclosure (podcast/media RSS)
  if (item.enclosure?.url) {
    const url = item.enclosure.url;
    if (url.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
      return url;
    }
  }

  // 2. Check media:thumbnail (Media RSS)
  if (item['media:thumbnail']?.['$']?.url) {
    return item['media:thumbnail']['$'].url;
  }

  // 3. Check media:content (Media RSS)
  if (item['media:content']) {
    const mediaContent = Array.isArray(item['media:content'])
      ? item['media:content'][0]
      : item['media:content'];
    if (mediaContent?.['$']?.url) {
      const url = mediaContent['$'].url;
      if (url.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
        return url;
      }
    }
  }

  // 4. Check content:encoded or description for <img> tags
  const contentToCheck = item['content:encoded'] || item.content || item.description;
  if (contentToCheck) {
    const imgMatch = contentToCheck.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (imgMatch) {
      return imgMatch[1];
    }
  }

  // 5. Check for og:image in content
  if (contentToCheck) {
    const ogMatch = contentToCheck.match(/property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
    if (ogMatch) {
      return ogMatch[1];
    }
  }

  return null;
}
