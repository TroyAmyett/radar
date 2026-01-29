import { createServerClient, createAdminClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export interface AuthResult {
  accountId: string;
  userId: string;
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

/**
 * Resolve the current user's account_id from their session cookie.
 * If the user has no account (new Radar signup), auto-provisions one.
 */
export async function resolveAuth(): Promise<AuthResult | null> {
  const supabase = await createServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  const adminClient = createAdminClient();

  // Query user_accounts for this user's active account
  const { data: userAccounts } = await adminClient
    .from('user_accounts')
    .select('account_id, is_primary')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('is_primary', { ascending: false })
    .limit(10);

  if (userAccounts && userAccounts.length > 0) {
    const account = userAccounts.find((a: { is_primary: boolean }) => a.is_primary) || userAccounts[0];
    return { accountId: account.account_id, userId: user.id };
  }

  // No account found — auto-provision for new Radar signups
  const { data: newAccount, error: accountError } = await adminClient
    .from('accounts')
    .insert({
      name: user.user_metadata?.name || user.email || 'Radar User',
      slug: `radar-${user.id.substring(0, 8)}`,
      plan: 'free',
      status: 'active',
      created_by: user.id,
      created_by_type: 'user',
    })
    .select('id')
    .single();

  if (accountError || !newAccount) {
    console.error('Failed to create account:', accountError);
    return null;
  }

  // Link user to the new account
  await adminClient
    .from('user_accounts')
    .insert({
      user_id: user.id,
      account_id: newAccount.id,
      is_primary: true,
      status: 'active',
      role: 'owner',
    });

  return { accountId: newAccount.id, userId: user.id };
}

/**
 * Resolve auth or throw AuthError. Use as the first call in user-facing API routes.
 */
export async function requireAuth(): Promise<AuthResult> {
  const auth = await resolveAuth();
  if (!auth) {
    throw new AuthError('Unauthorized');
  }
  return auth;
}

/**
 * Standard 401 response.
 */
export function unauthorizedResponse() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
