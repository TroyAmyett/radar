import { NextRequest, NextResponse } from 'next/server';
import { supabase, getAccountId } from '@/lib/supabase';

export async function GET() {
  const accountId = getAccountId();

  const { data, error } = await supabase
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

  const { data, error } = await supabase
    .from('sources')
    .insert({
      account_id: accountId,
      name: body.name,
      type: body.type,
      url: body.url,
      channel_id: body.channel_id,
      username: body.username,
      topic_id: body.topic_id,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'ID is required' }, { status: 400 });
  }

  const { error } = await supabase.from('sources').delete().eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
