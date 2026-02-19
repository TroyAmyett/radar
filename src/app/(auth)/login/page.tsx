'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Radio, Mail, Lock, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const { signIn, resendConfirmation, user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Where to go after login — supports ?next=/view/123 from unauthenticated redirects
  const nextUrl = searchParams.get('next') || '/';
  // Validate redirect to prevent open redirect
  const safeNext = nextUrl.startsWith('/') && !nextUrl.startsWith('//') ? nextUrl : '/';

  // Check for error from auth callback
  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam) {
      setError(decodeURIComponent(errorParam));
    }
  }, [searchParams]);

  // Redirect if already authenticated (session sharing from AgentPM)
  useEffect(() => {
    if (!authLoading && user) {
      router.push(safeNext);
    }
  }, [user, authLoading, router, safeNext]);

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="w-full max-w-md flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  // If user exists, don't show login form (redirect is happening)
  if (user) {
    return (
      <div className="w-full max-w-md flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResendSuccess(false);
    setLoading(true);

    try {
      await signIn({ email, password });
      router.push(safeNext);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (!email) {
      setError('Please enter your email address first');
      return;
    }
    setResendLoading(true);
    setError('');
    try {
      await resendConfirmation(email);
      setResendSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend confirmation email');
    } finally {
      setResendLoading(false);
    }
  };

  const isEmailNotConfirmedError = error.toLowerCase().includes('email not confirmed');

  return (
    <div className="w-full max-w-md">
      <div className="glass-card p-8">
        <div className="flex items-center justify-center gap-3 mb-8">
          <Radio className="w-10 h-10 text-accent" />
          <span className="text-2xl font-bold">Radar</span>
        </div>

        <h1 className="text-xl font-semibold text-center mb-2">Welcome back</h1>
        <p className="text-white/60 text-center mb-8">Sign in to your account</p>

        {resendSuccess && (
          <div className="mb-6 p-3 rounded-lg bg-green-500/20 border border-green-500/30 text-green-400 text-sm">
            Confirmation email sent! Please check your inbox and click the link to verify your email.
          </div>
        )}

        {error && (
          <div className="mb-6 p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 text-sm">
            <p>{error}</p>
            {isEmailNotConfirmedError && (
              <button
                type="button"
                onClick={handleResendConfirmation}
                disabled={resendLoading}
                className="mt-2 text-accent hover:text-accent/80 transition-colors underline disabled:opacity-50"
              >
                {resendLoading ? 'Sending...' : 'Resend confirmation email'}
              </button>
            )}
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

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-white/70 mb-2">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="glass-input w-full pl-10"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Link
              href="/forgot-password"
              className="text-sm text-accent hover:text-accent/80 transition-colors"
            >
              Forgot password?
            </Link>
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
                Sign in
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-white/60 text-sm">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-accent hover:text-accent/80 transition-colors">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="w-full max-w-md flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
