'use client';

import { Youtube, FileText, Twitter, TrendingUp, Check } from 'lucide-react';

export type ContentType = 'video' | 'article' | 'post' | 'tweet' | 'prediction';

interface ContentTypeFilterProps {
  selectedTypes: ContentType[];
  onToggleType: (type: ContentType) => void;
  onToggleAll: () => void;
}

const contentTypes: { type: ContentType; label: string; icon: typeof Youtube; color: string; comingSoon?: boolean }[] = [
  { type: 'video', label: 'Videos', icon: Youtube, color: '#ef4444' },
  { type: 'article', label: 'Articles', icon: FileText, color: '#f97316' },
  { type: 'prediction', label: 'Predictions', icon: TrendingUp, color: '#a855f7' },
  { type: 'post', label: 'Posts', icon: Twitter, color: '#3b82f6', comingSoon: true },
];

export default function ContentTypeFilter({
  selectedTypes,
  onToggleType,
  onToggleAll,
}: ContentTypeFilterProps) {
  const allSelected = selectedTypes.length === contentTypes.length;

  return (
    <div className="flex items-center gap-2 md:gap-3 text-xs md:text-sm overflow-x-auto pb-1 scrollbar-hide">
      <span className="text-white/40 flex-shrink-0">Show:</span>

      {/* All checkbox */}
      <label className="flex items-center gap-1 md:gap-1.5 cursor-pointer group flex-shrink-0">
        <div
          className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
            allSelected
              ? 'bg-accent border-accent'
              : 'border-white/30 group-hover:border-white/50'
          }`}
          onClick={onToggleAll}
        >
          {allSelected && <Check className="w-3 h-3 text-white" />}
        </div>
        <span className={`${allSelected ? 'text-white' : 'text-white/60'} group-hover:text-white`}>
          All
        </span>
      </label>

      <span className="text-white/20 flex-shrink-0">|</span>

      {/* Individual type checkboxes */}
      {contentTypes.map(({ type, label, icon: Icon, color, comingSoon }) => {
        const isSelected = selectedTypes.includes(type);

        // Hide coming soon types from filter for now
        if (comingSoon) return null;

        return (
          <label key={type} className="flex items-center gap-1 md:gap-1.5 cursor-pointer group flex-shrink-0">
            <div
              className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                isSelected
                  ? 'border-transparent'
                  : 'border-white/30 group-hover:border-white/50'
              }`}
              style={{ backgroundColor: isSelected ? color : undefined }}
              onClick={() => onToggleType(type)}
            >
              {isSelected && <Check className="w-3 h-3 text-white" />}
            </div>
            <Icon
              className="w-3.5 h-3.5"
              style={{ color: isSelected ? color : 'rgba(255,255,255,0.4)' }}
            />
            <span className={`${isSelected ? 'text-white' : 'text-white/60'} group-hover:text-white`}>
              {label}
            </span>
          </label>
        );
      })}
    </div>
  );
}
