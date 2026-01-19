'use client';

import { Search, Bell } from 'lucide-react';
import { useState } from 'react';

interface HeaderProps {
  onSearch?: (query: string) => void;
}

export default function Header({ onSearch }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(searchQuery);
  };

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

      <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
        <button className="glass-button p-2 md:p-2.5 rounded-full">
          <Bell className="w-4 md:w-5 h-4 md:h-5 text-white/70" />
        </button>
        <div className="w-8 md:w-9 h-8 md:h-9 rounded-full bg-accent/20 flex items-center justify-center">
          <span className="text-accent font-semibold text-xs md:text-sm">U</span>
        </div>
      </div>
    </header>
  );
}
