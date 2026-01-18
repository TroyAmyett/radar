import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Radar - Authentication',
  description: 'Sign in to your Radar account',
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
