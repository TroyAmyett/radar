'use client';

import Sidebar from './Sidebar';
import Footer from './Footer';
import { SidebarProvider } from './SidebarContext';
import IOSInstallPrompt from '@/components/pwa/IOSInstallPrompt';

interface StandaloneLayoutProps {
  children: React.ReactNode;
}

function StandaloneLayoutContent({ children }: StandaloneLayoutProps) {
  return (
    <>
      {/* Mobile sidebar only - desktop navigation is in Header */}
      <Sidebar />
      {/* No margin needed - sidebar only shows on mobile as a slide-in drawer */}
      <div className="min-h-screen flex flex-col">
        <main className="flex-1">
          {children}
        </main>
        <Footer />
      </div>
      <IOSInstallPrompt />
    </>
  );
}

export default function StandaloneLayout({ children }: StandaloneLayoutProps) {
  return (
    <SidebarProvider>
      <StandaloneLayoutContent>{children}</StandaloneLayoutContent>
    </SidebarProvider>
  );
}
