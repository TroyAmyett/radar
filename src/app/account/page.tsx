'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import {
  Key,
  Link2,
  Users,
  CreditCard,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  CheckCircle,
  Loader2
} from 'lucide-react';
import { getCurrentSubscription, type Subscription } from '@/lib/subscription';
import { createClient } from '@/lib/supabase/client';
import { formatDate } from '@/lib/timezone';

// Types
interface ApiKey {
  id: string;
  provider: string;
  keyHint: string;
  isValid: boolean;
  lastUsedAt: string | null;
}

interface OAuthConnection {
  id: string;
  provider: string;
  providerUsername: string;
  isActive: boolean;
  createdAt: string;
}

interface TeamMember {
  id: string;
  email: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  status: 'active' | 'pending';
}

type TabId = 'api-keys' | 'connections' | 'team' | 'billing';

const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'api-keys', label: 'API Keys', icon: <Key className="w-4 h-4" /> },
  { id: 'connections', label: 'Connections', icon: <Link2 className="w-4 h-4" /> },
  { id: 'team', label: 'Team', icon: <Users className="w-4 h-4" /> },
  { id: 'billing', label: 'Billing', icon: <CreditCard className="w-4 h-4" /> },
];

export default function AccountConfigurationPage() {
  const [activeTab, setActiveTab] = useState<TabId>('api-keys');
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<{ email: string; id: string } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser({ email: user.email || '', id: user.id });
      }
      const sub = await getCurrentSubscription();
      setSubscription(sub);
    } catch (error) {
      console.error('Failed to load account data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="flex flex-col h-screen bg-background">
        <Header />

        <div className="flex-1 overflow-auto">
          <div className="max-w-4xl mx-auto p-6">
            {/* Page Header */}
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-white mb-2">Config</h1>
              <p className="text-white/60">
                API keys, connections, team, and billing.
              </p>
            </div>

            {/* Subscription Badge */}
            {subscription && (
              <div className="mb-6 p-4 rounded-lg bg-white/5 border border-white/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      ['beta', 'trial', 'demo', 'free'].includes(subscription.tier)
                        ? 'bg-green-100 text-green-800'
                        : 'bg-purple-100 text-purple-800'
                    }`}>
                      {subscription.tier.toUpperCase()}
                    </span>
                    <span className="text-white/80">
                      {['beta', 'trial', 'demo', 'free'].includes(subscription.tier)
                        ? 'Platform API keys available'
                        : 'Bring Your Own Keys (BYOK) required'}
                    </span>
                  </div>
                  {user && (
                    <span className="text-white/40 text-sm">{user.email}</span>
                  )}
                </div>
              </div>
            )}

            {/* Tab Navigation */}
            <div className="flex gap-1 mb-6 p-1 rounded-lg bg-white/5">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-accent text-white'
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="bg-white/5 rounded-xl border border-white/10 p-6">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-accent" />
                </div>
              ) : (
                <>
                  {activeTab === 'api-keys' && <ApiKeysTab subscription={subscription} />}
                  {activeTab === 'connections' && <ConnectionsTab />}
                  {activeTab === 'team' && <TeamTab />}
                  {activeTab === 'billing' && <BillingTab subscription={subscription} />}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

// API Keys Tab
function ApiKeysTab({ subscription }: { subscription: Subscription | null }) {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  const providers = [
    { id: 'anthropic', name: 'Anthropic (Claude)', description: 'Used for AI summaries and analysis' },
    { id: 'google', name: 'Google (Gemini)', description: 'Used for video transcription' },
    { id: 'openai', name: 'OpenAI', description: 'Alternative AI provider' },
  ];

  useEffect(() => {
    loadKeys();
  }, []);

  const loadKeys = async () => {
    setIsLoading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('user_api_keys')
        .select('id, provider, key_hint, is_valid, last_used_at')
        .eq('user_id', user.id)
        .is('deleted_at', null);

      if (error) {
        // Table might not exist yet - that's ok for now
        console.warn('API keys query:', error.message);
      } else if (data) {
        setKeys(data.map(k => ({
          id: k.id,
          provider: k.provider,
          keyHint: k.key_hint,
          isValid: k.is_valid,
          lastUsedAt: k.last_used_at
        })));
      }
    } catch (error) {
      console.error('Failed to load API keys:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to delete this API key?')) return;

    try {
      const supabase = createClient();
      await supabase
        .from('user_api_keys')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', keyId);

      setKeys(keys.filter(k => k.id !== keyId));
    } catch (error) {
      console.error('Failed to delete key:', error);
    }
  };

  const isPlatformTier = subscription && ['beta', 'trial', 'demo', 'free'].includes(subscription.tier);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">API Keys</h2>
          <p className="text-white/60 text-sm">
            {isPlatformTier
              ? 'Platform keys are available. You can optionally add your own.'
              : 'Add your API keys to use AI features in Radar.'}
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/80 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Add Key
        </button>
      </div>

      {/* Platform Keys Notice */}
      {isPlatformTier && (
        <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
          <div className="flex items-center gap-2 text-green-400">
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium">Platform API keys active</span>
          </div>
          <p className="text-green-200/80 text-sm mt-1">
            As a {subscription?.tier} user, Radar uses platform-provided API keys. No configuration required.
          </p>
        </div>
      )}

      {/* Keys List */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-white/40" />
        </div>
      ) : keys.length === 0 ? (
        <div className="text-center py-8 text-white/40">
          {isPlatformTier
            ? 'No custom API keys configured. Platform keys are being used.'
            : 'No API keys configured. Add your keys to enable AI features.'}
        </div>
      ) : (
        <div className="space-y-3">
          {keys.map((key) => (
            <div
              key={key.id}
              className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10"
            >
              <div className="flex items-center gap-4">
                <div className={`w-3 h-3 rounded-full ${key.isValid ? 'bg-green-500' : 'bg-red-500'}`} />
                <div>
                  <div className="font-medium text-white">
                    {providers.find(p => p.id === key.provider)?.name || key.provider}
                  </div>
                  <div className="text-white/40 text-sm font-mono">{key.keyHint}</div>
                </div>
              </div>
              <button
                onClick={() => deleteKey(key.id)}
                className="p-2 text-white/40 hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add Key Modal */}
      {showAddModal && (
        <AddApiKeyModal
          providers={providers}
          existingProviders={keys.map(k => k.provider)}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            loadKeys();
          }}
        />
      )}
    </div>
  );
}

// Add API Key Modal
function AddApiKeyModal({
  providers,
  existingProviders,
  onClose,
  onSuccess
}: {
  providers: { id: string; name: string; description: string }[];
  existingProviders: string[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [selectedProvider, setSelectedProvider] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProvider || !apiKey) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/account/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: selectedProvider, apiKey }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save API key');
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save API key');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-md bg-surface-800 border border-white/10 rounded-xl shadow-2xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Add API Key</h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">Provider</label>
            <select
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value)}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="">Select a provider...</option>
              {providers.map((p) => (
                <option
                  key={p.id}
                  value={p.id}
                  disabled={existingProviders.includes(p.id)}
                >
                  {p.name} {existingProviders.includes(p.id) ? '(already added)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">API Key</label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
                className="w-full px-3 py-2 pr-10 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-accent font-mono"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-white/40 hover:text-white"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-white/10 rounded-lg text-white/60 hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !selectedProvider || !apiKey}
              className="flex-1 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Key'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Connections Tab
function ConnectionsTab() {
  const [connections, setConnections] = useState<OAuthConnection[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const providers = [
    { id: 'twitter', name: 'X (Twitter)', icon: '𝕏', description: 'Post content to X', comingSoon: true },
    { id: 'linkedin', name: 'LinkedIn', icon: 'in', description: 'Share to LinkedIn', comingSoon: true },
  ];

  useEffect(() => {
    loadConnections();
  }, []);

  const loadConnections = async () => {
    setIsLoading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('oauth_connections')
        .select('id, provider, provider_username, is_active, created_at')
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (error) {
        // Table might not exist yet - that's ok for now
        console.warn('OAuth connections query:', error.message);
      } else if (data) {
        setConnections(data.map(c => ({
          id: c.id,
          provider: c.provider,
          providerUsername: c.provider_username,
          isActive: c.is_active,
          createdAt: c.created_at
        })));
      }
    } catch (error) {
      console.error('Failed to load connections:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = (provider: string) => {
    window.location.href = `/api/oauth/${provider}/authorize`;
  };

  const handleDisconnect = async (connectionId: string, provider: string) => {
    if (!confirm(`Disconnect ${provider}?`)) return;

    try {
      const supabase = createClient();
      await supabase
        .from('oauth_connections')
        .update({ is_active: false })
        .eq('id', connectionId);

      setConnections(connections.filter(c => c.id !== connectionId));
    } catch (error) {
      console.error('Failed to disconnect:', error);
    }
  };

  const getConnection = (providerId: string) =>
    connections.find(c => c.provider === providerId);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-white">Connections</h2>
        <p className="text-white/60 text-sm">
          Connect your social accounts to share content directly from Radar.
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-white/40" />
        </div>
      ) : (
        <div className="space-y-3">
          {providers.map((provider) => {
            const connection = getConnection(provider.id);
            return (
              <div
                key={provider.id}
                className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-white font-bold">
                    {provider.icon}
                  </div>
                  <div>
                    <div className="font-medium text-white">{provider.name}</div>
                    {connection ? (
                      <div className="text-green-400 text-sm">@{connection.providerUsername}</div>
                    ) : (
                      <div className="text-white/40 text-sm">{provider.description}</div>
                    )}
                  </div>
                </div>
                {provider.comingSoon ? (
                  <span className="px-3 py-1 text-xs font-medium text-white/40 bg-white/5 rounded-full">
                    Coming Soon
                  </span>
                ) : connection ? (
                  <button
                    onClick={() => handleDisconnect(connection.id, provider.name)}
                    className="px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                  >
                    Disconnect
                  </button>
                ) : (
                  <button
                    onClick={() => handleConnect(provider.id)}
                    className="px-4 py-2 text-sm bg-accent text-white rounded-lg hover:bg-accent/80 transition-colors"
                  >
                    Connect
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Team Tab
function TeamTab() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadMembers();
  }, []);

  const loadMembers = async () => {
    setIsLoading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }

      // Get current user's account
      const { data: userAccount } = await supabase
        .from('user_accounts')
        .select('account_id')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('is_primary', { ascending: false })
        .limit(1)
        .single();

      if (!userAccount) {
        setIsLoading(false);
        return;
      }

      // Get all members of this account (simplified - no join to users table)
      const { data, error } = await supabase
        .from('user_accounts')
        .select('id, user_id, role, status')
        .eq('account_id', userAccount.account_id);

      if (error) {
        console.warn('Team members query:', error.message);
      } else if (data) {
        // For now just show user IDs - full user info requires admin access
        setMembers(data.map((m: { id: string; user_id: string; role: string; status: string }) => ({
          id: m.id,
          email: m.user_id === user.id ? (user.email || 'You') : `User ${m.user_id.slice(0, 8)}...`,
          role: m.role as TeamMember['role'],
          status: m.status as TeamMember['status']
        })));
      }
    } catch (error) {
      console.error('Failed to load team members:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const roleColors: Record<string, string> = {
    owner: 'bg-purple-100 text-purple-800',
    admin: 'bg-blue-100 text-blue-800',
    member: 'bg-gray-100 text-gray-800',
    viewer: 'bg-gray-100 text-gray-600',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Team Members</h2>
          <p className="text-white/60 text-sm">
            Manage who has access to this account.
          </p>
        </div>
        <button
          className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/80 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Invite Member
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-white/40" />
        </div>
      ) : members.length === 0 ? (
        <div className="text-center py-8 text-white/40">
          No team members found.
        </div>
      ) : (
        <div className="space-y-3">
          {members.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center text-accent font-medium">
                  {member.email[0].toUpperCase()}
                </div>
                <div>
                  <div className="font-medium text-white">{member.email}</div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${roleColors[member.role]}`}>
                    {member.role}
                  </span>
                </div>
              </div>
              {member.role !== 'owner' && (
                <button className="p-2 text-white/40 hover:text-red-400 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Billing Tab
function BillingTab({ subscription }: { subscription: Subscription | null }) {
  const tierInfo: Record<string, { name: string; price: string; description: string }> = {
    beta: { name: 'Beta', price: 'Free', description: 'Early access with platform API keys' },
    trial: { name: 'Trial', price: 'Free', description: '14-day trial with full features' },
    demo: { name: 'Demo', price: 'Free', description: 'Demo account for testing' },
    free: { name: 'Free', price: 'Free', description: 'Basic access with rate limits' },
    friends_family: { name: 'Friends & Family', price: 'Free', description: 'Full access, bring your own keys' },
    starter: { name: 'Starter', price: '$X/mo', description: 'For individuals' },
    pro: { name: 'Pro', price: '$XX/mo', description: 'For professionals' },
    business: { name: 'Business', price: '$XXX/mo', description: 'For teams' },
    enterprise: { name: 'Enterprise', price: 'Custom', description: 'Custom solutions' },
  };

  const currentTier = subscription?.tier || 'free';
  const info = tierInfo[currentTier] || tierInfo.free;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-white">Billing & Subscription</h2>
        <p className="text-white/60 text-sm">
          Manage your subscription and billing information.
        </p>
      </div>

      {/* Current Plan */}
      <div className="p-6 rounded-lg bg-gradient-to-r from-accent/20 to-purple-500/20 border border-accent/30">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-white/60 text-sm mb-1">Current Plan</div>
            <div className="text-2xl font-bold text-white">{info.name}</div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-white">{info.price}</div>
          </div>
        </div>
        <p className="text-white/60 mb-4">{info.description}</p>

        {subscription?.current_period_end && (
          <div className="text-white/40 text-sm">
            {subscription.status === 'active' ? 'Renews' : 'Expires'}: {formatDate(subscription.current_period_end)}
          </div>
        )}
      </div>

      {/* Upgrade Options */}
      {['beta', 'trial', 'demo', 'free'].includes(currentTier) && (
        <div className="p-4 rounded-lg bg-white/5 border border-white/10">
          <h3 className="font-medium text-white mb-2">Upgrade to Pro</h3>
          <p className="text-white/60 text-sm mb-4">
            Get unlimited access, priority support, and advanced features.
          </p>
          <button className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/80 transition-colors text-sm font-medium">
            View Plans
          </button>
        </div>
      )}
    </div>
  );
}
