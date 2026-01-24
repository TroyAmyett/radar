import { getCurrentSubscription } from './subscription';
import { createClient } from '@/lib/supabase/client';

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
 * Get an API key for the specified provider
 * Uses tier-based logic:
 * - Beta/Trial/Demo/Free: Use platform keys
 * - Paying tiers: Require BYOK from AgentPM
 */
export async function getApiKey(provider: AIProvider): Promise<string> {
  // Get user's subscription tier
  const subscription = await getCurrentSubscription();

  // Beta, Trial, Demo, Free accounts can use platform keys
  if (PLATFORM_KEY_TIERS.includes(subscription.tier)) {
    const platformKey = process.env[`${provider.toUpperCase()}_API_KEY`];
    if (platformKey) {
      return platformKey;
    }
  }

  // Paying customers must use BYOK
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Please sign in to use Radar');
  }

  // Fetch user's BYOK key from AgentPM
  const response = await fetch(`${AGENTPM_URL}/api/keys/get`, {
    method: 'POST',
    credentials: 'include', // Send session cookie
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider })
  });

  if (!response.ok) {
    throw new Error(`Failed to retrieve ${provider} API key`);
  }

  const { key } = await response.json();

  if (!key) {
    throw new Error(
      `Please configure your ${provider} API key in Settings. ` +
      `As a ${subscription.tier} tier user, you need to bring your own API key.`
    );
  }

  return key;
}

/**
 * Get key status for UI display
 * Shows whether a key is configured and where it comes from
 */
export async function getKeyStatus(provider: AIProvider): Promise<KeyStatus> {
  const subscription = await getCurrentSubscription();
  const isPlatformTier = PLATFORM_KEY_TIERS.includes(subscription.tier);

  // Platform tiers can use platform keys
  if (isPlatformTier && process.env[`${provider.toUpperCase()}_API_KEY`]) {
    return {
      configured: true,
      source: 'platform',
      required: false
    };
  }

  // Check if user has BYOK configured
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return {
      configured: false,
      source: 'none',
      required: !isPlatformTier
    };
  }

  try {
    const response = await fetch(`${AGENTPM_URL}/api/keys/status?provider=${provider}`, {
      credentials: 'include'
    });

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
