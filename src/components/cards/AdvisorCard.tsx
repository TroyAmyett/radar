'use client';

import { Advisor, ContentItemWithInteraction } from '@/types/database';
import { formatDistanceToNow } from 'date-fns';
import {
  Heart,
  Bookmark,
  MessageSquare,
  ExternalLink,
  Twitter,
  Linkedin,
  Youtube,
  LucideProps,
} from 'lucide-react';
import { useState } from 'react';

interface AdvisorCardProps {
  item: ContentItemWithInteraction;
  advisor?: Advisor;
  onLike?: (id: string) => void;
  onSave?: (id: string) => void;
  onAddNote?: (id: string, note: string) => void;
}

const platformIcons: Record<string, React.ComponentType<LucideProps>> = {
  twitter: Twitter,
  linkedin: Linkedin,
  youtube: Youtube,
};

export default function AdvisorCard({
  item,
  advisor,
  onLike,
  onSave,
  onAddNote,
}: AdvisorCardProps) {
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [note, setNote] = useState(item.interaction?.notes || '');
  const isLiked = item.interaction?.is_liked || false;
  const isSaved = item.interaction?.is_saved || false;

  const PlatformIcon = advisor?.platform
    ? platformIcons[advisor.platform] || Twitter
    : Twitter;

  const handleAddNote = () => {
    if (note.trim()) {
      onAddNote?.(item.id, note);
      setShowNoteInput(false);
    }
  };

  return (
    <article className="glass-card p-4 group">
      <div className="flex items-start gap-3 mb-3">
        {advisor?.avatar_url ? (
          <img
            src={advisor.avatar_url}
            alt={advisor.name}
            className="w-12 h-12 rounded-full object-cover"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center">
            <span className="text-accent font-semibold text-lg">
              {advisor?.name?.charAt(0) || item.author?.charAt(0) || 'A'}
            </span>
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold truncate">
              {advisor?.name || item.author}
            </span>
            <PlatformIcon className="w-4 h-4 text-white/40" />
          </div>
          {advisor?.username && (
            <span className="text-white/40 text-sm">@{advisor.username}</span>
          )}
        </div>

        {item.published_at && (
          <span className="text-white/40 text-xs">
            {formatDistanceToNow(new Date(item.published_at), {
              addSuffix: true,
            })}
          </span>
        )}
      </div>

      {item.topic && (
        <span
          className="inline-block px-2 py-1 text-xs font-medium rounded-full mb-2"
          style={{
            backgroundColor: `${item.topic.color}20`,
            color: item.topic.color || '#0ea5e9',
          }}
        >
          {item.topic.name}
        </span>
      )}

      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block hover:text-accent transition-colors"
      >
        <p className="text-white/80 text-sm whitespace-pre-wrap line-clamp-6">
          {item.content || item.summary || item.title}
        </p>
      </a>

      <div className="flex items-center gap-2 pt-3 mt-3 border-t border-white/10">
        <button
          onClick={() => onLike?.(item.id)}
          className={`p-2 rounded-lg transition-all ${
            isLiked
              ? 'bg-red-500/20 text-red-400'
              : 'hover:bg-white/10 text-white/50'
          }`}
        >
          <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
        </button>

        <button
          onClick={() => onSave?.(item.id)}
          className={`p-2 rounded-lg transition-all ${
            isSaved
              ? 'bg-accent/20 text-accent'
              : 'hover:bg-white/10 text-white/50'
          }`}
        >
          <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
        </button>

        <button
          onClick={() => setShowNoteInput(!showNoteInput)}
          className={`p-2 rounded-lg transition-all ${
            item.interaction?.notes
              ? 'bg-accent/20 text-accent'
              : 'hover:bg-white/10 text-white/50'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
        </button>

        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto p-2 rounded-lg hover:bg-white/10 text-white/50"
        >
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>

      {showNoteInput && (
        <div className="mt-3 pt-3 border-t border-white/10">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add a note..."
            className="glass-input w-full text-sm resize-none"
            rows={2}
          />
          <button
            onClick={handleAddNote}
            className="mt-2 px-3 py-1.5 bg-accent text-white text-sm rounded-lg hover:bg-accent/80 transition-colors"
          >
            Save Note
          </button>
        </div>
      )}
    </article>
  );
}
