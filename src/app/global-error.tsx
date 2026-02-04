'use client';

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ backgroundColor: '#0a0a0f', color: 'white', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '24px', textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '8px' }}>Something went wrong</h2>
          <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '24px' }}>
            An unexpected error occurred. Try refreshing the page.
          </p>
          <button
            onClick={reset}
            style={{ backgroundColor: '#0ea5e9', color: 'white', fontWeight: 500, padding: '12px 24px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  );
}
