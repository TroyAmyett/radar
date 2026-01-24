'use client';

import { Search, LogOut, ChevronDown, User } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

interface HeaderProps {
  onSearch?: (query: string) => void;
}

export default function Header({ onSearch }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  // Track when component is mounted for portal
  useEffect(() => {
    setMounted(true);
  }, []);

  const isEmbedded = process.env.NEXT_PUBLIC_RADAR_MODE === 'embedded';

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(searchQuery);
  };

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      const clickedOutsideMenu = menuRef.current && !menuRef.current.contains(target);
      const clickedOutsideButton = buttonRef.current && !buttonRef.current.contains(target);
      if (clickedOutsideMenu && clickedOutsideButton) {
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

  const userEmail = user?.email || 'User';

  return (
    <header className="glass border-b border-white/10 pl-14 pr-3 lg:px-6 py-3 lg:py-4 flex items-center justify-between gap-3 sticky top-0 z-[100]">
      <form onSubmit={handleSearch} className="flex-1 max-w-xl min-w-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 lg:w-5 h-4 lg:h-5 text-white/40" />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="glass-input w-full pl-9 lg:pl-10 pr-3 lg:pr-4 py-2 lg:py-2.5 text-sm lg:text-base"
          />
        </div>
      </form>

      <div className="flex items-center gap-2 lg:gap-4 flex-shrink-0">
        {/* User Menu - only show in standalone mode */}
        {!isEmbedded ? (
          <div className="relative" ref={menuRef}>
            <button
              ref={buttonRef}
              onClick={() => {
                if (!isMenuOpen && buttonRef.current) {
                  const rect = buttonRef.current.getBoundingClientRect();
                  setMenuPosition({
                    top: rect.bottom + 8,
                    right: window.innerWidth - rect.right,
                  });
                }
                setIsMenuOpen(!isMenuOpen);
              }}
              className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-white/10 transition-colors"
            >
              <div className="w-8 lg:w-9 h-8 lg:h-9 rounded-full bg-accent/20 flex items-center justify-center">
                <User className="w-4 lg:w-5 h-4 lg:h-5 text-accent" />
              </div>
              <ChevronDown
                className={`w-4 h-4 text-white/60 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {isMenuOpen && mounted && createPortal(
              <div
                ref={menuRef}
                className="fixed w-64 bg-[#1a1a2e] rounded-xl border border-white/10 shadow-2xl overflow-hidden z-[9999]"
                style={{ top: menuPosition.top, right: menuPosition.right }}
              >
                {/* User Info */}
                <div className="px-4 py-3 border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
                      <User className="w-5 h-5 text-accent" />
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
                    <div className="w-10 flex items-center justify-center">
                      <User className="w-4 h-4" />
                    </div>
                    Manage Account
                  </button>
                </div>

                {/* Logout */}
                <div className="border-t border-white/10 py-1">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <div className="w-10 flex items-center justify-center">
                      <LogOut className="w-4 h-4" />
                    </div>
                    Sign Out
                  </button>
                </div>
              </div>,
              document.body
            )}
          </div>
        ) : (
          <div className="w-8 lg:w-9 h-8 lg:h-9 rounded-full bg-accent/20 flex items-center justify-center">
            <User className="w-4 lg:w-5 h-4 lg:h-5 text-accent" />
          </div>
        )}
      </div>
    </header>
  );
}
