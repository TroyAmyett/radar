import type { Metadata } from 'next';
import './globals.css';
import AppLayout from '@/components/layout/AppLayout';

export const metadata: Metadata = {
  title: 'Radar - Intelligence Dashboard',
  description: 'Your personal intelligence dashboard for tracking AI, tech, and thought leaders',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <div className="bg-gradient-orbs" />
        <AppLayout>
          {children}
        </AppLayout>
      </body>
    </html>
  );
}
