import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth, AuthError, unauthorizedResponse } from '@/lib/auth';
import { sendInviteEmail } from '@/lib/email/resend';

// Check if user is super admin
async function isSuperAdmin(userId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('user_profiles')
    .select('is_super_admin')
    .eq('id', userId)
    .single();

  return data?.is_super_admin === true;
}

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

// DELETE - Cancel an invite
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await requireAuth();
    const { id } = await params;

    // Check if user is super admin
    if (!await isSuperAdmin(userId)) {
      return NextResponse.json(
        { error: 'Only super admins can cancel invites' },
        { status: 403 }
      );
    }

    // Get the invite
    const { data: invite, error: fetchError } = await supabaseAdmin
      .from('user_invites')
      .select('id, status')
      .eq('id', id)
      .single();

    if (fetchError || !invite) {
      return NextResponse.json(
        { error: 'Invite not found' },
        { status: 404 }
      );
    }

    if (invite.status !== 'pending') {
      return NextResponse.json(
        { error: `Cannot cancel invite with status: ${invite.status}` },
        { status: 400 }
      );
    }

    // Cancel the invite
    const { error } = await supabaseAdmin
      .from('user_invites')
      .update({ status: 'cancelled' })
      .eq('id', id);

    if (error) {
      console.error('Error cancelling invite:', error);
      return NextResponse.json(
        { error: 'Failed to cancel invite' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Invite cancelled',
    });
  } catch (e) {
    if (e instanceof AuthError) return unauthorizedResponse();
    console.error('Error cancelling invite:', e);
    return NextResponse.json(
      { error: 'Failed to cancel invite' },
      { status: 500 }
    );
  }
}

// POST - Resend an invite
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await requireAuth();
    const { id } = await params;

    // Check if user is super admin
    if (!await isSuperAdmin(userId)) {
      return NextResponse.json(
        { error: 'Only super admins can resend invites' },
        { status: 403 }
      );
    }

    // Get the invite
    const { data: invite, error: fetchError } = await supabaseAdmin
      .from('user_invites')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !invite) {
      return NextResponse.json(
        { error: 'Invite not found' },
        { status: 404 }
      );
    }

    if (invite.status !== 'pending') {
      return NextResponse.json(
        { error: `Cannot resend invite with status: ${invite.status}` },
        { status: 400 }
      );
    }

    // Get inviter's name
    const { data: inviterProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('name, email')
      .eq('id', invite.invited_by_user_id)
      .single();

    const inviterName = inviterProfile?.name || inviterProfile?.email?.split('@')[0] || 'Someone';

    // Calculate days until expiry
    const expiryDate = new Date(invite.token_expires_at);
    const now = new Date();
    const daysUntilExpiry = Math.max(1, Math.ceil((expiryDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)));

    // If expired, generate new token
    let token = invite.token;
    let tokenExpiresAt = invite.token_expires_at;

    if (expiryDate < now) {
      const crypto = await import('crypto');
      token = crypto.randomBytes(32).toString('hex');
      const expiryDays = await getAppSetting('invite_expiry_days', 7);
      tokenExpiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString();
    }

    // Update invite
    const { error: updateError } = await supabaseAdmin
      .from('user_invites')
      .update({
        token,
        token_expires_at: tokenExpiresAt,
        reminder_count: 0,
        last_reminder_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) {
      console.error('Error updating invite:', updateError);
      return NextResponse.json(
        { error: 'Failed to update invite' },
        { status: 500 }
      );
    }

    // Send email
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://radar.funnelists.com';
    const acceptUrl = `${baseUrl}/api/invites/accept?token=${token}`;

    const emailId = await sendInviteEmail({
      to: invite.email,
      inviteeName: invite.name || undefined,
      inviterName,
      acceptUrl,
      expiresInDays: daysUntilExpiry,
    });

    if (!emailId) {
      return NextResponse.json(
        { error: 'Failed to send email' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Invite resent',
    });
  } catch (e) {
    if (e instanceof AuthError) return unauthorizedResponse();
    console.error('Error resending invite:', e);
    return NextResponse.json(
      { error: 'Failed to resend invite' },
      { status: 500 }
    );
  }
}
