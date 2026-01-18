import { TwitterApi } from 'twitter-api-v2';

export interface XPostData {
  title: string;
  summary: string;
  url: string;
  hashtags?: string[];
}

export interface XPostResult {
  success: boolean;
  postId?: string;
  error?: string;
}

/**
 * Check if X API credentials are configured
 */
export function isXConfigured(): boolean {
  return !!(
    process.env.X_API_KEY &&
    process.env.X_API_SECRET &&
    process.env.X_ACCESS_TOKEN &&
    process.env.X_ACCESS_SECRET
  );
}

// Lazily initialize X (Twitter) API v2 client
// Only creates client when actually needed to avoid build errors
function getClient(): TwitterApi {
  if (!isXConfigured()) {
    throw new Error('X API credentials not configured');
  }

  return new TwitterApi({
    appKey: process.env.X_API_KEY!,
    appSecret: process.env.X_API_SECRET!,
    accessToken: process.env.X_ACCESS_TOKEN!,
    accessSecret: process.env.X_ACCESS_SECRET!,
  });
}

/**
 * Post content to X (Twitter)
 */
export async function postToX(data: XPostData): Promise<XPostResult> {
  try {
    if (!isXConfigured()) {
      return {
        success: false,
        error: 'X API credentials not configured',
      };
    }

    const client = getClient();
    const rwClient = client.readWrite;

    // Build tweet text
    const hashtagString = data.hashtags?.length
      ? '\n\n' + data.hashtags.map((tag) => `#${tag.replace(/^#/, '')}`).join(' ')
      : '';

    // Twitter has 280 character limit
    // URL takes ~23 characters (t.co shortening)
    // Calculate available space
    const urlSpace = 25; // t.co + newlines
    const hashtagSpace = hashtagString.length;
    const availableForContent = 280 - urlSpace - hashtagSpace - 4; // 4 for safety margin

    // Create tweet text with title and truncated summary
    let tweetContent = data.title;
    if (data.summary) {
      const summarySpace = availableForContent - data.title.length - 3; // 3 for " - "
      if (summarySpace > 30) {
        const truncatedSummary =
          data.summary.length > summarySpace
            ? data.summary.substring(0, summarySpace - 3) + '...'
            : data.summary;
        tweetContent = `${data.title}\n\n${truncatedSummary}`;
      }
    }

    // Truncate if still too long
    if (tweetContent.length > availableForContent) {
      tweetContent = tweetContent.substring(0, availableForContent - 3) + '...';
    }

    const tweetText = `${tweetContent}\n\n${data.url}${hashtagString}`;

    // Post the tweet
    const result = await rwClient.v2.tweet(tweetText);

    return {
      success: true,
      postId: result.data.id,
    };
  } catch (error) {
    console.error('Error posting to X:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Delete a tweet by ID
 */
export async function deleteXPost(postId: string): Promise<boolean> {
  try {
    if (!isXConfigured()) {
      return false;
    }

    const client = getClient();
    await client.readWrite.v2.deleteTweet(postId);
    return true;
  } catch (error) {
    console.error('Error deleting X post:', error);
    return false;
  }
}
