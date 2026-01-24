'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import StandaloneLayout from './StandaloneLayout';
import EmbeddedLayout from './EmbeddedLayout';

interface AppLayoutProps {
  children: React.ReactNode;
}

// Auth routes that should not show the sidebar
const AUTH_ROUTES = ['/login', '/signup', '/reset-password', '/forgot-password'];

export default function AppLayout({ children }: AppLayoutProps) {
  const isEmbedded = process.env.NEXT_PUBLIC_RADAR_MODE === 'embedded';
  const pathname = usePathname();
  const isAuthRoute = AUTH_ROUTES.some(route => pathname?.startsWith(route));

  // Register service worker for PWA
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((error) => {
        console.error('Service worker registration failed:', error);
      });
    }
  }, []);

  // Auth routes render without any layout wrapper
  if (isAuthRoute) {
    return <>{children}</>;
  }

  if (isEmbedded) {
    return <EmbeddedLayout>{children}</EmbeddedLayout>;
  }

  return <StandaloneLayout>{children}</StandaloneLayout>;
}
