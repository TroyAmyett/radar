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
  Menu,
  X,
  Play,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard, adminOnly: false },
  { href: '/whats-hot', label: 'Hot', icon: Flame, adminOnly: true },
  { href: '/sources', label: 'Sources', icon: Rss, adminOnly: false },
  { href: '/saved', label: 'Saved', icon: Bookmark, adminOnly: false },
  { href: '/settings', label: 'Settings', icon: Settings, adminOnly: false },
  { href: '/help', label: 'Help', icon: Play, adminOnly: false },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isSuperAdmin } = useAuth();

  // Filter nav items based on admin status
  const filteredNavItems = navItems.filter(
    (item) => !item.adminOnly || isSuperAdmin
  );

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
        {filteredNavItems.map((item) => {
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
        className={`md:hidden fixed left-0 top-0 h-full w-64 glass border-r border-white/10 p-4 pt-16 z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <MobileSidebarContent />
      </aside>
    </>
  );
}
