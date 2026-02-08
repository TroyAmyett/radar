'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Radio, Mail, Lock, User, ArrowRight, Loader2, Gift } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

// Map error codes to user-friendly messages
const errorMessages: Record<string, string> = {
  missing_token: 'Invalid invite link. Please request a new invitation.',
  invalid_token: 'This invite link is invalid. Please request a new invitation.',
  invite_cancelled: 'This invitation has been cancelled.',
  invite_expired: 'This invitation has expired. Please request a new one.',
  server_error: 'Something went wrong. Please try again.',
};

// Loading fallback for Suspense
function SignupLoading() {
  return (
    <div className="w-full max-w-md">
      <div className="glass-card p-8">
        <div className="flex items-center justify-center gap-3 mb-8">
          <Radio className="w-10 h-10 text-accent" />
          <span className="text-2xl font-bold">Radar</span>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
        </div>
      </div>
    </div>
  );
}

// Main signup page wrapper with Suspense
export default function SignupPage() {
  return (
    <Suspense fallback={<SignupLoading />}>
      <SignupForm />
    </Suspense>
  );
}

// Actual signup form component
function SignupForm() {
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get('invite');
  const prefillEmail = searchParams.get('email');
  const prefillName = searchParams.get('name');
  const errorCode = searchParams.get('error');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { signUp } = useAuth();
  const router = useRouter();

  // Pre-fill form from invite params
  useEffect(() => {
    if (prefillEmail) setEmail(prefillEmail);
    if (prefillName) setName(prefillName);
    if (errorCode && errorMessages[errorCode]) {
      setError(errorMessages[errorCode]);
    }
  }, [prefillEmail, prefillName, errorCode]);

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
      const { session, user } = await signUp({ email, password, name });

      // Mark invite as accepted if we have a token
      if (inviteToken && user) {
        try {
          await fetch('/api/invites/accept', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: inviteToken, userId: user.id }),
          });
        } catch (inviteErr) {
          console.error('Failed to mark invite as accepted:', inviteErr);
          // Don't block signup if this fails
        }
      }

      if (session) {
        // User was auto-confirmed, redirect to dashboard
        router.push('/');
      } else {
        // User needs to confirm email
        setSuccess(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create account');
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
            We&apos;ve sent a confirmation link to <strong className="text-white">{email}</strong>
          </p>

          <Link
            href="/login"
            className="text-accent hover:text-accent/80 transition-colors"
          >
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

        <h1 className="text-xl font-semibold text-center mb-2">Create an account</h1>
        <p className="text-white/60 text-center mb-8">Start tracking your intelligence feeds</p>

        {inviteToken && prefillEmail && (
          <div className="mb-6 p-3 rounded-lg bg-accent/20 border border-accent/30 text-accent flex items-center gap-2">
            <Gift className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm">You&apos;ve been invited to join Radar!</span>
          </div>
        )}

        {error && (
          <div className="mb-6 p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-white/70 mb-2">
              Name
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="glass-input w-full pl-10"
                placeholder="Your name"
              />
            </div>
          </div>

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
                className={`glass-input w-full pl-10 ${inviteToken && prefillEmail ? 'bg-white/5 cursor-not-allowed' : ''}`}
                placeholder="you@example.com"
                required
                readOnly={!!(inviteToken && prefillEmail)}
              />
            </div>
            {inviteToken && prefillEmail && (
              <p className="mt-1 text-xs text-white/40">
                This email is linked to your invitation
              </p>
            )}
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
                placeholder="••••••••"
                required
                minLength={6}
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
                Create account
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-white/60 text-sm">
          Already have an account?{' '}
          <Link href="/login" className="text-accent hover:text-accent/80 transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
