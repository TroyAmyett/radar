'use client';

import Sidebar from './Sidebar';

interface StandaloneLayoutProps {
  children: React.ReactNode;
}

export default function StandaloneLayout({ children }: StandaloneLayoutProps) {
  return (
    <>
      <Sidebar />
      {/* No margin on mobile (sidebar is hidden), margin on desktop */}
      <main className="ml-0 md:ml-64 min-h-screen">
        {children}
      </main>
    </>
  );
}
