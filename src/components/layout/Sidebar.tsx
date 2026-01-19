'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Rss,
  Users,
  Bookmark,
  Settings,
  Radio,
  Flame,
  Bot,
  StickyNote,
  Palette,
  ChevronDown,
  Menu,
  X,
} from 'lucide-react';

// Helper to get app URLs based on environment
function getAppUrl(app: string): string {
  const isDev = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  const devPorts: Record<string, number> = {
    agentpm: 3000,
    radar: 3001,
    notetaker: 3000,
    canvas: 3003,
    leadgen: 3004,
  };

  const prodDomains: Record<string, string> = {
    agentpm: 'agentpm.funnelists.com',
    radar: 'radar.funnelists.com',
    notetaker: 'notetaker.funnelists.com',
    canvas: 'canvas.funnelists.com',
    leadgen: 'leadgen.funnelists.com',
  };

  if (isDev) {
    return `http://localhost:${devPorts[app] || 3000}`;
  }

  return `https://${prodDomains[app] || 'funnelists.com'}`;
}

interface Tool {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  href?: string;
  comingSoon?: boolean;
}

const appTools: Tool[] = [
  { id: 'agentpm', name: 'AgentPM', icon: <Bot size={18} />, description: 'AI project management', href: getAppUrl('agentpm') },
  { id: 'radar', name: 'Radar', icon: <Radio size={18} />, description: 'Intelligence feed' },
  { id: 'notetaker', name: 'NoteTaker', icon: <StickyNote size={18} />, description: 'Brainstorming & ideation', href: getAppUrl('notetaker') },
  { id: 'canvas', name: 'Canvas', icon: <Palette size={18} />, description: 'AI design & visuals', href: getAppUrl('canvas'), comingSoon: true },
  { id: 'leadgen', name: 'LeadGen', icon: <Users size={18} />, description: 'Lead generation & enrichment', href: getAppUrl('leadgen') },
];

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/whats-hot', label: "What's Hot", icon: Flame },
  { href: '/sources', label: 'Sources', icon: Rss },
  { href: '/saved', label: 'Saved', icon: Bookmark },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [toolsOpen, setToolsOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const currentTool = appTools.find(t => t.id === 'radar');

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Close mobile menu on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileMenuOpen(false);
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const handleToolSelect = (tool: Tool) => {
    if (tool.comingSoon) return;
    if (tool.href) {
      window.location.href = tool.href;
    }
    setToolsOpen(false);
  };

  // Mobile hamburger button (fixed position)
  const MobileMenuButton = () => (
    <button
      onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
      className="md:hidden fixed top-3 left-3 z-[60] p-2 rounded-lg glass border border-white/10 hover:bg-white/10 transition-colors"
      aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
    >
      {mobileMenuOpen ? (
        <X className="w-5 h-5 text-white" />
      ) : (
        <Menu className="w-5 h-5 text-white" />
      )}
    </button>
  );

  // Sidebar content (shared between mobile and desktop)
  const SidebarContent = () => (
    <>
      {/* Tool Switcher */}
      <div className="relative mb-6">
        <button
          onClick={() => setToolsOpen(!toolsOpen)}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 transition-colors"
        >
          <Radio className="w-6 h-6 text-accent" />
          <span className="text-lg font-semibold flex-1 text-left">{currentTool?.name}</span>
          <ChevronDown
            size={16}
            className={`text-white/50 transition-transform ${toolsOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {toolsOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setToolsOpen(false)} />
            <div className="absolute left-0 top-full mt-2 w-full py-2 rounded-xl bg-[#1a1a2e] border border-white/10 shadow-xl z-50">
              {appTools.map((tool) => (
                <button
                  key={tool.id}
                  onClick={() => handleToolSelect(tool)}
                  disabled={tool.comingSoon}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                    tool.id === 'radar'
                      ? 'bg-accent/20 text-accent'
                      : tool.comingSoon
                      ? 'text-white/30 cursor-not-allowed'
                      : 'text-white/70 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span className={tool.id === 'radar' ? 'text-accent' : ''}>{tool.icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{tool.name}</span>
                      {tool.comingSoon && (
                        <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-white/10 text-white/50">
                          Soon
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-white/50">{tool.description}</p>
                  </div>
                </button>
              ))}

              <div className="border-t border-white/10 mt-2 pt-2">
                <Link
                  href="/settings"
                  onClick={() => setToolsOpen(false)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                >
                  <Settings size={18} />
                  <span className="text-sm">Settings</span>
                </Link>
              </div>
            </div>
          </>
        )}
      </div>

      <nav className="space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                isActive
                  ? 'bg-accent/20 text-accent border border-accent/30'
                  : 'text-white/70 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );

  return (
    <>
      {/* Mobile hamburger button */}
      <MobileMenuButton />

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile sidebar (slide-in drawer) */}
      <aside
        className={`md:hidden fixed left-0 top-0 h-full w-64 glass border-r border-white/10 p-4 pt-16 z-50 transform transition-transform duration-300 ease-in-out ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <SidebarContent />
      </aside>

      {/* Desktop sidebar (always visible) */}
      <aside className="hidden md:block fixed left-0 top-0 h-full w-64 glass border-r border-white/10 p-4 z-50">
        <SidebarContent />
      </aside>
    </>
  );
}
