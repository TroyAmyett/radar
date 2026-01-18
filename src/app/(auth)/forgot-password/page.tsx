'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Radio, Mail, ArrowRight, Loader2, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { resetPassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await resetPassword(email);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="w-full max-w-md">
        <div className="glass-card p-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-8">
            <Radio className="w-10 h-10 text-accent" />
            <span className="text-2xl font-bold">Radar</span>
          </div>

          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-green-500/20 flex items-center justify-center">
            <Mail className="w-8 h-8 text-green-400" />
          </div>

          <h1 className="text-xl font-semibold mb-2">Check your email</h1>
          <p className="text-white/60 mb-6">
            We&apos;ve sent a password reset link to <strong className="text-white">{email}</strong>
          </p>

          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-accent hover:text-accent/80 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <div className="glass-card p-8">
        <div className="flex items-center justify-center gap-3 mb-8">
          <Radio className="w-10 h-10 text-accent" />
          <span className="text-2xl font-bold">Radar</span>
        </div>

        <h1 className="text-xl font-semibold text-center mb-2">Reset your password</h1>
        <p className="text-white/60 text-center mb-8">
          Enter your email and we&apos;ll send you a reset link
        </p>

        {error && (
          <div className="mb-6 p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-white/70 mb-2">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="glass-input w-full pl-10"
                placeholder="you@example.com"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-accent hover:bg-accent/90 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                Send reset link
                <ArrowRight className="w-5 h-5" />
              </>
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
