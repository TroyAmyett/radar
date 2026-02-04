'use client';

import { Zap } from 'lucide-react';

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-white/5 backdrop-blur-xl border-t border-white/10 px-4 md:px-6 py-3">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-sm">
        {/* Left: Copyright + Funnelists branding */}
        <a
          href="https://funnelists.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-white/70 hover:text-white transition-colors group"
        >
          <div className="flex items-center justify-center w-5 h-5 rounded bg-gradient-to-br from-accent to-accent-600 group-hover:from-accent-400 group-hover:to-accent transition-all">
            <Zap className="w-3 h-3 text-white" />
          </div>
          <span>
            &copy; {year} <span className="text-accent font-medium">Funnelists</span>
          </span>
        </a>

        {/* Right: Legal links */}
        <div className="flex items-center gap-4 text-white/50">
          <a
            href="https://funnelists.com/terms"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white transition-colors"
          >
            Terms
          </a>
          <a
            href="https://funnelists.com/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white transition-colors"
          >
            Privacy
          </a>
        </div>
      </div>
    </footer>
  );
}
