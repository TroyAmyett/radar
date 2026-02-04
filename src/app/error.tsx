'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
      <AlertTriangle className="w-12 h-12 text-yellow-400 mb-4" />
      <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
      <p className="text-white/60 mb-6 max-w-md">
        An unexpected error occurred. Try refreshing the page.
      </p>
      <button
        onClick={reset}
        className="flex items-center gap-2 bg-accent hover:bg-accent/80 text-white font-medium py-3 px-6 rounded-lg transition-colors"
      >
        <RefreshCw className="w-4 h-4" />
        Try Again
      </button>
    </div>
  );
}
