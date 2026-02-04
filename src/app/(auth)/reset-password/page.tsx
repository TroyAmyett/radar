'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Radio, Lock, Loader2, ArrowLeft, CheckCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const [waiting, setWaiting] = useState(true);

  // Detect recovery params from URL hash (client-side only to avoid hydration mismatch)
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes('type=recovery') || hash.includes('type=magiclink')) {
      setIsRecovery(true);
      setWaiting(false);
    }
  }, []);

  // Listen for PASSWORD_RECOVERY event from Supabase
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecovery(true);
        setWaiting(false);
      }
    });

    // Also check if we already have a session (in case the event fired before mount)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setIsRecovery(true);
        setWaiting(false);
      }
    });

    // Timeout: stop waiting after 3 seconds (fallback for edge cases)
    const timeout = setTimeout(() => {
      setWaiting(false);
    }, 3000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        throw updateError;
      }

      setSuccess(true);
      // Redirect to login after success
      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (waiting) {
    return (
      <div className="w-full max-w-md flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
        <p className="text-white/60 text-sm">Verifying reset link...</p>
      </div>
    );
  }

  // Invalid / expired link
  if (!isRecovery && !success) {
    return (
      <div className="w-full max-w-md">
        <div className="glass-card p-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-8">
            <Radio className="w-10 h-10 text-accent" />
            <span className="text-2xl font-bold">Radar</span>
          </div>

          <h1 className="text-xl font-semibold mb-2">Invalid or Expired Link</h1>
          <p className="text-white/60 mb-6">
            This password reset link is invalid or has expired. Please request a new one.
          </p>

          <Link
            href="/forgot-password"
            className="inline-flex items-center gap-2 text-accent hover:text-accent/80 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Request new reset link
          </Link>
        </div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="w-full max-w-md">
        <div className="glass-card p-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-8">
            <Radio className="w-10 h-10 text-accent" />
            <span className="text-2xl font-bold">Radar</span>
          </div>

          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-green-500/20 flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>

          <h1 className="text-xl font-semibold mb-2">Password Updated</h1>
          <p className="text-white/60 mb-6">
            Your password has been updated successfully. Redirecting to sign in...
          </p>
        </div>
      </div>
    );
  }

  // Reset form
  return (
    <div className="w-full max-w-md">
      <div className="glass-card p-8">
        <div className="flex items-center justify-center gap-3 mb-8">
          <Radio className="w-10 h-10 text-accent" />
          <span className="text-2xl font-bold">Radar</span>
        </div>

        <h1 className="text-xl font-semibold text-center mb-2">Set new password</h1>
        <p className="text-white/60 text-center mb-8">
          Enter your new password below
        </p>

        {error && (
          <div className="mb-6 p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-white/70 mb-2">
              New Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="glass-input w-full pl-10"
                placeholder="Enter new password"
                required
                minLength={6}
              />
            </div>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-white/70 mb-2">
              Confirm Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="glass-input w-full pl-10"
                placeholder="Confirm new password"
                required
                minLength={6}
              />
            </div>
            {confirmPassword && password !== confirmPassword && (
              <p className="text-red-400 text-xs mt-1">Passwords do not match</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || password !== confirmPassword || password.length < 6}
            className="w-full flex items-center justify-center gap-2 bg-accent hover:bg-accent/90 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              'Update Password'
            )}
          </button>
        </form>

        <p className="mt-6 text-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-accent hover:text-accent/80 transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
