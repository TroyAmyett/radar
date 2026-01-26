import Anthropic from '@anthropic-ai/sdk';

// Use environment variable directly for server-side usage
function getAnthropicClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not configured');
  }
  return new Anthropic({ apiKey });
}

export async function summarizeTranscript(
  transcript: string,
  videoTitle: string
): Promise<string> {
  try {
    const anthropic = getAnthropicClient();

    const prompt = `You are summarizing a YouTube video transcript for a content intelligence dashboard.

Video Title: ${videoTitle}

Transcript:
${transcript.substring(0, 8000)}

Create a concise, informative summary (2-3 sentences, max 300 characters) that captures:
1. The main topic or theme
2. Key insights or takeaways
3. Why this content matters

Keep it professional and actionable. Focus on what the viewer will learn or gain.`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }],
    });

    const summary = message.content[0].type === 'text' ? message.content[0].text.trim() : '';

    // Ensure it's under 300 characters for the summary field
    if (summary.length > 300) {
      return summary.substring(0, 297) + '...';
    }

    return summary;
  } catch (error) {
    console.error('Failed to generate summary:', error);
    throw error;
  }
}

export async function summarizeContent(
  content: string,
  title: string,
  contentType: 'article' | 'video' | 'tweet' | 'post'
): Promise<string> {
  try {
    const anthropic = getAnthropicClient();

    const prompt = `You are summarizing ${contentType} content for a content intelligence dashboard.

Title: ${title}

Content:
${content.substring(0, 4000)}

Create a concise, informative summary (2-3 sentences, max 300 characters) that captures:
1. The main topic or theme
2. Key insights or takeaways
3. Why this content matters

Keep it professional and actionable.`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }],
    });

    const summary = message.content[0].type === 'text' ? message.content[0].text.trim() : '';

    // Ensure it's under 300 characters
    if (summary.length > 300) {
      return summary.substring(0, 297) + '...';
    }

    return summary;
  } catch (error) {
    console.error('Failed to generate summary:', error);
    throw error;
  }
}
