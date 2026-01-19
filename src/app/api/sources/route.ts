import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, getAccountId } from '@/lib/supabase';

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

  return NextResponse.json(data);
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
      image_url: body.image_url || null,
      description: body.description || null,
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
  const allowedFields = ['name', 'url', 'channel_id', 'username', 'topic_id', 'image_url', 'description'];

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
