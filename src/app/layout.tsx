import type { Metadata, Viewport } from 'next';
import './globals.css';
import AppLayout from '@/components/layout/AppLayout';

export const metadata: Metadata = {
  title: 'Funnelists Radar',
  description: 'AI-powered intelligence monitoring — What\'s Hot in AI, Agents, and Automation',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Radar',
  },
  icons: {
    icon: [
      { url: '/icons/favicon-32x32.ico', sizes: '32x32', type: 'image/x-icon' },
      { url: '/icons/favicon-16x16.ico', sizes: '16x16', type: 'image/x-icon' },
    ],
    apple: [
      { url: '/icons/maskable-192x192.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0a0a0f',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" style={{ backgroundColor: '#0a0a0f' }}>
      <body className="antialiased" style={{ backgroundColor: '#0a0a0f', color: 'white' }}>
        <AppLayout>
          {children}
        </AppLayout>
      </body>
    </html>
  );
}
