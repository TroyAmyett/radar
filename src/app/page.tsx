'use client';

import { useState, useEffect, useCallback } from 'react';
import Header from '@/components/layout/Header';
import TopicFilter from '@/components/TopicFilter';
import CardStream from '@/components/CardStream';
import DeepDiveModal from '@/components/modals/DeepDiveModal';
import { Topic, ContentItemWithInteraction, Advisor } from '@/types/database';
import { RefreshCw } from 'lucide-react';

interface DeepDiveAnalysis {
  summary: string;
  keyPoints: string[];
  sentiment: number;
  sentimentLabel: string;
  actionItems: string[];
  relatedTopics: string[];
  implications: string;
  recommendations: string[];
}

export default function Dashboard() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [items, setItems] = useState<ContentItemWithInteraction[]>([]);
  const [advisors, setAdvisors] = useState<Record<string, Advisor>>({});
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Deep Dive modal state
  const [deepDiveOpen, setDeepDiveOpen] = useState(false);
  const [deepDiveLoading, setDeepDiveLoading] = useState(false);
  const [deepDiveItem, setDeepDiveItem] = useState<ContentItemWithInteraction | null>(null);
  const [deepDiveAnalysis, setDeepDiveAnalysis] = useState<DeepDiveAnalysis | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch topics
      const topicsRes = await fetch('/api/topics');
      const topicsData = await topicsRes.json();
      setTopics(Array.isArray(topicsData) ? topicsData : []);

      // Fetch content
      let contentUrl = '/api/content';
      const params = new URLSearchParams();
      if (selectedTopic) params.set('topic', selectedTopic);
      if (searchQuery) params.set('search', searchQuery);
      if (params.toString()) contentUrl += '?' + params.toString();

      const contentRes = await fetch(contentUrl);
      const contentData = await contentRes.json();
      setItems(Array.isArray(contentData) ? contentData : []);

      // Fetch advisors and build lookup
      const advisorsRes = await fetch('/api/advisors');
      const advisorsData = await advisorsRes.json();
      const advisorLookup: Record<string, Advisor> = {};
      if (Array.isArray(advisorsData)) {
        advisorsData.forEach((advisor: Advisor) => {
          advisorLookup[advisor.id] = advisor;
        });
      }
      setAdvisors(advisorLookup);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedTopic, searchQuery]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefreshFeeds = async () => {
    setIsRefreshing(true);
    try {
      // Fetch RSS feeds
      await fetch('/api/fetch-feeds', { method: 'POST', body: JSON.stringify({}) });
      // Fetch YouTube videos
      await fetch('/api/fetch-youtube', { method: 'POST', body: JSON.stringify({}) });
      // Refresh content
      await fetchData();
    } catch (error) {
      console.error('Failed to refresh feeds:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleLike = async (id: string) => {
    try {
      await fetch('/api/interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content_item_id: id, action: 'like' }),
      });
      // Update local state
      setItems((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                interaction: {
                  ...item.interaction,
                  id: item.interaction?.id || '',
                  account_id: item.interaction?.account_id || '',
                  content_item_id: id,
                  is_liked: !item.interaction?.is_liked,
                  is_saved: item.interaction?.is_saved || false,
                  notes: item.interaction?.notes || null,
                  read_at: item.interaction?.read_at || null,
                  created_at: item.interaction?.created_at || new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                },
              }
            : item
        )
      );
    } catch (error) {
      console.error('Failed to like:', error);
    }
  };

  const handleSave = async (id: string) => {
    try {
      await fetch('/api/interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content_item_id: id, action: 'save' }),
      });
      // Update local state
      setItems((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                interaction: {
                  ...item.interaction,
                  id: item.interaction?.id || '',
                  account_id: item.interaction?.account_id || '',
                  content_item_id: id,
                  is_liked: item.interaction?.is_liked || false,
                  is_saved: !item.interaction?.is_saved,
                  notes: item.interaction?.notes || null,
                  read_at: item.interaction?.read_at || null,
                  created_at: item.interaction?.created_at || new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                },
              }
            : item
        )
      );
    } catch (error) {
      console.error('Failed to save:', error);
    }
  };

  const handleAddNote = async (id: string, note: string) => {
    try {
      await fetch('/api/interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content_item_id: id, action: 'note', value: note }),
      });
      // Update local state
      setItems((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                interaction: {
                  ...item.interaction,
                  id: item.interaction?.id || '',
                  account_id: item.interaction?.account_id || '',
                  content_item_id: id,
                  is_liked: item.interaction?.is_liked || false,
                  is_saved: item.interaction?.is_saved || false,
                  notes: note,
                  read_at: item.interaction?.read_at || null,
                  created_at: item.interaction?.created_at || new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                },
              }
            : item
        )
      );
    } catch (error) {
      console.error('Failed to add note:', error);
    }
  };

  const handleDeepDive = async (id: string) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;

    setDeepDiveItem(item);
    setDeepDiveOpen(true);
    setDeepDiveLoading(true);
    setDeepDiveAnalysis(null);

    try {
      const res = await fetch('/api/deep-dive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content_item_id: id }),
      });
      const analysis = await res.json();
      setDeepDiveAnalysis(analysis);
    } catch (error) {
      console.error('Failed to get deep dive:', error);
    } finally {
      setDeepDiveLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen">
      <Header onSearch={setSearchQuery} />

      <div className="flex-1 overflow-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <TopicFilter
            topics={topics}
            selectedTopic={selectedTopic}
            onSelectTopic={setSelectedTopic}
          />

          <button
            onClick={handleRefreshFeeds}
            disabled={isRefreshing}
            className="glass-button flex items-center gap-2"
          >
            <RefreshCw
              className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`}
            />
            <span>Refresh</span>
          </button>
        </div>

        <CardStream
          items={items}
          advisors={advisors}
          isLoading={isLoading}
          onLike={handleLike}
          onSave={handleSave}
          onAddNote={handleAddNote}
          onDeepDive={handleDeepDive}
        />
      </div>

      <DeepDiveModal
        isOpen={deepDiveOpen}
        onClose={() => setDeepDiveOpen(false)}
        title={deepDiveItem?.title || ''}
        analysis={deepDiveAnalysis}
        isLoading={deepDiveLoading}
      />
    </div>
  );
}
