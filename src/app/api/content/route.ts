import { NextRequest, NextResponse } from 'next/server';
import { supabase, getAccountId } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const accountId = getAccountId();
  const { searchParams } = new URL(request.url);
  const topicSlug = searchParams.get('topic');
  const searchQuery = searchParams.get('search');
  const savedOnly = searchParams.get('saved') === 'true';
  const limit = parseInt(searchParams.get('limit') || '50');
  const offset = parseInt(searchParams.get('offset') || '0');

  let query = supabase
    .from('content_items')
    .select(`
      *,
      topic:topics(*),
      source:sources(*),
      advisor:advisors(*),
      interaction:content_interactions(*)
    `)
    .eq('account_id', accountId)
    .order('published_at', { ascending: false, nullsFirst: false })
    .range(offset, offset + limit - 1);

  if (topicSlug) {
    const { data: topic } = await supabase
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

  // Filter by saved if needed
  let filteredData = transformedData;
  if (savedOnly) {
    filteredData = transformedData?.filter(
      (item) => item.interaction?.is_saved
    );
  }

  return NextResponse.json(filteredData);
}
