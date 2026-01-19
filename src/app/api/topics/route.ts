import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, getAccountId } from '@/lib/supabase';

export async function GET() {
  const accountId = getAccountId();

  const { data, error } = await supabaseAdmin
    .from('topics')
    .select('*')
    .eq('account_id', accountId)
    .order('name');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const accountId = getAccountId();
  const body = await request.json();

  const { data, error } = await supabaseAdmin
    .from('topics')
    .insert({
      account_id: accountId,
      name: body.name,
      slug: body.name.toLowerCase().replace(/\s+/g, '-'),
      color: body.color,
      icon: body.icon,
    })
    .select()
    .single();

  if (error) {
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
  const allowedFields = ['name', 'color', 'icon'];

  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      allowedUpdates[field] = updates[field];
    }
  }

  // Update slug if name changed
  if (updates.name) {
    allowedUpdates.slug = updates.name.toLowerCase().replace(/\s+/g, '-');
  }

  const { data, error } = await supabaseAdmin
    .from('topics')
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
    .from('topics')
    .delete()
    .eq('id', id)
    .eq('account_id', accountId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
