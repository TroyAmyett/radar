import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, createAdminClient } from '@/lib/supabase/server';

// Supported API providers
const VALID_PROVIDERS = ['anthropic', 'google', 'openai'];

// Create a hint from an API key (show first 4 and last 4 chars)
function createKeyHint(key: string): string {
  if (key.length <= 8) return '****';
  return `${key.slice(0, 4)}...${key.slice(-4)}`;
}

export async function GET() {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('user_api_keys')
      .select('id, provider, key_hint, is_valid, last_used_at, created_at')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch API keys:', error);
      return NextResponse.json({ error: 'Failed to fetch API keys' }, { status: 500 });
    }

    return NextResponse.json({ keys: data || [] });
  } catch (error) {
    console.error('API keys GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { provider, apiKey } = body;

    // Validate input
    if (!provider || !VALID_PROVIDERS.includes(provider)) {
      return NextResponse.json({ error: 'Invalid provider' }, { status: 400 });
    }

    if (!apiKey || typeof apiKey !== 'string' || apiKey.length < 10) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 400 });
    }

    const adminClient = createAdminClient();

    // Check if user already has a key for this provider
    const { data: existing } = await adminClient
      .from('user_api_keys')
      .select('id')
      .eq('user_id', user.id)
      .eq('provider', provider)
      .is('deleted_at', null)
      .single();

    if (existing) {
      // Update existing key
      const { error: updateError } = await adminClient
        .from('user_api_keys')
        .update({
          encrypted_key: apiKey, // In production, this should be encrypted
          key_hint: createKeyHint(apiKey),
          is_valid: true, // Will be validated on first use
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);

      if (updateError) {
        console.error('Failed to update API key:', updateError);
        return NextResponse.json({ error: 'Failed to update API key' }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: 'API key updated' });
    }

    // Insert new key
    const { error: insertError } = await adminClient
      .from('user_api_keys')
      .insert({
        user_id: user.id,
        provider,
        encrypted_key: apiKey, // In production, this should be encrypted
        key_hint: createKeyHint(apiKey),
        is_valid: true, // Will be validated on first use
      });

    if (insertError) {
      console.error('Failed to save API key:', insertError);
      return NextResponse.json({ error: 'Failed to save API key' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'API key saved' });
  } catch (error) {
    console.error('API keys POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const keyId = searchParams.get('id');

    if (!keyId) {
      return NextResponse.json({ error: 'Key ID required' }, { status: 400 });
    }

    const adminClient = createAdminClient();

    // Soft delete the key (only if owned by user)
    const { error } = await adminClient
      .from('user_api_keys')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', keyId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Failed to delete API key:', error);
      return NextResponse.json({ error: 'Failed to delete API key' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'API key deleted' });
  } catch (error) {
    console.error('API keys DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
