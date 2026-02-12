'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, Youtube, Rss, Twitter, TrendingUp } from 'lucide-react';
import { Source, Topic } from '@/types/database';

interface EditSourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (source: Partial<Source> & { id: string }) => Promise<void>;
  source: Source | null;
  topics: Topic[];
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

export default function EditSourceModal({
  isOpen,
  onClose,
  onSave,
  source,
  topics,
}: EditSourceModalProps) {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [channelId, setChannelId] = useState('');
  const [username, setUsername] = useState('');
  const [topicId, setTopicId] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Polymarket-specific settings
  const [polymarketKeywords, setPolymarketKeywords] = useState('');
  const [polymarketExcludeSports, setPolymarketExcludeSports] = useState(true);
  const [polymarketCategories, setPolymarketCategories] = useState<string[]>([]);
  const [polymarketMaxPerTag, setPolymarketMaxPerTag] = useState(3);

  // Reset form when source changes
  useEffect(() => {
    if (source) {
      setName(source.name || '');
      setUrl(source.url || '');
      setChannelId(source.channel_id || '');
      setUsername(source.username || '');
      setTopicId(source.topic_id || '');

      // Load Polymarket settings from metadata
      const metadata = source.metadata as {
        polymarketKeywords?: string[];
        polymarketExcludeSports?: boolean;
        polymarketCategories?: string[];
        polymarketMaxPerTag?: number;
      } | null;

      if (metadata) {
        setPolymarketKeywords(metadata.polymarketKeywords?.join(', ') || '');
        setPolymarketExcludeSports(metadata.polymarketExcludeSports !== false);
        setPolymarketCategories(metadata.polymarketCategories || []);
        setPolymarketMaxPerTag(metadata.polymarketMaxPerTag ?? 3);
      } else {
        setPolymarketKeywords('');
        setPolymarketExcludeSports(true);
        setPolymarketCategories([]);
        setPolymarketMaxPerTag(3);
      }
    }
  }, [source]);

  if (!isOpen || !source) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    // Parse keywords from comma-separated string
    const keywords = polymarketKeywords
      .split(',')
      .map(k => k.trim().toLowerCase())
      .filter(k => k.length > 0);

    try {
      await onSave({
        id: source.id,
        name,
        url,
        channel_id: channelId || undefined,
        username: username || undefined,
        topic_id: topicId || undefined,
        // Include Polymarket settings in metadata
        metadata: source.type === 'polymarket' ? {
          polymarketCategories: polymarketCategories.length > 0 ? polymarketCategories : undefined,
          polymarketKeywords: keywords.length > 0 ? keywords : undefined,
          polymarketExcludeSports: polymarketExcludeSports,
          polymarketMaxPerTag: polymarketMaxPerTag,
        } : source.metadata,
      });
      onClose();
    } catch (error) {
      console.error('Failed to save source:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleCategory = (categoryId: string) => {
    setPolymarketCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(c => c !== categoryId)
        : [...prev, categoryId]
    );
  };

  const TypeIcon = typeIcons[source.type as keyof typeof typeIcons] || Rss;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative glass-card w-full max-w-md mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg hover:bg-white/10 text-white/50"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <TypeIcon className={`w-6 h-6 ${typeColors[source.type as keyof typeof typeColors]}`} />
          <div>
            <h2 className="text-xl font-semibold">Edit Source</h2>
            <p className="text-sm text-white/50">{typeLabels[source.type as keyof typeof typeLabels]}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm text-white/60 mb-2">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Source name"
              className="glass-input w-full"
              required
            />
          </div>

          {/* URL */}
          <div>
            <label className="block text-sm text-white/60 mb-2">
              {source.type === 'rss' ? 'Feed URL' : 'URL'}
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
              className="glass-input w-full"
              required
            />
          </div>

          {/* Channel ID for YouTube */}
          {source.type === 'youtube' && (
            <div>
              <label className="block text-sm text-white/60 mb-2">Channel ID</label>
              <input
                type="text"
                value={channelId}
                onChange={(e) => setChannelId(e.target.value)}
                placeholder="UCxxxxxxxxxxxxxxxx"
                className="glass-input w-full font-mono text-sm"
              />
              <p className="text-xs text-white/40 mt-1">
                The YouTube channel ID (starts with UC)
              </p>
            </div>
          )}

          {/* Username for Twitter */}
          {source.type === 'twitter' && (
            <div>
              <label className="block text-sm text-white/60 mb-2">Username</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">@</span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.replace(/^@/, ''))}
                  placeholder="username"
                  className="glass-input w-full pl-8"
                />
              </div>
            </div>
          )}

          {/* Polymarket Settings */}
          {source.type === 'polymarket' && (
            <>
              {/* Exclude Sports */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="excludeSports"
                  checked={polymarketExcludeSports}
                  onChange={(e) => setPolymarketExcludeSports(e.target.checked)}
                  className="w-4 h-4 rounded border-white/20 bg-white/5 text-primary focus:ring-primary"
                />
                <label htmlFor="excludeSports" className="text-sm text-white/80">
                  Exclude sports markets
                </label>
              </div>

              {/* Max per tag (diversity) */}
              <div>
                <label className="block text-sm text-white/60 mb-2">
                  Max contracts per category
                </label>
                <select
                  value={polymarketMaxPerTag}
                  onChange={(e) => setPolymarketMaxPerTag(parseInt(e.target.value))}
                  className="glass-input w-full"
                >
                  <option value={1}>1 per category (most diverse)</option>
                  <option value={2}>2 per category</option>
                  <option value={3}>3 per category (default)</option>
                  <option value={5}>5 per category</option>
                  <option value={0}>Unlimited</option>
                </select>
                <p className="text-xs text-white/40 mt-1">
                  Limits contracts per tag to prevent one topic from dominating
                </p>
              </div>

              {/* Categories */}
              <div>
                <label className="block text-sm text-white/60 mb-2">
                  Categories (optional)
                </label>
                <div className="flex flex-wrap gap-2">
                  {POLYMARKET_CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => toggleCategory(cat.id)}
                      className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                        polymarketCategories.includes(cat.id)
                          ? 'bg-purple-500/30 text-purple-300 border border-purple-500/50'
                          : 'glass-button'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-white/40 mt-2">
                  Leave empty to include all categories
                </p>
              </div>

              {/* Keywords */}
              <div>
                <label className="block text-sm text-white/60 mb-2">
                  Keywords filter (optional)
                </label>
                <input
                  type="text"
                  value={polymarketKeywords}
                  onChange={(e) => setPolymarketKeywords(e.target.value)}
                  placeholder="trump, fed, bitcoin, ..."
                  className="glass-input w-full"
                />
                <p className="text-xs text-white/40 mt-1">
                  Comma-separated. Only show markets containing these words.
                </p>
              </div>
            </>
          )}

          {/* Topic */}
          <div>
            <label className="block text-sm text-white/60 mb-2">Topic</label>
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

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 glass-button"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || !name.trim() || !url.trim()}
              className="flex-1 py-3 bg-accent text-white rounded-lg font-medium hover:bg-accent/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
