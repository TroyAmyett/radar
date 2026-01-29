import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth, AuthError, unauthorizedResponse, resolveAuth } from '@/lib/auth';
import { postToX, isXConfigured } from '@/lib/social/x-client';

export async function POST(request: NextRequest) {
  try {
    const { accountId } = await requireAuth();

    const body = await request.json();
    const {
      contentItemId,
      title,
      summary,
      url,
      thumbnailUrl,
      topicId,
      author,
      xPostEnabled,
      emailDigestEnabled,
      hashtags,
    } = body;

    // Validate required fields
    if (!title || !summary || !url) {
      return NextResponse.json(
        { error: 'Title, summary, and URL are required' },
        { status: 400 }
      );
    }

    // Create the What's Hot post record
    const { data: post, error: insertError } = await supabase
      .from('whats_hot_posts')
      .insert({
        account_id: accountId,
        content_item_id: contentItemId,
        title,
        summary,
        url,
        thumbnail_url: thumbnailUrl,
        topic_id: topicId,
        author,
        status: 'published',
        published_at: new Date().toISOString(),
        x_post_enabled: xPostEnabled,
        email_digest_enabled: emailDigestEnabled,
        hashtags,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating post:', insertError);
      return NextResponse.json(
        { error: 'Failed to create post' },
        { status: 500 }
      );
    }

    // Post to X if enabled and configured
    let xPostResult = null;
    if (xPostEnabled && isXConfigured()) {
      xPostResult = await postToX({
        title,
        summary,
        url,
        hashtags,
      });

      if (xPostResult.success && xPostResult.postId) {
        // Update the post with X post ID
        await supabase
          .from('whats_hot_posts')
          .update({
            x_post_id: xPostResult.postId,
            x_posted_at: new Date().toISOString(),
          })
          .eq('id', post.id);
      }
    }

    return NextResponse.json({
      success: true,
      post,
      xPost: xPostResult,
    });
  } catch (e) {
    if (e instanceof AuthError) return unauthorizedResponse();
    console.error('Error publishing:', e);
    return NextResponse.json(
      { error: 'Failed to publish content' },
      { status: 500 }
    );
  }
}

// GET endpoint to list published posts
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '10');
  const topicId = searchParams.get('topic_id');
  const queryAccountId = searchParams.get('account_id');

  let accountId: string;
  if (queryAccountId) {
    accountId = queryAccountId;
  } else {
    const auth = await resolveAuth();
    if (!auth) return unauthorizedResponse();
    accountId = auth.accountId;
  }

  const offset = (page - 1) * limit;

  try {
    let query = supabase
      .from('whats_hot_posts')
      .select('*, topics(*)', { count: 'exact' })
      .eq('account_id', accountId)
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (topicId) {
      query = query.eq('topic_id', topicId);
    }

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      posts: data,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching posts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch posts' },
      { status: 500 }
    );
  }
}
