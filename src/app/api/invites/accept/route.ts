import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET - Accept an invite (public endpoint)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://radar.funnelists.com';

  if (!token) {
    return NextResponse.redirect(`${baseUrl}/signup?error=missing_token`);
  }

  try {
    // Find the invite
    const { data: invite, error: fetchError } = await supabaseAdmin
      .from('user_invites')
      .select('*')
      .eq('token', token)
      .single();

    if (fetchError || !invite) {
      return NextResponse.redirect(`${baseUrl}/signup?error=invalid_token`);
    }

    // Check if already accepted
    if (invite.status === 'accepted') {
      // Redirect to login since they already have an account
      return NextResponse.redirect(`${baseUrl}/login?message=invite_already_accepted`);
    }

    // Check if cancelled
    if (invite.status === 'cancelled') {
      return NextResponse.redirect(`${baseUrl}/signup?error=invite_cancelled`);
    }

    // Check if expired
    const now = new Date();
    if (invite.status === 'expired' || new Date(invite.token_expires_at) < now) {
      // Update status if not already expired
      if (invite.status !== 'expired') {
        await supabaseAdmin
          .from('user_invites')
          .update({ status: 'expired' })
          .eq('id', invite.id);
      }
      return NextResponse.redirect(`${baseUrl}/signup?error=invite_expired`);
    }

    // Valid invite - redirect to signup with email prefilled
    const params = new URLSearchParams({
      invite: token,
      email: invite.email,
    });

    if (invite.name) {
      params.set('name', invite.name);
    }

    return NextResponse.redirect(`${baseUrl}/signup?${params.toString()}`);
  } catch (e) {
    console.error('Error accepting invite:', e);
    return NextResponse.redirect(`${baseUrl}/signup?error=server_error`);
  }
}

// POST - Mark invite as accepted (called after successful signup)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, userId } = body;

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      );
    }

    // Find and update the invite
    const { data: invite, error: fetchError } = await supabaseAdmin
      .from('user_invites')
      .select('*')
      .eq('token', token)
      .eq('status', 'pending')
      .single();

    if (fetchError || !invite) {
      return NextResponse.json(
        { error: 'Invalid or already used invite' },
        { status: 400 }
      );
    }

    // Mark as accepted
    const { error: updateError } = await supabaseAdmin
      .from('user_invites')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
        accepted_by_user_id: userId || null,
      })
      .eq('id', invite.id);

    if (updateError) {
      console.error('Error marking invite as accepted:', updateError);
      return NextResponse.json(
        { error: 'Failed to update invite' },
        { status: 500 }
      );
    }

    // Auto-confirm invited users so they skip the email confirmation step
    let autoConfirmed = false;
    if (userId) {
      const { error: confirmError } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        { email_confirm: true }
      );
      if (confirmError) {
        console.error('Failed to auto-confirm invited user:', confirmError);
      } else {
        autoConfirmed = true;
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Invite accepted',
      autoConfirmed,
    });
  } catch (e) {
    console.error('Error in invite accept POST:', e);
    return NextResponse.json(
      { error: 'Failed to process invite acceptance' },
      { status: 500 }
    );
  }
}
