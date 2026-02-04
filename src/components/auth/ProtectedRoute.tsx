'use client';

import { useState, useEffect } from 'react';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { Loader2 } from 'lucide-react';
import WelcomeModal from '@/components/onboarding/WelcomeModal';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { loading } = useRequireAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);

  // Check if onboarding is needed after auth is complete (from database)
  useEffect(() => {
    if (!loading) {
      // Fast path: if localStorage says onboarding is done, skip the API call
      try {
        if (localStorage.getItem('radar_onboarding_complete') === 'true') {
          setCheckingOnboarding(false);
          return;
        }
      } catch { /* localStorage unavailable */ }

      fetch('/api/preferences')
        .then(res => res.json())
        .then(data => {
          const needsOnboarding = !data.onboarding_complete;
          setShowOnboarding(needsOnboarding);
          setCheckingOnboarding(false);

          if (needsOnboarding) {
            // Seed default topics for new users (runs in background)
            fetch('/api/seed-topics', { method: 'POST' }).catch(() => {});
          } else {
            // Cache completion so subsequent navigations skip the API call
            try { localStorage.setItem('radar_onboarding_complete', 'true'); } catch { /* */ }
          }
        })
        .catch(() => {
          // On error, don't show onboarding
          setCheckingOnboarding(false);
        });
    }
  }, [loading]);

  // In embedded mode, skip auth check and onboarding
  const isEmbedded = process.env.NEXT_PUBLIC_RADAR_MODE === 'embedded';

  if (isEmbedded) {
    return <>{children}</>;
  }

  if (loading || checkingOnboarding) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <>
      {showOnboarding && (
        <WelcomeModal onComplete={() => setShowOnboarding(false)} />
      )}
      {children}
    </>
  );
}
