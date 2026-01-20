'use client';

import { useState, useEffect, useMemo } from 'react';
import Header from '@/components/layout/Header';
import AddSourceModal from '@/components/modals/AddSourceModal';
import EditSourceModal from '@/components/modals/EditSourceModal';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { Source, Topic } from '@/types/database';
import { Plus, Rss, Youtube, Twitter, Trash2, RefreshCw, Pencil, TrendingUp, Check, LucideProps } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

type SourceType = 'rss' | 'youtube' | 'twitter' | 'polymarket';

const typeIcons: Record<string, React.ComponentType<LucideProps>> = {
  rss: Rss,
  youtube: Youtube,
  twitter: Twitter,
  polymarket: TrendingUp,
};

const typeColors: Record<string, string> = {
  rss: '#f97316',
  youtube: '#ef4444',
  twitter: '#3b82f6',
  polymarket: '#a855f7',
};

const typeLabels: Record<string, string> = {
  rss: 'RSS Feeds',
  youtube: 'YouTube',
  twitter: 'X/Twitter',
  polymarket: 'Polymarket',
};

export default function SourcesPage() {
  const [sources, setSources] = useState<Source[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingSource, setEditingSource] = useState<Source | null>(null);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);

  // Filter state
  const [selectedTypes, setSelectedTypes] = useState<SourceType[]>([]);
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [sourcesRes, topicsRes] = await Promise.all([
        fetch('/api/sources'),
        fetch('/api/topics'),
      ]);
      const [sourcesData, topicsData] = await Promise.all([
        sourcesRes.json(),
        topicsRes.json(),
      ]);
      // Only set data if it's an array (not an error object)
      setSources(Array.isArray(sourcesData) ? sourcesData : []);
      setTopics(Array.isArray(topicsData) ? topicsData : []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      setSources([]);
      setTopics([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddSource = async (source: {
    name: string;
    type: 'rss' | 'youtube' | 'twitter' | 'polymarket';
    url: string;
    channel_id?: string;
    username?: string;
    topic_id?: string;
    image_url?: string;
    description?: string;
    metadata?: Record<string, unknown>;
  }) => {
    const res = await fetch('/api/sources', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(source),
    });
    const newSource = await res.json();

    // Check if the response is an error - throw so the modal knows not to close
    if (!res.ok || newSource.error) {
      console.error('Failed to add source:', newSource.error);
      throw new Error(newSource.error || 'Failed to add source');
    }

    setSources((prev) => [newSource, ...prev]);

    // Fetch content for the new source based on type
    if (source.type === 'rss') {
      fetch('/api/fetch-feeds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source_id: newSource.id }),
      });
    } else if (source.type === 'youtube') {
      fetch('/api/fetch-youtube', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source_id: newSource.id }),
      });
    } else if (source.type === 'polymarket') {
      fetch('/api/fetch-polymarket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source_id: newSource.id }),
      });
    }
  };

  const handleEditSource = (source: Source) => {
    setEditingSource(source);
    setIsEditModalOpen(true);
  };

  const handleSaveSource = async (updates: Partial<Source> & { id: string }) => {
    try {
      const res = await fetch('/api/sources', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const updatedSource = await res.json();
      setSources((prev) =>
        prev.map((s) => (s.id === updatedSource.id ? updatedSource : s))
      );
    } catch (error) {
      console.error('Failed to save source:', error);
      throw error;
    }
  };

  const handleDeleteSource = async (id: string) => {
    if (!confirm('Are you sure you want to delete this source?')) return;

    try {
      await fetch(`/api/sources?id=${id}`, { method: 'DELETE' });
      setSources((prev) => prev.filter((s) => s.id !== id));
    } catch (error) {
      console.error('Failed to delete source:', error);
    }
  };

  const handleRefreshSource = async (source: Source) => {
    setRefreshingId(source.id);
    try {
      if (source.type === 'rss') {
        await fetch('/api/fetch-feeds', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ source_id: source.id }),
        });
      } else if (source.type === 'youtube') {
        await fetch('/api/fetch-youtube', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ source_id: source.id }),
        });
      }
      await fetchData();
    } catch (error) {
      console.error('Failed to refresh source:', error);
    } finally {
      setRefreshingId(null);
    }
  };

  // Get available types from sources
  const availableTypes = useMemo(() => {
    const types = new Set(sources.map((s) => s.type));
    return Array.from(types) as SourceType[];
  }, [sources]);

  // Filter sources by type and topic
  const filteredSources = useMemo(() => {
    return sources.filter((source) => {
      // Filter by type
      if (selectedTypes.length > 0 && !selectedTypes.includes(source.type as SourceType)) {
        return false;
      }
      // Filter by topic
      if (selectedTopicId && source.topic_id !== selectedTopicId) {
        return false;
      }
      return true;
    });
  }, [sources, selectedTypes, selectedTopicId]);

  const handleToggleType = (type: SourceType) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  return (
    <ProtectedRoute>
      <div className="flex flex-col h-screen">
        <Header />

        <div className="flex-1 overflow-auto p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-semibold">Sources</h1>
              <p className="text-white/60 mt-1">
                Manage your RSS feeds, YouTube channels, and X accounts
              </p>
            </div>

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="glass-button flex items-center gap-2 bg-accent hover:bg-accent/80"
            >
              <Plus className="w-5 h-5" />
              <span>Add Source</span>
            </button>
          </div>

          {/* Filters */}
          {sources.length > 0 && (
            <div className="flex flex-col md:flex-row gap-3 mb-6">
              {/* Type Filter */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-white/40 text-sm">Type:</span>
                <button
                  onClick={() => setSelectedTypes([])}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                    selectedTypes.length === 0
                      ? 'bg-accent text-white'
                      : 'glass-button text-white/60 hover:text-white'
                  }`}
                >
                  All
                </button>
                {availableTypes.map((type) => {
                  const Icon = typeIcons[type] || Rss;
                  const isSelected = selectedTypes.includes(type);
                  const count = sources.filter((s) => s.type === type).length;
                  return (
                    <button
                      key={type}
                      onClick={() => handleToggleType(type)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all ${
                        isSelected
                          ? 'text-white'
                          : 'glass-button text-white/60 hover:text-white'
                      }`}
                      style={{
                        backgroundColor: isSelected ? typeColors[type] : undefined,
                      }}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{typeLabels[type] || type}</span>
                      <span className="text-white/50">({count})</span>
                    </button>
                  );
                })}
              </div>

              {/* Topic Filter */}
              {topics.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap md:ml-4 md:pl-4 md:border-l md:border-white/10">
                  <span className="text-white/40 text-sm">Topic:</span>
                  <button
                    onClick={() => setSelectedTopicId(null)}
                    className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                      selectedTopicId === null
                        ? 'bg-accent text-white'
                        : 'glass-button text-white/60 hover:text-white'
                    }`}
                  >
                    All
                  </button>
                  {topics.map((topic) => {
                    const count = sources.filter((s) => s.topic_id === topic.id).length;
                    if (count === 0) return null;
                    return (
                      <button
                        key={topic.id}
                        onClick={() => setSelectedTopicId(selectedTopicId === topic.id ? null : topic.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all ${
                          selectedTopicId === topic.id
                            ? 'text-white'
                            : 'glass-button text-white/60 hover:text-white'
                        }`}
                        style={{
                          backgroundColor: selectedTopicId === topic.id ? topic.color || '#0ea5e9' : undefined,
                        }}
                      >
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: topic.color || '#0ea5e9' }}
                        />
                        <span>{topic.name}</span>
                        <span className="text-white/50">({count})</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <RefreshCw className="w-8 h-8 text-accent animate-spin" />
            </div>
          ) : sources.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-white/40">
              <Rss className="w-16 h-16 mb-4" />
              <p className="text-lg">No sources yet</p>
              <p className="text-sm mt-1">Add RSS feeds, YouTube channels, or X accounts to get started</p>
            </div>
          ) : filteredSources.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-white/40">
              <Rss className="w-16 h-16 mb-4" />
              <p className="text-lg">No sources match filters</p>
              <p className="text-sm mt-1">Try adjusting your type or topic filters</p>
            </div>
          ) : (
            <>
              <p className="text-white/40 text-sm mb-4">
                Showing {filteredSources.length} of {sources.length} sources
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredSources.map((source) => {
                const Icon = typeIcons[source.type] || Rss;
                return (
                  <div key={source.id} className="glass-card p-4 group">
                    <div className="flex items-start gap-3">
                      {source.image_url ? (
                        <img
                          src={source.image_url}
                          alt={source.name}
                          className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                        />
                      ) : (
                        <div
                          className="p-2 rounded-lg flex-shrink-0"
                          style={{ backgroundColor: `${typeColors[source.type]}20` }}
                        >
                          <Icon
                            className="w-5 h-5"
                            style={{ color: typeColors[source.type] }}
                          />
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">{source.name}</h3>
                        <p className="text-white/40 text-sm truncate">
                          {source.type === 'twitter'
                            ? `@${source.username}`
                            : source.url}
                        </p>
                      </div>

                      {/* Edit button - shows on hover */}
                      <button
                        onClick={() => handleEditSource(source)}
                        className="p-2 rounded-lg hover:bg-white/10 text-white/30 hover:text-white/70 transition-all opacity-0 group-hover:opacity-100"
                        title="Edit source"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    </div>

                    {source.last_fetched_at && (
                      <p className="text-white/30 text-xs mt-3">
                        Last fetched{' '}
                        {formatDistanceToNow(new Date(source.last_fetched_at), {
                          addSuffix: true,
                        })}
                      </p>
                    )}

                    <div className="flex items-center gap-2 mt-4 pt-4 border-t border-white/10">
                      <button
                        onClick={() => handleRefreshSource(source)}
                        disabled={refreshingId === source.id}
                        className="flex-1 glass-button flex items-center justify-center gap-2 text-sm"
                      >
                        <RefreshCw
                          className={`w-4 h-4 ${
                            refreshingId === source.id ? 'animate-spin' : ''
                          }`}
                        />
                        <span>Refresh</span>
                      </button>

                      <button
                        onClick={() => handleDeleteSource(source.id)}
                        className="p-2 rounded-lg hover:bg-red-500/20 text-white/50 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
              </div>
            </>
          )}
        </div>

        <AddSourceModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onAdd={handleAddSource}
          topics={topics}
        />

        <EditSourceModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingSource(null);
          }}
          onSave={handleSaveSource}
          source={editingSource}
          topics={topics}
        />
      </div>
    </ProtectedRoute>
  );
}
