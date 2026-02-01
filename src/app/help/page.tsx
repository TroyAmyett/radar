'use client';

import Header from '@/components/layout/Header';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import VideoGallery from '@/components/onboarding/VideoGallery';
import { Play } from 'lucide-react';

export default function HelpPage() {
  return (
    <ProtectedRoute>
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-accent/20">
            <Play className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Getting Started</h1>
            <p className="text-white/60 text-sm">Short video guides to help you get the most out of Radar</p>
          </div>
        </div>

        <VideoGallery />
      </main>
    </ProtectedRoute>
  );
}
