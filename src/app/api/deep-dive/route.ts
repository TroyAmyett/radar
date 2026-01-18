import { NextRequest, NextResponse } from 'next/server';
import { supabase, getAccountId } from '@/lib/supabase';
import { generateDeepDive } from '@/lib/ai/summarize';

export async function POST(request: NextRequest) {
  const accountId = getAccountId();
  const body = await request.json();
  const { content_item_id } = body;

  if (!content_item_id) {
    return NextResponse.json(
      { error: 'content_item_id is required' },
      { status: 400 }
    );
  }

  // Get the content item
  const { data: item, error } = await supabase
    .from('content_items')
    .select('*')
    .eq('id', content_item_id)
    .eq('account_id', accountId)
    .single();

  if (error || !item) {
    return NextResponse.json(
      { error: 'Content item not found' },
      { status: 404 }
    );
  }

  // Generate deep dive analysis
  const analysis = await generateDeepDive(
    item.title,
    item.content || item.summary,
    item.type,
    item.author
  );

  return NextResponse.json(analysis);
}
