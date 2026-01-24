'use client';

import Sidebar from './Sidebar';
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
      <main
        className={`ml-0 min-h-screen transition-all duration-300 ${
          collapsed ? 'md:ml-16' : 'md:ml-64'
        }`}
      >
        {children}
      </main>
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
