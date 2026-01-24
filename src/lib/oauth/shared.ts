import { createClient } from '@/lib/supabase/client';

export type OAuthProvider = 'twitter' | 'linkedin';

export interface OAuthConnection {
  id: string;
  provider: OAuthProvider;
  provider_username: string;
  is_active: boolean;
  created_at: string;
}

/**
 * Get all OAuth connections for the current user
 * Connections are shared across all Funnelists products
 */
export async function getOAuthConnections(): Promise<OAuthConnection[]> {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('oauth_connections')
    .select('id, provider, provider_username, is_active, created_at')
    .eq('user_id', user.id)
    .eq('is_active', true);

  if (error) {
    console.error('Failed to get OAuth connections:', error);
    return [];
  }

  return data || [];
}

/**
 * Check if a specific provider is connected
 */
export async function isOAuthConnected(provider: OAuthProvider): Promise<boolean> {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase
    .from('oauth_connections')
    .select('id')
    .eq('user_id', user.id)
    .eq('provider', provider)
    .eq('is_active', true)
    .single();

  return !!data;
}

/**
 * Get OAuth connection for posting (includes encrypted tokens)
 * Used by posting services to publish content
 */
export async function getOAuthConnection(provider: OAuthProvider): Promise<{
  access_token: string;
  refresh_token?: string;
} | null> {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('oauth_connections')
    .select('access_token, refresh_token')
    .eq('user_id', user.id)
    .eq('provider', provider)
    .eq('is_active', true)
    .single();

  return data;
}

/**
 * Disconnect an OAuth connection
 * Marks the connection as inactive instead of deleting
 */
export async function disconnectOAuth(provider: OAuthProvider): Promise<void> {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('oauth_connections')
    .update({ is_active: false })
    .eq('user_id', user.id)
    .eq('provider', provider);

  if (error) {
    throw new Error(`Failed to disconnect ${provider}: ${error.message}`);
  }
}
