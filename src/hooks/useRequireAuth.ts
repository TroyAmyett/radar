'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './useAuth';

export function useRequireAuth(redirectTo: string = '/login') {
  const { user, session, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Only redirect in standalone mode
    const isStandaloneMode = process.env.NEXT_PUBLIC_RADAR_MODE !== 'embedded';

    if (!loading && !user && isStandaloneMode) {
      router.push(redirectTo);
    }
  }, [user, loading, router, redirectTo]);

  return { user, session, loading };
}
