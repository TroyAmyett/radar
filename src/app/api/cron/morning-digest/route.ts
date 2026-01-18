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
    // Get all users with digest enabled for daily
    const { data: preferences } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('digest_enabled', true)
      .in('digest_frequency', ['daily', 'both'])
      .not('email_address', 'is', null);

    const results = {
      processed: 0,
      sent: 0,
      errors: [] as string[],
    };

    for (const pref of preferences || []) {
      try {
        // Generate digest
        const generateRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/digests/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'morning',
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
              type: 'morning',
              html: digest.html,
              email: pref.email_address,
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

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...results,
    });
  } catch (error) {
    console.error('Cron morning-digest failed:', error);
    return NextResponse.json(
      { error: 'Failed to send morning digests' },
      { status: 500 }
    );
  }
}
