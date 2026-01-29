import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth, AuthError, unauthorizedResponse } from '@/lib/auth';

// Business color: cyan (#0ea5e9), Personal color: amber (#f59e0b)
const DEFAULT_TOPICS = [
  // Business topics (cyan)
  { name: 'My Brand', slug: 'my-brand', color: '#0ea5e9', icon: 'building' },
  { name: 'Competitors', slug: 'competitors', color: '#0ea5e9', icon: 'target' },
  { name: 'Partners', slug: 'partners', color: '#0ea5e9', icon: 'handshake' },
  { name: 'Industry', slug: 'industry', color: '#0ea5e9', icon: 'trending-up' },
  // Personal topics (amber)
  { name: 'Interests', slug: 'interests', color: '#f59e0b', icon: 'star' },
  { name: 'Learning', slug: 'learning', color: '#f59e0b', icon: 'book-open' },
];

export async function POST() {
  try {
    const { accountId } = await requireAuth();

    // Check if topics already exist
    const { data: existingTopics } = await supabaseAdmin
      .from('topics')
      .select('id')
      .eq('account_id', accountId)
      .limit(1);

    if (existingTopics && existingTopics.length > 0) {
      return NextResponse.json({
        message: 'Topics already exist',
        count: existingTopics.length,
      });
    }

    // Insert default topics
    const topicsToInsert = DEFAULT_TOPICS.map((topic) => ({
      ...topic,
      account_id: accountId,
      is_default: true,
    }));

    const { data, error } = await supabaseAdmin
      .from('topics')
      .insert(topicsToInsert)
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Default topics created',
      topics: data,
    });
  } catch (e) {
    if (e instanceof AuthError) return unauthorizedResponse();
    console.error('Failed to seed topics:', e);
    return NextResponse.json(
      { error: 'Failed to seed topics' },
      { status: 500 }
    );
  }
}
