'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ExternalLink, Clock, User, Calendar, Bookmark, Heart, Share2, TrendingUp, Loader2 } from 'lucide-react';
import { ContentItemWithInteraction } from '@/types/database';
import { formatDate } from '@/lib/timezone';
import { authFetch } from '@/lib/api';

// Threshold in characters — if stored content text is shorter, fetch full article
const SHORT_CONTENT_THRESHOLD = 500;

function textLength(html: string | null | undefined): number {
  if (!html) return 0;
  return html.replace(/<[^>]*>/g, '').trim().length;
}

export default function ContentViewerPage() {
  const params = useParams();
  const id = params.id as string;
  const [item, setItem] = useState<ContentItemWithInteraction | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fullContent, setFullContent] = useState<string | null>(null);
  const [isLoadingFull, setIsLoadingFull] = useState(false);

  useEffect(() => {
    async function fetchContent() {
      try {
        const res = await fetch(`/api/content/${id}`);
        if (!res.ok) {
          if (res.status === 401) {
            // Not authenticated — redirect to login with return URL
            window.location.href = `/login?next=${encodeURIComponent(`/view/${id}`)}`;
            return;
          }
          if (res.status === 404) {
            setError('Content not found');
          } else {
            setError('Failed to load content');
          }
          return;
        }
        const data = await res.json();
        setItem(data);
      } catch {
        setError('Failed to load content');
      } finally {
        setIsLoading(false);
      }
    }

    if (id) {
      fetchContent();
    }
  }, [id]);

  // Auto-fetch full article when stored content is short
  useEffect(() => {
    if (!item || item.type !== 'article') return;
    if (textLength(item.content) >= SHORT_CONTENT_THRESHOLD) return;

    let cancelled = false;
    setIsLoadingFull(true);

    fetch(`/api/content/${item.id}/full-article`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (!cancelled && data?.content) {
          setFullContent(data.content);
        }
      })
      .catch(() => { /* keep original content */ })
      .finally(() => { if (!cancelled) setIsLoadingFull(false); });

    return () => { cancelled = true; };
  }, [item]);

  const handleSave = async () => {
    if (!item) return;
    try {
      await authFetch('/api/interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content_item_id: item.id, action: 'save' }),
      });
      setItem(prev => prev ? {
        ...prev,
        interaction: {
          ...prev.interaction,
          id: prev.interaction?.id || '',
          account_id: prev.interaction?.account_id || '',
          content_item_id: item.id,
          is_saved: !prev.interaction?.is_saved,
          is_liked: prev.interaction?.is_liked || false,
          notes: prev.interaction?.notes || null,
          read_at: prev.interaction?.read_at || null,
          created_at: prev.interaction?.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      } : null);
    } catch (err) {
      console.error('Failed to save:', err);
    }
  };

  const handleLike = async () => {
    if (!item) return;
    try {
      await authFetch('/api/interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content_item_id: item.id, action: 'like' }),
      });
      setItem(prev => prev ? {
        ...prev,
        interaction: {
          ...prev.interaction,
          id: prev.interaction?.id || '',
          account_id: prev.interaction?.account_id || '',
          content_item_id: item.id,
          is_liked: !prev.interaction?.is_liked,
          is_saved: prev.interaction?.is_saved || false,
          notes: prev.interaction?.notes || null,
          read_at: prev.interaction?.read_at || null,
          created_at: prev.interaction?.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      } : null);
    } catch (err) {
      console.error('Failed to like:', err);
    }
  };

  const handleShare = async () => {
    if (!item) return;
    try {
      await navigator.share({
        title: item.title,
        url: window.location.href,
      });
    } catch {
      // Fallback to clipboard
      await navigator.clipboard.writeText(window.location.href);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-bold text-white mb-4">{error || 'Content not found'}</h1>
        <Link href="/" className="glass-button">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const isYouTube = item.type === 'video' && item.url?.includes('youtube.com');
  const isPolymarket = item.type === 'prediction';
  const youtubeVideoId = isYouTube ? extractYouTubeId(item.url) : null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/5 backdrop-blur-xl border-b border-white/10" style={{ backgroundColor: 'rgba(10, 10, 20, 0.85)' }}>
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-white/70 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden sm:inline">Back to Dashboard</span>
          </Link>

          <div className="flex items-center gap-2">
            <button
              onClick={handleLike}
              className={`p-2 rounded-lg transition-colors ${
                item.interaction?.is_liked
                  ? 'bg-red-500/20 text-red-400'
                  : 'glass-button'
              }`}
              title="Like"
            >
              <Heart className={`w-5 h-5 ${item.interaction?.is_liked ? 'fill-current' : ''}`} />
            </button>
            <button
              onClick={handleSave}
              className={`p-2 rounded-lg transition-colors ${
                item.interaction?.is_saved
                  ? 'bg-primary/20 text-primary'
                  : 'glass-button'
              }`}
              title="Save"
            >
              <Bookmark className={`w-5 h-5 ${item.interaction?.is_saved ? 'fill-current' : ''}`} />
            </button>
            <button
              onClick={handleShare}
              className="glass-button p-2"
              title="Share"
            >
              <Share2 className="w-5 h-5" />
            </button>
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="glass-button p-2"
              title="View Original"
            >
              <ExternalLink className="w-5 h-5" />
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-2 sm:px-4 py-4 sm:py-6">
        {/* Topic Badge */}
        {item.topic && (
          <div className="mb-4">
            <span
              className="inline-block px-3 py-1 rounded-full text-sm font-medium"
              style={{
                backgroundColor: `${item.topic.color || '#0ea5e9'}20`,
                color: item.topic.color || '#0ea5e9',
              }}
            >
              {item.topic.name}
            </span>
          </div>
        )}

        {/* Title */}
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-4">
          {item.title}
        </h1>

        {/* Meta */}
        <div className="flex flex-wrap items-center gap-4 text-white/60 text-sm mb-6">
          {item.author && (
            <span className="flex items-center gap-1">
              <User className="w-4 h-4" />
              {item.author}
            </span>
          )}
          {item.published_at && (
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {formatDate(item.published_at)}
            </span>
          )}
          {item.duration && (
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {formatDuration(item.duration)}
            </span>
          )}
          {item.source && (
            <span className="flex items-center gap-1">
              {item.source.name}
            </span>
          )}
        </div>

        {/* Content Area - reduced rounding on mobile for more space */}
        <div className="glass-panel rounded-lg sm:rounded-xl overflow-hidden">
          {/* YouTube Embed - Responsive for mobile portrait/landscape */}
          {isYouTube && youtubeVideoId && (
            <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
              <iframe
                src={`https://www.youtube.com/embed/${youtubeVideoId}?autoplay=0&rel=0`}
                title={item.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 w-full h-full"
              />
            </div>
          )}

          {/* Prediction Market */}
          {isPolymarket && (
            <div className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-primary" />
                <span className="text-primary font-medium">Prediction Market</span>
              </div>

              {/* Odds Display */}
              {item.summary && (
                <div className="glass-panel rounded-lg p-4 mb-4">
                  <p className="text-lg text-white font-mono">{item.summary}</p>
                </div>
              )}

              {/* Volume/Liquidity Info */}
              {item.metadata && (
                <div className="flex flex-wrap gap-4 text-sm text-white/60">
                  {(item.metadata as { volume?: string }).volume && (
                    <span>Volume: ${formatNumber((item.metadata as { volume: string }).volume)}</span>
                  )}
                  {(item.metadata as { liquidity?: string }).liquidity && (
                    <span>Liquidity: ${formatNumber((item.metadata as { liquidity: string }).liquidity)}</span>
                  )}
                </div>
              )}

              {/* Description */}
              {item.content && (
                <div className="mt-6 text-white/80 leading-relaxed">
                  {item.content}
                </div>
              )}

              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-flex items-center gap-2 glass-button"
              >
                Trade on Polymarket
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          )}

          {/* Article Content */}
          {item.type === 'article' && (
            <div className="p-6">
              {/* Thumbnail */}
              {item.thumbnail_url && (
                <div className="mb-6 rounded-lg overflow-hidden">
                  <img
                    src={item.thumbnail_url}
                    alt={item.title}
                    className="w-full h-auto max-h-96 object-cover"
                  />
                </div>
              )}

              {/* Summary */}
              {item.summary && (
                <div className="rounded-lg p-4 mb-6 border-l-4 border-primary bg-white/5">
                  <p className="text-white/90 italic">{item.summary}</p>
                </div>
              )}

              {/* Full Content */}
              {(fullContent || item.content) && (
                <div
                  className="prose prose-invert prose-lg max-w-none"
                  dangerouslySetInnerHTML={{ __html: fullContent || item.content || '' }}
                />
              )}

              {/* Loading full article indicator */}
              {isLoadingFull && (
                <div className="flex items-center gap-2 text-white/50 text-sm mt-4">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Loading full article...</span>
                </div>
              )}

              {/* Read More Link */}
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-flex items-center gap-2 glass-button"
              >
                Read Full Article
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          )}

          {/* Video (non-YouTube) */}
          {item.type === 'video' && !isYouTube && (
            <div className="p-6">
              {item.thumbnail_url && (
                <div className="mb-6 rounded-lg overflow-hidden">
                  <img
                    src={item.thumbnail_url}
                    alt={item.title}
                    className="w-full h-auto"
                  />
                </div>
              )}

              {item.summary && (
                <p className="text-white/80 mb-6">{item.summary}</p>
              )}

              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 glass-button"
              >
                Watch Video
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-5xl mx-auto px-4 py-8 mt-8 border-t border-white/10">
        <div className="text-center text-white/40 text-sm">
          <p>Powered by <Link href="/" className="text-primary hover:underline">Radar</Link></p>
        </div>
      </footer>
    </div>
  );
}

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

function formatNumber(value: string): string {
  const num = parseFloat(value);
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
  return num.toFixed(0);
}
