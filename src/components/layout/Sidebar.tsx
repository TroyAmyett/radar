'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Rss,
  Bookmark,
  Settings,
  Radio,
  Flame,
  Sparkles,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useSidebar } from './SidebarContext';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/whats-hot', label: "What's Hot", icon: Flame },
  { href: '/sources', label: 'Sources', icon: Rss },
  { href: '/saved', label: 'Saved', icon: Bookmark },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { collapsed, toggleCollapsed } = useSidebar();

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

  // Sidebar content for mobile (always expanded)
  const MobileSidebarContent = () => (
    <>
      {/* App Logo/Name */}
      <div className="flex items-center gap-3 px-3 py-2 mb-6">
        <Radio className="w-6 h-6 text-accent" />
        <span className="text-lg font-semibold">Radar</span>
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

      {/* Upsell to AgentPM */}
      <div className="mt-auto pt-6">
        <a
          href="https://agentpm.funnelists.com"
          target="_blank"
          rel="noopener noreferrer"
          className="block p-4 rounded-xl bg-gradient-to-br from-accent/20 to-purple-500/20 border border-accent/30 hover:border-accent/50 transition-colors"
        >
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-accent" />
            <span className="font-semibold text-white">Upgrade to AgentPM</span>
          </div>
          <p className="text-xs text-white/60">
            Get AI planning, agentic project management and more powerful tools.
          </p>
        </a>
      </div>
    </>
  );

  // Desktop sidebar content (collapsible)
  const DesktopSidebarContent = () => (
    <>
      {/* App Logo/Name */}
      <div className={`flex items-center gap-3 px-3 py-2 mb-6 ${collapsed ? 'justify-center' : ''}`}>
        <Radio className="w-6 h-6 text-accent flex-shrink-0" />
        {!collapsed && <span className="text-lg font-semibold">Radar</span>}
      </div>

      <nav className="space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                collapsed ? 'justify-center' : ''
              } ${
                isActive
                  ? 'bg-accent/20 text-accent border border-accent/30'
                  : 'text-white/70 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span className="font-medium">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Upsell to AgentPM */}
      <div className="mt-auto pt-6">
        {collapsed ? (
          <a
            href="https://agentpm.funnelists.com"
            target="_blank"
            rel="noopener noreferrer"
            title="Upgrade to AgentPM"
            className="flex items-center justify-center p-3 rounded-xl bg-gradient-to-br from-accent/20 to-purple-500/20 border border-accent/30 hover:border-accent/50 transition-colors"
          >
            <Sparkles className="w-5 h-5 text-accent" />
          </a>
        ) : (
          <a
            href="https://agentpm.funnelists.com"
            target="_blank"
            rel="noopener noreferrer"
            className="block p-4 rounded-xl bg-gradient-to-br from-accent/20 to-purple-500/20 border border-accent/30 hover:border-accent/50 transition-colors"
          >
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-accent" />
              <span className="font-semibold text-white">Upgrade to AgentPM</span>
            </div>
            <p className="text-xs text-white/60">
              Get AI planning, agentic project management and more powerful tools.
            </p>
          </a>
        )}
      </div>

      {/* Collapse toggle button */}
      <button
        onClick={toggleCollapsed}
        className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-gray-800 border border-white/20 flex items-center justify-center hover:bg-gray-700 transition-colors"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? (
          <ChevronRight className="w-4 h-4 text-white/70" />
        ) : (
          <ChevronLeft className="w-4 h-4 text-white/70" />
        )}
      </button>
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
        className={`md:hidden fixed left-0 top-0 h-full w-64 glass border-r border-white/10 p-4 pt-16 z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <MobileSidebarContent />
      </aside>

      {/* Desktop sidebar (collapsible) */}
      <aside
        className={`hidden md:flex md:flex-col fixed left-0 top-0 h-full glass border-r border-white/10 p-4 z-50 transition-all duration-300 ${
          collapsed ? 'w-16' : 'w-64'
        }`}
      >
        <DesktopSidebarContent />
      </aside>
    </>
  );
}
