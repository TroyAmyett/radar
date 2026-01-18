import { NextRequest, NextResponse } from 'next/server';
import { supabase, getAccountId } from '@/lib/supabase';
import { resend } from '@/lib/email/resend';
import crypto from 'crypto';

// Generate a secure random token
function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export async function POST(request: NextRequest) {
  const accountId = getAccountId();

  try {
    const body = await request.json();
    const { email, name, frequency = 'daily', topics, source } = body;

    // Validate email
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: 'Valid email address is required' },
        { status: 400 }
      );
    }

    // Check if email already exists
    const { data: existing } = await supabase
      .from('email_subscribers')
      .select('id, status')
      .eq('account_id', accountId)
      .eq('email', email.toLowerCase())
      .single();

    if (existing) {
      if (existing.status === 'confirmed') {
        return NextResponse.json(
          { error: 'This email is already subscribed' },
          { status: 400 }
        );
      }

      // Resend confirmation for pending subscribers
      if (existing.status === 'pending') {
        const confirmationToken = generateToken();

        await supabase
          .from('email_subscribers')
          .update({ confirmation_token: confirmationToken })
          .eq('id', existing.id);

        // Send confirmation email
        await sendConfirmationEmail(email, name || 'Subscriber', confirmationToken);

        return NextResponse.json({
          success: true,
          message: 'Confirmation email resent',
        });
      }

      // Resubscribe unsubscribed users
      if (existing.status === 'unsubscribed') {
        const confirmationToken = generateToken();
        const unsubscribeToken = generateToken();

        await supabase
          .from('email_subscribers')
          .update({
            status: 'pending',
            confirmation_token: confirmationToken,
            unsubscribe_token: unsubscribeToken,
            name,
            frequency,
            topics,
            source,
            unsubscribed_at: null,
          })
          .eq('id', existing.id);

        await sendConfirmationEmail(email, name || 'Subscriber', confirmationToken);

        return NextResponse.json({
          success: true,
          message: 'Confirmation email sent',
        });
      }
    }

    // Create new subscriber
    const confirmationToken = generateToken();
    const unsubscribeToken = generateToken();

    const { data: subscriber, error } = await supabase
      .from('email_subscribers')
      .insert({
        account_id: accountId,
        email: email.toLowerCase(),
        name,
        status: 'pending',
        frequency,
        topics,
        source,
        confirmation_token: confirmationToken,
        unsubscribe_token: unsubscribeToken,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating subscriber:', error);
      return NextResponse.json(
        { error: 'Failed to create subscription' },
        { status: 500 }
      );
    }

    // Send confirmation email
    await sendConfirmationEmail(email, name || 'Subscriber', confirmationToken);

    return NextResponse.json({
      success: true,
      message: 'Confirmation email sent',
      subscriber: {
        id: subscriber.id,
        email: subscriber.email,
        status: subscriber.status,
      },
    });
  } catch (error) {
    console.error('Error in subscriber endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to process subscription' },
      { status: 500 }
    );
  }
}

async function sendConfirmationEmail(
  email: string,
  name: string,
  token: string
): Promise<void> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const confirmUrl = `${baseUrl}/api/subscribers/confirm?token=${token}`;

  await resend.emails.send({
    from: 'Radar <noreply@go.funnelists.com>',
    to: email,
    subject: 'Confirm your subscription to Radar',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0a0a0f;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="text-align: center; margin-bottom: 32px;">
              <h1 style="color: #0ea5e9; font-size: 28px; font-weight: bold; margin: 0; letter-spacing: 4px;">RADAR</h1>
            </div>

            <div style="background: rgba(255, 255, 255, 0.05); border-radius: 12px; padding: 32px; border: 1px solid rgba(255, 255, 255, 0.1);">
              <h2 style="color: #ffffff; font-size: 24px; margin: 0 0 16px 0;">Confirm your subscription</h2>

              <p style="color: rgba(255, 255, 255, 0.7); font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                Hi ${name},<br><br>
                Thank you for subscribing to Radar! Click the button below to confirm your email address and start receiving curated content digests.
              </p>

              <a href="${confirmUrl}" style="display: inline-block; background-color: #0ea5e9; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px;">
                Confirm Subscription
              </a>

              <p style="color: rgba(255, 255, 255, 0.4); font-size: 14px; margin: 24px 0 0 0;">
                If you didn&apos;t request this subscription, you can safely ignore this email.
              </p>
            </div>

            <div style="text-align: center; margin-top: 32px;">
              <p style="color: rgba(255, 255, 255, 0.3); font-size: 12px; margin: 0;">
                &copy; ${new Date().getFullYear()} Radar. All rights reserved.
              </p>
            </div>
          </div>
        </body>
      </html>
    `,
  });
}

// GET endpoint to list subscribers (admin only)
export async function GET() {
  const accountId = getAccountId();

  const { data, error } = await supabase
    .from('email_subscribers')
    .select('*')
    .eq('account_id', accountId)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
