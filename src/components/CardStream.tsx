'use client';

import { ContentItemWithInteraction } from '@/types/database';
import ArticleCard from './cards/ArticleCard';
import VideoCard from './cards/VideoCard';
import PredictionCard from './cards/PredictionCard';
import { Loader2 } from 'lucide-react';

interface CardStreamProps {
  items: ContentItemWithInteraction[];
  isLoading?: boolean;
  isRefreshing?: boolean;
  onLike?: (id: string) => void;
  onSave?: (id: string) => void;
  onAddNote?: (id: string, note: string) => void;
  onDeepDive?: (id: string) => void;
  onPublish?: (id: string) => void;
  onDismiss?: (id: string) => void;
}

export default function CardStream({
  items,
  isLoading = false,
  isRefreshing = false,
  onLike,
  onSave,
  onAddNote,
  onDeepDive,
  onPublish,
  onDismiss,
}: CardStreamProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-accent animate-spin" />
      </div>
    );
  }

  if (items.length === 0 && isRefreshing) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-white/60">
        <Loader2 className="w-8 h-8 text-accent animate-spin mb-4" />
        <p className="text-lg">Fetching content from your sources...</p>
        <p className="text-sm mt-1 text-white/40">This may take a moment</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-white/40">
        <p className="text-lg">No content found</p>
        <p className="text-sm mt-1">Add sources to start seeing content, then click Refresh</p>
      </div>
    );
  }

  return (
    <div className="masonry-grid">
      {items.map((item) => {
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
                onDismiss={onDismiss}
              />
            </div>
          );
        }

        if (item.type === 'prediction') {
          return (
            <div key={item.id} className="masonry-item">
              <PredictionCard
                item={item}
                onLike={onLike}
                onSave={onSave}
                onAddNote={onAddNote}
                onDismiss={onDismiss}
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
              onDismiss={onDismiss}
            />
          </div>
        );
      })}
    </div>
  );
}
