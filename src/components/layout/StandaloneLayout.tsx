'use client';

import Sidebar from './Sidebar';

interface StandaloneLayoutProps {
  children: React.ReactNode;
}

export default function StandaloneLayout({ children }: StandaloneLayoutProps) {
  return (
    <>
      <Sidebar />
      <main className="ml-64 min-h-screen">
        {children}
      </main>
    </>
  );
}
