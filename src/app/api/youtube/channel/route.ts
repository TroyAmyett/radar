import { NextRequest, NextResponse } from 'next/server';

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get('username');

  if (!username) {
    return NextResponse.json({ error: 'Username is required' }, { status: 400 });
  }

  if (!YOUTUBE_API_KEY) {
    return NextResponse.json({ error: 'YouTube API key not configured' }, { status: 500 });
  }

  try {
    // First try to find by handle (@username)
    let channelData = await findChannelByHandle(username);

    // If not found, try by custom URL or legacy username
    if (!channelData) {
      channelData = await findChannelByCustomUrl(username);
    }

    if (!channelData) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
    }

    return NextResponse.json(channelData);
  } catch (error) {
    console.error('YouTube API error:', error);
    return NextResponse.json({ error: 'Failed to fetch channel info' }, { status: 500 });
  }
}

async function findChannelByHandle(handle: string): Promise<ChannelInfo | null> {
  // Remove @ if present
  const cleanHandle = handle.replace(/^@/, '');

  const response = await fetch(
    `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&forHandle=${cleanHandle}&key=${YOUTUBE_API_KEY}`
  );

  const data = await response.json();

  if (data.items && data.items.length > 0) {
    return extractChannelInfo(data.items[0]);
  }

  return null;
}

async function findChannelByCustomUrl(username: string): Promise<ChannelInfo | null> {
  // Search for the channel
  const searchResponse = await fetch(
    `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(username)}&maxResults=1&key=${YOUTUBE_API_KEY}`
  );

  const searchData = await searchResponse.json();

  if (!searchData.items || searchData.items.length === 0) {
    return null;
  }

  const channelId = searchData.items[0].snippet.channelId;

  // Get full channel details
  const channelResponse = await fetch(
    `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${channelId}&key=${YOUTUBE_API_KEY}`
  );

  const channelData = await channelResponse.json();

  if (channelData.items && channelData.items.length > 0) {
    return extractChannelInfo(channelData.items[0]);
  }

  return null;
}

interface ChannelInfo {
  name: string;
  username: string;
  avatar_url: string;
  bio: string;
  subscriber_count?: number;
}

interface YouTubeChannelItem {
  id: string;
  snippet: {
    title: string;
    description: string;
    customUrl?: string;
    thumbnails: {
      default?: { url: string };
      high?: { url: string };
    };
  };
  statistics?: {
    subscriberCount?: string;
  };
}

function extractChannelInfo(item: YouTubeChannelItem): ChannelInfo {
  const snippet = item.snippet;
  const statistics = item.statistics;

  return {
    name: snippet.title,
    username: snippet.customUrl?.replace(/^@/, '') || item.id,
    avatar_url: snippet.thumbnails?.high?.url || snippet.thumbnails?.default?.url || '',
    bio: snippet.description?.substring(0, 300) || '',
    subscriber_count: statistics?.subscriberCount ? parseInt(statistics.subscriberCount) : undefined,
  };
}
