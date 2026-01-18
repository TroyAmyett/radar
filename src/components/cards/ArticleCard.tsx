'use client';

import { ContentItemWithInteraction } from '@/types/database';
import { formatDistanceToNow } from 'date-fns';
import { Heart, Bookmark, MessageSquare, ExternalLink, Sparkles } from 'lucide-react';
import { useState } from 'react';

interface ArticleCardProps {
  item: ContentItemWithInteraction;
  onLike?: (id: string) => void;
  onSave?: (id: string) => void;
  onAddNote?: (id: string, note: string) => void;
  onDeepDive?: (id: string) => void;
}

export default function ArticleCard({
  item,
  onLike,
  onSave,
  onAddNote,
  onDeepDive,
}: ArticleCardProps) {
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [note, setNote] = useState(item.interaction?.notes || '');
  const isLiked = item.interaction?.is_liked || false;
  const isSaved = item.interaction?.is_saved || false;

  const handleAddNote = () => {
    if (note.trim()) {
      onAddNote?.(item.id, note);
      setShowNoteInput(false);
    }
  };

  return (
    <article className="glass-card p-4 group">
      {item.topic && (
        <span
          className="inline-block px-2 py-1 text-xs font-medium rounded-full mb-3"
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
        className="block group-hover:text-accent transition-colors"
      >
        <h3 className="font-semibold text-lg mb-2 line-clamp-2">{item.title}</h3>
      </a>

      {item.summary && (
        <p className="text-white/60 text-sm mb-3 line-clamp-3">{item.summary}</p>
      )}

      <div className="flex items-center justify-between text-white/40 text-xs mb-3">
        {item.author && <span>{item.author}</span>}
        {item.published_at && (
          <span>
            {formatDistanceToNow(new Date(item.published_at), {
              addSuffix: true,
            })}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 pt-3 border-t border-white/10">
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

        <button
          onClick={() => onDeepDive?.(item.id)}
          className="p-2 rounded-lg hover:bg-purple-500/20 text-white/50 hover:text-purple-400 transition-all"
          title="Deep Dive Analysis"
        >
          <Sparkles className="w-4 h-4" />
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
