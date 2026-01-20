'use client';

import { ContentItemWithInteraction } from '@/types/database';
import { formatDistanceToNow } from 'date-fns';
import { Heart, Bookmark, MessageSquare, ExternalLink, Sparkles, Send, ClipboardList, FileText, X, Volume2, VolumeX, MoreHorizontal } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

interface ArticleCardProps {
  item: ContentItemWithInteraction;
  onLike?: (id: string) => void;
  onSave?: (id: string) => void;
  onAddNote?: (id: string, note: string) => void;
  onDeepDive?: (id: string) => void;
  onPublish?: (id: string) => void;
  onDismiss?: (id: string) => void;
}

export default function ArticleCard({
  item,
  onLike,
  onSave,
  onAddNote,
  onDeepDive,
  onPublish,
  onDismiss,
}: ArticleCardProps) {
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [note, setNote] = useState(item.interaction?.notes || '');
  const [isReading, setIsReading] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const isLiked = item.interaction?.is_liked || false;
  const isSaved = item.interaction?.is_saved || false;

  // Close more menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setShowMoreMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAddNote = () => {
    if (note.trim()) {
      onAddNote?.(item.id, note);
      setShowNoteInput(false);
    }
  };

  const handleCreateTask = () => {
    // Open AgentPM in new tab with prefilled data
    const params = new URLSearchParams({
      title: `Research: ${item.title}`,
      description: item.summary || '',
    });
    window.open(`https://agentpm.funnelists.com/tasks/new?${params}`, '_blank');
  };

  const handleSaveToNotes = () => {
    // Open NoteTaker in new tab with prefilled data
    const params = new URLSearchParams({
      title: item.title,
      content: item.summary || item.content || '',
    });
    window.open(`https://agentpm.funnelists.com/notes/new?${params}`, '_blank');
  };

  const handleReadAloud = () => {
    if (isReading) {
      // Stop reading
      window.speechSynthesis.cancel();
      setIsReading(false);
      return;
    }

    // Build text to read: title + summary/content
    const textToRead = `${item.title}. ${item.summary || item.content || ''}`;

    if (!textToRead.trim()) return;

    const utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onend = () => setIsReading(false);
    utterance.onerror = () => setIsReading(false);

    setIsReading(true);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <article className="glass-card p-3 md:p-4 group relative">
      {onDismiss && (
        <button
          onClick={() => onDismiss(item.id)}
          className="absolute top-2 right-2 z-10 p-1.5 rounded-full bg-white/5 hover:bg-red-500/80 text-white/40 hover:text-white transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100"
          title="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      )}
      {item.topic && (
        <span
          className="inline-block px-2 py-0.5 md:py-1 text-xs font-medium rounded-full mb-2 md:mb-3"
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
        <h3 className="font-semibold text-base md:text-lg mb-2 line-clamp-2 pr-6">{item.title}</h3>
      </a>

      {item.thumbnail_url && (
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block mb-2 md:mb-3"
        >
          <img
            src={item.thumbnail_url}
            alt={item.title}
            className="w-full h-32 md:h-40 object-cover rounded-lg"
            onError={(e) => {
              // Hide image if it fails to load
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </a>
      )}

      {item.summary && (
        <p className="text-white/60 text-sm mb-2 md:mb-3 line-clamp-2 md:line-clamp-3">{item.summary}</p>
      )}

      <div className="flex items-center justify-between text-white/40 text-xs mb-2 md:mb-3">
        {item.author && <span>{item.author}</span>}
        {item.published_at && (
          <span>
            {formatDistanceToNow(new Date(item.published_at), {
              addSuffix: true,
            })}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1 md:gap-2 pt-3 border-t border-white/10">
        {/* Primary actions - always visible */}
        <button
          onClick={() => onLike?.(item.id)}
          className={`p-1.5 md:p-2 rounded-lg transition-all ${
            isLiked
              ? 'bg-red-500/20 text-red-400'
              : 'hover:bg-white/10 text-white/50'
          }`}
          title="Like"
        >
          <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
        </button>

        <button
          onClick={() => onSave?.(item.id)}
          className={`p-1.5 md:p-2 rounded-lg transition-all ${
            isSaved
              ? 'bg-accent/20 text-accent'
              : 'hover:bg-white/10 text-white/50'
          }`}
          title="Save"
        >
          <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
        </button>

        <button
          onClick={handleReadAloud}
          className={`p-1.5 md:p-2 rounded-lg transition-all ${
            isReading
              ? 'bg-orange-500/20 text-orange-400'
              : 'hover:bg-orange-500/20 text-white/50 hover:text-orange-400'
          }`}
          title={isReading ? 'Stop Reading' : 'Read Aloud'}
        >
          {isReading ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>

        {/* Secondary actions - hidden on mobile, shown in menu */}
        <div className="hidden md:flex items-center gap-2">
          <button
            onClick={() => setShowNoteInput(!showNoteInput)}
            className={`p-2 rounded-lg transition-all ${
              item.interaction?.notes
                ? 'bg-accent/20 text-accent'
                : 'hover:bg-white/10 text-white/50'
            }`}
            title="Add Note"
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
            title="Create Task - Opens AgentPM to create a research task from this content"
          >
            <ClipboardList className="w-4 h-4" />
          </button>

          <button
            onClick={handleSaveToNotes}
            className="p-2 rounded-lg hover:bg-yellow-500/20 text-white/50 hover:text-yellow-400 transition-all"
            title="Save to Notes - Opens AgentPM NoteTaker with this content"
          >
            <FileText className="w-4 h-4" />
          </button>
        </div>

        {/* More menu for mobile */}
        <div className="relative md:hidden" ref={moreMenuRef}>
          <button
            onClick={() => setShowMoreMenu(!showMoreMenu)}
            className="p-1.5 rounded-lg hover:bg-white/10 text-white/50 transition-all"
            title="More actions"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {showMoreMenu && (
            <div className="absolute bottom-full right-0 mb-2 py-2 w-48 bg-gray-900/95 backdrop-blur-lg border border-white/10 rounded-lg shadow-xl z-20">
              <button
                onClick={() => { setShowNoteInput(!showNoteInput); setShowMoreMenu(false); }}
                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-white/70 hover:bg-white/10 hover:text-white"
              >
                <MessageSquare className="w-4 h-4" />
                Add Note
              </button>
              <button
                onClick={() => { onDeepDive?.(item.id); setShowMoreMenu(false); }}
                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-white/70 hover:bg-white/10 hover:text-purple-400"
              >
                <Sparkles className="w-4 h-4" />
                Deep Dive
              </button>
              <button
                onClick={() => { onPublish?.(item.id); setShowMoreMenu(false); }}
                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-white/70 hover:bg-white/10 hover:text-green-400"
              >
                <Send className="w-4 h-4" />
                Publish
              </button>
              <button
                onClick={() => { handleCreateTask(); setShowMoreMenu(false); }}
                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-white/70 hover:bg-white/10 hover:text-blue-400"
              >
                <ClipboardList className="w-4 h-4" />
                Create Task
              </button>
              <button
                onClick={() => { handleSaveToNotes(); setShowMoreMenu(false); }}
                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-white/70 hover:bg-white/10 hover:text-yellow-400"
              >
                <FileText className="w-4 h-4" />
                Save to Notes
              </button>
            </div>
          )}
        </div>

        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto p-1.5 md:p-2 rounded-lg hover:bg-white/10 text-white/50"
          title="Open article"
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
