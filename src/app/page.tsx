'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Header from '@/components/layout/Header';
import TopicFilter from '@/components/TopicFilter';
import ContentTypeFilter, { ContentType } from '@/components/ContentTypeFilter';
import CardStream, { CardDensity } from '@/components/CardStream';
import PublishModal, { PublishData } from '@/components/modals/PublishModal';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { Topic, ContentItemWithInteraction } from '@/types/database';
import { RefreshCw, ZoomIn, ZoomOut } from 'lucide-react';
import VideoHelpButton from '@/components/onboarding/VideoHelpButton';
import { onboardingVideos } from '@/lib/onboarding-videos';
import { authFetch } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

// Only include active content types (post/tweet coming soon - X API is $100/month)
const ALL_CONTENT_TYPES: ContentType[] = ['video', 'article', 'prediction'];

// Card density zoom levels (3, 4, 5, 6 columns)
const DENSITY_LEVELS: CardDensity[] = ['comfortable', 'cozy', 'compact', 'dense'];

export default function Dashboard() {
  const { isSuperAdmin } = useAuth();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [items, setItems] = useState<ContentItemWithInteraction[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]); // Topics to INCLUDE (when not in all mode)
  const [excludedTopics, setExcludedTopics] = useState<string[]>([]); // Topics to EXCLUDE (when in all mode)
  const [isAllMode, setIsAllMode] = useState(true); // True = show all except excluded, False = show only selected
  const [selectedTypes, setSelectedTypes] = useState<ContentType[]>(ALL_CONTENT_TYPES);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasFetchedOnce, setHasFetchedOnce] = useState(false);

  // Publish modal state
  const [publishOpen, setPublishOpen] = useState(false);
  const [publishItem, setPublishItem] = useState<ContentItemWithInteraction | null>(null);

  // Card density zoom state
  const [cardDensity, setCardDensity] = useState<CardDensity>('comfortable');

  // Load density from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('radar_card_density');
    if (saved && DENSITY_LEVELS.includes(saved as CardDensity)) {
      setCardDensity(saved as CardDensity);
    }
  }, []);

  // Zoom in (fewer, larger cards)
  const zoomIn = useCallback(() => {
    setCardDensity((current) => {
      const idx = DENSITY_LEVELS.indexOf(current);
      const newDensity = idx > 0 ? DENSITY_LEVELS[idx - 1] : current;
      localStorage.setItem('radar_card_density', newDensity);
      return newDensity;
    });
  }, []);

  // Zoom out (more, smaller cards)
  const zoomOut = useCallback(() => {
    setCardDensity((current) => {
      const idx = DENSITY_LEVELS.indexOf(current);
      const newDensity = idx < DENSITY_LEVELS.length - 1 ? DENSITY_LEVELS[idx + 1] : current;
      localStorage.setItem('radar_card_density', newDensity);
      return newDensity;
    });
  }, []);

  // Pinch-to-zoom handler (trackpad pinch triggers wheel with ctrlKey)
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        if (e.deltaY > 0) {
          zoomOut(); // Pinch out / scroll down = zoom out = more cards
        } else {
          zoomIn(); // Pinch in / scroll up = zoom in = fewer cards
        }
      }
    };

    // Keyboard shortcuts: Ctrl/Cmd + Plus/Minus
    const handleKeydown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        zoomIn();
      } else if ((e.ctrlKey || e.metaKey) && e.key === '-') {
        e.preventDefault();
        zoomOut();
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('keydown', handleKeydown);

    return () => {
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('keydown', handleKeydown);
    };
  }, [zoomIn, zoomOut]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch topics
      const topicsRes = await authFetch('/api/topics');
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

      // Filter by topics based on mode
      const itemTopicSlug = item.topic?.slug;
      if (isAllMode) {
        // All mode: show everything EXCEPT excluded topics
        if (excludedTopics.length > 0 && itemTopicSlug && excludedTopics.includes(itemTopicSlug)) {
          return false;
        }
      } else {
        // Selection mode: show ONLY selected topics (empty selection = show nothing)
        if (selectedTopics.length === 0) {
          return false;
        }
        if (!itemTopicSlug || !selectedTopics.includes(itemTopicSlug)) {
          return false;
        }
      }

      return true;
    });
  }, [items, selectedTypes, selectedTopics, excludedTopics, isAllMode]);

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
      // "All" button - always go back to showing all
      setIsAllMode(true);
      setExcludedTopics([]);
      setSelectedTopics([]);
    } else if (isAllMode) {
      // In All mode: clicking a topic shows ONLY that topic
      setIsAllMode(false);
      setSelectedTopics([topicSlug]);
      setExcludedTopics([]);
    } else {
      // In Selection mode: toggle the topic
      setSelectedTopics((prev) => {
        if (prev.includes(topicSlug)) {
          // If this is the only selected topic, go back to All mode
          if (prev.length === 1) {
            setIsAllMode(true);
            setExcludedTopics([]);
            return [];
          }
          return prev.filter((t) => t !== topicSlug);
        }
        return [...prev, topicSlug];
      });
    }
  };


  const handleToggleColor = (color: string) => {
    const topicsWithColor = topics.filter((t) => t.color === color);
    const topicSlugs = topicsWithColor.map((t) => t.slug);

    // Check if this color is already the only one selected
    const isAlreadySelected = !isAllMode &&
      topicSlugs.length === selectedTopics.length &&
      topicSlugs.every((slug) => selectedTopics.includes(slug));

    if (isAlreadySelected) {
      // Clicking the same color again - go back to showing all
      setIsAllMode(true);
      setSelectedTopics([]);
      setExcludedTopics([]);
    } else {
      // Show ONLY this color's topics
      setIsAllMode(false);
      setSelectedTopics(topicSlugs);
      setExcludedTopics([]);
    }
  };

  const handleRefreshFeeds = async () => {
    setIsRefreshing(true);
    try {
      // Don't pass account_id - let API use the default hardcoded account
      // (Sources are created with the hardcoded account_id, so fetching must use the same)
      // Fetch all source types in parallel
      await Promise.all([
        authFetch('/api/fetch-feeds', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }),
        authFetch('/api/fetch-youtube', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }),
        authFetch('/api/fetch-polymarket', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }),
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
      await authFetch('/api/interactions', {
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
      await authFetch('/api/interactions', {
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
      await authFetch('/api/interactions', {
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

  const handlePublish = (id: string) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    setPublishItem(item);
    setPublishOpen(true);
  };

  const handleDismiss = async (id: string) => {
    try {
      await authFetch('/api/interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content_item_id: id, action: 'dismiss' }),
      });
      // Remove from local state
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (error) {
      console.error('Failed to dismiss:', error);
    }
  };

  const handlePublishSubmit = async (data: PublishData) => {
    const res = await authFetch('/api/publish', {
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
      <div className="min-h-screen overflow-x-clip">
        <Header onSearch={setSearchQuery} />

        <div className="p-3 md:p-6 max-w-full">
          {/* Mobile: stack vertically, Desktop: side by side */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
            <TopicFilter
              topics={topics}
              selectedTopics={selectedTopics}
              excludedTopics={excludedTopics}
              isAllMode={isAllMode}
              onSelectTopic={handleSelectTopic}
              onToggleColor={handleToggleColor}
            />

            <div className="flex items-center gap-2 w-full md:w-auto">
              <VideoHelpButton video={onboardingVideos.welcomeOverview} label="Tour" />
              <button
                onClick={handleRefreshFeeds}
                disabled={isRefreshing}
                className="glass-button flex items-center justify-center gap-2 flex-1 md:flex-initial"
              >
                <RefreshCw
                  className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`}
                />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          <div className="mb-4 md:mb-6 flex items-center gap-3">
            <ContentTypeFilter
              selectedTypes={selectedTypes}
              onToggleType={handleToggleType}
              onToggleAll={handleToggleAllTypes}
            />
            <VideoHelpButton video={onboardingVideos.aiSummaries} compact />

            {/* Zoom controls */}
            <div className="ml-auto flex items-center gap-1 bg-white/5 rounded-lg p-1">
              <button
                onClick={zoomIn}
                disabled={cardDensity === 'comfortable'}
                className={`p-1.5 rounded transition-all ${
                  cardDensity === 'comfortable'
                    ? 'text-white/20 cursor-not-allowed'
                    : 'text-white/60 hover:text-white hover:bg-white/10'
                }`}
                title="Zoom in (fewer, larger cards)"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={zoomOut}
                disabled={cardDensity === 'dense'}
                className={`p-1.5 rounded transition-all ${
                  cardDensity === 'dense'
                    ? 'text-white/20 cursor-not-allowed'
                    : 'text-white/60 hover:text-white hover:bg-white/10'
                }`}
                title="Zoom out (more, smaller cards)"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
            </div>
          </div>

          <CardStream
            items={filteredItems}
            isLoading={isLoading}
            isRefreshing={isRefreshing}
            density={cardDensity}
            onLike={handleLike}
            onSave={handleSave}
            onAddNote={handleAddNote}
            onPublish={isSuperAdmin ? handlePublish : undefined}
            onDismiss={handleDismiss}
          />
        </div>

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
