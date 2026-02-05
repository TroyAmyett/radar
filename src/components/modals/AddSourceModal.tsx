'use client';

import { useState, useCallback } from 'react';
import { X, Loader2, Link, Youtube, Rss, Twitter, CheckCircle2, AlertCircle, TrendingUp } from 'lucide-react';
import { Topic } from '@/types/database';
import { authFetch } from '@/lib/api';

interface SourceInfo {
  type: 'youtube' | 'rss' | 'twitter' | 'polymarket';
  name: string;
  url: string;
  imageUrl?: string;
  description?: string;
  channelId?: string;
  username?: string;
  feedUrl?: string;
  subscriberCount?: number;
  suggestedTopicId?: string;
  // Polymarket-specific
  polymarketTags?: string[];
  polymarketExcludeSports?: boolean;
}

interface AddSourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (source: {
    name: string;
    type: 'rss' | 'youtube' | 'twitter' | 'polymarket';
    url: string;
    channel_id?: string;
    username?: string;
    topic_id?: string;
    image_url?: string;
    description?: string;
    metadata?: Record<string, unknown>;
  }) => void;
  topics: Topic[];
}

function formatSubscribers(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M subscribers`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K subscribers`;
  }
  return `${count} subscribers`;
}

const typeIcons = {
  youtube: Youtube,
  rss: Rss,
  twitter: Twitter,
  polymarket: TrendingUp,
};

const typeLabels = {
  youtube: 'YouTube Channel',
  rss: 'RSS Feed',
  twitter: 'X / Twitter',
  polymarket: 'Polymarket',
};

const typeColors = {
  youtube: 'text-red-400',
  rss: 'text-orange-400',
  twitter: 'text-blue-400',
  polymarket: 'text-purple-400',
};

