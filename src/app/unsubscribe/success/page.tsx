import { CheckCircle } from 'lucide-react';
import Link from 'next/link';

export default function UnsubscribeSuccessPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="glass-card p-8 max-w-md w-full text-center">
        <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-6" />
        <h1 className="text-2xl font-semibold mb-4">Unsubscribed</h1>
        <p className="text-white/60 mb-6">
          You&apos;ve been successfully unsubscribed from our email digests.
          We&apos;re sorry to see you go!
        </p>
        <Link
          href="/"
          className="inline-block px-6 py-3 bg-accent text-white rounded-lg font-medium hover:bg-accent/80 transition-colors"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
