'use client';

import { useState } from 'react';
import { X, Loader2, Sparkles, Plus, Search, Youtube, Rss, ExternalLink } from 'lucide-react';
import { Topic } from '@/types/database';

interface DiscoveredSource {
  name: string;
  url: string;
  type: 'rss' | 'youtube';
  reason: string;
  metadata?: {
    subscribers?: string;
    frequency?: string;
  };
}

interface DiscoverSourcesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddSource: (source: {
    name: string;
    type: 'rss' | 'youtube';
    url: string;
    topic_id?: string;
  }) => Promise<void>;
  topics: Topic[];
}

const typeIcons = {
  youtube: Youtube,
  rss: Rss,
};

const typeColors = {
  youtube: 'text-red-400 bg-red-500/20',
  rss: 'text-orange-400 bg-orange-500/20',
};

export default function DiscoverSourcesModal({
  isOpen,
  onClose,
  onAddSource,
  topics,
}: DiscoverSourcesModalProps) {
  const [selectedTopicId, setSelectedTopicId] = useState<string>('');
  const [customQuery, setCustomQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<DiscoveredSource[]>([]);
  const [error, setError] = useState('');
  const [addingSource, setAddingSource] = useState<string | null>(null);
  const [addedSources, setAddedSources] = useState<Set<string>>(new Set());
  const [topicForSource, setTopicForSource] = useState<Record<string, string>>({});

  const handleSearch = async (searchTerm: string) => {
    if (!searchTerm.trim()) return;

    setIsSearching(true);
    setError('');
    setResults([]);

    try {
      const res = await fetch('/api/discover-sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: selectedTopicId ? topics.find(t => t.id === selectedTopicId)?.name : undefined,
          query: customQuery || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to discover sources');
        return;
      }

      setResults(data.sources || []);
    } catch (err) {
      console.error('Discover error:', err);
      setError('Failed to search for sources. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleTopicSearch = () => {
    const topic = topics.find(t => t.id === selectedTopicId);
    if (topic) {
      handleSearch(topic.name);
    }
  };

  const handleCustomSearch = () => {
    handleSearch(customQuery);
  };

  const handleAddSource = async (source: DiscoveredSource) => {
    setAddingSource(source.url);

    try {
      await onAddSource({
        name: source.name,
        type: source.type,
        url: source.url,
        topic_id: topicForSource[source.url] || selectedTopicId || undefined,
      });
      setAddedSources(prev => new Set([...Array.from(prev), source.url]));
    } catch (err) {
      console.error('Failed to add source:', err);
    } finally {
      setAddingSource(null);
    }
  };

  const handleClose = () => {
    setResults([]);
    setError('');
    setCustomQuery('');
    setSelectedTopicId('');
    setAddedSources(new Set());
    setTopicForSource({});
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />

      <div className="relative glass-card w-full max-w-2xl mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 rounded-lg hover:bg-white/10 text-white/50"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-purple-500/20">
            <Sparkles className="w-5 h-5 text-purple-400" />
          </div>
          <h2 className="text-xl font-semibold">Discover Sources</h2>
        </div>
        <p className="text-sm text-white/50 mb-6">
          AI-powered source recommendations based on your topics
        </p>

        {/* Topic-based search */}
        {topics.length > 0 && (
          <div className="mb-6">
            <label className="block text-sm text-white/60 mb-2">Find sources for a topic</label>
            <div className="flex gap-2">
              <select
                value={selectedTopicId}
                onChange={(e) => setSelectedTopicId(e.target.value)}
                className="glass-input flex-1"
              >
                <option value="">Select a topic...</option>
                {topics.map((topic) => (
                  <option key={topic.id} value={topic.id}>
                    {topic.name}
                  </option>
                ))}
              </select>
              <button
                onClick={handleTopicSearch}
                disabled={!selectedTopicId || isSearching}
                className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSearching ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
                Search
              </button>
            </div>
          </div>
        )}

        {/* Divider */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-sm text-white/40">or search for anything</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        {/* Custom query search */}
        <div className="mb-6">
          <label className="block text-sm text-white/60 mb-2">Custom search</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={customQuery}
              onChange={(e) => setCustomQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && customQuery.trim()) {
                  handleCustomSearch();
                }
              }}
              placeholder="e.g., kubernetes security blogs, AI news channels"
              className="glass-input flex-1"
            />
            <button
              onClick={handleCustomSearch}
              disabled={!customQuery.trim() || isSearching}
              className="px-4 py-2 bg-accent hover:bg-accent/80 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSearching ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              Search
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="p-3 mb-4 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Loading state */}
        {isSearching && (
          <div className="flex flex-col items-center justify-center py-12 text-white/40">
            <Loader2 className="w-8 h-8 animate-spin mb-4" />
            <p>Searching for quality sources...</p>
          </div>
        )}

        {/* Results */}
        {!isSearching && results.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm text-white/60">Found {results.length} recommended sources:</p>

            {results.map((source) => {
              const Icon = typeIcons[source.type];
              const isAdded = addedSources.has(source.url);
              const isAdding = addingSource === source.url;

              return (
                <div
                  key={source.url}
                  className="p-4 bg-white/5 rounded-lg border border-white/10 hover:border-white/20 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${typeColors[source.type]}`}>
                      <Icon className="w-5 h-5" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold truncate">{source.name}</h3>
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-white/30 hover:text-white/60"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>

                      {/* Why we recommend this */}
                      <p className="text-sm text-white/60 mt-1">{source.reason}</p>

                      {/* Metadata */}
                      {source.metadata && (
                        <div className="flex gap-3 mt-2 text-xs text-white/40">
                          {source.metadata.subscribers && (
                            <span>{source.metadata.subscribers} subscribers</span>
                          )}
                          {source.metadata.frequency && (
                            <span>{source.metadata.frequency}</span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-2">
                      {/* Topic selector for this source */}
                      {!isAdded && topics.length > 0 && (
                        <select
                          value={topicForSource[source.url] || selectedTopicId || ''}
                          onChange={(e) => setTopicForSource(prev => ({ ...prev, [source.url]: e.target.value }))}
                          className="glass-input text-xs py-1.5 px-2 min-w-[120px]"
                        >
                          <option value="">No topic</option>
                          {topics.map((topic) => (
                            <option key={topic.id} value={topic.id}>
                              {topic.name}
                            </option>
                          ))}
                        </select>
                      )}

                      {/* Add button */}
                      <button
                        onClick={() => handleAddSource(source)}
                        disabled={isAdded || isAdding}
                        className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                          isAdded
                            ? 'bg-green-500/20 text-green-400 cursor-default'
                            : 'bg-accent hover:bg-accent/80 text-white'
                        } disabled:opacity-50`}
                      >
                        {isAdding ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : isAdded ? (
                          'Added'
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            Add
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Empty state */}
        {!isSearching && results.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center py-12 text-white/40">
            <Sparkles className="w-12 h-12 mb-4" />
            <p className="text-lg">Ready to discover</p>
            <p className="text-sm mt-1">Select a topic or enter a search query above</p>
          </div>
        )}
      </div>
    </div>
  );
}
