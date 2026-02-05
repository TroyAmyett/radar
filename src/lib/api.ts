import { supabase } from '@/lib/supabase';

/**
 * Authenticated fetch wrapper.
 * Reads the current Supabase session and attaches the access token
 * as an Authorization header so server-side API routes can authenticate
 * without relying on cookie timing/sync.
 */
export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const { data: { session } } = await supabase.auth.getSession();

  const headers = new Headers(options.headers);
  if (session?.access_token) {
    headers.set('Authorization', `Bearer ${session.access_token}`);
  }

  return fetch(url, { ...options, headers });
}
