'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search, LogOut, User, Settings, Radio, LayoutDashboard, Rss, Bookmark, Flame, Play } from 'lucide-react';
import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useChangelog } from '@/hooks/useChangelog';
import { ChangelogBadge, ChangelogDrawer, WhatsNewModal } from '@/components/changelog';

// Check if running in embedded mode (inside AgentPM)
const isEmbedded = process.env.NEXT_PUBLIC_RADAR_MODE === 'embedded';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard, adminOnly: false },
  { href: '/whats-hot', label: 'Hot', icon: Flame, adminOnly: true },
  { href: '/sources', label: 'Sources', icon: Rss, adminOnly: false },
  { href: '/saved', label: 'Saved', icon: Bookmark, adminOnly: false },
  { href: '/settings', label: 'Settings', icon: Settings, adminOnly: false },
  { href: '/help', label: 'Help', icon: Play, adminOnly: false },
];

interface HeaderProps {
  onSearch?: (query: string) => void;
}

export default function Header({ onSearch }: HeaderProps) {
  const pathname = usePathname();
  const [searchQuery, setSearchQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const { user, signOut, isSuperAdmin } = useAuth();
  const router = useRouter();

  // Changelog hook
  const {
    entries,
    unreadCount,
    unreadHighlights,
    isLoading: changelogLoading,
    isDrawerOpen,
    isWhatsNewOpen,
    fetchEntries,
    markAsRead,
    markAllAsRead,
    dismissHighlights,
    openDrawer,
    closeDrawer,
    closeWhatsNew,
  } = useChangelog(user?.id, 'radar');

  const handleViewAllChangelog = useCallback(() => {
    closeWhatsNew();
    openDrawer();
  }, [closeWhatsNew, openDrawer]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(searchQuery);
  };

  const handleSignOut = async () => {
    setMenuOpen(false);
    try {
      await signOut();
      router.push('/login');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const toggleMenu = () => {
    if (!menuOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    }
    setMenuOpen(!menuOpen);
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        buttonRef.current &&
        !buttonRef.current.contains(target)
      ) {
        setMenuOpen(false);
      }
    };

    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen]);

  // Update position on scroll/resize
  useEffect(() => {
    const updatePosition = () => {
      if (menuOpen && buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        setMenuPosition({
          top: rect.bottom + 8,
          right: window.innerWidth - rect.right,
        });
      }
    };

    if (menuOpen) {
      window.addEventListener('scroll', updatePosition);
      window.addEventListener('resize', updatePosition);
    }

    return () => {
      window.removeEventListener('scroll', updatePosition);
      window.removeEventListener('resize', updatePosition);
    };
  }, [menuOpen]);

  return (
    <>
    <header className="sticky top-0 z-40 bg-white/5 backdrop-blur-xl border-b border-white/10 px-3 md:px-4 lg:px-6 py-3 flex items-center justify-between gap-2 md:gap-3">
      {/* Logo - hidden on mobile (shown in hamburger menu) */}
      <Link href="/" className="hidden md:flex items-center gap-1.5 flex-shrink-0">
        <Radio className="w-5 h-5 text-accent" />
        <span className="text-base font-semibold text-white hidden lg:inline">Radar</span>
      </Link>

      {/* Desktop Navigation - absolutely centered */}
      <nav className={`hidden md:flex items-center absolute left-1/2 -translate-x-1/2 ${isEmbedded ? 'gap-0.5' : 'gap-1 lg:gap-2'}`}>
        {navItems
          .filter((item) => !item.adminOnly || isSuperAdmin)
          .map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 rounded-lg transition-all whitespace-nowrap ${
                  isEmbedded
                    ? 'px-2 py-1.5 text-sm'
                    : 'px-2 lg:px-3 py-2 text-sm lg:text-base'
                } ${
                  isActive
                    ? 'bg-accent/20 text-accent'
                    : 'text-white/70 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className={isEmbedded ? 'w-4 h-4' : 'w-4 h-4 lg:w-5 lg:h-5'} />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
      </nav>

      {/* Search */}
      <form onSubmit={handleSearch} className="w-full md:w-auto md:min-w-[200px] max-w-md min-w-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 md:w-5 h-4 md:h-5 text-white/40" />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="glass-input w-full pl-9 md:pl-10 pr-3 md:pr-4 py-2 md:py-2.5 text-sm md:text-base"
          />
        </div>
      </form>

      {/* Changelog Badge - only show when not embedded */}
      {user && !isEmbedded && (
        <ChangelogBadge unreadCount={unreadCount} onClick={openDrawer} />
      )}

      {/* Hide user menu when embedded in AgentPM - parent app handles user context */}
      {user && !isEmbedded && (
        <div className="flex-shrink-0">
          <button
            ref={buttonRef}
            onClick={toggleMenu}
            className="w-8 md:w-9 h-8 md:h-9 rounded-full bg-accent/20 flex items-center justify-center hover:bg-accent/30 transition-colors"
          >
            <User className="w-4 md:w-5 h-4 md:h-5 text-accent" />
          </button>

          {menuOpen && typeof document !== 'undefined' && createPortal(
            <div
              ref={menuRef}
              className="fixed w-48 py-2 rounded-lg bg-[#111118] border border-white/20 shadow-2xl"
              style={{
                top: menuPosition.top,
                right: menuPosition.right,
                zIndex: 99999,
              }}
            >
              {user.email && (
                <div className="px-4 py-2 border-b border-white/10">
                  <p className="text-sm text-white/60 truncate">{user.email}</p>
                </div>
              )}
              <button
                onClick={() => {
                  setMenuOpen(false);
                  router.push('/profile');
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              >
                <User className="w-4 h-4" />
                <span>Profile</span>
              </button>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  router.push('/account');
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                data-testid="config-button"
              >
                <Settings className="w-4 h-4" />
                <span>Config</span>
              </button>
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>,
            document.body
          )}
        </div>
      )}
    </header>

    {/* Changelog Drawer */}
    <ChangelogDrawer
      isOpen={isDrawerOpen}
      onClose={closeDrawer}
      entries={entries}
      isLoading={changelogLoading}
      onMarkAllRead={markAllAsRead}
      onMarkAsRead={markAsRead}
      onFetchEntries={fetchEntries}
    />

    {/* What's New Modal */}
    <WhatsNewModal
      isOpen={isWhatsNewOpen}
      highlights={unreadHighlights}
      onDismiss={dismissHighlights}
      onViewAll={handleViewAllChangelog}
    />
    </>
  );
}
