import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthError, unauthorizedResponse } from '@/lib/auth';
import Anthropic from '@anthropic-ai/sdk';
import { getApiKey } from '@/lib/apiKeyManager';

export async function POST(request: NextRequest) {
  try {
    await requireAuth();
    const { message, currentPrompt } = await request.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const apiKey = await getApiKey('anthropic');
    const anthropic = new Anthropic({ apiKey });

    const systemMessage = `You are a briefing customization assistant for an intelligence dashboard called Radar.
Users receive daily/weekly email digests summarizing content from their RSS feeds, YouTube channels, Twitter accounts, and prediction markets.

Your job is to help users refine their digest prompt — the instructions that control how their briefing is written.

When the user describes what they want, generate a clear, concise prompt that will be used as instructions for the AI generating their daily briefing.

${currentPrompt ? `The user's current custom prompt is:\n"${currentPrompt}"\n\nRefine it based on their new request.` : 'The user has no custom prompt yet (using default). Create one based on their request.'}

Respond in JSON format:
{
  "prompt": "The refined prompt text that will be saved and used for generating digests",
  "explanation": "A brief, friendly explanation of what the prompt will do (1-2 sentences)"
}`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      system: systemMessage,
      messages: [{ role: 'user', content: message }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const jsonText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(jsonText);

    return NextResponse.json({
      prompt: parsed.prompt || '',
      explanation: parsed.explanation || '',
    });
  } catch (e) {
    if (e instanceof AuthError) return unauthorizedResponse();
    console.error('Digest prompt chat error:', e);
    return NextResponse.json({ error: 'Failed to generate prompt' }, { status: 500 });
  }
}
