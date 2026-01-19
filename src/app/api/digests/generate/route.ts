import { NextRequest, NextResponse } from 'next/server';
import { supabase, getAccountId } from '@/lib/supabase';
import { generateDigestInsight } from '@/lib/ai/summarize';
import { render } from '@react-email/components';
import MorningDigest from '@/components/email/MorningDigest';
import WeeklyDigest from '@/components/email/WeeklyDigest';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, subDays } from 'date-fns';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { type = 'morning', account_id } = body;
  const accountId = account_id || getAccountId();

  try {
    if (type === 'morning') {
      return await generateMorningDigest(accountId);
    } else if (type === 'weekly') {
      return await generateWeeklyDigest(accountId);
    }

    return NextResponse.json({ error: 'Invalid digest type' }, { status: 400 });
  } catch (error) {
    console.error('Failed to generate digest:', error);
    return NextResponse.json({ error: 'Failed to generate digest' }, { status: 500 });
  }
}

async function generateMorningDigest(accountId: string) {
  const today = new Date();
  const yesterday = subDays(today, 1);

  // Get top content from last 24 hours
  const { data: content } = await supabase
    .from('content_items')
    .select(`
      *,
      topic:topics(*)
    `)
    .eq('account_id', accountId)
    .gte('published_at', startOfDay(yesterday).toISOString())
    .lte('published_at', endOfDay(today).toISOString())
    .order('published_at', { ascending: false })
    .limit(5);

  // Generate AI insight
  const summaries = (content || []).map((item: { title: string; summary?: string; topic?: { name: string } }) => ({
    title: item.title,
    summary: item.summary || '',
    topic: item.topic?.name,
  }));
  const aiInsight = await generateDigestInsight(summaries);

  // Format data for email
  const topContent = (content || []).map((item: { id: string; title: string; summary?: string; url: string; author?: string; topic?: { name: string; color: string } }) => ({
    id: item.id,
    title: item.title,
    summary: item.summary || '',
    url: item.url,
    author: item.author,
    topic: item.topic?.name,
    topicColor: item.topic?.color,
  }));

  // Render email HTML
  const html = await render(
    MorningDigest({
      date: format(today, 'MMMM d, yyyy'),
      topContent,
      aiInsight,
    })
  );

  return NextResponse.json({
    type: 'morning',
    date: format(today, 'yyyy-MM-dd'),
    contentCount: content?.length || 0,
    html,
  });
}

async function generateWeeklyDigest(accountId: string) {
  const today = new Date();
  const weekStart = startOfWeek(today);
  const weekEnd = endOfWeek(today);

  // Get content from this week
  const { data: content } = await supabase
    .from('content_items')
    .select(`
      *,
      topic:topics(*)
    `)
    .eq('account_id', accountId)
    .gte('published_at', weekStart.toISOString())
    .lte('published_at', weekEnd.toISOString())
    .order('published_at', { ascending: false });

  // Get saved items count
  const { count: savedCount } = await supabase
    .from('content_interactions')
    .select('*', { count: 'exact', head: true })
    .eq('account_id', accountId)
    .eq('is_saved', true)
    .gte('created_at', weekStart.toISOString());

  // Calculate trends by topic
  const topicCounts: Record<string, { count: number; color: string }> = {};
  (content || []).forEach((item: { topic?: { name: string; color: string } }) => {
    if (item.topic) {
      if (!topicCounts[item.topic.name]) {
        topicCounts[item.topic.name] = { count: 0, color: item.topic.color };
      }
      topicCounts[item.topic.name].count++;
    }
  });

  const trends = Object.entries(topicCounts)
    .map(([topic, data]) => ({
      topic,
      count: data.count,
      color: data.color,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Generate AI summary
  const summaries = (content || []).slice(0, 10).map((item: { title: string; summary?: string; topic?: { name: string } }) => ({
    title: item.title,
    summary: item.summary || '',
    topic: item.topic?.name,
  }));
  const weekSummary = await generateDigestInsight(summaries);

  // Top content
  const topContent = (content || []).slice(0, 5).map((item: { id: string; title: string; summary?: string; url: string; author?: string; topic?: { name: string; color: string } }) => ({
    id: item.id,
    title: item.title,
    summary: item.summary || '',
    url: item.url,
    author: item.author,
    topic: item.topic?.name,
    topicColor: item.topic?.color,
  }));

  // Render email HTML
  const html = await render(
    WeeklyDigest({
      weekRange: `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`,
      weekSummary,
      trends,
      topContent,
      totalItems: content?.length || 0,
      savedItems: savedCount || 0,
    })
  );

  return NextResponse.json({
    type: 'weekly',
    weekRange: `${format(weekStart, 'yyyy-MM-dd')} to ${format(weekEnd, 'yyyy-MM-dd')}`,
    contentCount: content?.length || 0,
    html,
  });
}
