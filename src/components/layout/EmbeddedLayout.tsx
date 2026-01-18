'use client';

interface EmbeddedLayoutProps {
  children: React.ReactNode;
}

export default function EmbeddedLayout({ children }: EmbeddedLayoutProps) {
  // Embedded layout for AgentPM integration
  // This layout doesn't include the sidebar since navigation
  // will be handled by the parent application
  return (
    <main className="min-h-screen">
      {children}
    </main>
  );
}
