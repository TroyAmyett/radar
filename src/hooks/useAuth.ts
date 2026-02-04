'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isSuperAdmin: boolean;
}

interface SignInCredentials {
  email: string;
  password: string;
}

interface SignUpCredentials {
  email: string;
  password: string;
  name?: string;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    isSuperAdmin: false,
  });

  // Fetch user profile to get is_super_admin status
  const fetchProfile = useCallback(async (accessToken: string) => {
    try {
      const res = await fetch('/api/profile', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      if (res.ok) {
        const profile = await res.json();
        setState((prev) => ({
          ...prev,
          isSuperAdmin: profile.is_super_admin ?? false,
        }));
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    }
  }, []);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setState((prev) => ({
          ...prev,
          user: session.user ?? null,
          session,
          loading: false,
        }));
        if (session.user && session.access_token) {
          fetchProfile(session.access_token);
        }
        return;
      }

      // No session in localStorage — try bootstrapping from the auth cookie.
      // After email confirmation, the server callback sets funnelists-auth-tokens
      // but the client-side localStorage is empty until we hydrate it here.
      try {
        const match = document.cookie.match(/funnelists-auth-tokens=([^;]+)/);
        if (match) {
          const tokens = JSON.parse(decodeURIComponent(match[1]));
          if (tokens?.access_token && tokens?.refresh_token) {
            supabase.auth.setSession({
              access_token: tokens.access_token,
              refresh_token: tokens.refresh_token,
            }).then(({ data: { session: bootstrapped } }) => {
              setState((prev) => ({
                ...prev,
                user: bootstrapped?.user ?? null,
                session: bootstrapped,
                loading: false,
              }));
              if (bootstrapped?.user && bootstrapped.access_token) {
                fetchProfile(bootstrapped.access_token);
              }
            }).catch(() => {
              setState((prev) => ({ ...prev, loading: false }));
            });
            return; // Wait for setSession to resolve
          }
        }
      } catch { /* cookie parse failed */ }

      // No session anywhere
      setState((prev) => ({ ...prev, loading: false }));
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setState((prev) => ({
          ...prev,
          user: session?.user ?? null,
          session,
          loading: false,
          isSuperAdmin: session?.user ? prev.isSuperAdmin : false,
        }));
        // Fetch profile if user logged in
        if (session?.user && session.access_token) {
          fetchProfile(session.access_token);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signIn = useCallback(async ({ email, password }: SignInCredentials) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw error;
    }

    return data;
  }, []);

  const signUp = useCallback(async ({ email, password, name }: SignUpCredentials) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      throw error;
    }

    return data;
  }, []);

  const signOut = useCallback(async () => {
    // Clear per-session onboarding cache so a different user gets their own check
    try { localStorage.removeItem('radar_onboarding_complete'); } catch { /* */ }

    const { error } = await supabase.auth.signOut();

    if (error) {
      throw error;
    }
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      throw error;
    }
  }, []);

  const resendConfirmation = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      throw error;
    }
  }, []);

  return {
    user: state.user,
    session: state.session,
    loading: state.loading,
    isSuperAdmin: state.isSuperAdmin,
    signIn,
    signUp,
    signOut,
    resetPassword,
    resendConfirmation,
  };
}
