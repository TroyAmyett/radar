'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { Topic } from '@/types/database';
import { Settings, Plus, Palette, Mail, Clock, Save, Pencil, Trash2 } from 'lucide-react';
import { setUserTimezone, getUserTimezone } from '@/lib/timezone';
import VideoHelpButton from '@/components/onboarding/VideoHelpButton';
import { onboardingVideos } from '@/lib/onboarding-videos';

// Expanded icon options with keyword associations for auto-selection
const iconOptions = [
  'sparkles', 'bot', 'brain', 'cpu', 'zap',           // AI/Tech
  'users', 'building', 'briefcase', 'handshake',       // Business
  'code', 'terminal', 'database', 'server',            // Development
  'globe', 'link', 'rss', 'wifi',                      // Web/Network
  'play', 'video', 'mic', 'headphones',                // Media
  'chart-line', 'trending-up', 'bar-chart', 'target', // Analytics
  'shield', 'lock', 'key', 'eye',                      // Security
  'cloud', 'rocket', 'star', 'lightning-bolt',         // General
  'dollar-sign', 'credit-card', 'coins', 'wallet',     // Finance
  'message-circle', 'mail', 'bell', 'megaphone',       // Communication
];

const colorOptions = ['#0ea5e9', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#ec4899', '#06b6d4', '#84cc16'];

// Auto-suggest an icon based on topic name, avoiding already-used icons
function suggestIcon(topicName: string, usedIcons: string[]): string {
  const name = topicName.toLowerCase();

  // Keyword to icon mappings
  const iconKeywords: Record<string, string[]> = {
    'sparkles': ['ai', 'magic', 'smart', 'intelligent'],
    'bot': ['agent', 'automation', 'robot', 'assistant'],
    'brain': ['learning', 'neural', 'cognitive', 'think'],
    'cpu': ['processor', 'compute', 'hardware', 'chip'],
    'zap': ['fast', 'quick', 'lightning', 'power', 'energy'],
    'users': ['team', 'people', 'community', 'group', 'social'],
    'building': ['enterprise', 'company', 'corporate', 'organization'],
    'briefcase': ['business', 'work', 'professional', 'job'],
    'handshake': ['partner', 'deal', 'agreement', 'collaboration'],
    'code': ['developer', 'programming', 'software', 'engineering'],
    'terminal': ['cli', 'command', 'shell', 'console'],
    'database': ['data', 'storage', 'sql', 'records'],
    'server': ['backend', 'infrastructure', 'hosting', 'cloud'],
    'globe': ['global', 'world', 'international', 'web'],
    'link': ['connect', 'integration', 'api', 'chain'],
    'rss': ['feed', 'news', 'blog', 'content'],
    'wifi': ['network', 'wireless', 'connection', 'signal'],
    'play': ['video', 'youtube', 'media', 'stream'],
    'video': ['film', 'movie', 'recording', 'camera'],
    'mic': ['podcast', 'audio', 'voice', 'speak'],
    'headphones': ['music', 'listen', 'sound', 'audio'],
    'chart-line': ['analytics', 'metrics', 'stats', 'growth'],
    'trending-up': ['trend', 'increase', 'rising', 'market'],
    'bar-chart': ['report', 'dashboard', 'visualization', 'chart'],
    'target': ['goal', 'objective', 'focus', 'aim'],
    'shield': ['security', 'protect', 'safe', 'defense'],
    'lock': ['secure', 'private', 'password', 'encrypt'],
    'key': ['access', 'auth', 'credential', 'unlock'],
    'eye': ['monitor', 'watch', 'observe', 'view'],
    'cloud': ['saas', 'aws', 'azure', 'hosting'],
    'rocket': ['launch', 'startup', 'fast', 'deploy'],
    'star': ['favorite', 'premium', 'best', 'top'],
    'lightning-bolt': ['electric', 'power', 'force', 'salesforce'],
    'dollar-sign': ['money', 'price', 'cost', 'revenue'],
    'credit-card': ['payment', 'billing', 'transaction', 'purchase'],
    'coins': ['crypto', 'bitcoin', 'currency', 'token'],
    'wallet': ['finance', 'budget', 'fund', 'savings'],
    'message-circle': ['chat', 'message', 'comment', 'discuss'],
    'mail': ['email', 'inbox', 'newsletter', 'correspondence'],
    'bell': ['notification', 'alert', 'reminder', 'update'],
    'megaphone': ['marketing', 'announce', 'promote', 'advertise'],
  };

  // Find the best matching icon
  let bestIcon: string | null = null;
  let bestScore = 0;

  for (const [icon, keywords] of Object.entries(iconKeywords)) {
    // Skip already used icons
    if (usedIcons.includes(icon)) continue;

    let score = 0;
    for (const keyword of keywords) {
      if (name.includes(keyword)) {
        score += keyword.length; // Longer matches score higher
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestIcon = icon;
    }
  }

  // If no match found, pick first unused icon
  if (!bestIcon) {
    bestIcon = iconOptions.find(icon => !usedIcons.includes(icon)) || 'sparkles';
  }

  return bestIcon;
}

interface DigestPreferences {
  digest_enabled: boolean;
  digest_frequency: 'daily' | 'weekly' | 'both';
  digest_time: string;
  digest_timezone: string;
  digest_topics: string[];
}

// Common timezones for selector
const timezoneOptions = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Phoenix', label: 'Arizona (AZ)' },
  { value: 'America/Anchorage', label: 'Alaska (AK)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii (HI)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Central European (CET)' },
  { value: 'Europe/Berlin', label: 'Berlin (CET)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Asia/Shanghai', label: 'China (CST)' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
  { value: 'Asia/Dubai', label: 'Dubai (GST)' },
  { value: 'Asia/Kolkata', label: 'India (IST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST)' },
  { value: 'Australia/Perth', label: 'Perth (AWST)' },
  { value: 'Pacific/Auckland', label: 'New Zealand (NZST)' },
  { value: 'UTC', label: 'UTC' },
];

export default function SettingsPage() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newTopicName, setNewTopicName] = useState('');
  const [newTopicColor, setNewTopicColor] = useState('#0ea5e9');
  const [newTopicIcon, setNewTopicIcon] = useState('sparkles');
  const [isAdding, setIsAdding] = useState(false);

  // Edit topic state
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [editIcon, setEditIcon] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Digest preferences state - will be populated from API/localStorage on mount
  const [digestPrefs, setDigestPrefs] = useState<DigestPreferences>({
    digest_enabled: true,
    digest_frequency: 'daily',
    digest_time: '06:00',
    digest_timezone: 'America/New_York',
    digest_topics: [],
  });

  // Initialize timezone from localStorage on client mount
  useEffect(() => {
    const savedTimezone = getUserTimezone();
    setDigestPrefs((prev) => ({ ...prev, digest_timezone: savedTimezone }));
  }, []);
  const [isSavingPrefs, setIsSavingPrefs] = useState(false);
  const [prefsSaved, setPrefsSaved] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [topicsRes, prefsRes] = await Promise.all([
        fetch('/api/topics'),
        fetch('/api/preferences'),
      ]);
      const topicsData = await topicsRes.json();
      const prefsData = await prefsRes.json();

      setTopics(Array.isArray(topicsData) ? topicsData : []);
      if (prefsData && !prefsData.error) {
        const timezone = prefsData.digest_timezone || getUserTimezone();
        setDigestPrefs({
          digest_enabled: prefsData.digest_enabled ?? true,
          digest_frequency: prefsData.digest_frequency || 'daily',
          digest_time: prefsData.digest_time?.substring(0, 5) || '06:00',
          digest_timezone: timezone,
          digest_topics: prefsData.digest_topics || [],
        });
        // Sync timezone preference to localStorage for client-side formatting
        if (prefsData.digest_timezone) {
          setUserTimezone(prefsData.digest_timezone);
        }
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTopicName.trim()) return;

    setIsAdding(true);
    try {
      const res = await fetch('/api/topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newTopicName,
          color: newTopicColor,
          icon: newTopicIcon,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error('Failed to add topic:', err);
        return;
      }
      const newTopic = await res.json();
      setTopics((prev) => [...prev, newTopic]);
      setNewTopicName('');
      setNewTopicIcon('sparkles'); // Reset to default
    } catch (error) {
      console.error('Failed to add topic:', error);
    } finally {
      setIsAdding(false);
    }
  };

  const handleEditTopic = (topic: Topic) => {
    setEditingTopic(topic);
    setEditName(topic.name);
    setEditColor(topic.color || '#0ea5e9');
    setEditIcon(topic.icon || 'sparkles');
  };

  const handleUpdateTopic = async () => {
    if (!editingTopic || !editName.trim()) return;

    setIsUpdating(true);
    try {
      const res = await fetch('/api/topics', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingTopic.id,
          name: editName,
          color: editColor,
          icon: editIcon,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error('Failed to update topic:', err);
        return;
      }
      const updatedTopic = await res.json();
      setTopics((prev) =>
        prev.map((t) => (t.id === updatedTopic.id ? updatedTopic : t))
      );
      setEditingTopic(null);
    } catch (error) {
      console.error('Failed to update topic:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteTopic = async (topicId: string) => {
    if (!confirm('Are you sure you want to delete this topic? This will unlink all associated content.')) {
      return;
    }

    try {
      await fetch(`/api/topics?id=${topicId}`, {
        method: 'DELETE',
      });
      setTopics((prev) => prev.filter((t) => t.id !== topicId));
    } catch (error) {
      console.error('Failed to delete topic:', error);
    }
  };

  const handleSaveDigestPrefs = async () => {
    setIsSavingPrefs(true);
    setPrefsSaved(false);
    try {
      await fetch('/api/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...digestPrefs,
          digest_time: digestPrefs.digest_time + ':00',
        }),
      });
      // Also save timezone to localStorage for client-side date formatting
      setUserTimezone(digestPrefs.digest_timezone);
      setPrefsSaved(true);
      setTimeout(() => setPrefsSaved(false), 3000);
    } catch (error) {
      console.error('Failed to save preferences:', error);
    } finally {
      setIsSavingPrefs(false);
    }
  };

  const toggleTopicInDigest = (topicSlug: string) => {
    setDigestPrefs((prev) => ({
      ...prev,
      digest_topics: prev.digest_topics.includes(topicSlug)
        ? prev.digest_topics.filter((t) => t !== topicSlug)
        : [...prev.digest_topics, topicSlug],
    }));
  };

  return (
    <ProtectedRoute>
      <div className="flex flex-col h-screen">
        <Header />

        <div className="flex-1 overflow-auto p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold">Settings</h1>
            <p className="text-white/60 mt-1">Manage your topics and preferences</p>
          </div>

          {/* 3-column layout: Topics, Email Digests, Preferences */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Topics Section */}
            <section className="glass-card p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-accent/20">
                  <Palette className="w-5 h-5 text-accent" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold">Topics</h2>
                    <VideoHelpButton video={onboardingVideos.createTopics} compact />
                  </div>
                  <p className="text-white/60 text-sm">
                    Organize your content with custom topics
                  </p>
              </div>
            </div>

            {/* Add Topic Form */}
            <form onSubmit={handleAddTopic} className="mb-6 p-4 rounded-lg bg-white/5">
              <div className="space-y-4 mb-4">
                <div>
                  <label className="block text-sm text-white/60 mb-2">Name</label>
                  <input
                    type="text"
                    value={newTopicName}
                    onChange={(e) => {
                      const name = e.target.value;
                      setNewTopicName(name);
                      // Auto-select icon based on topic name
                      if (name.trim()) {
                        const usedIcons = topics.map(t => t.icon).filter(Boolean) as string[];
                        setNewTopicIcon(suggestIcon(name, usedIcons));
                      }
                    }}
                    placeholder="Topic name"
                    className="glass-input w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm text-white/60 mb-2">Color Group</label>
                  <div className="flex gap-2 flex-wrap">
                    {colorOptions.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setNewTopicColor(color)}
                        className={`w-8 h-8 rounded-full transition-transform ${
                          newTopicColor === color ? 'scale-110 ring-2 ring-white' : ''
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-white/60 mb-2">
                    Icon <span className="text-white/40">(auto-selected)</span>
                  </label>
                  <select
                    value={newTopicIcon}
                    onChange={(e) => setNewTopicIcon(e.target.value)}
                    className="glass-input w-full"
                  >
                    {iconOptions.map((icon) => {
                      const isUsed = topics.some(t => t.icon === icon);
                      return (
                        <option key={icon} value={icon} disabled={isUsed}>
                          {icon}{isUsed ? ' (in use)' : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={isAdding || !newTopicName.trim()}
                className="glass-button flex items-center gap-2 bg-accent hover:bg-accent/80 disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                <span>{isAdding ? 'Adding...' : 'Add Topic'}</span>
              </button>
            </form>

            {/* Topics List */}
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="space-y-2">
                {topics.map((topic) => (
                  <div key={topic.id}>
                    {editingTopic && editingTopic.id === topic.id ? (
                      // Edit Mode
                      <div className="p-4 rounded-lg bg-white/10 border border-accent/50">
                        <div className="space-y-4 mb-4">
                          <div>
                            <label className="block text-sm text-white/60 mb-2">Name</label>
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="glass-input w-full"
                            />
                          </div>

                          <div>
                            <label className="block text-sm text-white/60 mb-2">Color Group</label>
                            <div className="flex gap-2 flex-wrap">
                              {colorOptions.map((color) => (
                                <button
                                  key={color}
                                  type="button"
                                  onClick={() => setEditColor(color)}
                                  className={`w-8 h-8 rounded-full transition-transform ${
                                    editColor === color ? 'scale-110 ring-2 ring-white' : ''
                                  }`}
                                  style={{ backgroundColor: color }}
                                />
                              ))}
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm text-white/60 mb-2">Icon</label>
                            <select
                              value={editIcon}
                              onChange={(e) => setEditIcon(e.target.value)}
                              className="glass-input w-full"
                            >
                              {iconOptions.map((icon) => (
                                <option key={icon} value={icon}>
                                  {icon}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={handleUpdateTopic}
                            disabled={isUpdating || !editName.trim()}
                            className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/80 disabled:opacity-50"
                          >
                            {isUpdating ? 'Saving...' : 'Save'}
                          </button>
                          <button
                            onClick={() => setEditingTopic(null)}
                            className="px-4 py-2 glass-button"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      // View Mode
                      <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 group hover:bg-white/10 transition-colors">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: topic.color || '#0ea5e9' }}
                          />
                          <span className="font-medium">{topic.name}</span>
                          {topic.is_default && (
                            <span className="text-xs text-white/40 px-2 py-0.5 rounded bg-white/10">
                              Default
                            </span>
                          )}
                        </div>

                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleEditTopic(topic)}
                            className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white"
                            title="Edit topic"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteTopic(topic.id)}
                            className="p-2 rounded-lg hover:bg-red-500/20 text-white/60 hover:text-red-400"
                            title="Delete topic"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Email Digest Section */}
          <section className="glass-card p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-purple-500/20">
                <Mail className="w-5 h-5 text-purple-400" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold">Email Digests</h2>
                  <VideoHelpButton video={onboardingVideos.dailyDigest} compact />
                </div>
                <p className="text-white/60 text-sm">
                  Get daily or weekly summaries delivered to your inbox
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Enable/Disable */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-white/5">
                <div>
                  <p className="font-medium">Enable Email Digests</p>
                  <p className="text-white/60 text-sm">
                    Receive curated content summaries by email
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={digestPrefs.digest_enabled}
                    onChange={(e) =>
                      setDigestPrefs((p) => ({ ...p, digest_enabled: e.target.checked }))
                    }
                  />
                  <div className="w-11 h-6 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
                </label>
              </div>

              {digestPrefs.digest_enabled && (
                <>
                  {/* Frequency */}
                  <div className="p-4 rounded-lg bg-white/5">
                    <label className="block text-sm font-medium mb-2">Frequency</label>
                    <div className="flex gap-2">
                      {(['daily', 'weekly', 'both'] as const).map((freq) => (
                        <button
                          key={freq}
                          type="button"
                          onClick={() => setDigestPrefs((p) => ({ ...p, digest_frequency: freq }))}
                          className={`flex-1 py-2 px-4 rounded-lg transition-all ${
                            digestPrefs.digest_frequency === freq
                              ? 'bg-accent text-white'
                              : 'glass-button text-white/70'
                          }`}
                        >
                          {freq.charAt(0).toUpperCase() + freq.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Time */}
                  <div className="p-4 rounded-lg bg-white/5">
                    <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Delivery Time
                    </label>
                    <input
                      type="time"
                      value={digestPrefs.digest_time}
                      onChange={(e) =>
                        setDigestPrefs((p) => ({ ...p, digest_time: e.target.value }))
                      }
                      className="glass-input w-full"
                    />
                    <p className="text-white/40 text-xs mt-2">
                      Based on your timezone (set in Preferences)
                    </p>
                  </div>

                  {/* Topics to Include */}
                  <div className="p-4 rounded-lg bg-white/5">
                    <label className="block text-sm font-medium mb-2">
                      Topics to Include (leave empty for all)
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {topics.map((topic) => (
                        <button
                          key={topic.id}
                          type="button"
                          onClick={() => toggleTopicInDigest(topic.slug)}
                          className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                            digestPrefs.digest_topics.includes(topic.slug)
                              ? 'text-white'
                              : 'bg-white/10 text-white/60'
                          }`}
                          style={{
                            backgroundColor: digestPrefs.digest_topics.includes(topic.slug)
                              ? topic.color || '#0ea5e9'
                              : undefined,
                          }}
                        >
                          {topic.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Save Button */}
              <button
                onClick={handleSaveDigestPrefs}
                disabled={isSavingPrefs}
                className="w-full py-3 bg-accent text-white rounded-lg font-medium hover:bg-accent/80 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                {isSavingPrefs ? 'Saving...' : prefsSaved ? 'Saved!' : 'Save Digest Preferences'}
              </button>
            </div>
          </section>

          {/* Preferences Section */}
          <section className="glass-card p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-accent/20">
                <Settings className="w-5 h-5 text-accent" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Preferences</h2>
                <p className="text-white/60 text-sm">
                  Customize your experience
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Timezone Selector */}
              <div className="p-4 rounded-lg bg-white/5">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-white/60" />
                  <p className="font-medium">Timezone</p>
                </div>
                <p className="text-white/60 text-sm mb-3">
                  Used for all dates, times, and scheduled content
                </p>
                <select
                  value={digestPrefs.digest_timezone}
                  onChange={(e) =>
                    setDigestPrefs((p) => ({ ...p, digest_timezone: e.target.value }))
                  }
                  className="glass-input w-full"
                >
                  {timezoneOptions.map((tz) => (
                    <option key={tz.value} value={tz.value}>
                      {tz.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Save Preferences Button */}
              <button
                onClick={handleSaveDigestPrefs}
                disabled={isSavingPrefs}
                className="w-full py-3 bg-accent text-white rounded-lg font-medium hover:bg-accent/80 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                {isSavingPrefs ? 'Saving...' : prefsSaved ? 'Saved!' : 'Save Preferences'}
              </button>
              </div>
            </section>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
