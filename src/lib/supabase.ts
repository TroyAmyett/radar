import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Client for browser (with RLS)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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

// Helper function to get user's account ID (for now, using a default)
export function getAccountId(): string {
  // In a full implementation, this would come from authentication
  return RADAR_DEFAULT_ACCOUNT_ID;
}
