'use client';

import { useEffect } from 'react';
import StandaloneLayout from './StandaloneLayout';
import EmbeddedLayout from './EmbeddedLayout';

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const isEmbedded = process.env.NEXT_PUBLIC_RADAR_MODE === 'embedded';

  // Register service worker for PWA
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((error) => {
        console.error('Service worker registration failed:', error);
      });
    }
  }, []);

  if (isEmbedded) {
    return <EmbeddedLayout>{children}</EmbeddedLayout>;
  }

  return <StandaloneLayout>{children}</StandaloneLayout>;
}
