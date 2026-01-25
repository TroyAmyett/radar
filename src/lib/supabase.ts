import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Client for browser (with RLS)
// Uses shared storage key for session sharing across all Funnelists apps
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storageKey: 'funnelists-auth', // Shared across all Funnelists apps
  },
});

// SSO: Check for session token passed from parent app (AgentPM) via URL hash
// This enables cross-subdomain authentication when Radar is embedded in AgentPM
if (typeof window !== 'undefined') {
  const hash = window.location.hash;
  if (hash.startsWith('#sso=')) {
    try {
      const encoded = hash.substring(5); // Remove '#sso='
      const decoded = atob(encoded);
      const params = new URLSearchParams(decoded);

      const access_token = params.get('access_token');
      const refresh_token = params.get('refresh_token');

      if (access_token && refresh_token) {
        // Set the session from the parent app
        supabase.auth.setSession({
          access_token,
          refresh_token,
        }).then(({ error }) => {
          if (error) {
            console.error('SSO session error:', error);
          } else {
            console.log('SSO session restored from parent app');
          }
          // Clear the hash to avoid token exposure in URL
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
        });
      }
    } catch (e) {
      console.error('Failed to parse SSO token:', e);
      // Clear invalid hash
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  }
}

// Server-side client that bypasses RLS
// Use this in API routes where you're already filtering by account_id
export const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceKey || supabaseAnonKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Default account UUID for Radar standalone app
// This UUID format is required because AgentPM migrated account_id columns to UUID type
const RADAR_DEFAULT_ACCOUNT_ID = '00000000-0000-0000-0000-000000000001';

// Helper function to get user's account ID (fallback only)
// API routes should prefer account_id from request body (passed by frontend)
export function getAccountId(): string {
  return RADAR_DEFAULT_ACCOUNT_ID;
}
