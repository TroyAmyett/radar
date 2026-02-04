import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth, AuthError, unauthorizedResponse } from '@/lib/auth';
import { Readability } from '@mozilla/readability';
import { parseHTML } from 'linkedom';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { accountId } = await requireAuth();
    const { id } = await params;

    // Fetch the content item to get its URL
    const { data, error } = await supabaseAdmin
      .from('content_items')
      .select('url, content, type')
      .eq('id', id)
      .eq('account_id', accountId)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (data.type !== 'article') {
      return NextResponse.json({ error: 'Not an article' }, { status: 400 });
    }

    if (!data.url) {
      return NextResponse.json({ content: data.content || '' });
    }

    // Fetch the full article from the source URL
    const response = await fetch(data.url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Radar/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      // Fall back to stored content
      return NextResponse.json({ content: data.content || '' });
    }

    const html = await response.text();

    // Parse with Readability
    const { document } = parseHTML(html);
    const reader = new Readability(document);
    const article = reader.parse();

    if (!article?.content) {
      return NextResponse.json({ content: data.content || '' });
    }

    // Update the stored content for future views
    await supabaseAdmin
      .from('content_items')
      .update({ content: article.content })
      .eq('id', id);

    return NextResponse.json({ content: article.content });
  } catch (e) {
    if (e instanceof AuthError) return unauthorizedResponse();
    console.error('Full article fetch error:', e);
    return NextResponse.json({ error: 'Failed to fetch article' }, { status: 500 });
  }
}
