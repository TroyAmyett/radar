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
