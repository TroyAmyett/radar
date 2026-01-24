'use client';

import { Globe } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-white/5 backdrop-blur-xl border-t border-white/10 px-4 md:px-6 py-3">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-sm">
        {/* Left: Funnelists branding */}
        <a
          href="https://funnelists.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-white/60 hover:text-white transition-colors"
        >
          Funnelists
        </a>

        {/* Center/Right: Built with Claude Code + CTA */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-white/50">
            <Globe className="w-4 h-4 text-emerald-400" />
            <span>Built with Claude Code</span>
          </div>

          <a
            href="https://calendly.com/funnelists"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-lg bg-accent/20 text-accent hover:bg-accent/30 transition-colors text-sm font-medium"
          >
            Build your AI app
          </a>
        </div>
      </div>
    </footer>
  );
}
