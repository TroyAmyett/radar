import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, getAccountId } from '@/lib/supabase';

export async function GET() {
  const accountId = getAccountId();

  const { data, error } = await supabaseAdmin
    .from('user_preferences')
    .select('*')
    .eq('account_id', accountId)
    .single();

  if (error && error.code !== 'PGRST116') {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Return default preferences if none exist
  // digest_timezone is null to let client use browser detection
  // onboarding_complete is false if no preferences saved yet
  if (!data) {
    return NextResponse.json({
      digest_enabled: true,
      digest_frequency: 'daily',
      digest_time: '06:00:00',
      digest_timezone: null,
      digest_topics: [],
      email_address: null,
      onboarding_complete: false,
    });
  }

  // If preferences exist with a timezone, onboarding is complete
  return NextResponse.json({
    ...data,
    onboarding_complete: !!data.digest_timezone,
  });
}

export async function POST(request: NextRequest) {
  const accountId = getAccountId();
  const body = await request.json();

  // Check if preferences exist
  const { data: existing } = await supabaseAdmin
    .from('user_preferences')
    .select('id')
    .eq('account_id', accountId)
    .single();

  if (existing) {
    // Update existing
    const { data, error } = await supabaseAdmin
      .from('user_preferences')
      .update({
        digest_enabled: body.digest_enabled,
        digest_frequency: body.digest_frequency,
        digest_time: body.digest_time,
        digest_timezone: body.digest_timezone,
        digest_topics: body.digest_topics,
        email_address: body.email_address,
      })
      .eq('id', existing.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } else {
    // Insert new
    const { data, error } = await supabaseAdmin
      .from('user_preferences')
      .insert({
        account_id: accountId,
        digest_enabled: body.digest_enabled,
        digest_frequency: body.digest_frequency,
        digest_time: body.digest_time,
        digest_timezone: body.digest_timezone,
        digest_topics: body.digest_topics,
        email_address: body.email_address,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  }
}
