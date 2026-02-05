'use client';

import { ContentItemWithInteraction } from '@/types/database';
import { formatDistanceToNow } from 'date-fns';
import { Heart, Bookmark, MessageSquare, ExternalLink, Play, Sparkles, Send, ClipboardList, FileText, X, Bot, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';
import { authFetch } from '@/lib/api';

const isEmbedded = process.env.NEXT_PUBLIC_RADAR_MODE === 'embedded';

interface VideoCardProps {
  item: ContentItemWithInteraction;
  onLike?: (id: string) => void;
  onSave?: (id: string) => void;
  onAddNote?: (id: string, note: string) => void;
  onDeepDive?: (id: string) => void;
  onPublish?: (id: string) => void;
  onDismiss?: (id: string) => void;
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
  onDismiss,
}: VideoCardProps) {
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [note, setNote] = useState(item.interaction?.notes || '');
  const [showAiSummary, setShowAiSummary] = useState(false);
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(
    (item.metadata as Record<string, unknown>)?.ai_summary as string || null
  );
  const [keyPoints, setKeyPoints] = useState<string[]>(
    ((item.metadata as Record<string, unknown>)?.key_points as string[]) || []
  );
  const isLiked = item.interaction?.is_liked || false;
  const isSaved = item.interaction?.is_saved || false;
  const hasAiSummary = !!aiSummary;

  const handleAddNote = () => {
    if (note.trim()) {
      onAddNote?.(item.id, note);
      setShowNoteInput(false);
    }
  };

  const handleAiSummary = async () => {
    if (hasAiSummary) {
      setShowAiSummary(!showAiSummary);
      return;
    }

    setIsLoadingAi(true);
    setShowAiSummary(true);

    try {
      const res = await authFetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content_item_id: item.id }),
      });

      if (res.ok) {
        const data = await res.json();
        setAiSummary(data.summary);
        setKeyPoints(data.keyPoints || []);
      } else {
        const errorData = await res.json().catch(() => ({}));
        console.error('AI summary API error:', res.status, errorData);
        setAiSummary(`Error: ${errorData.error || 'Failed to generate summary'}`);
        setShowAiSummary(false);
      }
    } catch (error) {
      console.error('Failed to get AI summary:', error);
      setAiSummary('Error: Network request failed');
      setShowAiSummary(false);
    } finally {
      setIsLoadingAi(false);
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

  return (
    <article className="glass-card overflow-hidden group relative">
      {onDismiss && (
        <button
          onClick={() => onDismiss(item.id)}
          className="absolute top-2 right-2 z-10 p-1.5 rounded-full bg-black/60 hover:bg-red-500/80 text-white/60 hover:text-white transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100"
          title="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      )}
      <Link
        href={`/view/${item.id}`}
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
      </Link>

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

        <Link
          href={`/view/${item.id}`}
          className="block hover:text-accent transition-colors"
        >
          <h3 className="font-semibold mb-2 line-clamp-2">{item.title}</h3>
        </Link>

        {/* Show raw summary if no AI summary shown */}
        {!showAiSummary && item.summary && (
          <p className="text-white/60 text-sm mb-3 line-clamp-4">{item.summary}</p>
        )}

        {/* AI Summary Section */}
        {showAiSummary && (
          <div className="mb-3 p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
            {isLoadingAi ? (
              <div className="flex items-center gap-2 text-purple-400 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Generating AI summary...</span>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-1.5 text-purple-400 text-xs font-medium mb-2">
                  <Bot className="w-3.5 h-3.5" />
                  <span>AI Summary</span>
                </div>
                <p className="text-white/80 text-sm mb-2">{aiSummary}</p>
                {keyPoints.length > 0 && (
                  <ul className="space-y-1">
                    {keyPoints.map((point, i) => (
                      <li key={i} className="text-white/60 text-xs flex items-start gap-2">
                        <span className="text-purple-400 mt-0.5">•</span>
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>
        )}

        {/* AI Summary Toggle Button */}
        <button
          onClick={handleAiSummary}
          disabled={isLoadingAi}
          className={`w-full mb-3 py-1.5 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
            hasAiSummary
              ? 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30'
              : 'bg-white/5 text-white/50 hover:bg-purple-500/20 hover:text-purple-400'
          }`}
        >
          <Bot className={`w-3.5 h-3.5 ${hasAiSummary ? 'text-purple-400' : ''}`} />
          <span>{hasAiSummary ? (showAiSummary ? 'Hide AI Summary' : 'Show AI Summary') : 'Get AI Summary'}</span>
          {hasAiSummary && (showAiSummary ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />)}
        </button>

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
                ? 'bg-yellow-500/20 text-yellow-400'
                : 'hover:bg-yellow-500/20 text-white/50 hover:text-yellow-400'
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

          {onPublish && (
            <button
              onClick={() => onPublish(item.id)}
              className="p-2 rounded-lg hover:bg-green-500/20 text-white/50 hover:text-green-400 transition-all"
              title="Publish to What's Hot"
            >
              <Send className="w-4 h-4" />
            </button>
          )}

          {isEmbedded && (
            <>
              <button
                onClick={handleCreateTask}
                className="p-2 rounded-lg hover:bg-blue-500/20 text-white/50 hover:text-blue-400 transition-all"
                title="Create Task"
              >
                <ClipboardList className="w-4 h-4" />
              </button>
              <button
                onClick={handleSaveToNotes}
                className="p-2 rounded-lg hover:bg-yellow-500/20 text-white/50 hover:text-yellow-400 transition-all"
                title="Save to Notes"
              >
                <FileText className="w-4 h-4" />
              </button>
            </>
          )}

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
