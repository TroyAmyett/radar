import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Dual storage: writes to both localStorage (SSO compat) and cookies (server access)
// Only stores tokens in the cookie (not the full session) to stay under 4KB limit
const AUTH_COOKIE_KEY = 'funnelists-auth-tokens';
const dualStorage = {
  getItem: (key: string) => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(key);
    }
    return null;
  },
  setItem: (key: string, value: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(key, value);
      // Extract only tokens for the cookie (full session is too large)
      try {
        const session = JSON.parse(value);
        if (session?.access_token) {
          const tokens = JSON.stringify({
            access_token: session.access_token,
            refresh_token: session.refresh_token || '',
          });
          document.cookie = `${AUTH_COOKIE_KEY}=${encodeURIComponent(tokens)}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
        }
      } catch {
        // Not a session value, skip cookie
      }
    }
  },
  removeItem: (key: string) => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(key);
      document.cookie = `${AUTH_COOKIE_KEY}=; path=/; max-age=0; SameSite=Lax`;
    }
  },
};

// Client for browser (with RLS)
// Uses shared storage key for session sharing across all Funnelists apps
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storageKey: 'funnelists-auth', // Shared across all Funnelists apps
    storage: dualStorage,
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
