'use client';

import { useRequireAuth } from '@/hooks/useRequireAuth';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { loading } = useRequireAuth();

  // In embedded mode, skip auth check
  const isEmbedded = process.env.NEXT_PUBLIC_RADAR_MODE === 'embedded';

  if (isEmbedded) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  return <>{children}</>;
}
