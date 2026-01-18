'use client';

import { ContentItemWithInteraction, Advisor } from '@/types/database';
import ArticleCard from './cards/ArticleCard';
import VideoCard from './cards/VideoCard';
import AdvisorCard from './cards/AdvisorCard';
import { Loader2 } from 'lucide-react';

interface CardStreamProps {
  items: ContentItemWithInteraction[];
  advisors?: Record<string, Advisor>;
  isLoading?: boolean;
  onLike?: (id: string) => void;
  onSave?: (id: string) => void;
  onAddNote?: (id: string, note: string) => void;
  onDeepDive?: (id: string) => void;
  onPublish?: (id: string) => void;
}

export default function CardStream({
  items,
  advisors = {},
  isLoading = false,
  onLike,
  onSave,
  onAddNote,
  onDeepDive,
  onPublish,
}: CardStreamProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-accent animate-spin" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-white/40">
        <p className="text-lg">No content yet</p>
        <p className="text-sm mt-1">Add sources to start seeing content</p>
      </div>
    );
  }

  return (
    <div className="masonry-grid">
      {items.map((item) => {
        const advisor = item.advisor_id ? advisors[item.advisor_id] : undefined;

        if (item.type === 'tweet' || item.type === 'post') {
          return (
            <div key={item.id} className="masonry-item">
              <AdvisorCard
                item={item}
                advisor={advisor}
                onLike={onLike}
                onSave={onSave}
                onAddNote={onAddNote}
              />
            </div>
          );
        }

        if (item.type === 'video') {
          return (
            <div key={item.id} className="masonry-item">
              <VideoCard
                item={item}
                onLike={onLike}
                onSave={onSave}
                onAddNote={onAddNote}
                onDeepDive={onDeepDive}
                onPublish={onPublish}
              />
            </div>
          );
        }

        return (
          <div key={item.id} className="masonry-item">
            <ArticleCard
              item={item}
              onLike={onLike}
              onSave={onSave}
              onAddNote={onAddNote}
              onDeepDive={onDeepDive}
              onPublish={onPublish}
            />
          </div>
        );
      })}
    </div>
  );
}
