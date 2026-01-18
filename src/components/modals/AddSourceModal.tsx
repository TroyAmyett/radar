'use client';

import { useState } from 'react';
import { X, Rss, Youtube, Twitter } from 'lucide-react';
import { Topic } from '@/types/database';

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

      // Reset form
      setName('');
      setUrl('');
      setChannelId('');
      setUsername('');
      setTopicId('');
      onClose();
    } catch (error) {
      console.error('Failed to add source:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative glass-card w-full max-w-md mx-4 p-6">
        <button
          onClick={onClose}
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
                    onClick={() => setSelectedType(st.type)}
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
            <div>
              <label className="block text-sm text-white/60 mb-2">Feed URL</label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/feed.xml"
                className="glass-input w-full"
                required
              />
            </div>
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
                  onChange={(e) => setUsername(e.target.value)}
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
