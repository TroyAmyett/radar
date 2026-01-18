import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.redirect(new URL('/unsubscribe/error?reason=missing-token', request.url));
  }

  try {
    // Find subscriber by unsubscribe token
    const { data: subscriber, error } = await supabase
      .from('email_subscribers')
      .select('id, status, email')
      .eq('unsubscribe_token', token)
      .single();

    if (error || !subscriber) {
      return NextResponse.redirect(new URL('/unsubscribe/error?reason=invalid-token', request.url));
    }

    if (subscriber.status === 'unsubscribed') {
      return NextResponse.redirect(new URL('/unsubscribe/already-unsubscribed', request.url));
    }

    // Unsubscribe
    await supabase
      .from('email_subscribers')
      .update({
        status: 'unsubscribed',
        unsubscribed_at: new Date().toISOString(),
      })
      .eq('id', subscriber.id);

    return NextResponse.redirect(new URL('/unsubscribe/success', request.url));
  } catch (error) {
    console.error('Error unsubscribing:', error);
    return NextResponse.redirect(new URL('/unsubscribe/error?reason=server-error', request.url));
  }
}
