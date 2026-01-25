import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, getAccountId } from '@/lib/supabase';
import { MAX_SOURCES_PER_USER, WARN_SOURCES_THRESHOLD } from '@/lib/constants';

export async function GET() {
  const accountId = getAccountId();

  const { data, error } = await supabaseAdmin
    .from('sources')
    .select(`
      *,
      topic:topics(*)
    `)
    .eq('account_id', accountId)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Return sources with count info for UI display
  const count = data?.length || 0;
  return NextResponse.json({
    sources: data,
    count,
    max: MAX_SOURCES_PER_USER,
    warn: WARN_SOURCES_THRESHOLD,
    atLimit: count >= MAX_SOURCES_PER_USER,
    nearLimit: count >= WARN_SOURCES_THRESHOLD,
  });
}

export async function POST(request: NextRequest) {
  const accountId = getAccountId();
  const body = await request.json();

  // Validate required fields
  if (!body.name || !body.type || !body.url) {
    console.error('Missing required fields:', { name: body.name, type: body.type, url: body.url });
    return NextResponse.json(
      { error: 'Name, type, and URL are required' },
      { status: 400 }
    );
  }

  // Check source limit before inserting
  const { count: currentCount } = await supabaseAdmin
    .from('sources')
    .select('*', { count: 'exact', head: true })
    .eq('account_id', accountId);

  if (currentCount !== null && currentCount >= MAX_SOURCES_PER_USER) {
    return NextResponse.json(
      { error: `You've reached the maximum of ${MAX_SOURCES_PER_USER} sources. Please remove some sources before adding new ones.` },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from('sources')
    .insert({
      account_id: accountId,
      name: body.name,
      type: body.type,
      url: body.url,
      channel_id: body.channel_id || null,
      username: body.username || null,
      topic_id: body.topic_id || null,
      metadata: body.metadata || null,
    })
    .select()
    .single();

  if (error) {
    console.error('Supabase insert error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function PATCH(request: NextRequest) {
  const accountId = getAccountId();
  const body = await request.json();
  const { id, ...updates } = body;

  if (!id) {
    return NextResponse.json({ error: 'ID is required' }, { status: 400 });
  }

  // Only allow updating certain fields
  const allowedUpdates: Record<string, unknown> = {};
  const allowedFields = ['name', 'url', 'channel_id', 'username', 'topic_id', 'metadata'];

  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      allowedUpdates[field] = updates[field];
    }
  }

  const { data, error } = await supabaseAdmin
    .from('sources')
    .update(allowedUpdates)
    .eq('id', id)
    .eq('account_id', accountId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // If topic_id was updated, also update all content items from this source
  if ('topic_id' in allowedUpdates) {
    await supabaseAdmin
      .from('content_items')
      .update({ topic_id: allowedUpdates.topic_id })
      .eq('source_id', id)
      .eq('account_id', accountId);
  }

  return NextResponse.json(data);
}

export async function DELETE(request: NextRequest) {
  const accountId = getAccountId();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'ID is required' }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from('sources')
    .delete()
    .eq('id', id)
    .eq('account_id', accountId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
