'use client';

import { ContentItemWithInteraction } from '@/types/database';
import { formatDistanceToNow } from 'date-fns';
import { Heart, Bookmark, MessageSquare, ExternalLink, TrendingUp, X, DollarSign, Droplets, Clock, RefreshCcw } from 'lucide-react';
import { useState, useMemo } from 'react';

interface PredictionCardProps {
  item: ContentItemWithInteraction;
  onLike?: (id: string) => void;
  onSave?: (id: string) => void;
  onAddNote?: (id: string, note: string) => void;
  onDismiss?: (id: string) => void;
}

interface MarketData {
  outcomes?: string[];
  outcomePrices?: string[];
}

interface PredictionMetadata {
  markets?: MarketData[];
  volume?: string;
  volume24hr?: string;
  liquidity?: string;
  endDate?: string;
  lastUpdated?: string;
}

// Format large numbers nicely
function formatNumber(value: string | undefined): string {
  if (!value) return '';
  const num = parseFloat(value);
  if (isNaN(num)) return '';
  if (num >= 1000000) return `$${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `$${(num / 1000).toFixed(0)}K`;
  return `$${num.toFixed(0)}`;
}

// Helper to parse potential JSON strings
function parseJsonOrArray(val: unknown): string[] {
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed;
    } catch { /* ignore */ }
  }
  return [];
}

export default function PredictionCard({
  item,
  onLike,
  onSave,
  onAddNote,
  onDismiss,
}: PredictionCardProps) {
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

  // Parse market data from metadata
  const metadata = item.metadata as PredictionMetadata | null;
  const markets = Array.isArray(metadata?.markets) ? metadata.markets : [];
  const firstMarket = markets[0];

  // Format volume metrics
  const totalVolume = formatNumber(metadata?.volume);
  const volume24hr = formatNumber(metadata?.volume24hr);
  const liquidity = formatNumber(metadata?.liquidity);

  // Parse and sort odds - sorted by probability (highest first)
  const odds = useMemo(() => {
    let results: { outcome: string; probability: number }[] = [];

    if (firstMarket) {
      const outcomes = parseJsonOrArray(firstMarket.outcomes);
      const prices = parseJsonOrArray(firstMarket.outcomePrices);

      if (outcomes.length > 0 && prices.length > 0) {
        results = outcomes.map((outcome, i) => {
          const price = parseFloat(prices[i] || '0');
          const probability = Math.round(price * 100);
          return { outcome, probability };
        });
      }
    }

    // Fallback: parse from summary string like "Yes: 62% | No: 38%"
    if (results.length === 0 && item.summary) {
      const parts = item.summary.split('|').map(p => p.trim());
      results = parts.map(part => {
        const match = part.match(/(.+?):\s*(\d+)%/);
        if (match) {
          return { outcome: match[1].trim(), probability: parseInt(match[2]) };
        }
        return { outcome: part, probability: 0 };
      }).filter(r => r.probability > 0);
    }

    // Sort by probability descending
    return results.sort((a, b) => b.probability - a.probability);
  }, [firstMarket, item.summary]);

  // Determine if this is a simple Yes/No market or a multi-candidate market
  const isSimpleYesNo = odds.length === 2 &&
    odds.some(o => o.outcome.toLowerCase() === 'yes') &&
    odds.some(o => o.outcome.toLowerCase() === 'no');

  return (
    <article className="glass-card overflow-hidden group relative">
      {onDismiss && (
        <button
          onClick={() => onDismiss(item.id)}
          className="absolute top-2 right-2 z-10 p-1.5 rounded-full bg-black/50 hover:bg-red-500/80 text-white/60 hover:text-white transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100"
          title="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      )}

      {/* Thumbnail image */}
      {item.thumbnail_url && (
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block relative"
        >
          <img
            src={item.thumbnail_url}
            alt={item.title}
            className="w-full h-40 object-cover"
          />
          {/* Polymarket badge overlay */}
          <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-1 rounded-full bg-purple-500/90 backdrop-blur-sm">
            <TrendingUp className="w-3 h-3 text-white" />
            <span className="text-xs font-medium text-white">Polymarket</span>
          </div>
        </a>
      )}

      <div className="p-4">
        {/* No image fallback - show badge inline */}
        {!item.thumbnail_url && (
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-purple-400" />
            <span className="text-xs font-medium text-purple-400">Prediction Market</span>
            {item.topic && (
              <span
                className="ml-auto px-2 py-0.5 text-xs font-medium rounded-full"
                style={{
                  backgroundColor: `${item.topic.color}20`,
                  color: item.topic.color || '#0ea5e9',
                }}
              >
                {item.topic.name}
              </span>
            )}
          </div>
        )}

        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block group-hover:text-accent transition-colors"
        >
          <h3 className="font-semibold text-lg mb-3 line-clamp-2">{item.title}</h3>
        </a>

        {/* Odds display - different layouts for Yes/No vs multi-candidate */}
        {odds.length > 0 && isSimpleYesNo && (
          <div className="flex gap-2 mb-3">
            {odds.slice(0, 2).map((odd, i) => (
              <div
                key={i}
                className="flex-1 p-3 rounded-lg bg-white/5 border border-white/10 text-center"
              >
                <div className={`text-2xl font-bold ${odd.probability >= 50 ? 'text-green-400' : 'text-red-400'}`}>
                  {odd.probability}%
                </div>
                <div className="text-xs text-white/50 mt-1 truncate">{odd.outcome}</div>
              </div>
            ))}
          </div>
        )}

        {/* Multi-candidate market - show ranked list */}
        {odds.length > 0 && !isSimpleYesNo && (
          <div className="mb-3 space-y-1.5">
            {odds.slice(0, 4).map((odd, i) => (
              <div
                key={i}
                className={`flex items-center gap-2 p-2 rounded-lg ${
                  i === 0 ? 'bg-green-500/10 border border-green-500/30' : 'bg-white/5'
                }`}
              >
                {/* Rank indicator */}
                <span className={`w-5 h-5 flex items-center justify-center rounded-full text-xs font-bold ${
                  i === 0 ? 'bg-green-500 text-white' : 'bg-white/10 text-white/50'
                }`}>
                  {i + 1}
                </span>
                {/* Candidate name */}
                <span className={`flex-1 text-sm truncate ${i === 0 ? 'text-white font-medium' : 'text-white/70'}`}>
                  {odd.outcome}
                </span>
                {/* Percentage */}
                <span className={`text-sm font-bold ${
                  i === 0 ? 'text-green-400' : odd.probability >= 20 ? 'text-yellow-400' : 'text-white/50'
                }`}>
                  {odd.probability}%
                </span>
                {/* Progress bar */}
                <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${i === 0 ? 'bg-green-500' : 'bg-white/30'}`}
                    style={{ width: `${odd.probability}%` }}
                  />
                </div>
              </div>
            ))}
            {odds.length > 4 && (
              <div className="text-xs text-white/40 text-center pt-1">
                +{odds.length - 4} more candidates
              </div>
            )}
          </div>
        )}

        {/* Market metrics */}
        <div className="flex flex-wrap gap-3 text-xs text-white/50 mb-3">
          {totalVolume && (
            <div className="flex items-center gap-1" title="Total volume">
              <DollarSign className="w-3 h-3" />
              <span>{totalVolume}</span>
            </div>
          )}
          {volume24hr && (
            <div className="flex items-center gap-1 text-green-400" title="24h volume">
              <TrendingUp className="w-3 h-3" />
              <span>{volume24hr} 24h</span>
            </div>
          )}
          {liquidity && (
            <div className="flex items-center gap-1" title="Liquidity">
              <Droplets className="w-3 h-3" />
              <span>{liquidity}</span>
            </div>
          )}
          {metadata?.lastUpdated && (
            <div className="flex items-center gap-1" title="Last updated">
              <RefreshCcw className="w-3 h-3" />
              <span>{formatDistanceToNow(new Date(metadata.lastUpdated), { addSuffix: true })}</span>
            </div>
          )}
          {metadata?.endDate && (
            <div className="flex items-center gap-1 ml-auto" title="Resolution date">
              <Clock className="w-3 h-3" />
              <span>Resolves {formatDistanceToNow(new Date(metadata.endDate), { addSuffix: true })}</span>
            </div>
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
