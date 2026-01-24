'use client';

import Sidebar from './Sidebar';
import Footer from './Footer';
import { SidebarProvider, useSidebar } from './SidebarContext';

interface StandaloneLayoutProps {
  children: React.ReactNode;
}

function StandaloneLayoutContent({ children }: StandaloneLayoutProps) {
  const { collapsed } = useSidebar();

  return (
    <>
      <Sidebar />
      {/* No margin on mobile (sidebar is hidden), dynamic margin on desktop */}
      <div
        className={`ml-0 min-h-screen flex flex-col transition-all duration-300 ${
          collapsed ? 'md:ml-16' : 'md:ml-64'
        }`}
      >
        <main className="flex-1">
          {children}
        </main>
        <Footer />
      </div>
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
