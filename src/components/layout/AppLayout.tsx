'use client';

import StandaloneLayout from './StandaloneLayout';
import EmbeddedLayout from './EmbeddedLayout';

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const isEmbedded = process.env.NEXT_PUBLIC_RADAR_MODE === 'embedded';

  if (isEmbedded) {
    return <EmbeddedLayout>{children}</EmbeddedLayout>;
  }

  return <StandaloneLayout>{children}</StandaloneLayout>;
}