export default function AddSourceModal({
  isOpen,
  onClose,
  onAdd,
  topics,
}: AddSourceModalProps) {
  const [inputUrl, setInputUrl] = useState('');
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [lookupError, setLookupError] = useState('');
  const [sourceInfo, setSourceInfo] = useState<SourceInfo | null>(null);
  const [topicId, setTopicId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Allow editing the auto-detected name
  const [editedName, setEditedName] = useState('');

  // Polymarket-specific preferences
  const [polymarketKeywords, setPolymarketKeywords] = useState('');
  const [polymarketExcludeSports, setPolymarketExcludeSports] = useState(true);
  const [polymarketCategories, setPolymarketCategories] = useState<string[]>([]);

  // Available Polymarket categories
  const POLYMARKET_CATEGORIES = [
    { id: 'politics', label: 'Politics' },
    { id: 'finance', label: 'Finance' },
    { id: 'geopolitics', label: 'Geopolitics' },
    { id: 'crypto', label: 'Crypto' },
    { id: 'tech', label: 'Tech' },
    { id: 'economy', label: 'Economy' },
    { id: 'world', label: 'World' },
    { id: 'elections', label: 'Elections' },
    { id: 'earnings', label: 'Earnings' },
  ];

  // Popular Polymarket topics/tags
  const POLYMARKET_TOPICS = [
    'Trump', 'Fed', 'Iran', 'Israel', 'Tariffs', 'Ukraine',
    'China', 'Bitcoin', 'Greenland', 'Venezuela', 'Russia',
  ];

  const resetForm = useCallback(() => {
    setInputUrl('');
    setIsLookingUp(false);
    setLookupError('');
    setSourceInfo(null);
    setTopicId('');
    setEditedName('');
    setSubmitError('');
    setPolymarketKeywords('');
    setPolymarketExcludeSports(true);
    setPolymarketCategories([]);
  }, []);

  // Normalize URL - add https:// if missing
  const normalizeUrl = useCallback((url: string): string => {
    let normalized = url.trim();
    if (!normalized) return normalized;

    // If it doesn't start with http:// or https://, add https://
    if (!normalized.match(/^https?:\/\//i)) {
      normalized = 'https://' + normalized;
    }
    return normalized;
  }, []);

  const lookupUrl = useCallback(async (urlOverride?: string) => {
    const urlToLookup = urlOverride || inputUrl;
    if (!urlToLookup.trim()) return;

    const normalizedUrl = normalizeUrl(urlToLookup);

    setIsLookingUp(true);
    setLookupError('');
    setSourceInfo(null);

    try {
      const res = await authFetch('/api/sources/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: normalizedUrl }),
      });

      const data = await res.json();

      if (!res.ok) {
        setLookupError(data.error || 'Could not identify source from URL');
        return;
      }

      setSourceInfo(data);
      setEditedName(data.name);
      // Auto-select suggested topic if available
      if (data.suggestedTopicId) {
        setTopicId(data.suggestedTopicId);
      }
    } catch (error) {
      console.error('Lookup error:', error);
      setLookupError('Failed to lookup URL. Please check the URL and try again.');
    } finally {
      setIsLookingUp(false);
    }
  }, [inputUrl, normalizeUrl]);

  // Quick-add handler for clickable source type hints
  const handleQuickAdd = useCallback((type: 'youtube' | 'rss' | 'twitter' | 'polymarket') => {
    const defaultUrls: Record<string, string> = {
      polymarket: 'polymarket.com',
      youtube: 'youtube.com/@',
    };

    if (defaultUrls[type]) {
      setInputUrl(defaultUrls[type]);
      // Auto-lookup for types with default URLs (but not YouTube - user needs to type handle)
      if (type !== 'youtube') {
        lookupUrl(defaultUrls[type]);
      }
    }
  }, [lookupUrl]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLookingUp && inputUrl.trim()) {
      e.preventDefault();
      lookupUrl();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceInfo) return;

    setIsSubmitting(true);
    setSubmitError('');

    // Parse keywords from comma-separated string
    const keywords = polymarketKeywords
      .split(',')
      .map(k => k.trim().toLowerCase())
      .filter(k => k.length > 0);

    const sourceData = {
      name: editedName || sourceInfo.name,
      type: sourceInfo.type,
      url: sourceInfo.feedUrl || sourceInfo.url,
      channel_id: sourceInfo.channelId,
      username: sourceInfo.username,
      topic_id: topicId || undefined,
      image_url: sourceInfo.imageUrl,
      description: sourceInfo.description,
      // Include Polymarket-specific settings in metadata
      metadata: sourceInfo.type === 'polymarket' ? {
        polymarketCategories: polymarketCategories.length > 0 ? polymarketCategories : undefined,
        polymarketKeywords: keywords.length > 0 ? keywords : undefined,
        polymarketExcludeSports: polymarketExcludeSports,
      } : undefined,
    };

    console.log('Adding source with data:', sourceData);

    try {
      await onAdd(sourceData);

      resetForm();
      onClose();
    } catch (error) {
      console.error('Failed to add source:', error);
      setSubmitError(error instanceof Error ? error.message : 'Failed to add source. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  const TypeIcon = sourceInfo ? typeIcons[sourceInfo.type] : Link;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />

      <div className="relative glass-card w-full max-w-md mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 rounded-lg hover:bg-white/10 text-white/50"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-xl font-semibold mb-2">Add New Source</h2>
        <p className="text-sm text-white/50 mb-4">
          Paste any YouTube, Twitter/X, blog URL, or polymarket.com
        </p>

        {/* Source type hints - YouTube and Polymarket are clickable */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            type="button"
            onClick={() => handleQuickAdd('youtube')}
            disabled={isLookingUp}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-500/20 hover:bg-red-500/30 rounded-full text-xs text-red-400 hover:text-red-300 transition-colors cursor-pointer border border-red-500/30"
            title="Click to add YouTube channel - just type the @handle"
          >
            <Youtube className="w-3.5 h-3.5" />
            YouTube
          </button>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white/5 rounded-full text-xs text-white/50">
            <Rss className="w-3.5 h-3.5 text-orange-400" />
            RSS / Blogs
          </span>
          <button
            type="button"
            onClick={() => handleQuickAdd('polymarket')}
            disabled={isLookingUp}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-500/20 hover:bg-purple-500/30 rounded-full text-xs text-purple-400 hover:text-purple-300 transition-colors cursor-pointer border border-purple-500/30"
            title="Click to add Polymarket"
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Polymarket
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* URL Input */}
          <div>
            <label className="block text-sm text-white/60 mb-2">URL</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input
                  type="text"
                  value={inputUrl}
                  onChange={(e) => {
                    setInputUrl(e.target.value);
                    setSourceInfo(null);
                    setLookupError('');
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Paste URL or type @channelname after clicking YouTube"
                  className="glass-input w-full pl-10"
                  autoFocus
                />
              </div>
              <button
                type="button"
                onClick={() => lookupUrl()}
                disabled={!inputUrl.trim() || isLookingUp}
                className="px-4 py-2 bg-accent hover:bg-accent/80 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
              >
                {isLookingUp ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Lookup'
                )}
              </button>
            </div>
          </div>

          {/* Error message */}
          {lookupError && (
            <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-400">{lookupError}</p>
            </div>
          )}

          {/* Source Preview */}
          {sourceInfo && (
            <div className="p-4 bg-white/5 rounded-lg border border-white/10 space-y-4">
              {/* Detected type badge */}
              <div className="flex items-center gap-2">
                {/* Show Twitter icon for RSS.app Twitter feeds */}
                {sourceInfo.feedUrl?.includes('rss.app/feeds/v1.1/twitter') ? (
                  <>
                    <Twitter className="w-5 h-5 text-blue-400" />
                    <span className="text-sm font-medium text-blue-400">
                      X / Twitter Feed
                    </span>
                  </>
                ) : (
                  <>
                    <TypeIcon className={`w-5 h-5 ${typeColors[sourceInfo.type]}`} />
                    <span className={`text-sm font-medium ${typeColors[sourceInfo.type]}`}>
                      {typeLabels[sourceInfo.type]}
                    </span>
                  </>
                )}
                {sourceInfo.type === 'twitter' ? (
                  <span className="ml-auto px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded-full">
                    Paid Service Required
                  </span>
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-green-400 ml-auto" />
                )}
              </div>

              {/* Twitter/X limitation warning */}
              {sourceInfo.type === 'twitter' && (
                <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg space-y-2">
                  <p className="text-sm text-yellow-400 font-medium">
                    X/Twitter requires a paid service to monitor
                  </p>
                  <p className="text-xs text-yellow-400/80">
                    Option 1: Create a feed at <a href="https://rss.app" target="_blank" rel="noopener noreferrer" className="underline hover:text-yellow-300">rss.app</a> (paid), then paste the RSS feed URL here.
                  </p>
                  <p className="text-xs text-yellow-400/80">
                    Option 2: X API integration coming in a future update.
                  </p>
                </div>
              )}

              {/* Source info */}
              <div className="flex gap-4">
                {sourceInfo.imageUrl ? (
                  <img
                    src={sourceInfo.imageUrl}
                    alt={sourceInfo.name}
                    className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                  />
                ) : (
                  <div className={`w-16 h-16 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    sourceInfo.type === 'polymarket' ? 'bg-purple-500/20' :
                    sourceInfo.type === 'youtube' ? 'bg-red-500/20' :
                    sourceInfo.type === 'twitter' ? 'bg-blue-500/20' :
                    'bg-orange-500/20'
                  }`}>
                    <TypeIcon className={`w-8 h-8 ${typeColors[sourceInfo.type]}`} />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  {/* Editable name */}
                  <input
                    type="text"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    className="w-full bg-transparent border-b border-white/20 focus:border-accent outline-none font-semibold text-lg pb-1 mb-1"
                    placeholder="Source name"
                  />
                  {sourceInfo.subscriberCount && sourceInfo.subscriberCount > 0 && (
                    <p className="text-sm text-white/50">
                      {formatSubscribers(sourceInfo.subscriberCount)}
                    </p>
                  )}
                  {sourceInfo.description && (
                    <p className="text-sm text-white/40 line-clamp-2 mt-1">
                      {sourceInfo.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Channel ID display for YouTube */}
              {sourceInfo.channelId && (
                <p className="text-xs text-white/30 font-mono">
                  Channel ID: {sourceInfo.channelId}
                </p>
              )}

              {/* Feed URL display for RSS */}
              {sourceInfo.feedUrl && sourceInfo.feedUrl !== sourceInfo.url && (
                <p className="text-xs text-white/30 truncate">
                  Feed: {sourceInfo.feedUrl}
                </p>
              )}
            </div>
          )}

          {/* Polymarket preferences - only show for Polymarket sources */}
          {sourceInfo?.type === 'polymarket' && (
            <div className="space-y-4 p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
              <div>
                <h4 className="text-sm font-medium text-purple-400">Filter Preferences</h4>
                <p className="text-xs text-white/50 mt-1">
                  Leave empty to see all markets. Select categories and/or keywords to filter.
                </p>
              </div>

              {/* Categories */}
              <div>
                <label className="block text-sm text-white/60 mb-2">Categories (optional)</label>
                <div className="flex flex-wrap gap-2">
                  {POLYMARKET_CATEGORIES.map((cat) => {
                    const isSelected = polymarketCategories.includes(cat.id);
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          setPolymarketCategories(prev =>
                            isSelected
                              ? prev.filter(c => c !== cat.id)
                              : [...prev, cat.id]
                          );
                        }}
                        className={`px-3 py-1 text-sm rounded-full transition-all ${
                          isSelected
                            ? 'bg-purple-500 text-white'
                            : 'bg-white/10 text-white/70 hover:bg-white/20'
                        }`}
                      >
                        {cat.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Topics/Keywords */}
              <div>
                <label className="block text-sm text-white/60 mb-2">Keywords (optional)</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {POLYMARKET_TOPICS.map((topic) => {
                    const isSelected = polymarketKeywords.toLowerCase().includes(topic.toLowerCase());
                    return (
                      <button
                        key={topic}
                        type="button"
                        onClick={() => {
                          const current = polymarketKeywords.split(',').map(k => k.trim()).filter(k => k);
                          if (isSelected) {
                            const filtered = current.filter(k => k.toLowerCase() !== topic.toLowerCase());
                            setPolymarketKeywords(filtered.join(', '));
                          } else {
                            setPolymarketKeywords([...current, topic].join(', '));
                          }
                        }}
                        className={`px-3 py-1 text-sm rounded-full transition-all ${
                          isSelected
                            ? 'bg-purple-500 text-white'
                            : 'bg-white/10 text-white/70 hover:bg-white/20'
                        }`}
                      >
                        {topic}
                      </button>
                    );
                  })}
                </div>
                <input
                  type="text"
                  value={polymarketKeywords}
                  onChange={(e) => setPolymarketKeywords(e.target.value)}
                  placeholder="Or type custom: tariffs, AI, economy..."
                  className="glass-input w-full text-sm"
                />
              </div>

              {/* How filters work explanation */}
              <div className="p-3 bg-white/5 rounded-lg">
                <p className="text-xs text-white/50">
                  <strong className="text-white/70">How it works:</strong> Markets matching <em>any</em> selected category or <em>any</em> keyword will be shown. Leave both empty to see all trending markets.
                </p>
              </div>

              {/* Exclude sports toggle */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={polymarketExcludeSports}
                  onChange={(e) => setPolymarketExcludeSports(e.target.checked)}
                  className="w-4 h-4 rounded border-white/30 bg-white/10 text-purple-500 focus:ring-purple-500"
                />
                <span className="text-sm text-white/70">Exclude sports markets (NBA, NFL, etc.)</span>
              </label>
            </div>
          )}

          {/* Topic selector - only show after source is detected */}
          {sourceInfo && (
            <div>
              <label className="block text-sm text-white/60 mb-2">Topic (optional)</label>
              <select
                value={topicId}
                onChange={(e) => setTopicId(e.target.value)}
                className="glass-input w-full"
              >
                <option value="">No specific topic</option>
                {topics.map((topic) => (
                  <option key={topic.id} value={topic.id}>
                    {topic.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Submit error message */}
          {submitError && (
            <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-400">{submitError}</p>
            </div>
          )}

          {/* Submit button - only show after source is detected */}
          {sourceInfo && (
            <button
              type="submit"
              disabled={isSubmitting || !editedName.trim()}
              className="w-full py-3 bg-accent text-white rounded-lg font-medium hover:bg-accent/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <TypeIcon className="w-4 h-4" />
                  Add {typeLabels[sourceInfo.type]}
                </>
              )}
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
