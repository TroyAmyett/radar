'use client';

import { useState, useEffect, useRef } from 'react';
import { Radio, Globe, Clock, ArrowRight, Check, Play, SkipForward } from 'lucide-react';
import { setUserTimezone } from '@/lib/timezone';
import { onboardingVideos, markVideoWatched, getYouTubeEmbedUrl } from '@/lib/onboarding-videos';

interface WelcomeModalProps {
  onComplete: () => void;
}

// Common timezones for selector
const timezoneOptions = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Phoenix', label: 'Arizona (AZ)' },
  { value: 'America/Anchorage', label: 'Alaska (AK)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii (HI)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Central European (CET)' },
  { value: 'Europe/Berlin', label: 'Berlin (CET)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Asia/Shanghai', label: 'China (CST)' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
  { value: 'Asia/Dubai', label: 'Dubai (GST)' },
  { value: 'Asia/Kolkata', label: 'India (IST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST)' },
  { value: 'Australia/Perth', label: 'Perth (AWST)' },
  { value: 'Pacific/Auckland', label: 'New Zealand (NZST)' },
  { value: 'UTC', label: 'UTC' },
];

export default function WelcomeModal({ onComplete }: WelcomeModalProps) {
  const [step, setStep] = useState<'timezone' | 'video'>('timezone');
  const videoRef = useRef<HTMLVideoElement>(null);
  const welcomeVideo = onboardingVideos.welcomeOverview;
  const [timezone, setTimezone] = useState('');
  const [detectedTimezone, setDetectedTimezone] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Detect browser timezone on mount
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    setDetectedTimezone(detected);
    setTimezone(detected);
  }, []);

  const handleComplete = async () => {
    setIsSaving(true);
    try {
      // Save timezone to localStorage
      setUserTimezone(timezone);

      // Save timezone to server preferences (this marks onboarding complete)
      await fetch('/api/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          digest_enabled: true,
          digest_frequency: 'daily',
          digest_time: '06:00:00',
          digest_timezone: timezone,
          digest_topics: [],
          email_address: null,
        }),
      });

      onComplete();
    } catch (error) {
      console.error('Failed to save preferences:', error);
      // Still complete onboarding even if save fails - user can set timezone in settings
      onComplete();
    } finally {
      setIsSaving(false);
    }
  };

  // Get friendly name for detected timezone
  const getTimezoneLabel = (tz: string) => {
    const option = timezoneOptions.find(o => o.value === tz);
    return option ? option.label : tz;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className={`glass-card w-full mx-4 p-8 ${step === 'video' ? 'max-w-3xl' : 'max-w-md'} transition-all duration-300`}>
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

        {step === 'timezone' && (
          <>
            {/* Timezone Selection */}
            <div className="space-y-4 mb-8">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-accent/20">
                  <Globe className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <h3 className="font-medium">Confirm Your Timezone</h3>
                  <p className="text-white/60 text-sm">
                    We&apos;ll use this for all dates and scheduled content
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-white/5">
                {detectedTimezone && (
                  <div className="flex items-center gap-2 mb-3 text-sm text-white/60">
                    <Check className="w-4 h-4 text-green-400" />
                    <span>Detected: {getTimezoneLabel(detectedTimezone)}</span>
                  </div>
                )}

                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-white/60" />
                  <label className="text-sm font-medium">Your Timezone</label>
                </div>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="glass-input w-full"
                >
                  {timezoneOptions.map((tz) => (
                    <option key={tz.value} value={tz.value}>
                      {tz.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Next Button */}
            <button
              onClick={() => welcomeVideo.url ? setStep('video') : handleComplete()}
              disabled={isSaving}
              className="w-full flex items-center justify-center gap-2 bg-accent hover:bg-accent/90 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50"
            >
              {isSaving ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  Next
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </>
        )}

        {step === 'video' && (
          <>
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

              {welcomeVideo.url && (
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
              )}
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
          </>
        )}

      </div>
    </div>
  );
}
