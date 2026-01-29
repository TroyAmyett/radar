import { createClient } from '@/lib/supabase/client';
import {
  isPlatformFunded,
  type SubscriptionTier,
  type SubscriptionStatus,
} from '@funnelists/auth';

// Re-export for backwards compatibility
export interface Subscription {
  id: string;
  account_id: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  current_period_end: string;
}

/**
 * Get the current user's subscription tier (client-side only)
 * This determines whether they need to provide their own API keys (BYOK)
 * or can use platform-provided keys
 */
export async function getCurrentSubscription(): Promise<Subscription> {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Not authenticated');
  }

  // Get user's current account (prefer primary, or first active)
  const { data: userAccounts, error: userAccountError } = await supabase
    .from('user_accounts')
    .select('account_id, is_primary')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('is_primary', { ascending: false })
    .limit(10);

  if (userAccountError || !userAccounts || userAccounts.length === 0) {
    throw new Error('No active account found');
  }

  // Use primary account if exists, otherwise first account
  const userAccount = userAccounts.find(a => a.is_primary) || userAccounts[0];

  // Get account's subscription
  const { data: subscription, error: subscriptionError } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('account_id', userAccount.account_id)
    .eq('status', 'active')
    .single();

  if (subscriptionError || !subscription) {
    // Default to free tier if no subscription found
    return {
      id: 'default',
      account_id: userAccount.account_id,
      tier: 'free',
      status: 'active',
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    };
  }

  return subscription as Subscription;
}

/**
 * Check if the user is on a tier that can use platform-provided API keys
 * Uses shared @funnelists/auth package
 */
export async function canUsePlatformKeys(): Promise<boolean> {
  const subscription = await getCurrentSubscription();
  return isPlatformFunded({
    account: {
      id: subscription.account_id,
      plan: subscription.tier,
    },
  });
}

/**
 * Check if the user is required to provide their own API keys
 */
export async function requiresBYOK(): Promise<boolean> {
  const canUse = await canUsePlatformKeys();
  return !canUse;
}
