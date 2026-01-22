import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// API endpoint to receive tweets from Make.com or other automation tools
// POST /api/ingest/tweets
// Headers: Authorization: Bearer {INGEST_API_KEY}
// Body: { tweets: [...], account_id: string, topic_id?: string }

interface IncomingTweet {
  id: string;
  text: string;
  author_name: string;
  author_username: string;
  author_profile_image?: string;
  created_at: string;
  url?: string;
  media_url?: string;
  metrics?: {
    likes?: number;
    retweets?: number;
    replies?: number;
  };
}

export async function POST(request: NextRequest) {
  try {
    // Verify API key
    const authHeader = request.headers.get('authorization');
    const apiKey = process.env.INGEST_API_KEY;

    if (!apiKey) {
      console.error('INGEST_API_KEY not configured');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    if (authHeader !== `Bearer ${apiKey}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { tweets, account_id, topic_id, source_id } = body as {
      tweets: IncomingTweet[];
      account_id: string;
      topic_id?: string;
      source_id?: string;
    };

    if (!account_id) {
      return NextResponse.json({ error: 'account_id is required' }, { status: 400 });
    }

    if (!tweets || !Array.isArray(tweets) || tweets.length === 0) {
      return NextResponse.json({ error: 'tweets array is required' }, { status: 400 });
    }

    let inserted = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const tweet of tweets) {
      try {
        // Check if tweet already exists
        const { data: existing } = await supabaseAdmin
          .from('content_items')
          .select('id')
          .eq('account_id', account_id)
          .eq('external_id', `twitter:${tweet.id}`)
          .single();

        if (existing) {
          skipped++;
          continue;
        }

        // Build tweet URL if not provided
        const tweetUrl = tweet.url || `https://x.com/${tweet.author_username}/status/${tweet.id}`;

        // Insert new tweet
        const { error: insertError } = await supabaseAdmin
          .from('content_items')
          .insert({
            account_id,
            source_id: source_id || null,
            topic_id: topic_id || null,
            type: 'tweet',
            title: `${tweet.author_name} (@${tweet.author_username})`,
            summary: tweet.text,
            content: tweet.text,
            url: tweetUrl,
            thumbnail_url: tweet.media_url || tweet.author_profile_image,
            author: tweet.author_name,
            published_at: tweet.created_at,
            external_id: `twitter:${tweet.id}`,
            metadata: {
              username: tweet.author_username,
              profile_image: tweet.author_profile_image,
              metrics: tweet.metrics,
            },
          });

        if (insertError) {
          errors.push(`Tweet ${tweet.id}: ${insertError.message}`);
        } else {
          inserted++;
        }
      } catch (err) {
        errors.push(`Tweet ${tweet.id}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    return NextResponse.json({
      success: true,
      inserted,
      skipped,
      errors: errors.length > 0 ? errors : undefined,
    });

  } catch (error) {
    console.error('Tweet ingestion error:', error);
    return NextResponse.json(
      { error: 'Failed to ingest tweets' },
      { status: 500 }
    );
  }
}
