import { createServerClient } from '@/lib/supabase/server';

const AGENTPM_URL = process.env.NEXT_PUBLIC_AGENTPM_URL || 'https://agentpm.funnelists.com';

// Tiers that can use platform-provided keys
const PLATFORM_KEY_TIERS = ['beta', 'trial', 'demo', 'free'];

export type AIProvider = 'anthropic' | 'gemini';

export interface KeyStatus {
  configured: boolean;
  source: 'platform' | 'byok' | 'none';
  required: boolean;
  keyHint?: string;
}

/**
 * Get an API key for the specified provider (server-side only)
 * Uses tier-based logic:
 * - Beta/Trial/Demo/Free: Use platform keys
 * - Paying tiers: Require BYOK from AgentPM
 */
export async function getApiKey(provider: AIProvider): Promise<string> {
  // First, try platform key (works for beta/trial/demo/free users)
  const platformKey = process.env[`${provider.toUpperCase()}_API_KEY`];

  // Get user's subscription tier to determine if they can use platform keys
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    // No user session - if platform key exists, use it (for cron jobs, etc)
    if (platformKey) {
      return platformKey;
    }
    throw new Error('Please sign in to use Radar');
  }

  // Get user's subscription tier
  const { data: userAccounts } = await supabase
    .from('user_accounts')
    .select('account_id, is_primary')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('is_primary', { ascending: false })
    .limit(10);

  if (!userAccounts || userAccounts.length === 0) {
    // No account found - use platform key if available
    if (platformKey) {
      return platformKey;
    }
    throw new Error('No active account found');
  }

  const userAccount = userAccounts.find(a => a.is_primary) || userAccounts[0];

  // Get subscription
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('tier')
    .eq('account_id', userAccount.account_id)
    .eq('status', 'active')
    .single();

  const tier = subscription?.tier || 'free';

  // Platform tier users can use platform keys
  if (PLATFORM_KEY_TIERS.includes(tier) && platformKey) {
    return platformKey;
  }

  // Paying customers must use BYOK
  // Fetch user's BYOK key from AgentPM
  const response = await fetch(`${AGENTPM_URL}/api/keys/get`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider, userId: user.id })
  });

  if (!response.ok) {
    throw new Error(`Failed to retrieve ${provider} API key`);
  }

  const { key } = await response.json();

  if (!key) {
    throw new Error(
      `Please configure your ${provider} API key in Settings. ` +
      `As a ${tier} tier user, you need to bring your own API key.`
    );
  }

  return key;
}

/**
 * Get key status for UI display (server-side only)
 * Shows whether a key is configured and where it comes from
 */
export async function getKeyStatus(provider: AIProvider): Promise<KeyStatus> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return {
      configured: false,
      source: 'none',
      required: true
    };
  }

  // Get user's subscription tier
  const { data: userAccounts } = await supabase
    .from('user_accounts')
    .select('account_id, is_primary')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('is_primary', { ascending: false })
    .limit(10);

  const userAccount = userAccounts?.find(a => a.is_primary) || userAccounts?.[0];

  let tier = 'free';
  if (userAccount) {
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('tier')
      .eq('account_id', userAccount.account_id)
      .eq('status', 'active')
      .single();
    tier = subscription?.tier || 'free';
  }

  const isPlatformTier = PLATFORM_KEY_TIERS.includes(tier);

  // Platform tiers can use platform keys
  if (isPlatformTier && process.env[`${provider.toUpperCase()}_API_KEY`]) {
    return {
      configured: true,
      source: 'platform',
      required: false
    };
  }

  // Check if user has BYOK configured
  try {
    const response = await fetch(`${AGENTPM_URL}/api/keys/status?provider=${provider}&userId=${user.id}`);

    if (response.ok) {
      const data = await response.json();
      return {
        configured: data.configured || false,
        source: data.configured ? 'byok' : 'none',
        required: !isPlatformTier,
        keyHint: data.keyHint
      };
    }
  } catch (error) {
    console.error(`Failed to check ${provider} key status:`, error);
  }

  return {
    configured: false,
    source: 'none',
    required: !isPlatformTier
  };
}
