'use client';

import { ContentItemWithInteraction } from '@/types/database';
import ArticleCard from './cards/ArticleCard';
import VideoCard from './cards/VideoCard';
import PredictionCard from './cards/PredictionCard';
import { Loader2, Rss, Plus } from 'lucide-react';
import Link from 'next/link';

export type CardDensity = 'comfortable' | 'cozy' | 'compact' | 'dense';

interface CardStreamProps {
  items: ContentItemWithInteraction[];
  isLoading?: boolean;
  isRefreshing?: boolean;
  density?: CardDensity;
  onLike?: (id: string) => void;
  onSave?: (id: string) => void;
  onAddNote?: (id: string, note: string) => void;
  onPublish?: (id: string) => void;
  onDismiss?: (id: string) => void;
}

export default function CardStream({
  items,
  isLoading = false,
  isRefreshing = false,
  density = 'comfortable',
  onLike,
  onSave,
  onAddNote,
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
        <Rss className="w-12 h-12 mb-3" />
        <p className="text-lg">No content found</p>
        <p className="text-sm mt-1 mb-4">Add sources to start seeing content, then click Refresh</p>
        <Link
          href="/sources"
          className="flex items-center gap-2 bg-accent hover:bg-accent/80 text-white font-medium py-2.5 px-5 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Sources
        </Link>
      </div>
    );
  }

  return (
    <div className={`masonry-grid density-${density}`}>
      {items.map((item) => {
        if (item.type === 'video') {
          return (
            <div key={item.id} className="masonry-item">
              <VideoCard
                item={item}
                onLike={onLike}
                onSave={onSave}
                onAddNote={onAddNote}
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
              onPublish={onPublish}
              onDismiss={onDismiss}
            />
          </div>
        );
      })}
    </div>
  );
}
