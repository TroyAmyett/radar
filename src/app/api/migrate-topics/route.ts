import { NextRequest, NextResponse } from 'next/server';
import { supabase, getAccountId } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  const accountId = getAccountId();

  try {
    // Remove old default topics (Advisors, Video)
    await supabase
      .from('topics')
      .delete()
      .eq('account_id', accountId)
      .in('slug', ['advisors', 'video']);

    // Add new default topics (Competitors, Partners)
    const newTopics = [
      {
        account_id: accountId,
        name: 'Competitors',
        slug: 'competitors',
        color: '#ef4444',
        icon: 'target',
        is_default: true,
      },
      {
        account_id: accountId,
        name: 'Partners',
        slug: 'partners',
        color: '#10b981',
        icon: 'handshake',
        is_default: true,
      },
    ];

    const { error: insertError } = await supabase
      .from('topics')
      .upsert(newTopics, { onConflict: 'account_id,slug' });

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Topics updated successfully',
    });
  } catch (error) {
    console.error('Failed to migrate topics:', error);
    return NextResponse.json(
      { error: 'Failed to migrate topics' },
      { status: 500 }
    );
  }
}
