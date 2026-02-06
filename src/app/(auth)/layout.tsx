import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Radar - AI-Powered Content Discovery',
  description: 'Curate your personalized feed of videos, articles, and insights from across the web. AI summaries, topic filtering, and smart recommendations.',
};

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      {children}
    </div>
  );
}
