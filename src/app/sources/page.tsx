'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import AddSourceModal from '@/components/modals/AddSourceModal';
import { Source, Topic } from '@/types/database';
import { Plus, Rss, Youtube, Twitter, Trash2, RefreshCw, LucideProps } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const typeIcons: Record<string, React.ComponentType<LucideProps>> = {
  rss: Rss,
  youtube: Youtube,
  twitter: Twitter,
};

const typeColors: Record<string, string> = {
  rss: '#f97316',
  youtube: '#ef4444',
  twitter: '#3b82f6',
};

export default function SourcesPage() {
  const [sources, setSources] = useState<Source[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);

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
      setSources(sourcesData);
      setTopics(topicsData);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddSource = async (source: {
    name: string;
    type: 'rss' | 'youtube' | 'twitter';
    url: string;
    channel_id?: string;
    username?: string;
    topic_id?: string;
  }) => {
    try {
      const res = await fetch('/api/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(source),
      });
      const newSource = await res.json();
      setSources((prev) => [newSource, ...prev]);

      // Fetch content for the new source if it's RSS or YouTube
      if (source.type === 'rss') {
        await fetch('/api/fetch-feeds', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ source_id: newSource.id }),
        });
      } else if (source.type === 'youtube') {
        await fetch('/api/fetch-youtube', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ source_id: newSource.id }),
        });
      }
    } catch (error) {
      console.error('Failed to add source:', error);
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

  return (
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
            onClick={() => setIsModalOpen(true)}
            className="glass-button flex items-center gap-2 bg-accent hover:bg-accent/80"
          >
            <Plus className="w-5 h-5" />
            <span>Add Source</span>
          </button>
        </div>

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
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sources.map((source) => {
              const Icon = typeIcons[source.type] || Rss;
              return (
                <div key={source.id} className="glass-card p-4">
                  <div className="flex items-start gap-3">
                    <div
                      className="p-2 rounded-lg"
                      style={{ backgroundColor: `${typeColors[source.type]}20` }}
                    >
                      <Icon
                        className="w-5 h-5"
                        style={{ color: typeColors[source.type] }}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{source.name}</h3>
                      <p className="text-white/40 text-sm truncate">
                        {source.type === 'twitter'
                          ? `@${source.username}`
                          : source.url}
                      </p>
                    </div>
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
        )}
      </div>

      <AddSourceModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAdd={handleAddSource}
        topics={topics}
      />
    </div>
  );
}
