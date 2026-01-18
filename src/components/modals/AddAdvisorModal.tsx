'use client';

import { useState, useEffect } from 'react';
import { X, Twitter, Linkedin, Youtube } from 'lucide-react';
import { Topic, Advisor } from '@/types/database';

interface AdvisorFormData {
  name: string;
  platform: 'twitter' | 'linkedin' | 'youtube';
  username: string;
  avatar_url?: string;
  bio?: string;
  topic_id?: string;
}

interface AddAdvisorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (advisor: AdvisorFormData) => void;
  onEdit?: (id: string, advisor: AdvisorFormData) => void;
  topics: Topic[];
  editingAdvisor?: Advisor | null;
}

const platforms = [
  { type: 'twitter' as const, label: 'X / Twitter', icon: Twitter },
  { type: 'linkedin' as const, label: 'LinkedIn', icon: Linkedin },
  { type: 'youtube' as const, label: 'YouTube', icon: Youtube },
];

export default function AddAdvisorModal({
  isOpen,
  onClose,
  onAdd,
  onEdit,
  topics,
  editingAdvisor,
}: AddAdvisorModalProps) {
  const [selectedPlatform, setSelectedPlatform] = useState<'twitter' | 'linkedin' | 'youtube'>('twitter');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [bio, setBio] = useState('');
  const [topicId, setTopicId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditing = !!editingAdvisor;

  useEffect(() => {
    if (editingAdvisor) {
      setSelectedPlatform(editingAdvisor.platform as 'twitter' | 'linkedin' | 'youtube');
      setName(editingAdvisor.name);
      setUsername(editingAdvisor.username);
      setAvatarUrl(editingAdvisor.avatar_url || '');
      setBio(editingAdvisor.bio || '');
      setTopicId(editingAdvisor.topic_id || '');
    } else {
      resetForm();
    }
  }, [editingAdvisor, isOpen]);

  const resetForm = () => {
    setSelectedPlatform('twitter');
    setName('');
    setUsername('');
    setAvatarUrl('');
    setBio('');
    setTopicId('');
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData: AdvisorFormData = {
      name,
      platform: selectedPlatform,
      username,
      avatar_url: avatarUrl || undefined,
      bio: bio || undefined,
      topic_id: topicId || undefined,
    };

    try {
      if (isEditing && onEdit) {
        await onEdit(editingAdvisor.id, formData);
      } else {
        await onAdd(formData);
      }
      resetForm();
      onClose();
    } catch (error) {
      console.error('Failed to save advisor:', error);
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

        <h2 className="text-xl font-semibold mb-6">
          {isEditing ? 'Edit Advisor' : 'Add Advisor to Follow'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-white/60 mb-2">Platform</label>
            <div className="flex gap-2">
              {platforms.map((p) => {
                const Icon = p.icon;
                return (
                  <button
                    key={p.type}
                    type="button"
                    onClick={() => setSelectedPlatform(p.type)}
                    className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg transition-all ${
                      selectedPlatform === p.type
                        ? 'bg-accent text-white'
                        : 'glass-button text-white/70'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-sm font-medium hidden sm:inline">
                      {p.label}
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
              placeholder="e.g., Elon Musk, Naval Ravikant"
              className="glass-input w-full"
              required
            />
          </div>

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

          <div>
            <label className="block text-sm text-white/60 mb-2">
              Avatar URL (optional)
            </label>
            <input
              type="url"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://example.com/avatar.jpg"
              className="glass-input w-full"
            />
          </div>

          <div>
            <label className="block text-sm text-white/60 mb-2">Bio (optional)</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Brief description..."
              className="glass-input w-full resize-none"
              rows={2}
            />
          </div>

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
            {isSubmitting
              ? (isEditing ? 'Saving...' : 'Adding...')
              : (isEditing ? 'Save Changes' : 'Add Advisor')}
          </button>
        </form>
      </div>
    </div>
  );
}
