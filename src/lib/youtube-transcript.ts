import { YoutubeTranscript } from 'youtube-transcript';

export interface TranscriptSegment {
  text: string;
  duration: number;
  offset: number;
}

export async function getVideoTranscript(videoId: string): Promise<string | null> {
  try {
    const transcript = await YoutubeTranscript.fetchTranscript(videoId);

    if (!transcript || transcript.length === 0) {
      return null;
    }

    // Combine all transcript segments into a single text
    const fullText = transcript.map((segment: { text: string; duration: number; offset: number }) => segment.text).join(' ');

    return fullText;
  } catch (error) {
    console.error(`Failed to fetch transcript for video ${videoId}:`, error);
    return null;
  }
}
