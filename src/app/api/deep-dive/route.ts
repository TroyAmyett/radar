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
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function POST(request: NextRequest) {
  try {
    const { accountId } = await requireAuth();
    const body = await request.json();
    const { content_item_id } = body;

    if (!content_item_id) {
      return NextResponse.json(
        { error: 'content_item_id is required' },
        { status: 400 }
      );
    }

    // Get the content item
    const { data: item, error } = await supabaseAdmin
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

    // Check for API key
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'AI service not configured' }, { status: 500 });
    }

    // Strip HTML and prepare content
    const contentText = stripHtml(item.content || item.summary || item.title);
    const maxContentLength = item.type === 'video' ? 12000 : 4000;
    const contentType = item.type === 'video' ? 'video transcript' : item.type;

    // Generate deep dive analysis
    const anthropic = new Anthropic({ apiKey });

    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1500,
      messages: [
        {
          role: 'user',
          content: `Perform a deep analysis of this ${contentType} and provide a comprehensive JSON response:

Title: ${item.title}
${item.author ? `Author/Channel: ${item.author}` : ''}

${item.type === 'video' ? 'Transcript' : 'Content'}: ${contentText.substring(0, maxContentLength)}

Provide a JSON response with exactly this structure:
{
  "summary": "Comprehensive 3-4 sentence summary",
  "keyPoints": ["detailed key point 1", "detailed key point 2", "detailed key point 3", "detailed key point 4", "detailed key point 5"],
  "sentiment": 0.5,
  "sentimentLabel": "Positive/Negative/Neutral/Mixed",
  "actionItems": ["actionable insight 1", "actionable insight 2"],
  "relatedTopics": ["related topic 1", "related topic 2", "related topic 3"],
  "implications": "What this means for the reader or industry",
  "recommendations": ["recommendation 1", "recommendation 2"]
}

The sentiment should be a number from -1 (very negative) to 1 (very positive).
Respond only with valid JSON, no other text.`,
        },
      ],
    });

    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';

    let analysis;
    try {
      const parsed = JSON.parse(responseText);
      analysis = {
        summary: parsed.summary || '',
        keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints : [],
        sentiment: typeof parsed.sentiment === 'number'
          ? Math.max(-1, Math.min(1, parsed.sentiment))
          : 0,
        sentimentLabel: parsed.sentimentLabel || 'Neutral',
        actionItems: Array.isArray(parsed.actionItems) ? parsed.actionItems : [],
        relatedTopics: Array.isArray(parsed.relatedTopics) ? parsed.relatedTopics : [],
        implications: parsed.implications || '',
        recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
      };
    } catch {
      // Fallback if JSON parsing fails
      analysis = {
        summary: contentText.substring(0, 300),
        keyPoints: [],
        sentiment: 0,
        sentimentLabel: 'Unknown',
        actionItems: [],
        relatedTopics: [],
        implications: 'Could not parse AI response',
        recommendations: [],
      };
    }

    return NextResponse.json(analysis);
  } catch (e) {
    if (e instanceof AuthError) return unauthorizedResponse();
    console.error('Deep dive error:', e);
    return NextResponse.json({ error: 'Failed to generate deep dive' }, { status: 500 });
  }
}
