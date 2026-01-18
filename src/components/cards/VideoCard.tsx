'use client';

import { ContentItemWithInteraction } from '@/types/database';
import { formatDistanceToNow } from 'date-fns';
import { Heart, Bookmark, MessageSquare, ExternalLink, Play, Sparkles, Send, ClipboardList } from 'lucide-react';
import { useState } from 'react';

interface VideoCardProps {
  item: ContentItemWithInteraction;
  onLike?: (id: string) => void;
  onSave?: (id: string) => void;
  onAddNote?: (id: string, note: string) => void;
  onDeepDive?: (id: string) => void;
  onPublish?: (id: string) => void;
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return '';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

export default function VideoCard({
  item,
  onLike,
  onSave,
  onAddNote,
  onDeepDive,
  onPublish,
}: VideoCardProps) {
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

  const handleCreateTask = async () => {
    // Open AgentPM in new tab with prefilled data
    const params = new URLSearchParams({
      title: `Research: ${item.title}`,
      description: item.summary || '',
      radar_item_id: item.id,
    });
    window.open(`https://agentpm.funnelists.com/tasks/new?${params}`, '_blank');

    // Also make API call if AgentPM exposes endpoint
    try {
      await fetch('https://agentpm.funnelists.com/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `Research: ${item.title}`,
          description: item.summary || '',
          radar_item_id: item.id,
        }),
      });
    } catch (error) {
      // Silently fail API call - the new tab will still work
      console.error('Failed to create task via API:', error);
    }
  };

  return (
    <article className="glass-card overflow-hidden group">
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block relative"
      >
        {item.thumbnail_url ? (
          <img
            src={item.thumbnail_url}
            alt={item.title}
            className="w-full aspect-video object-cover"
          />
        ) : (
          <div className="w-full aspect-video bg-white/5 flex items-center justify-center">
            <Play className="w-12 h-12 text-white/20" />
          </div>
        )}

        {item.duration && (
          <span className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/80 text-white text-xs rounded">
            {formatDuration(item.duration)}
          </span>
        )}

        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="w-14 h-14 rounded-full bg-accent flex items-center justify-center">
            <Play className="w-6 h-6 text-white ml-1" />
          </div>
        </div>
      </a>

      <div className="p-4">
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
          <h3 className="font-semibold mb-2 line-clamp-2">{item.title}</h3>
        </a>

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

          <button
            onClick={() => onPublish?.(item.id)}
            className="p-2 rounded-lg hover:bg-green-500/20 text-white/50 hover:text-green-400 transition-all"
            title="Publish to What's Hot"
          >
            <Send className="w-4 h-4" />
          </button>

          <button
            onClick={handleCreateTask}
            className="p-2 rounded-lg hover:bg-blue-500/20 text-white/50 hover:text-blue-400 transition-all"
            title="Create Task in AgentPM"
          >
            <ClipboardList className="w-4 h-4" />
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
      </div>
    </article>
  );
}
