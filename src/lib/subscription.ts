import { createClient } from '@/lib/supabase/client';

export interface Subscription {
  id: string;
  account_id: string;
  tier: 'beta' | 'trial' | 'demo' | 'free' | 'friends_family' | 'starter' | 'pro' | 'business' | 'enterprise';
  status: 'active' | 'trialing' | 'past_due' | 'canceled';
  current_period_end: string;
}

/**
 * Get the current user's subscription tier
 * This determines whether they need to provide their own API keys (BYOK)
 * or can use platform-provided keys
 */
export async function getCurrentSubscription(): Promise<Subscription> {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Not authenticated');
  }

  // Get user's current account
  const { data: userAccount, error: userAccountError } = await supabase
    .from('user_accounts')
    .select('account_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single();

  if (userAccountError || !userAccount) {
    throw new Error('No active account found');
  }

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
 */
export async function canUsePlatformKeys(): Promise<boolean> {
  const subscription = await getCurrentSubscription();
  const platformTiers = ['beta', 'trial', 'demo', 'free'];
  return platformTiers.includes(subscription.tier);
}

/**
 * Check if the user is required to provide their own API keys
 */
export async function requiresBYOK(): Promise<boolean> {
  const canUseplatform = await canUsePlatformKeys();
  return !canUseplatform;
}
