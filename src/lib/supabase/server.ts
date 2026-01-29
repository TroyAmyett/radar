import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

// Create a server-side Supabase client that respects RLS
export async function createServerClient() {
  const cookieStore = await cookies();

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
      global: {
        headers: {
          cookie: cookieStore.toString(),
        },
      },
    }
  );

  // Get tokens from the auth cookie (set by dual storage adapter in supabase.ts)
  const authCookie = cookieStore.get('funnelists-auth-tokens') || cookieStore.get('funnelists-auth');
  if (authCookie) {
    try {
      const decoded = decodeURIComponent(authCookie.value);
      const session = JSON.parse(decoded);
      if (session?.access_token) {
        await supabase.auth.setSession({
          access_token: session.access_token,
          refresh_token: session.refresh_token || '',
        });
      }
    } catch {
      // Invalid session cookie, continue without auth
    }
  }

  return supabase;
}

// Admin client that bypasses RLS (use carefully)
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
