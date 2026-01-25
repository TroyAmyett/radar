import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getApiKey } from '@/lib/apiKeyManager';

interface DiscoveredSource {
  name: string;
  url: string;
  type: 'rss' | 'youtube';
  reason: string;
  metadata?: {
    subscribers?: string;
    frequency?: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { topic, query } = body;

    if (!topic && !query) {
      return NextResponse.json(
        { error: 'Either topic or query is required' },
        { status: 400 }
      );
    }

    const searchTerm = query || topic;

    // Get API key dynamically
    const apiKey = await getApiKey('gemini');
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `You are an expert at finding high-quality content sources for professionals who want to stay informed about specific topics.

Search Term: "${searchTerm}"

Find 5-8 high-quality sources (blogs, YouTube channels, or newsletters) related to this topic. For each source, provide:
1. The exact name of the source
2. The URL (for YouTube use the channel URL like https://www.youtube.com/@channelname, for blogs use the main blog URL)
3. Type: either "rss" for blogs/websites or "youtube" for YouTube channels
4. A brief reason (1-2 sentences) explaining WHY this source is valuable - include things like:
   - Expertise or authority of the creator
   - Update frequency
   - Unique value proposition
   - Subscriber count or popularity if known

IMPORTANT:
- Only include real, active sources that you are confident exist
- Prefer sources that update regularly (at least monthly)
- Focus on quality over quantity
- Include a mix of source types when relevant

Respond in this exact JSON format:
{
  "sources": [
    {
      "name": "Source Name",
      "url": "https://...",
      "type": "rss" or "youtube",
      "reason": "Why this source is valuable...",
      "metadata": {
        "subscribers": "100K" (optional),
        "frequency": "Weekly" (optional)
      }
    }
  ]
}

Only output valid JSON, no other text.`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text().trim();

    // Parse the JSON response
    let sources: DiscoveredSource[] = [];
    try {
      // Remove markdown code blocks if present
      const jsonText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(jsonText);
      sources = parsed.sources || [];
    } catch {
      console.error('Failed to parse Gemini response:', text);
      return NextResponse.json(
        { error: 'Failed to parse AI response' },
        { status: 500 }
      );
    }

    // Validate and clean up URLs
    sources = sources.filter(source => {
      try {
        new URL(source.url);
        return source.name && source.url && source.type && source.reason;
      } catch {
        return false;
      }
    });

    return NextResponse.json({ sources });
  } catch (error) {
    console.error('Discover sources error:', error);
    return NextResponse.json(
      { error: 'Failed to discover sources' },
      { status: 500 }
    );
  }
}
