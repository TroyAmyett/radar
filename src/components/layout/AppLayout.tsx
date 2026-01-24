'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import StandaloneLayout from './StandaloneLayout';
import EmbeddedLayout from './EmbeddedLayout';

interface AppLayoutProps {
  children: React.ReactNode;
}

// Auth routes that should not show the sidebar
const AUTH_ROUTES = ['/login', '/signup', '/forgot-password'];

export default function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();
  const isEmbedded = process.env.NEXT_PUBLIC_RADAR_MODE === 'embedded';
  const isAuthPage = AUTH_ROUTES.includes(pathname);

  // Register service worker for PWA
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((error) => {
        console.error('Service worker registration failed:', error);
      });
    }
  }, []);

  // Auth pages should not show sidebar/header
  if (isAuthPage) {
    return <>{children}</>;
  }

  if (isEmbedded) {
    return <EmbeddedLayout>{children}</EmbeddedLayout>;
  }

  return <StandaloneLayout>{children}</StandaloneLayout>;
}
