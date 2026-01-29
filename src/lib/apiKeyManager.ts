import { createServerClient } from '@/lib/supabase/server';
import {
  resolveApiKey,
  getApiKeyStatus,
  type AuthContext,
  type AIProvider as SharedAIProvider,
  AGENTPM_URLS,
} from '@funnelists/auth';

const AGENTPM_URL = process.env.NEXT_PUBLIC_AGENTPM_URL || AGENTPM_URLS.production;

// Re-export for backwards compatibility
export type AIProvider = 'anthropic' | 'gemini';

export interface KeyStatus {
  configured: boolean;
  source: 'platform' | 'byok' | 'none';
  required: boolean;
  keyHint?: string;
}

/**
 * Build auth context from Supabase user data (server-side)
 */
async function buildServerAuthContext(): Promise<AuthContext & { platformKey?: string }> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { userId: undefined };
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
    return { userId: user.id };
  }

  const userAccount = userAccounts.find(a => a.is_primary) || userAccounts[0];

  // Get subscription
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('id, tier, status, account_id')
    .eq('account_id', userAccount.account_id)
    .eq('status', 'active')
    .single();

  // Get account details
  const { data: account } = await supabase
    .from('accounts')
    .select('id, slug')
    .eq('id', userAccount.account_id)
    .single();

  return {
    userId: user.id,
    account: account ? {
      id: account.id,
      slug: account.slug,
      plan: subscription?.tier || 'free',
    } : null,
    subscription: subscription ? {
      id: subscription.id,
      account_id: subscription.account_id,
      tier: subscription.tier,
      status: subscription.status,
    } : null,
  };
}

/**
 * Get an API key for the specified provider (server-side only)
 * Uses shared @funnelists/auth package for tier-based logic:
 * - Beta/Trial/Demo/Free: Use platform keys
 * - Paying tiers: Require BYOK from AgentPM
 */
export async function getApiKey(provider: AIProvider): Promise<string> {
  const platformKey = process.env[`${provider.toUpperCase()}_API_KEY`];
  const context = await buildServerAuthContext();

  // No user session - if platform key exists, use it (for cron jobs, etc)
  if (!context.userId) {
    if (platformKey) {
      return platformKey;
    }
    throw new Error('Please sign in to use Radar');
  }

  // Use shared resolver
  const result = await resolveApiKey({
    provider: provider as SharedAIProvider,
    context,
    config: {
      agentpmUrl: AGENTPM_URL,
      platformKeys: {
        anthropic: process.env.ANTHROPIC_API_KEY,
        gemini: process.env.GEMINI_API_KEY,
      },
    },
  });

  if (result.key) {
    return result.key;
  }

  throw new Error(result.error || `Failed to retrieve ${provider} API key`);
}

/**
 * Get key status for UI display (server-side only)
 * Shows whether a key is configured and where it comes from
 * Uses shared @funnelists/auth package
 */
export async function getKeyStatus(provider: AIProvider): Promise<KeyStatus> {
  const context = await buildServerAuthContext();

  if (!context.userId) {
    return {
      configured: false,
      source: 'none',
      required: true
    };
  }

  // Use shared status checker
  const status = await getApiKeyStatus(
    provider as SharedAIProvider,
    context,
    {
      agentpmUrl: AGENTPM_URL,
      platformKeys: {
        anthropic: process.env.ANTHROPIC_API_KEY,
        gemini: process.env.GEMINI_API_KEY,
      },
    }
  );

  return {
    configured: status.isConfigured,
    source: status.source,
    required: status.required,
    keyHint: status.keyHint,
  };
}
