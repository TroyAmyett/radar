import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { resolveAuth, unauthorizedResponse } from '@/lib/auth';
import { generateDigestInsight } from '@/lib/ai/summarize';
import { render } from '@react-email/components';
import MorningDigest from '@/components/email/MorningDigest';
import WeeklyDigest from '@/components/email/WeeklyDigest';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, subDays } from 'date-fns';
import Anthropic from '@anthropic-ai/sdk';

interface DiscoveredSource {
  name: string;
  url: string;
  type: 'rss' | 'youtube';
  reason: string;
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { type = 'morning', account_id } = body;
  let accountId: string;
  if (account_id) {
    accountId = account_id;
  } else {
    const auth = await resolveAuth();
    if (!auth) return unauthorizedResponse();
    accountId = auth.accountId;
  }

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

// Get source recommendations for a topic using Anthropic
async function getSourceRecommendations(topicName: string): Promise<DiscoveredSource[]> {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.error('ANTHROPIC_API_KEY not configured');
      return [];
    }

    const anthropic = new Anthropic({ apiKey });

    const prompt = `Find 2-3 high-quality content sources (blogs or YouTube channels) for "${topicName}".

For each source provide:
1. Name
2. URL (for YouTube use channel URL like https://www.youtube.com/@channelname)
3. Type: "rss" for blogs or "youtube" for channels
4. Brief reason (1 sentence) why it's valuable

Respond in JSON format only:
{"sources": [{"name": "...", "url": "...", "type": "rss" or "youtube", "reason": "..."}]}`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = message.content[0].type === 'text' ? message.content[0].text : '';
    const jsonText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(jsonText);
    return parsed.sources || [];
  } catch (error) {
    console.error('Failed to get source recommendations:', error);
    return [];
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

  // Get base URL for viewer links
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://radar.funnelists.com';

  // Format data for email - link to our viewer page for SEO
  const topContent = (content || []).map((item: { id: string; title: string; summary?: string; url: string; author?: string; thumbnail_url?: string; topic?: { name: string; color: string } }) => ({
    id: item.id,
    title: item.title,
    summary: item.summary || '',
    url: `${baseUrl}/view/${item.id}`,
    originalUrl: item.url,
    author: item.author,
    thumbnailUrl: item.thumbnail_url,
    topic: item.topic?.name,
    topicColor: item.topic?.color,
  }));

  // Get source recommendations based on user's topics
  let recommendedSources: { name: string; url: string; type: 'rss' | 'youtube'; reason: string; addUrl: string }[] = [];
  try {
    // Get user's topics
    const { data: topics } = await supabase
      .from('topics')
      .select('name')
      .eq('account_id', accountId)
      .limit(5);

    if (topics && topics.length > 0) {
      // Pick a random topic for variety
      const randomTopic = topics[Math.floor(Math.random() * topics.length)];
      const sources = await getSourceRecommendations(randomTopic.name);

      // Format with one-click add URLs
      recommendedSources = sources.slice(0, 3).map((source) => {
        const addData = btoa(JSON.stringify({
          name: source.name,
          url: source.url,
          type: source.type,
          reason: source.reason,
        }));
        return {
          name: source.name,
          url: source.url,
          type: source.type,
          reason: source.reason,
          addUrl: `${baseUrl}/sources?add=${addData}`,
        };
      });
    }
  } catch (error) {
    console.error('Failed to get source recommendations for digest:', error);
    // Continue without recommendations
  }

  // Render email HTML
  const html = await render(
    MorningDigest({
      date: format(today, 'MMMM d, yyyy'),
      topContent,
      aiInsight,
      recommendedSources,
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

  // Get base URL for viewer links
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://radar.funnelists.com';

  // Top content - link to our viewer page for SEO
  const topContent = (content || []).slice(0, 5).map((item: { id: string; title: string; summary?: string; url: string; author?: string; thumbnail_url?: string; topic?: { name: string; color: string } }) => ({
    id: item.id,
    title: item.title,
    summary: item.summary || '',
    url: `${baseUrl}/view/${item.id}`,
    originalUrl: item.url,
    author: item.author,
    thumbnailUrl: item.thumbnail_url,
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
