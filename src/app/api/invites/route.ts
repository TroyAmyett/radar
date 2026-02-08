import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth, AuthError, unauthorizedResponse } from '@/lib/auth';
import { sendInviteEmail } from '@/lib/email/resend';
import crypto from 'crypto';

// Generate a secure random token
function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

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

// POST - Send a new invite
export async function POST(request: NextRequest) {
  try {
    const { accountId, userId } = await requireAuth();

    // Check if user is super admin (required during beta)
    const superAdmin = await isSuperAdmin(userId);
    if (!superAdmin) {
      return NextResponse.json(
        { error: 'Only super admins can send invites during beta' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { email, name } = body;

    // Validate email
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: 'Valid email address is required' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if email is already registered
    const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
    const isRegistered = existingUser?.users?.some(
      u => u.email?.toLowerCase() === normalizedEmail
    );

    if (isRegistered) {
      return NextResponse.json(
        { error: 'This email is already registered' },
        { status: 400 }
      );
    }

    // Check if already invited
    const { data: existingInvite } = await supabaseAdmin
      .from('user_invites')
      .select('id, status')
      .eq('email', normalizedEmail)
      .in('status', ['pending', 'accepted'])
      .single();

    if (existingInvite) {
      if (existingInvite.status === 'pending') {
        return NextResponse.json(
          { error: 'This email already has a pending invite' },
          { status: 400 }
        );
      }
      if (existingInvite.status === 'accepted') {
        return NextResponse.json(
          { error: 'This email has already accepted an invite' },
          { status: 400 }
        );
      }
    }

    // Check invite limit (super admins are unlimited)
    if (!superAdmin) {
      const inviteLimit = await getAppSetting('invite_limit_per_user', 3);
      const { count } = await supabaseAdmin
        .from('user_invites')
        .select('*', { count: 'exact', head: true })
        .eq('invited_by_user_id', userId)
        .in('status', ['pending', 'accepted']);

      if ((count || 0) >= inviteLimit) {
        return NextResponse.json(
          { error: `You have reached your invite limit of ${inviteLimit}` },
          { status: 400 }
        );
      }
    }

    // Get inviter's name for the email
    const { data: inviterProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('name, email')
      .eq('id', userId)
      .single();

    const inviterName = inviterProfile?.name || inviterProfile?.email?.split('@')[0] || 'Someone';

    // Generate token and expiry
    const token = generateToken();
    const expiryDays = await getAppSetting('invite_expiry_days', 7);
    const tokenExpiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);

    // Create invite record
    const { data: invite, error } = await supabaseAdmin
      .from('user_invites')
      .insert({
        account_id: accountId,
        email: normalizedEmail,
        name: name || null,
        invited_by_user_id: userId,
        token,
        token_expires_at: tokenExpiresAt.toISOString(),
        status: 'pending',
        reminder_count: 0,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating invite:', error);
      return NextResponse.json(
        { error: 'Failed to create invite' },
        { status: 500 }
      );
    }

    // Send invite email
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://radar.funnelists.com';
    const acceptUrl = `${baseUrl}/api/invites/accept?token=${token}`;

    const emailId = await sendInviteEmail({
      to: normalizedEmail,
      inviteeName: name || undefined,
      inviterName,
      acceptUrl,
      expiresInDays: expiryDays,
    });

    if (!emailId) {
      console.error('Failed to send invite email');
      // Still return success - invite was created, email can be resent
    }

    return NextResponse.json({
      success: true,
      invite: {
        id: invite.id,
        email: invite.email,
        name: invite.name,
        status: invite.status,
        expiresAt: invite.token_expires_at,
        createdAt: invite.created_at,
      },
    });
  } catch (e) {
    if (e instanceof AuthError) return unauthorizedResponse();
    console.error('Error in invite endpoint:', e);
    return NextResponse.json(
      { error: 'Failed to process invite' },
      { status: 500 }
    );
  }
}

// GET - List all invites (super admin only)
export async function GET() {
  try {
    const { userId } = await requireAuth();

    // Check if user is super admin
    if (!await isSuperAdmin(userId)) {
      return NextResponse.json(
        { error: 'Only super admins can view invites' },
        { status: 403 }
      );
    }

    // Get all invites
    const { data: invites, error } = await supabaseAdmin
      .from('user_invites')
      .select(`
        id,
        email,
        name,
        status,
        reminder_count,
        token_expires_at,
        accepted_at,
        created_at,
        invited_by_user_id
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching invites:', error);
      return NextResponse.json(
        { error: 'Failed to fetch invites' },
        { status: 500 }
      );
    }

    // Calculate stats
    const stats = {
      total: invites?.length || 0,
      pending: invites?.filter(i => i.status === 'pending').length || 0,
      accepted: invites?.filter(i => i.status === 'accepted').length || 0,
      expired: invites?.filter(i => i.status === 'expired').length || 0,
      cancelled: invites?.filter(i => i.status === 'cancelled').length || 0,
    };

    // Mark expired invites
    const now = new Date();
    const expiredPending = invites?.filter(
      i => i.status === 'pending' && new Date(i.token_expires_at) < now
    ) || [];

    if (expiredPending.length > 0) {
      await supabaseAdmin
        .from('user_invites')
        .update({ status: 'expired' })
        .in('id', expiredPending.map(i => i.id));

      // Update local data
      expiredPending.forEach(inv => {
        inv.status = 'expired';
      });
      stats.pending -= expiredPending.length;
      stats.expired += expiredPending.length;
    }

    return NextResponse.json({
      invites,
      stats,
    });
  } catch (e) {
    if (e instanceof AuthError) return unauthorizedResponse();
    console.error('Error fetching invites:', e);
    return NextResponse.json(
      { error: 'Failed to fetch invites' },
      { status: 500 }
    );
  }
}
