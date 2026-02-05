import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth, AuthError, unauthorizedResponse } from '@/lib/auth';
import Anthropic from '@anthropic-ai/sdk';

// Strip HTML tags for cleaner AI analysis
function stripHtml(html: string): string {
  if (!html) return '';
  return html
    .replace(/&#160;/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function POST(request: NextRequest) {
  try {
    const { accountId } = await requireAuth();
    const { content_item_id } = await request.json();

    if (!content_item_id) {
      return NextResponse.json({ error: 'content_item_id is required' }, { status: 400 });
    }

    // Get the content item
    const { data: item, error } = await supabaseAdmin
      .from('content_items')
      .select('*')
      .eq('id', content_item_id)
      .eq('account_id', accountId)
      .single();

    if (error || !item) {
      return NextResponse.json({ error: 'Content item not found' }, { status: 404 });
    }

    // Check if we already have an AI summary cached
    const metadata = (item.metadata as Record<string, unknown>) || {};
    if (metadata.ai_summary && metadata.key_points) {
      return NextResponse.json({
        summary: metadata.ai_summary,
        keyPoints: metadata.key_points,
        cached: true,
      });
    }

    // Generate AI summary using Haiku (fast and cheap)
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'AI service not configured' }, { status: 500 });
    }

    const anthropic = new Anthropic({ apiKey });
    const contentText = stripHtml(item.content || item.summary || item.title);

    const message = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 300,
      messages: [
        {
          role: 'user',
          content: `Summarize this ${item.type} content concisely. Provide a 2-sentence summary and 3 key takeaways.

Title: ${item.title}
Content: ${contentText.substring(0, 2000)}

Respond in JSON format:
{
  "summary": "2-sentence summary here",
  "keyPoints": ["point 1", "point 2", "point 3"]
}

Only output valid JSON.`,
        },
      ],
    });

    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';

    let aiSummary: string;
    let keyPoints: string[];

    try {
      const parsed = JSON.parse(responseText);
      aiSummary = parsed.summary || '';
      keyPoints = Array.isArray(parsed.keyPoints) ? parsed.keyPoints : [];
    } catch {
      // Fallback if JSON parsing fails
      aiSummary = responseText.substring(0, 200);
      keyPoints = [];
    }

    // Cache the AI summary in metadata
    await supabaseAdmin
      .from('content_items')
      .update({
        metadata: {
          ...metadata,
          ai_summary: aiSummary,
          key_points: keyPoints,
          summarized_at: new Date().toISOString(),
        },
      })
      .eq('id', content_item_id);

    return NextResponse.json({
      summary: aiSummary,
      keyPoints,
      cached: false,
    });
  } catch (e) {
    if (e instanceof AuthError) return unauthorizedResponse();
    console.error('Summarize error:', e);
    return NextResponse.json({ error: 'Failed to generate summary' }, { status: 500 });
  }
}
