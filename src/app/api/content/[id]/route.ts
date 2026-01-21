import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, getAccountId } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const accountId = getAccountId();
  const { id } = await params;

  const { data, error } = await supabaseAdmin
    .from('content_items')
    .select(`
      *,
      topic:topics(*),
      source:sources(*),
      interaction:content_interactions(*)
    `)
    .eq('id', id)
    .eq('account_id', accountId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Transform interaction to single object
  const transformedData = {
    ...data,
    interaction: Array.isArray(data.interaction)
      ? data.interaction[0] || null
      : data.interaction,
  };

  return NextResponse.json(transformedData);
}
