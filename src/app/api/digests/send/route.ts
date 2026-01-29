import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { resolveAuth, unauthorizedResponse } from '@/lib/auth';
import { sendDigestEmail } from '@/lib/email/resend';
import { format } from 'date-fns';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { type = 'morning', html, email, account_id } = body;
  let accountId: string;
  if (account_id) {
    accountId = account_id;
  } else {
    const auth = await resolveAuth();
    if (!auth) return unauthorizedResponse();
    accountId = auth.accountId;
  }

  if (!html || !email) {
    return NextResponse.json(
      { error: 'html and email are required' },
      { status: 400 }
    );
  }

  try {
    const today = new Date();
    let subject = '';

    if (type === 'morning') {
      subject = `Your Radar Morning Digest - ${format(today, 'MMMM d, yyyy')}`;
    } else if (type === 'weekly') {
      subject = `Your Radar Weekly Digest - Week of ${format(today, 'MMMM d, yyyy')}`;
    }

    const emailId = await sendDigestEmail({
      to: email,
      subject,
      html,
    });

    // Log to digest history
    await supabase.from('digest_history').insert({
      account_id: accountId,
      digest_type: type,
      email_id: emailId,
    });

    return NextResponse.json({
      success: true,
      emailId,
    });
  } catch (error) {
    console.error('Failed to send digest:', error);
    return NextResponse.json(
      { error: 'Failed to send digest' },
      { status: 500 }
    );
  }
}
