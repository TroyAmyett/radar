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
    <header className="glass border-b border-white/10 px-6 py-4 flex items-center justify-between">
      <form onSubmit={handleSearch} className="flex-1 max-w-xl">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
          <input
            type="text"
            placeholder="Search content..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="glass-input w-full pl-10 pr-4"
          />
        </div>
      </form>

      <div className="flex items-center gap-4 ml-6">
        <button className="glass-button p-2.5 rounded-full">
          <Bell className="w-5 h-5 text-white/70" />
        </button>
        <div className="w-9 h-9 rounded-full bg-accent/20 flex items-center justify-center">
          <span className="text-accent font-semibold text-sm">U</span>
        </div>
      </div>
    </header>
  );
}
