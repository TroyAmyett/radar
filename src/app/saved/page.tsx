'use client';

import { useState, useEffect, useCallback } from 'react';
import Header from '@/components/layout/Header';
import CardStream from '@/components/CardStream';
import { ContentItemWithInteraction, Advisor } from '@/types/database';
import { Bookmark } from 'lucide-react';

export default function SavedPage() {
  const [items, setItems] = useState<ContentItemWithInteraction[]>([]);
  const [advisors, setAdvisors] = useState<Record<string, Advisor>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch saved content
      let contentUrl = '/api/content?saved=true';
      if (searchQuery) contentUrl += `&search=${encodeURIComponent(searchQuery)}`;

      const contentRes = await fetch(contentUrl);
      const contentData = await contentRes.json();
      setItems(contentData);

      // Fetch advisors
      const advisorsRes = await fetch('/api/advisors');
      const advisorsData = await advisorsRes.json();
      const advisorLookup: Record<string, Advisor> = {};
      advisorsData.forEach((advisor: Advisor) => {
        advisorLookup[advisor.id] = advisor;
      });
      setAdvisors(advisorLookup);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleLike = async (id: string) => {
    try {
      await fetch('/api/interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content_item_id: id, action: 'like' }),
      });
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
      // Remove from saved list when unsaving
      setItems((prev) => prev.filter((item) => item.id !== id));
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

  return (
    <div className="flex flex-col h-screen">
      <Header onSearch={setSearchQuery} />

      <div className="flex-1 overflow-auto p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold">Saved Items</h1>
          <p className="text-white/60 mt-1">
            Your bookmarked articles, videos, and posts
          </p>
        </div>

        {!isLoading && items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-white/40">
            <Bookmark className="w-16 h-16 mb-4" />
            <p className="text-lg">No saved items yet</p>
            <p className="text-sm mt-1">
              Save content from the dashboard to access it later
            </p>
          </div>
        ) : (
          <CardStream
            items={items}
            advisors={advisors}
            isLoading={isLoading}
            onLike={handleLike}
            onSave={handleSave}
            onAddNote={handleAddNote}
          />
        )}
      </div>
    </div>
  );
}
