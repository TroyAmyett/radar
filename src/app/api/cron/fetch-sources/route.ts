import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { supabase } from '@/lib/supabase';

async function logCronJobComplete(logId: string | null, status: string, responseStatus: number, responseBody: object, errorMessage: string | null = null) {
  if (!logId) return;

  await supabase.rpc('log_cron_job_complete', {
    p_log_id: logId,
    p_status: status,
    p_response_status: responseStatus,
    p_response_body: responseBody,
    p_error_message: errorMessage
  });
}

export async function GET(request: NextRequest) {
  return handleRequest(request, null);
}

export async function POST(request: NextRequest) {
  // Parse body for log_id from pg_cron
  let logId: string | null = null;
  try {
    const body = await request.json();
    logId = body.log_id || null;
  } catch {
    // No body or invalid JSON
  }
  return handleRequest(request, logId);
}

async function handleRequest(request: NextRequest, logId: string | null) {
  // Verify cron secret in production
  const headersList = await headers();
  const authHeader = headersList.get('authorization');

  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Also check query params for log_id (fallback)
  if (!logId) {
    logId = request.nextUrl.searchParams.get('log_id');
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
      polymarketResults: [] as object[],
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

      // Fetch Polymarket predictions
      const polyResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/fetch-polymarket`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_id: accountId }),
      });
      const polyResult = await polyResponse.json();
      results.polymarketResults.push({ accountId, ...polyResult });
    }

    const responseBody = {
      success: true,
      timestamp: new Date().toISOString(),
      ...results,
    };

    // Log completion
    await logCronJobComplete(logId, 'completed', 200, responseBody);

    return NextResponse.json(responseBody);
  } catch (error) {
    console.error('Cron fetch-sources failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Log failure
    await logCronJobComplete(logId, 'failed', 500, { error: 'Failed to fetch sources' }, errorMessage);

    return NextResponse.json(
      { error: 'Failed to fetch sources' },
      { status: 500 }
    );
  }
}

