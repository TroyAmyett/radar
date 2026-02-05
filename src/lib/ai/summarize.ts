import Anthropic from '@anthropic-ai/sdk';
import { getApiKey } from '@/lib/apiKeyManager';

// Strip HTML tags and decode common entities for cleaner AI analysis
function stripHtml(html: string): string {
  if (!html) return '';

  // Decode common HTML entities
  let text = html
    .replace(/&#160;/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(dec))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));

  // Remove HTML tags
  text = text.replace(/<[^>]*>/g, ' ');

  // Clean up whitespace
  text = text.replace(/\s+/g, ' ').trim();

  return text;
}

export interface ContentSummary {
  summary: string;
  keyPoints: string[];
  sentiment: number; // -1 to 1
}

export interface DeepDiveAnalysis {
  summary: string;
  keyPoints: string[];
  sentiment: number;
  sentimentLabel: string;
  actionItems: string[];
  relatedTopics: string[];
  implications: string;
  recommendations: string[];
}

export async function generateSummary(
  title: string,
  content: string | null,
  type: string
): Promise<ContentSummary> {
  // Strip HTML from content for cleaner AI analysis
  const contentText = stripHtml(content || title);

  try {
    // Get API key dynamically based on user's tier
    const apiKey = await getApiKey('anthropic');
    const anthropic = new Anthropic({ apiKey });

    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: `Analyze this ${type} content and provide a JSON response with exactly this structure:
{
  "summary": "2-3 sentence summary of the main points",
  "keyPoints": ["key point 1", "key point 2", "key point 3"],
  "sentiment": 0.5
}

The sentiment should be a number from -1 (very negative) to 1 (very positive), where 0 is neutral.

Title: ${title}

Content: ${contentText.substring(0, 2000)}

Respond only with valid JSON, no other text.`,
        },
      ],
    });

    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';

    // Parse the JSON response
    const parsed = JSON.parse(responseText);

    return {
      summary: parsed.summary || '',
      keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints : [],
      sentiment: typeof parsed.sentiment === 'number'
        ? Math.max(-1, Math.min(1, parsed.sentiment))
        : 0,
    };
  } catch (error) {
    console.error('Failed to generate summary:', error);
    // Return a fallback with HTML stripped
    return {
      summary: stripHtml(content || title).substring(0, 200),
      keyPoints: [],
      sentiment: 0,
    };
  }
}

export async function generateDeepDive(
  title: string,
  content: string | null,
  type: string,
  author?: string | null
): Promise<DeepDiveAnalysis> {
  // Strip HTML from content for cleaner AI analysis
  const contentText = stripHtml(content || title);

  // For videos, use more content since transcripts are longer and more detailed
  const maxContentLength = type === 'video' ? 12000 : 4000;
  const contentType = type === 'video' ? 'video transcript' : type;

  try {
    // Get API key dynamically based on user's tier
    const apiKey = await getApiKey('anthropic');
    const anthropic = new Anthropic({ apiKey });

    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1500,
      messages: [
        {
          role: 'user',
          content: `Perform a deep analysis of this ${contentType} and provide a comprehensive JSON response:

Title: ${title}
${author ? `Author/Channel: ${author}` : ''}

${type === 'video' ? 'Transcript' : 'Content'}: ${contentText.substring(0, maxContentLength)}

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
    const parsed = JSON.parse(responseText);

    return {
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
  } catch (error) {
    console.error('Failed to generate deep dive:', error);
    return {
      summary: stripHtml(content || title).substring(0, 300),
      keyPoints: [],
      sentiment: 0,
      sentimentLabel: 'Unknown',
      actionItems: [],
      relatedTopics: [],
      implications: 'Analysis unavailable',
      recommendations: [],
    };
  }
}

export async function generateDigestInsight(
  contentSummaries: Array<{ title: string; summary: string; topic?: string }>
): Promise<string> {
  try {
    // Get API key dynamically based on user's tier
    const apiKey = await getApiKey('anthropic');
    const anthropic = new Anthropic({ apiKey });

    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 300,
      messages: [
        {
          role: 'user',
          content: `Based on these content summaries from today, generate a single insightful paragraph (2-3 sentences) about the key trends or themes:

${contentSummaries.map((c, i) => `${i + 1}. ${c.title}: ${c.summary}`).join('\n')}

Write a natural, engaging insight paragraph. No JSON, just the text.`,
        },
      ],
    });

    return message.content[0].type === 'text' ? message.content[0].text : '';
  } catch (error) {
    console.error('Failed to generate digest insight:', error);
    return 'Today\'s content covers a diverse range of topics in your areas of interest.';
  }
}
