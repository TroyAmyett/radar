import { createServerClient as createSSRServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies, headers } from 'next/headers';

// Create a server-side Supabase client that respects RLS.
//
// Auth resolution priority:
// 1. Authorization header (sent by authFetch on every client API call)
// 2. @supabase/ssr managed cookies (sb-* cookies set during auth callback)
// 3. Legacy funnelists-auth-tokens cookie (set by dual storage adapter for password logins)
export async function createServerClient() {
  const cookieStore = await cookies();
  const headerStore = await headers();

  // 1. Authorization header — most reliable for client-side API calls.
  //    authFetch() reads the access token from the Supabase client session
  //    and passes it directly, bypassing cookie timing issues entirely.
  const authHeader = headerStore.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const accessToken = authHeader.substring(7);
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false,
        },
      }
    );
    await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: '',
    });
    return supabase;
  }

  // 2. @supabase/ssr — handles Supabase's own sb-* cookies automatically.
  //    These cookies are set by the auth callback (src/app/auth/callback/route.ts)
  //    during OAuth and email confirmation flows.
  const supabase = createSSRServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll may fail in read-only Server Component context
          }
        },
      },
    }
  );

  // 3. Legacy fallback — for password logins where only the dual storage
  //    adapter set the funnelists-auth-tokens cookie (no sb-* cookies).
  //    Only attempt this if @supabase/ssr didn't find its own cookies.
  const hasSbCookies = cookieStore.getAll().some(c => c.name.startsWith('sb-'));
  if (!hasSbCookies) {
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
