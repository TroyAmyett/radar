'use client';

import { Zap, Globe } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-white/5 backdrop-blur-xl border-t border-white/10 px-4 md:px-6 py-3">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-sm">
        {/* Left: Built by Funnelists branding */}
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
            Built by <span className="text-accent font-medium">Funnelists</span>
          </span>
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
