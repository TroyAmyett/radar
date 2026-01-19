import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdminAdmin, getAccountId } from '@/lib/supabaseAdmin';

export async function GET() {
  const accountId = getAccountId();

  const { data, error } = await supabaseAdmin
    .from('advisors')
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

  const { data, error } = await supabaseAdmin
    .from('advisors')
    .insert({
      account_id: accountId,
      name: body.name,
      platform: body.platform,
      username: body.username,
      avatar_url: body.avatar_url,
      bio: body.bio,
      topic_id: body.topic_id,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function PUT(request: NextRequest) {
  const body = await request.json();

  if (!body.id) {
    return NextResponse.json({ error: 'ID is required' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('advisors')
    .update({
      name: body.name,
      platform: body.platform,
      username: body.username,
      avatar_url: body.avatar_url,
      bio: body.bio,
      topic_id: body.topic_id,
    })
    .eq('id', body.id)
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

  const { error } = await supabaseAdmin.from('advisors').delete().eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
