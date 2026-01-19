import { NextResponse } from 'next/server';
import { supabaseAdmin, getAccountId } from '@/lib/supabase';

const DEFAULT_TOPICS = [
  { name: 'Agentforce', slug: 'agentforce', color: '#0ea5e9', icon: 'bot' },
  { name: 'AI Tools', slug: 'ai-tools', color: '#8b5cf6', icon: 'sparkles' },
  { name: 'Blockchain AI', slug: 'blockchain-ai', color: '#f59e0b', icon: 'link' },
  { name: 'Competitors', slug: 'competitors', color: '#ef4444', icon: 'target' },
  { name: 'Partners', slug: 'partners', color: '#10b981', icon: 'handshake' },
];

export async function POST() {
  const accountId = getAccountId();

  try {
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
  } catch (error) {
    console.error('Failed to seed topics:', error);
    return NextResponse.json(
      { error: 'Failed to seed topics' },
      { status: 500 }
    );
  }
}
