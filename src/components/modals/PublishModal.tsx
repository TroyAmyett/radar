'use client';

import { useState, useEffect } from 'react';
import { X, Send, Loader2, Twitter, Mail, Hash } from 'lucide-react';
import { ContentItemWithInteraction, Topic } from '@/types/database';

interface PublishModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: ContentItemWithInteraction | null;
  topics: Topic[];
  onPublish: (data: PublishData) => Promise<void>;
}

export interface PublishData {
  contentItemId: string;
  title: string;
  summary: string;
  url: string;
  thumbnailUrl?: string;
  topicId?: string;
  author?: string;
  xPostEnabled: boolean;
  emailDigestEnabled: boolean;
  hashtags: string[];
}

export default function PublishModal({
  isOpen,
  onClose,
  item,
  topics,
  onPublish,
}: PublishModalProps) {
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [topicId, setTopicId] = useState<string | undefined>();
  const [xPostEnabled, setXPostEnabled] = useState(true);
  const [emailDigestEnabled, setEmailDigestEnabled] = useState(true);
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [newHashtag, setNewHashtag] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);

  useEffect(() => {
    if (item) {
      setTitle(item.title);
      setSummary(item.summary || '');
      setTopicId(item.topic_id || undefined);
      // Generate initial hashtags from topic
      if (item.topic?.name) {
        setHashtags([item.topic.name.toLowerCase().replace(/\s+/g, '')]);
      } else {
        setHashtags([]);
      }
    }
  }, [item]);

  const handleAddHashtag = () => {
    if (newHashtag.trim() && !hashtags.includes(newHashtag.trim().toLowerCase())) {
      setHashtags([...hashtags, newHashtag.trim().toLowerCase().replace(/^#/, '')]);
      setNewHashtag('');
    }
  };

  const handleRemoveHashtag = (tag: string) => {
    setHashtags(hashtags.filter((h) => h !== tag));
  };

  const handlePublish = async () => {
    if (!item) return;

    setIsPublishing(true);
    try {
      await onPublish({
        contentItemId: item.id,
        title,
        summary,
        url: item.url,
        thumbnailUrl: item.thumbnail_url || undefined,
        topicId,
        author: item.author || undefined,
        xPostEnabled,
        emailDigestEnabled,
        hashtags,
      });
      onClose();
    } catch (error) {
      console.error('Publish failed:', error);
    } finally {
      setIsPublishing(false);
    }
  };

  if (!isOpen || !item) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto py-8">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative glass-card w-full max-w-lg mx-4 p-6">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg hover:bg-white/10 text-white/50"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-6">
          <span className="text-green-400 text-sm font-medium">Publish to What&apos;s Hot</span>
          <h2 className="text-xl font-semibold mt-1">Share this content</h2>
        </div>

        <div className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm text-white/60 mb-2">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="glass-input w-full"
              placeholder="Enter title..."
            />
          </div>

          {/* Summary */}
          <div>
            <label className="block text-sm text-white/60 mb-2">Summary</label>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className="glass-input w-full resize-none"
              rows={3}
              placeholder="Enter summary..."
            />
            <p className="text-xs text-white/40 mt-1">{summary.length}/280 characters</p>
          </div>

          {/* Topic */}
          <div>
            <label className="block text-sm text-white/60 mb-2">Topic</label>
            <select
              value={topicId || ''}
              onChange={(e) => setTopicId(e.target.value || undefined)}
              className="glass-input w-full"
            >
              <option value="">Select a topic</option>
              {topics.map((topic) => (
                <option key={topic.id} value={topic.id}>
                  {topic.name}
                </option>
              ))}
            </select>
          </div>

          {/* Hashtags */}
          <div>
            <label className="block text-sm text-white/60 mb-2 flex items-center gap-2">
              <Hash className="w-4 h-4" />
              Hashtags
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {hashtags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-1 bg-accent/20 text-accent rounded-full text-sm flex items-center gap-1"
                >
                  #{tag}
                  <button
                    onClick={() => handleRemoveHashtag(tag)}
                    className="ml-1 hover:text-white"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newHashtag}
                onChange={(e) => setNewHashtag(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddHashtag())}
                className="glass-input flex-1"
                placeholder="Add hashtag..."
              />
              <button
                onClick={handleAddHashtag}
                className="px-3 py-2 bg-white/10 rounded-lg hover:bg-white/20"
              >
                Add
              </button>
            </div>
          </div>

          {/* Publish Options */}
          <div className="space-y-3 pt-4 border-t border-white/10">
            <label className="flex items-center justify-between p-3 rounded-lg bg-white/5 cursor-pointer">
              <div className="flex items-center gap-3">
                <Twitter className="w-5 h-5 text-[#1DA1F2]" />
                <div>
                  <p className="font-medium">Post to X</p>
                  <p className="text-xs text-white/50">Share on X (Twitter)</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={xPostEnabled}
                onChange={(e) => setXPostEnabled(e.target.checked)}
                className="w-5 h-5 rounded accent-accent"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-lg bg-white/5 cursor-pointer">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-purple-400" />
                <div>
                  <p className="font-medium">Include in Email Digest</p>
                  <p className="text-xs text-white/50">Send to subscribers</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={emailDigestEnabled}
                onChange={(e) => setEmailDigestEnabled(e.target.checked)}
                className="w-5 h-5 rounded accent-accent"
              />
            </label>
          </div>

          {/* Publish Button */}
          <button
            onClick={handlePublish}
            disabled={isPublishing || !title.trim() || !summary.trim()}
            className="w-full py-3 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isPublishing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Publishing...
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                Publish
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
