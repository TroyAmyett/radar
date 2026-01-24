'use client';

import { Search, LogOut, User } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';

interface HeaderProps {
  onSearch?: (query: string) => void;
}

export default function Header({ onSearch }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { user, signOut } = useAuth();
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(searchQuery);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/login');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
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

  return (
    <header className="glass border-b border-white/10 px-3 md:px-6 py-3 md:py-4 flex items-center justify-between gap-3">
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

      <div className="relative flex-shrink-0" ref={menuRef}>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="w-8 md:w-9 h-8 md:h-9 rounded-full bg-accent/20 flex items-center justify-center hover:bg-accent/30 transition-colors"
        >
          <User className="w-4 md:w-5 h-4 md:h-5 text-accent" />
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-full mt-2 w-48 py-2 rounded-lg bg-gray-900/95 border border-white/20 shadow-2xl z-[9999]">
            {user?.email && (
              <div className="px-4 py-2 border-b border-white/10">
                <p className="text-xs text-white/60 truncate">{user.email}</p>
              </div>
            )}
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-white/70 hover:text-white hover:bg-white/5 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
