import { NextRequest, NextResponse } from 'next/server';
import { sendWelcomeEmail } from '@/lib/email/resend';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, name } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Determine the login URL based on environment
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://radar.funnelists.com';
    const loginUrl = `${baseUrl}/login`;

    const emailId = await sendWelcomeEmail({
      to: email,
      userName: name,
      loginUrl,
    });

    if (!emailId) {
      return NextResponse.json(
        { error: 'Failed to send welcome email' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      emailId,
    });
  } catch (error) {
    console.error('Failed to send welcome email:', error);
    return NextResponse.json(
      { error: 'Failed to send welcome email' },
      { status: 500 }
    );
  }
}
