'use client';

import { Radio, WifiOff, RefreshCw } from 'lucide-react';

export default function OfflinePage() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6 text-center"
      style={{ backgroundColor: "#0a0a0f" }}
    >
      <div className="flex items-center gap-3 mb-8">
        <Radio className="w-10 h-10 text-accent" />
        <span className="text-2xl font-bold text-white">Radar</span>
      </div>

      <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-white/10 flex items-center justify-center">
        <WifiOff className="w-10 h-10 text-white/60" />
      </div>

      <h1 className="text-2xl font-semibold text-white mb-3">
        You&apos;re Offline
      </h1>

      <p className="text-white/60 max-w-md mb-8">
        Radar needs an internet connection to fetch the latest intelligence.
        Check your connection and try again.
      </p>

      <button
        onClick={() => window.location.reload()}
        className="flex items-center gap-2 px-6 py-3 bg-accent hover:bg-accent/90 text-white font-medium rounded-lg transition-colors"
      >
        <RefreshCw className="w-5 h-5" />
        Retry
      </button>
    </div>
  );
}
