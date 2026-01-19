'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Header from '@/components/layout/Header';
import TopicFilter from '@/components/TopicFilter';
import ContentTypeFilter, { ContentType } from '@/components/ContentTypeFilter';
import CardStream from '@/components/CardStream';
import DeepDiveModal from '@/components/modals/DeepDiveModal';
import PublishModal, { PublishData } from '@/components/modals/PublishModal';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { Topic, ContentItemWithInteraction } from '@/types/database';
import { RefreshCw } from 'lucide-react';

// Only include active content types (post/tweet coming soon - X API is $100/month)
const ALL_CONTENT_TYPES: ContentType[] = ['video', 'article'];

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
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<ContentType[]>(ALL_CONTENT_TYPES);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasFetchedOnce, setHasFetchedOnce] = useState(false);

  // Deep Dive modal state
  const [deepDiveOpen, setDeepDiveOpen] = useState(false);
  const [deepDiveLoading, setDeepDiveLoading] = useState(false);
  const [deepDiveItem, setDeepDiveItem] = useState<ContentItemWithInteraction | null>(null);
  const [deepDiveAnalysis, setDeepDiveAnalysis] = useState<DeepDiveAnalysis | null>(null);

  // Publish modal state
  const [publishOpen, setPublishOpen] = useState(false);
  const [publishItem, setPublishItem] = useState<ContentItemWithInteraction | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch topics
      const topicsRes = await fetch('/api/topics');
      const topicsData = await topicsRes.json();
      setTopics(Array.isArray(topicsData) ? topicsData : []);

      // Fetch content (we'll filter by topics client-side for multi-select)
      let contentUrl = '/api/content';
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (params.toString()) contentUrl += '?' + params.toString();

      const contentRes = await fetch(contentUrl);
      const contentData = await contentRes.json();
      setItems(Array.isArray(contentData) ? contentData : []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-fetch sources on first load if no content exists
  useEffect(() => {
    const autoFetchIfEmpty = async () => {
      if (!isLoading && items.length === 0 && !hasFetchedOnce && !isRefreshing) {
        setHasFetchedOnce(true);
        await handleRefreshFeeds();
      }
    };
    autoFetchIfEmpty();
  }, [isLoading, items.length, hasFetchedOnce, isRefreshing]);

  // Filter items by content type and topics (client-side filtering)
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Filter by content type
      if (selectedTypes.length < ALL_CONTENT_TYPES.length) {
        const itemType = item.type === 'tweet' ? 'post' : item.type;
        if (!selectedTypes.includes(itemType as ContentType)) {
          return false;
        }
      }

      // Filter by selected topics (empty array means show all)
      if (selectedTopics.length > 0) {
        const itemTopicSlug = item.topic?.slug;
        if (!itemTopicSlug || !selectedTopics.includes(itemTopicSlug)) {
          return false;
        }
      }

      return true;
    });
  }, [items, selectedTypes, selectedTopics]);

  const handleToggleType = (type: ContentType) => {
    setSelectedTypes((prev) => {
      if (prev.includes(type)) {
        // Don't allow deselecting all - keep at least one
        if (prev.length === 1) return prev;
        return prev.filter((t) => t !== type);
      }
      return [...prev, type];
    });
  };

  const handleToggleAllTypes = () => {
    if (selectedTypes.length === ALL_CONTENT_TYPES.length) {
      // If all selected, don't deselect all - keep first type
      setSelectedTypes([ALL_CONTENT_TYPES[0]]);
    } else {
      setSelectedTypes([...ALL_CONTENT_TYPES]);
    }
  };

  const handleSelectTopic = (topicSlug: string | null) => {
    if (topicSlug === null) {
      // "All" button - clear selection
      setSelectedTopics([]);
    } else {
      // Toggle individual topic
      setSelectedTopics((prev) => {
        if (prev.includes(topicSlug)) {
          return prev.filter((t) => t !== topicSlug);
        }
        return [...prev, topicSlug];
      });
    }
  };

  const handleToggleColor = (color: string) => {
    const topicsWithColor = topics.filter((t) => t.color === color);
    const topicSlugs = topicsWithColor.map((t) => t.slug);

    setSelectedTopics((prev) => {
      const allSelected = topicSlugs.every((slug) => prev.includes(slug));

      if (allSelected) {
        // Remove all topics of this color
        return prev.filter((slug) => !topicSlugs.includes(slug));
      } else {
        // Add all topics of this color (without duplicates)
        const newSelection = [...prev];
        topicSlugs.forEach((slug) => {
          if (!newSelection.includes(slug)) {
            newSelection.push(slug);
          }
        });
        return newSelection;
      }
    });
  };

  const handleRefreshFeeds = async () => {
    setIsRefreshing(true);
    try {
      // Fetch all source types in parallel
      await Promise.all([
        fetch('/api/fetch-feeds', { method: 'POST', body: JSON.stringify({}) }),
        fetch('/api/fetch-youtube', { method: 'POST', body: JSON.stringify({}) }),
        fetch('/api/fetch-polymarket', { method: 'POST', body: JSON.stringify({}) }),
      ]);
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

  const handlePublish = (id: string) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    setPublishItem(item);
    setPublishOpen(true);
  };

  const handleDismiss = async (id: string) => {
    try {
      await fetch(`/api/content?id=${id}`, { method: 'DELETE' });
      // Remove from local state
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (error) {
      console.error('Failed to dismiss:', error);
    }
  };

  const handlePublishSubmit = async (data: PublishData) => {
    const res = await fetch('/api/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      throw new Error('Failed to publish');
    }

    return res.json();
  };

  return (
    <ProtectedRoute>
      <div className="flex flex-col h-screen">
        <Header onSearch={setSearchQuery} />

        <div className="flex-1 overflow-auto p-3 md:p-6">
          {/* Mobile: stack vertically, Desktop: side by side */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
            <TopicFilter
              topics={topics}
              selectedTopics={selectedTopics}
              onSelectTopic={handleSelectTopic}
              onToggleColor={handleToggleColor}
            />

            <button
              onClick={handleRefreshFeeds}
              disabled={isRefreshing}
              className="glass-button flex items-center justify-center gap-2 w-full md:w-auto flex-shrink-0"
            >
              <RefreshCw
                className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`}
              />
              <span>Refresh</span>
            </button>
          </div>

          <div className="mb-4 md:mb-6">
            <ContentTypeFilter
              selectedTypes={selectedTypes}
              onToggleType={handleToggleType}
              onToggleAll={handleToggleAllTypes}
            />
          </div>

          <CardStream
            items={filteredItems}
            isLoading={isLoading}
            isRefreshing={isRefreshing}
            onLike={handleLike}
            onSave={handleSave}
            onAddNote={handleAddNote}
            onDeepDive={handleDeepDive}
            onPublish={handlePublish}
            onDismiss={handleDismiss}
          />
        </div>

        <DeepDiveModal
          isOpen={deepDiveOpen}
          onClose={() => setDeepDiveOpen(false)}
          title={deepDiveItem?.title || ''}
          analysis={deepDiveAnalysis}
          isLoading={deepDiveLoading}
        />

        <PublishModal
          isOpen={publishOpen}
          onClose={() => setPublishOpen(false)}
          item={publishItem}
          topics={topics}
          onPublish={handlePublishSubmit}
        />
      </div>
    </ProtectedRoute>
  );
}
