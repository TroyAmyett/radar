import { NextRequest, NextResponse } from 'next/server';
import { supabase, getAccountId } from '@/lib/supabase';

export async function GET() {
  const accountId = getAccountId();

  const { data, error } = await supabase
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

  const { data, error } = await supabase
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
