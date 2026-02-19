'use client';

import { useState, useEffect } from 'react';
import { Share, Plus, X } from 'lucide-react';

/**
 * Shows a banner prompting iOS/iPadOS Safari users to add the app to their home screen.
 * Only appears when:
 * - Running on iOS/iPadOS Safari (not Chrome, Firefox, etc.)
 * - Not already in standalone mode (already installed)
 * - User hasn't dismissed the banner recently (7-day cooldown)
 */
export default function IOSInstallPrompt() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Only show on iOS/iPadOS Safari, not already installed
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); // iPadOS
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
      ('standalone' in navigator && (navigator as { standalone?: boolean }).standalone);
    const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome|CriOS|FxiOS/.test(navigator.userAgent);

    if (!isIOS || isStandalone || !isSafari) return;

    // Check if user dismissed recently (7-day cooldown)
    const dismissedAt = localStorage.getItem('radar_ios_install_dismissed');
    if (dismissedAt) {
      const daysSince = (Date.now() - parseInt(dismissedAt)) / (1000 * 60 * 60 * 24);
      if (daysSince < 7) return;
    }

    // Show after a short delay so it doesn't flash on load
    const timer = setTimeout(() => setShow(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  const dismiss = () => {
    setShow(false);
    localStorage.setItem('radar_ios_install_dismissed', Date.now().toString());
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
      <div className="max-w-lg mx-auto glass-card p-4 border border-white/10 shadow-2xl">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-accent/20 flex-shrink-0">
            <Plus className="w-5 h-5 text-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm mb-1">Add Radar to your Home Screen</p>
            <p className="text-white/50 text-xs leading-relaxed">
              Tap the <Share className="w-3.5 h-3.5 inline-block -mt-0.5 text-accent" /> Share button in Safari, then scroll down and tap <strong className="text-white/70">&ldquo;Add to Home Screen&rdquo;</strong>
            </p>
          </div>
          <button
            onClick={dismiss}
            className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white/60 transition-colors flex-shrink-0"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
