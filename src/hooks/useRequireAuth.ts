'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './useAuth';

export function useRequireAuth(redirectTo: string = '/login') {
  const { user, session, loading } = useAuth();
  const router = useRouter();
  const [timedOut, setTimedOut] = useState(false);

  // Safety net: if auth loading takes >5s, stop waiting and redirect
  useEffect(() => {
    if (!loading) return;
    const timer = setTimeout(() => setTimedOut(true), 5000);
    return () => clearTimeout(timer);
  }, [loading]);

  useEffect(() => {
    // Only redirect in standalone mode
    const isStandaloneMode = process.env.NEXT_PUBLIC_RADAR_MODE !== 'embedded';

    if ((!loading || timedOut) && !user && isStandaloneMode) {
      router.push(redirectTo);
    }
  }, [user, loading, timedOut, router, redirectTo]);

  return { user, session, loading: loading && !timedOut };
}
