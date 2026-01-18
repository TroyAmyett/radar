import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.redirect(new URL('/subscribe/error?reason=missing-token', request.url));
  }

  try {
    // Find subscriber by confirmation token
    const { data: subscriber, error } = await supabase
      .from('email_subscribers')
      .select('id, status')
      .eq('confirmation_token', token)
      .single();

    if (error || !subscriber) {
      return NextResponse.redirect(new URL('/subscribe/error?reason=invalid-token', request.url));
    }

    if (subscriber.status === 'confirmed') {
      return NextResponse.redirect(new URL('/subscribe/already-confirmed', request.url));
    }

    // Confirm the subscription
    await supabase
      .from('email_subscribers')
      .update({
        status: 'confirmed',
        confirmed_at: new Date().toISOString(),
        confirmation_token: null, // Clear the token after use
      })
      .eq('id', subscriber.id);

    return NextResponse.redirect(new URL('/subscribe/success', request.url));
  } catch (error) {
    console.error('Error confirming subscription:', error);
    return NextResponse.redirect(new URL('/subscribe/error?reason=server-error', request.url));
  }
}
