import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase';
import { sendInviteReminderEmail } from '@/lib/email/resend';

// Get app setting value
async function getAppSetting(key: string, defaultValue: number): Promise<number> {
  const { data } = await supabaseAdmin
    .from('app_settings')
    .select('value')
    .eq('key', key)
    .single();

  if (data?.value) {
    const parsed = typeof data.value === 'string'
      ? parseInt(data.value, 10)
      : Number(data.value);
    return isNaN(parsed) ? defaultValue : parsed;
  }
  return defaultValue;
}

export async function GET() {
  // Verify cron secret
  const headersList = await headers();
  const authHeader = headersList.get('authorization');

  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = new Date();
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://radar.funnelists.com';

    // Get settings
    const maxReminders = await getAppSetting('invite_reminder_max', 3);
    const reminderIntervalHours = await getAppSetting('invite_reminder_interval_hours', 24);

    // Calculate cutoff time for last reminder
    const reminderCutoff = new Date(now.getTime() - reminderIntervalHours * 60 * 60 * 1000);

    // Find pending invites that need reminders
    const { data: pendingInvites, error: fetchError } = await supabaseAdmin
      .from('user_invites')
      .select(`
        id,
        email,
        name,
        token,
        token_expires_at,
        reminder_count,
        last_reminder_at,
        invited_by_user_id
      `)
      .eq('status', 'pending')
      .lt('reminder_count', maxReminders)
      .gt('token_expires_at', now.toISOString());

    if (fetchError) {
      console.error('Error fetching pending invites:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch invites' }, { status: 500 });
    }

    // Filter invites that are due for a reminder
    const invitesDueForReminder = (pendingInvites || []).filter(invite => {
      if (!invite.last_reminder_at) {
        // Never reminded - check if it's been at least 24 hours since creation
        // (First reminder should go out ~24h after initial invite)
        return true;
      }
      return new Date(invite.last_reminder_at) < reminderCutoff;
    });

    console.log(`Found ${invitesDueForReminder.length} invites due for reminders`);

    let sentCount = 0;
    let failedCount = 0;

    for (const invite of invitesDueForReminder) {
      try {
        // Get inviter's name
        const { data: inviterProfile } = await supabaseAdmin
          .from('user_profiles')
          .select('name, email')
          .eq('id', invite.invited_by_user_id)
          .single();

        const inviterName = inviterProfile?.name || inviterProfile?.email?.split('@')[0] || undefined;

        // Calculate days until expiry
        const expiryDate = new Date(invite.token_expires_at);
        const daysUntilExpiry = Math.max(1, Math.ceil((expiryDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)));

        // Send reminder email
        const acceptUrl = `${baseUrl}/api/invites/accept?token=${invite.token}`;
        const newReminderCount = invite.reminder_count + 1;

        const emailId = await sendInviteReminderEmail({
          to: invite.email,
          inviteeName: invite.name || undefined,
          inviterName,
          acceptUrl,
          daysUntilExpiry,
          reminderNumber: newReminderCount,
        });

        if (emailId) {
          // Update invite with new reminder count
          await supabaseAdmin
            .from('user_invites')
            .update({
              reminder_count: newReminderCount,
              last_reminder_at: now.toISOString(),
            })
            .eq('id', invite.id);

          sentCount++;
          console.log(`Sent reminder ${newReminderCount} to ${invite.email}`);
        } else {
          failedCount++;
          console.error(`Failed to send reminder to ${invite.email}`);
        }
      } catch (err) {
        failedCount++;
        console.error(`Error processing invite ${invite.id}:`, err);
      }
    }

    // Mark expired invites
    const { data: expiredInvites, error: expiredError } = await supabaseAdmin
      .from('user_invites')
      .update({ status: 'expired' })
      .eq('status', 'pending')
      .lt('token_expires_at', now.toISOString())
      .select('id');

    if (expiredError) {
      console.error('Error marking expired invites:', expiredError);
    } else {
      console.log(`Marked ${expiredInvites?.length || 0} invites as expired`);
    }

    return NextResponse.json({
      success: true,
      summary: {
        checked: invitesDueForReminder.length,
        sent: sentCount,
        failed: failedCount,
        expired: expiredInvites?.length || 0,
      },
    });
  } catch (e) {
    console.error('Error in invite reminders cron:', e);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
