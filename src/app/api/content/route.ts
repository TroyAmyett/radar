import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth, AuthError, unauthorizedResponse } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const { accountId } = await requireAuth();
    const { searchParams } = new URL(request.url);
    const topicSlug = searchParams.get('topic');
    const searchQuery = searchParams.get('search');
    const savedOnly = searchParams.get('saved') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = supabaseAdmin
      .from('content_items')
      .select(`
        *,
        topic:topics(*),
        source:sources(*),
        interaction:content_interactions(*)
      `)
      .eq('account_id', accountId)
      .order('published_at', { ascending: false, nullsFirst: false })
      .range(offset, offset + limit - 1);

    if (topicSlug) {
      const { data: topic } = await supabaseAdmin
        .from('topics')
        .select('id')
        .eq('account_id', accountId)
        .eq('slug', topicSlug)
        .single();

      if (topic) {
        query = query.eq('topic_id', topic.id);
      }
    }

    if (searchQuery) {
      query = query.or(`title.ilike.%${searchQuery}%,summary.ilike.%${searchQuery}%,content.ilike.%${searchQuery}%`);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Transform data to include interaction as a single object
    const transformedData = data?.map((item) => ({
      ...item,
      interaction: Array.isArray(item.interaction)
        ? item.interaction[0] || null
        : item.interaction,
    }));

    // Filter out dismissed items, expired predictions, and filter by saved if needed
    const now = new Date().toISOString();
    let filteredData = transformedData?.filter((item) => {
      if (item.interaction?.is_dismissed) return false;
      // Hide expired Polymarket contracts
      if (item.type === 'prediction' && item.metadata?.endDate && item.metadata.endDate < now) return false;
      return true;
    });

    if (savedOnly) {
      filteredData = filteredData?.filter(
        (item) => item.interaction?.is_saved
      );
    }

    return NextResponse.json(filteredData);
  } catch (e) {
    if (e instanceof AuthError) return unauthorizedResponse();
    throw e;
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { accountId } = await requireAuth();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    // Delete the content item (interactions will cascade delete due to FK)
    const { error } = await supabaseAdmin
      .from('content_items')
      .delete()
      .eq('id', id)
      .eq('account_id', accountId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    if (e instanceof AuthError) return unauthorizedResponse();
    throw e;
  }
}
