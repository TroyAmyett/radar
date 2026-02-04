import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth, AuthError, unauthorizedResponse } from '@/lib/auth';

export async function GET() {
  try {
    const { accountId } = await requireAuth();

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

    // If a preferences row exists, onboarding has been completed
    return NextResponse.json({
      ...data,
      onboarding_complete: true,
    });
  } catch (e) {
    if (e instanceof AuthError) return unauthorizedResponse();
    throw e;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { accountId } = await requireAuth();
    const body = await request.json();

    // Check if preferences exist
    const { data: existing } = await supabaseAdmin
      .from('user_preferences')
      .select('id')
      .eq('account_id', accountId)
      .single();

    if (existing) {
      // Update existing — only include fields that were explicitly provided
      const updateFields: Record<string, unknown> = {};
      if ('digest_enabled' in body) updateFields.digest_enabled = body.digest_enabled;
      if ('digest_frequency' in body) updateFields.digest_frequency = body.digest_frequency;
      if ('digest_time' in body) updateFields.digest_time = body.digest_time;
      if ('digest_timezone' in body) updateFields.digest_timezone = body.digest_timezone;
      if ('digest_topics' in body) updateFields.digest_topics = body.digest_topics;
      if ('email_address' in body) updateFields.email_address = body.email_address;

      const { data, error } = await supabaseAdmin
        .from('user_preferences')
        .update(updateFields)
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
  } catch (e) {
    if (e instanceof AuthError) return unauthorizedResponse();
    throw e;
  }
}
