import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

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

// Validate that a URL is reachable and appropriate for its type
async function validateSource(source: DiscoveredSource): Promise<DiscoveredSource | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    if (source.type === 'youtube') {
      // For YouTube, verify the channel page exists
      const response = await fetch(source.url, {
        method: 'HEAD',
        signal: controller.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Radar Feed Discoverer)' },
      });
      clearTimeout(timeout);

      if (!response.ok) return null;
      return source;
    } else {
      // For RSS, try to find and validate an actual feed
      const response = await fetch(source.url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Radar Feed Discoverer)',
          'Accept': 'text/html,application/rss+xml,application/atom+xml,application/xml',
        },
      });
      clearTimeout(timeout);

      if (!response.ok) return null;

      const text = await response.text();

      // Check if it's already a feed
      if (text.includes('<rss') || text.includes('<feed') || text.includes('<channel>')) {
        return source;
      }

      // Look for feed links in HTML
      const feedLinkMatch = text.match(/<link[^>]+type=["']application\/(?:rss|atom)\+xml["'][^>]+href=["']([^"']+)["']/i) ||
                           text.match(/<link[^>]+href=["']([^"']+)["'][^>]+type=["']application\/(?:rss|atom)\+xml["']/i);

      if (feedLinkMatch) {
        let feedUrl = feedLinkMatch[1];
        // Make absolute if relative
        if (feedUrl.startsWith('/')) {
          const baseUrl = new URL(source.url);
          feedUrl = `${baseUrl.origin}${feedUrl}`;
        } else if (!feedUrl.startsWith('http')) {
          feedUrl = new URL(feedUrl, source.url).href;
        }
        // Update source with actual feed URL
        return { ...source, url: feedUrl };
      }

      // Try common feed patterns
      const baseUrl = new URL(source.url);
      const feedPatterns = ['/feed', '/rss', '/feed.xml', '/rss.xml', '/atom.xml'];

      for (const pattern of feedPatterns) {
        const feedUrl = `${baseUrl.origin}${pattern}`;
        try {
          const feedRes = await fetch(feedUrl, {
            method: 'HEAD',
            signal: AbortSignal.timeout(3000),
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Radar Feed Discoverer)' },
          });
          if (feedRes.ok) {
            return { ...source, url: feedUrl };
          }
        } catch {
          // Continue trying other patterns
        }
      }

      // No valid feed found
      return null;
    }
  } catch {
    return null;
  }
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

    // Use Anthropic API key from environment
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.error('ANTHROPIC_API_KEY not configured');
      return NextResponse.json(
        { error: 'AI service not configured' },
        { status: 500 }
      );
    }

    const anthropic = new Anthropic({ apiKey });

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

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = message.content[0].type === 'text' ? message.content[0].text : '';

    // Parse the JSON response
    let sources: DiscoveredSource[] = [];
    try {
      // Remove markdown code blocks if present
      const jsonText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(jsonText);
      sources = parsed.sources || [];
    } catch {
      console.error('Failed to parse Anthropic response:', text);
      return NextResponse.json(
        { error: 'Failed to parse AI response' },
        { status: 500 }
      );
    }

    // Validate and clean up URLs (basic format check)
    sources = sources.filter(source => {
      try {
        new URL(source.url);
        return source.name && source.url && source.type && source.reason;
      } catch {
        return false;
      }
    });

    // Validate each source actually exists and has a valid feed/channel
    // Run validations in parallel for speed
    const validationResults = await Promise.all(
      sources.map(source => validateSource(source))
    );

    // Filter out null results (failed validations)
    const validatedSources = validationResults.filter(
      (source): source is DiscoveredSource => source !== null
    );

    return NextResponse.json({ sources: validatedSources });
  } catch (error) {
    console.error('Discover sources error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to discover sources', details: errorMessage },
      { status: 500 }
    );
  }
}
