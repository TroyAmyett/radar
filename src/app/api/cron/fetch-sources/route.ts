import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { supabase } from '@/lib/supabase';

export async function GET() {
  // Verify cron secret in production
  const headersList = await headers();
  const authHeader = headersList.get('authorization');

  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get all unique account IDs
    const { data: accounts } = await supabase
      .from('sources')
      .select('account_id')
      .eq('is_active', true);

    const uniqueAccounts = Array.from(new Set(accounts?.map((a) => a.account_id) || []));

    const results = {
      accounts: uniqueAccounts.length,
      rssResults: [] as object[],
      youtubeResults: [] as object[],
    };

    // Fetch for each account
    for (const accountId of uniqueAccounts) {
      // Fetch RSS feeds
      const rssResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/fetch-feeds`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_id: accountId }),
      });
      const rssResult = await rssResponse.json();
      results.rssResults.push({ accountId, ...rssResult });

      // Fetch YouTube videos
      const ytResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/fetch-youtube`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_id: accountId }),
      });
      const ytResult = await ytResponse.json();
      results.youtubeResults.push({ accountId, ...ytResult });
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...results,
    });
  } catch (error) {
    console.error('Cron fetch-sources failed:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sources' },
      { status: 500 }
    );
  }
}
