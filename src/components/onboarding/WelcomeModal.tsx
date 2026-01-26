'use client';

import { useState, useEffect } from 'react';
import { Radio, Globe, Clock, ArrowRight, Check } from 'lucide-react';
import { setUserTimezone } from '@/lib/timezone';

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

      // Save timezone to server preferences
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

      // Mark onboarding as complete
      localStorage.setItem('radar_onboarding_complete', 'true');

      onComplete();
    } catch (error) {
      console.error('Failed to save preferences:', error);
      // Still complete onboarding even if save fails
      localStorage.setItem('radar_onboarding_complete', 'true');
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
      <div className="glass-card w-full max-w-md mx-4 p-8">
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

        {/* Get Started Button */}
        <button
          onClick={handleComplete}
          disabled={isSaving}
          className="w-full flex items-center justify-center gap-2 bg-accent hover:bg-accent/90 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50"
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
  );
}
