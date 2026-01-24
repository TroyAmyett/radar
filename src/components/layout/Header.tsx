'use client';

import { Search, Bell, LogOut, ChevronDown, User } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

interface HeaderProps {
  onSearch?: (query: string) => void;
}

export default function Header({ onSearch }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { user, signOut } = useAuth();
  const router = useRouter();

  const isEmbedded = process.env.NEXT_PUBLIC_RADAR_MODE === 'embedded';

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(searchQuery);
  };

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await signOut();
      router.push('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const userInitial = user?.email?.charAt(0).toUpperCase() || 'U';
  const userEmail = user?.email || 'User';

  return (
    <header className="glass border-b border-white/10 px-3 md:px-6 py-3 md:py-4 flex items-center justify-between gap-3 sticky top-0 z-[100]">
      <form onSubmit={handleSearch} className="flex-1 max-w-xl min-w-0">
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

      <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
        <button className="glass-button p-2 md:p-2.5 rounded-full">
          <Bell className="w-4 md:w-5 h-4 md:h-5 text-white/70" />
        </button>

        {/* User Menu - only show in standalone mode */}
        {!isEmbedded ? (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-white/10 transition-colors"
            >
              <div className="w-8 md:w-9 h-8 md:h-9 rounded-full bg-accent/20 flex items-center justify-center">
                <span className="text-accent font-semibold text-xs md:text-sm">{userInitial}</span>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-white/60 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {isMenuOpen && (
              <div className="fixed right-4 top-16 w-64 glass rounded-xl border border-white/10 shadow-xl overflow-hidden z-[9999]">
                {/* User Info */}
                <div className="px-4 py-3 border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
                      <span className="text-accent font-semibold">{userInitial}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{userEmail}</p>
                      <p className="text-xs text-white/50">Funnelists Account</p>
                    </div>
                  </div>
                </div>

                {/* Menu Items */}
                <div className="py-1">
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      // TODO: Link to Funnelists account management
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-white/80 hover:bg-white/10 transition-colors"
                  >
                    <User className="w-4 h-4" />
                    Manage Account
                  </button>
                </div>

                {/* Logout */}
                <div className="border-t border-white/10 py-1">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="w-8 md:w-9 h-8 md:h-9 rounded-full bg-accent/20 flex items-center justify-center">
            <span className="text-accent font-semibold text-xs md:text-sm">{userInitial}</span>
          </div>
        )}
      </div>
    </header>
  );
}
