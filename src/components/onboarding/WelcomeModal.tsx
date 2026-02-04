'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Radio, ArrowRight, Play, SkipForward } from 'lucide-react';
import { setUserTimezone } from '@/lib/timezone';
import { onboardingVideos, markVideoWatched, getYouTubeEmbedUrl } from '@/lib/onboarding-videos';

interface WelcomeModalProps {
  onComplete: () => void;
}

export default function WelcomeModal({ onComplete }: WelcomeModalProps) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const welcomeVideo = onboardingVideos.welcomeOverview;
  const [isSaving, setIsSaving] = useState(false);
  const timezoneRef = useRef('UTC');

  useEffect(() => {
    // Auto-detect browser timezone silently
    timezoneRef.current = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  }, []);

  const handleComplete = async () => {
    setIsSaving(true);

    // Mark onboarding done immediately so navigation doesn't re-trigger the modal
    try { localStorage.setItem('radar_onboarding_complete', 'true'); } catch { /* */ }

    try {
      const timezone = timezoneRef.current;

      // Save timezone to localStorage
      setUserTimezone(timezone);

      // Save preferences to server (creates the user_preferences row)
      await fetch('/api/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          digest_enabled: true,
          digest_frequency: 'daily',
          digest_time: '06:00:00',
          digest_timezone: timezone,
          digest_topics: [],
        }),
      });
    } catch (error) {
      console.error('Failed to save preferences:', error);
    } finally {
      setIsSaving(false);
    }

    onComplete();
    router.push('/settings');
  };

  // If no video URL, just complete immediately
  useEffect(() => {
    if (!welcomeVideo.url) {
      handleComplete();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Don't render the modal if there's no video
  if (!welcomeVideo.url) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="glass-card w-full mx-4 p-8 max-w-5xl transition-all duration-300">
        {/* Logo and Welcome */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Radio className="w-10 h-10 text-accent" />
            <span className="text-2xl font-bold">Radar</span>
          </div>
          <h1 className="text-xl font-semibold mb-2">Welcome to Radar!</h1>
          <p className="text-white/60">
            Your intelligence feed for staying informed on topics that matter to you.
          </p>
        </div>

        {/* Welcome Video */}
        <div className="space-y-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent/20">
              <Play className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h3 className="font-medium">Quick Tour</h3>
              <p className="text-white/60 text-sm">
                Watch a {welcomeVideo.duration} overview of how Radar works
              </p>
            </div>
          </div>

          <div className="rounded-lg overflow-hidden bg-black">
            {getYouTubeEmbedUrl(welcomeVideo.url) ? (
              <iframe
                src={getYouTubeEmbedUrl(welcomeVideo.url)!}
                className="w-full aspect-video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <video
                ref={videoRef}
                src={welcomeVideo.url}
                controls
                autoPlay
                playsInline
                className="w-full aspect-video"
                onPlay={() => markVideoWatched(welcomeVideo.key)}
              />
            )}
          </div>
        </div>

        {/* Continue / Skip */}
        <div className="flex gap-3">
          <button
            onClick={() => {
              if (videoRef.current) videoRef.current.pause();
              handleComplete();
            }}
            disabled={isSaving}
            className="flex-1 flex items-center justify-center gap-2 text-white/60 hover:text-white font-medium py-3 px-4 rounded-lg border border-white/10 hover:border-white/20 transition-colors disabled:opacity-50"
          >
            <SkipForward className="w-4 h-4" />
            Skip
          </button>
          <button
            onClick={() => {
              if (videoRef.current) videoRef.current.pause();
              handleComplete();
            }}
            disabled={isSaving}
            className="flex-1 flex items-center justify-center gap-2 bg-accent hover:bg-accent/90 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50"
          >
            {isSaving ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                Get Started
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
