import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { supabase, supabaseAdmin } from '@/lib/supabase';

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

  if (!logId) {
    logId = request.nextUrl.searchParams.get('log_id');
  }

  try {
    // Get all users with digest enabled for daily
    const { data: preferences } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('digest_enabled', true)
      .in('digest_frequency', ['daily', 'both']);

    const results = {
      processed: 0,
      sent: 0,
      errors: [] as string[],
    };

    for (const pref of preferences || []) {
      try {
        // Resolve user email from account_id → user_accounts → auth.users
        const { data: userAccount } = await supabaseAdmin
          .from('user_accounts')
          .select('user_id')
          .eq('account_id', pref.account_id)
          .eq('is_primary', true)
          .maybeSingle();

        if (!userAccount) continue;

        const { data: { user: authUser } } = await supabaseAdmin.auth.admin.getUserById(userAccount.user_id);
        const email = authUser?.email;
        if (!email) continue;

        // Generate digest
        const generateRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/digests/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'evening',
            account_id: pref.account_id,
          }),
        });
        const digest = await generateRes.json();

        if (digest.html && digest.contentCount > 0) {
          // Send digest
          const sendRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/digests/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'evening',
              html: digest.html,
              email,
              account_id: pref.account_id,
            }),
          });
          const sendResult = await sendRes.json();

          if (sendResult.success) {
            results.sent++;
          }
        }

        results.processed++;
      } catch (error) {
        results.errors.push(`${pref.account_id}: ${(error as Error).message}`);
      }
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
    console.error('Cron evening-digest failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Log failure
    await logCronJobComplete(logId, 'failed', 500, { error: 'Failed to send evening digests' }, errorMessage);

    return NextResponse.json(
      { error: 'Failed to send evening digests' },
      { status: 500 }
    );
  }
}

