'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { Topic } from '@/types/database';
import { Settings, Plus, Palette, Mail, Clock, Save, Pencil, Trash2, Twitter, ExternalLink, AlertCircle, CheckCircle, Users, Key, Linkedin } from 'lucide-react';
import { getCurrentSubscription, type Subscription } from '@/lib/subscription';
import { getKeyStatus, type KeyStatus } from '@/lib/apiKeyManager';
import { getOAuthConnections, disconnectOAuth, type OAuthConnection, type OAuthProvider } from '@/lib/oauth/shared';

const AGENTPM_URL = process.env.NEXT_PUBLIC_AGENTPM_URL || 'https://agentpm.funnelists.com';

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
  email_address: string | null;
}

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

  // Digest preferences state
  const [digestPrefs, setDigestPrefs] = useState<DigestPreferences>({
    digest_enabled: true,
    digest_frequency: 'daily',
    digest_time: '06:00',
    digest_timezone: 'America/New_York',
    digest_topics: [],
    email_address: null,
  });
  const [isSavingPrefs, setIsSavingPrefs] = useState(false);
  const [prefsSaved, setPrefsSaved] = useState(false);

  // X (Twitter) connection state
  const [xConnected, setXConnected] = useState(false);
  const [xChecking, setXChecking] = useState(true);

  // New: Subscription and API keys state
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [anthropicStatus, setAnthropicStatus] = useState<KeyStatus | null>(null);
  const [geminiStatus, setGeminiStatus] = useState<KeyStatus | null>(null);
  const [isLoadingKeys, setIsLoadingKeys] = useState(true);

  // New: OAuth connections state
  const [oauthConnections, setOAuthConnections] = useState<OAuthConnection[]>([]);

  useEffect(() => {
    fetchData();
    loadSubscriptionAndKeys();
    loadOAuthConnections();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    setXChecking(true);
    try {
      const [topicsRes, prefsRes, xStatusRes] = await Promise.all([
        fetch('/api/topics'),
        fetch('/api/preferences'),
        fetch('/api/x-status'),
      ]);
      const topicsData = await topicsRes.json();
      const prefsData = await prefsRes.json();
      const xStatusData = await xStatusRes.json();

      setTopics(Array.isArray(topicsData) ? topicsData : []);
      if (prefsData && !prefsData.error) {
        setDigestPrefs({
          digest_enabled: prefsData.digest_enabled ?? true,
          digest_frequency: prefsData.digest_frequency || 'daily',
          digest_time: prefsData.digest_time?.substring(0, 5) || '06:00',
          digest_timezone: prefsData.digest_timezone || 'America/New_York',
          digest_topics: prefsData.digest_topics || [],
          email_address: prefsData.email_address || null,
        });
      }
      setXConnected(xStatusData?.connected || false);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setIsLoading(false);
      setXChecking(false);
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

  // New: Load subscription and API keys
  const loadSubscriptionAndKeys = async () => {
    setIsLoadingKeys(true);
    try {
      const sub = await getCurrentSubscription();
      setSubscription(sub);

      const [anthropic, gemini] = await Promise.all([
        getKeyStatus('anthropic'),
        getKeyStatus('gemini')
      ]);
      setAnthropicStatus(anthropic);
      setGeminiStatus(gemini);
    } catch (error) {
      console.error('Failed to load subscription/keys:', error);
    } finally {
      setIsLoadingKeys(false);
    }
  };

  // New: Load OAuth connections
  const loadOAuthConnections = async () => {
    try {
      const connections = await getOAuthConnections();
      setOAuthConnections(connections);
    } catch (error) {
      console.error('Failed to load OAuth connections:', error);
    }
  };

  // New: Handle OAuth connect
  const handleOAuthConnect = (provider: OAuthProvider) => {
    window.location.href = `/api/oauth/${provider}/authorize`;
  };

  // New: Handle OAuth disconnect
  const handleOAuthDisconnect = async (provider: OAuthProvider) => {
    if (confirm(`Disconnect ${provider}?`)) {
      try {
        await disconnectOAuth(provider);
        await loadOAuthConnections();
      } catch (error) {
        console.error(`Failed to disconnect ${provider}:`, error);
      }
    }
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

          <div className="max-w-2xl">
            {/* Topics Section */}
            <section className="glass-card p-6 mb-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-accent/20">
                  <Palette className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Topics</h2>
                  <p className="text-white/60 text-sm">
                    Organize your content with custom topics
                  </p>
              </div>
            </div>

            {/* Add Topic Form */}
            <form onSubmit={handleAddTopic} className="mb-6 p-4 rounded-lg bg-white/5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
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
                  <label className="block text-sm text-white/60 mb-2">Color</label>
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
                    {editingTopic?.id === topic.id ? (
                      // Edit Mode
                      <div className="p-4 rounded-lg bg-white/10 border border-accent/50">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
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
                            <label className="block text-sm text-white/60 mb-2">Color</label>
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
          <section className="glass-card p-6 mb-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-purple-500/20">
                <Mail className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Email Digests</h2>
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
                  {/* Email Address */}
                  <div className="p-4 rounded-lg bg-white/5">
                    <label className="block text-sm font-medium mb-2">Email Address</label>
                    <input
                      type="email"
                      value={digestPrefs.email_address || ''}
                      onChange={(e) =>
                        setDigestPrefs((p) => ({ ...p, email_address: e.target.value }))
                      }
                      placeholder="your@email.com"
                      className="glass-input w-full"
                    />
                  </div>

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
                      Timezone: {digestPrefs.digest_timezone}
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

          {/* Account & Team Section */}
          <section className="glass-card p-6 mb-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-purple-500/20">
                <Users className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Account & Team</h2>
                <p className="text-white/60 text-sm">
                  Manage your account, team members, and permissions
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-white/5">
                <div>
                  <p className="font-medium">Account Management</p>
                  <p className="text-white/60 text-sm">
                    Manage account settings, team members, and invitations
                  </p>
                </div>
                <a
                  href={`${AGENTPM_URL}/#settings?section=account`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="glass-button flex items-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  Manage in AgentPM
                </a>
              </div>
            </div>
          </section>

          {/* API Keys Section */}
          <section className="glass-card p-6 mb-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-accent/20">
                <Key className="w-5 h-5 text-accent" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">API Keys</h2>
                <p className="text-white/60 text-sm">
                  Configure your AI provider API keys for content analysis
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {isLoadingKeys ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <>
                  {/* Tier-specific messaging */}
                  {subscription && (
                    <>
                      {['beta', 'trial', 'demo', 'free'].includes(subscription.tier) ? (
                        <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              {subscription.tier.toUpperCase()} ACCOUNT
                            </span>
                          </div>
                          <p className="text-green-200 text-sm mb-2">
                            As a {subscription.tier} tier user, you have access to Radar using platform-provided API keys.
                            No configuration needed!
                          </p>
                          <p className="text-white/60 text-xs">
                            Want to use your own API keys? You can optionally configure them below.
                          </p>
                        </div>
                      ) : (
                        <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                              {subscription.tier.toUpperCase()} ACCOUNT
                            </span>
                          </div>
                          <p className="text-purple-200 text-sm mb-3">
                            API keys are securely managed through AgentPM. You must configure your own API keys to use Radar.
                          </p>
                          <a
                            href={`${AGENTPM_URL}/#settings?section=api-keys`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/80 transition-colors text-sm font-medium"
                          >
                            <ExternalLink className="w-4 h-4" />
                            Manage API Keys in AgentPM
                          </a>
                        </div>
                      )}
                    </>
                  )}

                  {/* Key Status Display */}
                  <div className="space-y-2">
                    {anthropicStatus && (
                      <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${
                            anthropicStatus.configured ? 'bg-green-500' : (anthropicStatus.required ? 'bg-red-500' : 'bg-yellow-500')
                          }`} />
                          <div>
                            <span className="font-medium">Anthropic Claude</span>
                            <div className="text-xs text-white/60 mt-0.5">
                              {anthropicStatus.source === 'platform' && 'Using platform key'}
                              {anthropicStatus.source === 'byok' && 'Using your API key'}
                              {anthropicStatus.source === 'none' && (anthropicStatus.required ? 'Required - not configured' : 'Optional - not configured')}
                            </div>
                          </div>
                        </div>
                        {!anthropicStatus.configured && anthropicStatus.required && (
                          <a
                            href={`${AGENTPM_URL}/#settings?section=api-keys`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-accent hover:underline"
                          >
                            Configure →
                          </a>
                        )}
                      </div>
                    )}

                    {geminiStatus && (
                      <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${
                            geminiStatus.configured ? 'bg-green-500' : (geminiStatus.required ? 'bg-red-500' : 'bg-yellow-500')
                          }`} />
                          <div>
                            <span className="font-medium">Google Gemini</span>
                            <div className="text-xs text-white/60 mt-0.5">
                              {geminiStatus.source === 'platform' && 'Using platform key'}
                              {geminiStatus.source === 'byok' && 'Using your API key'}
                              {geminiStatus.source === 'none' && (geminiStatus.required ? 'Required - not configured' : 'Optional - not configured')}
                            </div>
                          </div>
                        </div>
                        {!geminiStatus.configured && geminiStatus.required && (
                          <a
                            href={`${AGENTPM_URL}/#settings?section=api-keys`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-accent hover:underline"
                          >
                            Configure →
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </section>

          {/* Social Connections Section */}
          <section className="glass-card p-6 mb-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <Twitter className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Social Connections</h2>
                <p className="text-white/60 text-sm">
                  Connect your social accounts to publish content
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {/* X (Twitter) */}
              {(() => {
                const xConnection = oauthConnections.find(c => c.provider === 'twitter');
                return (
                  <div className="flex items-center justify-between p-4 rounded-lg bg-white/5">
                    <div className="flex items-center gap-3">
                      <Twitter className="w-5 h-5 text-blue-400" />
                      <div>
                        <p className="font-medium">X (Twitter)</p>
                        {xConnection ? (
                          <div className="flex items-center gap-2 text-xs text-white/60 mt-0.5">
                            <CheckCircle className="w-3 h-3 text-green-400" />
                            <span>Connected as @{xConnection.provider_username}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-xs text-white/60 mt-0.5">
                            <AlertCircle className="w-3 h-3 text-amber-400" />
                            <span>Not connected</span>
                          </div>
                        )}
                      </div>
                    </div>
                    {xConnection ? (
                      <button
                        onClick={() => handleOAuthDisconnect('twitter')}
                        className="px-3 py-1.5 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      >
                        Disconnect
                      </button>
                    ) : (
                      <button
                        onClick={() => handleOAuthConnect('twitter')}
                        className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                      >
                        Connect
                      </button>
                    )}
                  </div>
                );
              })()}

              {/* LinkedIn */}
              {(() => {
                const linkedinConnection = oauthConnections.find(c => c.provider === 'linkedin');
                return (
                  <div className="flex items-center justify-between p-4 rounded-lg bg-white/5">
                    <div className="flex items-center gap-3">
                      <Linkedin className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="font-medium">LinkedIn</p>
                        {linkedinConnection ? (
                          <div className="flex items-center gap-2 text-xs text-white/60 mt-0.5">
                            <CheckCircle className="w-3 h-3 text-green-400" />
                            <span>Connected as {linkedinConnection.provider_username}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-xs text-white/60 mt-0.5">
                            <AlertCircle className="w-3 h-3 text-amber-400" />
                            <span>Not connected - Coming soon</span>
                          </div>
                        )}
                      </div>
                    </div>
                    {linkedinConnection ? (
                      <button
                        onClick={() => handleOAuthDisconnect('linkedin')}
                        className="px-3 py-1.5 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      >
                        Disconnect
                      </button>
                    ) : (
                      <button
                        disabled
                        className="px-3 py-1.5 text-sm bg-white/10 text-white/40 rounded-lg cursor-not-allowed"
                      >
                        Coming Soon
                      </button>
                    )}
                  </div>
                );
              })()}

              {/* Cross-Product Note */}
              <div className="mt-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <p className="text-blue-200 text-xs">
                  <strong>Shared across products:</strong> Your social connections are available in all Funnelists products.
                  Connect once, use everywhere.
                </p>
              </div>
            </div>
          </section>

          {/* Legacy X (Twitter) Connection Section - DEPRECATED, will remove after OAuth migration */}
          <section className="glass-card p-6 mb-6 hidden">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <Twitter className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">X (Twitter) Connection</h2>
                <p className="text-white/60 text-sm">
                  Connect your X account to post content directly
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-white/5">
                <div className="flex items-center gap-3">
                  {xChecking ? (
                    <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                  ) : xConnected ? (
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-amber-400" />
                  )}
                  <div>
                    <p className="font-medium">
                      {xChecking ? 'Checking connection...' : xConnected ? 'Connected' : 'Not Connected'}
                    </p>
                    <p className="text-white/60 text-sm">
                      {xConnected
                        ? 'Your X account is connected and ready to post'
                        : 'X API credentials need to be configured'}
                    </p>
                  </div>
                </div>
              </div>

              {!xConnected && !xChecking && (
                <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <p className="text-amber-200 text-sm mb-3">
                    To enable posting to X, you need to configure API credentials in your environment variables:
                  </p>
                  <ul className="text-white/60 text-sm space-y-1 ml-4 list-disc">
                    <li>X_API_KEY</li>
                    <li>X_API_SECRET</li>
                    <li>X_ACCESS_TOKEN</li>
                    <li>X_ACCESS_SECRET</li>
                  </ul>
                  <a
                    href="https://developer.x.com/en/portal/dashboard"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 mt-3 text-blue-400 hover:text-blue-300 text-sm"
                  >
                    <span>Get API credentials from X Developer Portal</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
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
              <div className="flex items-center justify-between p-4 rounded-lg bg-white/5">
                <div>
                  <p className="font-medium">Auto-refresh feeds</p>
                  <p className="text-white/60 text-sm">
                    Automatically fetch new content periodically
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" defaultChecked />
                  <div className="w-11 h-6 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-white/5">
                <div>
                  <p className="font-medium">Show read items</p>
                  <p className="text-white/60 text-sm">
                    Display items you&apos;ve already viewed
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" defaultChecked />
                  <div className="w-11 h-6 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
                </label>
              </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
