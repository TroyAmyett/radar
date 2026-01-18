'use client';

import { useState, useCallback } from 'react';
import { X, Rss, Youtube, Twitter, Loader2, Search, CheckCircle2 } from 'lucide-react';
import { Topic } from '@/types/database';

interface DiscoveredFeed {
  url: string;
  title?: string;
  type: 'rss' | 'atom';
}

interface AddSourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (source: {
    name: string;
    type: 'rss' | 'youtube' | 'twitter';
    url: string;
    channel_id?: string;
    username?: string;
    topic_id?: string;
  }) => void;
  topics: Topic[];
}

const sourceTypes = [
  { type: 'rss' as const, label: 'RSS Feed', icon: Rss },
  { type: 'youtube' as const, label: 'YouTube Channel', icon: Youtube },
  { type: 'twitter' as const, label: 'X / Twitter', icon: Twitter },
];

export default function AddSourceModal({
  isOpen,
  onClose,
  onAdd,
  topics,
}: AddSourceModalProps) {
  const [selectedType, setSelectedType] = useState<'rss' | 'youtube' | 'twitter'>('rss');
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [channelId, setChannelId] = useState('');
  const [username, setUsername] = useState('');
  const [topicId, setTopicId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // RSS discovery state
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [discoveredFeeds, setDiscoveredFeeds] = useState<DiscoveredFeed[]>([]);
  const [discoveryError, setDiscoveryError] = useState('');
  const [feedDiscovered, setFeedDiscovered] = useState(false);

  const resetForm = useCallback(() => {
    setName('');
    setUrl('');
    setChannelId('');
    setUsername('');
    setTopicId('');
    setWebsiteUrl('');
    setDiscoveredFeeds([]);
    setDiscoveryError('');
    setFeedDiscovered(false);
  }, []);

  const discoverFeed = useCallback(async () => {
    if (!websiteUrl) return;

    setIsDiscovering(true);
    setDiscoveryError('');
    setDiscoveredFeeds([]);
    setFeedDiscovered(false);

    try {
      const res = await fetch('/api/rss/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: websiteUrl }),
      });

      const data = await res.json();

      if (!res.ok) {
        setDiscoveryError(data.error || 'Failed to discover feed');
        return;
      }

      if (data.feeds && data.feeds.length > 0) {
        setDiscoveredFeeds(data.feeds);
        // Auto-select the first feed
        const firstFeed = data.feeds[0];
        setUrl(firstFeed.url);
        if (!name && (firstFeed.title || data.pageTitle)) {
          setName(firstFeed.title || data.pageTitle);
        }
        setFeedDiscovered(true);
      } else {
        setDiscoveryError('No RSS feed found at this URL. Try entering the feed URL directly.');
      }
    } catch (error) {
      console.error('Feed discovery error:', error);
      setDiscoveryError('Failed to discover feed. Please try entering the feed URL directly.');
    } finally {
      setIsDiscovering(false);
    }
  }, [websiteUrl, name]);

  const selectFeed = useCallback((feed: DiscoveredFeed) => {
    setUrl(feed.url);
    if (!name && feed.title) {
      setName(feed.title);
    }
  }, [name]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await onAdd({
        name,
        type: selectedType,
        url: selectedType === 'twitter' ? `https://x.com/${username}` : url,
        channel_id: selectedType === 'youtube' ? channelId : undefined,
        username: selectedType === 'twitter' ? username : undefined,
        topic_id: topicId || undefined,
      });

      resetForm();
      onClose();
    } catch (error) {
      console.error('Failed to add source:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

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

        <h2 className="text-xl font-semibold mb-6">Add New Source</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-white/60 mb-2">Source Type</label>
            <div className="flex gap-2">
              {sourceTypes.map((st) => {
                const Icon = st.icon;
                return (
                  <button
                    key={st.type}
                    type="button"
                    onClick={() => {
                      setSelectedType(st.type);
                      setDiscoveredFeeds([]);
                      setDiscoveryError('');
                      setFeedDiscovered(false);
                    }}
                    className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg transition-all ${
                      selectedType === st.type
                        ? 'bg-accent text-white'
                        : 'glass-button text-white/70'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-sm font-medium hidden sm:inline">
                      {st.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm text-white/60 mb-2">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Tech Crunch, Lex Fridman"
              className="glass-input w-full"
              required
            />
          </div>

          {selectedType === 'rss' && (
            <>
              {/* Website URL with discovery */}
              <div>
                <label className="block text-sm text-white/60 mb-2">
                  Website or Blog URL
                  {feedDiscovered && (
                    <span className="ml-2 text-green-400">
                      <CheckCircle2 className="w-3 h-3 inline" /> Feed found
                    </span>
                  )}
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={websiteUrl}
                    onChange={(e) => {
                      setWebsiteUrl(e.target.value);
                      setFeedDiscovered(false);
                    }}
                    placeholder="https://example.com/blog"
                    className="glass-input flex-1"
                  />
                  <button
                    type="button"
                    onClick={discoverFeed}
                    disabled={!websiteUrl || isDiscovering}
                    className="px-4 py-2 bg-accent/20 hover:bg-accent/30 text-accent rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isDiscovering ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                    <span className="hidden sm:inline">Find Feed</span>
                  </button>
                </div>
                <p className="text-xs text-white/40 mt-1">
                  Enter any page URL and we&apos;ll find the RSS feed automatically
                </p>
              </div>

              {/* Discovery error */}
              {discoveryError && (
                <p className="text-sm text-red-400">{discoveryError}</p>
              )}

              {/* Discovered feeds list */}
              {discoveredFeeds.length > 1 && (
                <div>
                  <label className="block text-sm text-white/60 mb-2">
                    Found {discoveredFeeds.length} feeds - select one:
                  </label>
                  <div className="space-y-2">
                    {discoveredFeeds.map((feed, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => selectFeed(feed)}
                        className={`w-full text-left p-3 rounded-lg transition-all ${
                          url === feed.url
                            ? 'bg-accent/20 border border-accent'
                            : 'glass-button'
                        }`}
                      >
                        <div className="font-medium text-sm">
                          {feed.title || 'Untitled Feed'}
                        </div>
                        <div className="text-xs text-white/40 truncate">
                          {feed.url}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Direct feed URL input */}
              <div>
                <label className="block text-sm text-white/60 mb-2">
                  Feed URL {feedDiscovered && '(auto-filled)'}
                </label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com/feed.xml"
                  className="glass-input w-full"
                  required
                />
              </div>
            </>
          )}

          {selectedType === 'youtube' && (
            <>
              <div>
                <label className="block text-sm text-white/60 mb-2">Channel URL</label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://youtube.com/@channel"
                  className="glass-input w-full"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-white/60 mb-2">
                  Channel ID (optional)
                </label>
                <input
                  type="text"
                  value={channelId}
                  onChange={(e) => setChannelId(e.target.value)}
                  placeholder="UCxxxxxxxxxxxxxxxx"
                  className="glass-input w-full"
                />
              </div>
            </>
          )}

          {selectedType === 'twitter' && (
            <div>
              <label className="block text-sm text-white/60 mb-2">Username</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">
                  @
                </span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.replace(/^@/, ''))}
                  placeholder="username"
                  className="glass-input w-full pl-8"
                  required
                />
              </div>
            </div>
          )}

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

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 bg-accent text-white rounded-lg font-medium hover:bg-accent/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Adding...' : 'Add Source'}
          </button>
        </form>
      </div>
    </div>
  );
}
