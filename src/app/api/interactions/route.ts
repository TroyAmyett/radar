import { NextRequest, NextResponse } from 'next/server';
import { supabase, getAccountId } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  const accountId = getAccountId();
  const body = await request.json();
  const { content_item_id, action, value } = body;

  if (!content_item_id || !action) {
    return NextResponse.json(
      { error: 'content_item_id and action are required' },
      { status: 400 }
    );
  }

  // Check if interaction exists
  const { data: existing } = await supabase
    .from('content_interactions')
    .select('*')
    .eq('account_id', accountId)
    .eq('content_item_id', content_item_id)
    .single();

  const updates: Record<string, unknown> = {};

  switch (action) {
    case 'like':
      updates.is_liked = existing ? !existing.is_liked : true;
      break;
    case 'save':
      updates.is_saved = existing ? !existing.is_saved : true;
      break;
    case 'dismiss':
      updates.is_dismissed = true;
      break;
    case 'note':
      updates.notes = value;
      break;
    default:
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  if (existing) {
    const { data, error } = await supabase
      .from('content_interactions')
      .update(updates)
      .eq('id', existing.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } else {
    const { data, error } = await supabase
      .from('content_interactions')
      .insert({
        account_id: accountId,
        content_item_id,
        ...updates,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  }
}
