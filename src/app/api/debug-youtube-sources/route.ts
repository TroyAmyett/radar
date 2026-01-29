import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth, AuthError, unauthorizedResponse } from '@/lib/auth';

// Debug endpoint to view and update YouTube source channel IDs
export async function GET(request: NextRequest) {
  try {
    const accountId = request.nextUrl.searchParams.get('account_id') || (await requireAuth()).accountId;

    const { data: sources, error } = await supabaseAdmin
      .from('sources')
      .select('id, name, url, channel_id, type')
      .eq('account_id', accountId)
      .eq('type', 'youtube');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      sources,
      instructions: 'POST with { source_id, channel_id } to update a channel ID',
    });
  } catch (e) {
    if (e instanceof AuthError) return unauthorizedResponse();
    throw e;
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { source_id, channel_id } = body;

  if (!source_id || !channel_id) {
    return NextResponse.json({ error: 'source_id and channel_id required' }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from('sources')
    .update({ channel_id })
    .eq('id', source_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, source_id, channel_id });
}
