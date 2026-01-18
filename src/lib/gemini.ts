import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

let genAI: GoogleGenerativeAI | null = null;

function getGeminiClient() {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  if (!genAI) {
    genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  }

  return genAI;
}

export async function summarizeTranscript(
  transcript: string,
  videoTitle: string
): Promise<string> {
  try {
    const client = getGeminiClient();
    const model = client.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `You are summarizing a YouTube video transcript for a content intelligence dashboard.

Video Title: ${videoTitle}

Transcript:
${transcript}

Create a concise, informative summary (2-3 sentences, max 300 characters) that captures:
1. The main topic or theme
2. Key insights or takeaways
3. Why this content matters

Keep it professional and actionable. Focus on what the viewer will learn or gain.`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const summary = response.text().trim();

    // Ensure it's under 300 characters for the summary field
    if (summary.length > 300) {
      return summary.substring(0, 297) + '...';
    }

    return summary;
  } catch (error) {
    console.error('Failed to generate summary with Gemini:', error);
    // Return null to fall back to YouTube description
    throw error;
  }
}

export async function summarizeContent(
  content: string,
  title: string,
  contentType: 'article' | 'video' | 'tweet' | 'post'
): Promise<string> {
  try {
    const client = getGeminiClient();
    const model = client.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `You are summarizing ${contentType} content for a content intelligence dashboard.

Title: ${title}

Content:
${content}

Create a concise, informative summary (2-3 sentences, max 300 characters) that captures:
1. The main topic or theme
2. Key insights or takeaways
3. Why this content matters

Keep it professional and actionable.`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const summary = response.text().trim();

    // Ensure it's under 300 characters
    if (summary.length > 300) {
      return summary.substring(0, 297) + '...';
    }

    return summary;
  } catch (error) {
    console.error('Failed to generate summary with Gemini:', error);
    throw error;
  }
}
