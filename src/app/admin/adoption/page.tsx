'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { authFetch } from '@/lib/api';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import Header from '@/components/layout/Header';
import {
  TrendingUp,
  Users,
  UserPlus,
  Activity,
  Rss,
  FileText,
  Heart,
  Bookmark,
  Clock,
  Search,
  Shield,
  Loader2,
  ShieldOff,
  ChevronRight,
} from 'lucide-react';

interface AdoptionData {
  funnel: {
    invited: number;
    signed_up: number;
    confirmed: number;
    active_7d: number;
    active_30d: number;
    new_7d: number;
    new_30d: number;
  };
  engagement: {
    total_sources: number;
    total_content_items: number;
    total_interactions: number;
    total_likes: number;
    total_saves: number;
  };
  invites: {
    total: number;
    pending: number;
    accepted: number;
    expired: number;
  };
  users: AdoptionUser[];
  generated_at: string;
}

interface AdoptionUser {
  id: string;
  email: string;
  name: string | null;
  status: 'active' | 'inactive' | 'unconfirmed';
  is_super_admin: boolean;
  created_at: string;
  last_sign_in_at: string | null;
  sources_count: number;
  interactions_count: number;
  invites_sent: number;
}

const statusColors: Record<string, string> = {
  active: 'bg-green-500/20 text-green-400',
  inactive: 'bg-gray-500/20 text-gray-400',
  unconfirmed: 'bg-yellow-500/20 text-yellow-400',
};

function timeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function conversionPct(from: number, to: number): string {
  if (from === 0) return '0%';
  return `${Math.round((to / from) * 100)}%`;
}

export default function AdoptionDashboard() {
  const { isSuperAdmin, loading: authLoading } = useAuth();
  const [data, setData] = useState<AdoptionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function fetchData() {
      try {
        const params = search ? `?search=${encodeURIComponent(search)}` : '';
        const res = await authFetch(`/api/admin/adoption${params}`);
        if (!res.ok) {
          if (res.status === 403) {
            setError('Access denied');
          } else {
            setError('Failed to load adoption data');
          }
          return;
        }
        const json = await res.json();
        setData(json);
      } catch {
        setError('Failed to load adoption data');
      } finally {
        setIsLoading(false);
      }
    }

    if (!authLoading && isSuperAdmin) {
      fetchData();
    } else if (!authLoading && !isSuperAdmin) {
      setIsLoading(false);
    }
  }, [authLoading, isSuperAdmin, search]);

  return (
    <ProtectedRoute>
      <div className="flex flex-col h-screen">
        <Header />
        <div className="flex-1 overflow-auto p-4 sm:p-6">
          <div className="max-w-6xl mx-auto">
            {/* Access Denied */}
            {!authLoading && !isSuperAdmin && (
              <div className="flex flex-col items-center justify-center py-20 text-white/40">
                <ShieldOff className="w-12 h-12 mb-3" />
                <p className="text-lg">Access Denied</p>
                <p className="text-sm mt-1">Super Admin access required</p>
              </div>
            )}

            {/* Loading */}
            {isLoading && isSuperAdmin && (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-accent animate-spin" />
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="flex flex-col items-center justify-center py-20 text-white/40">
                <p className="text-lg">{error}</p>
              </div>
            )}

            {/* Dashboard Content */}
            {data && (
              <>
                {/* Page Header */}
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 rounded-lg bg-cyan-500/20">
                    <TrendingUp className="w-6 h-6 text-cyan-400" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-semibold text-white">Adoption Dashboard</h1>
                    <p className="text-white/50 text-sm">Growth metrics & user engagement</p>
                  </div>
                </div>

                {/* Funnel Visualization */}
                <div className="mb-6">
                  <h2 className="text-sm font-medium text-white/40 uppercase tracking-wider mb-3">Conversion Funnel</h2>
                  <div className="flex items-stretch gap-2 overflow-x-auto pb-2">
                    {[
                      { label: 'Invited', value: data.funnel.invited, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
                      { label: 'Signed Up', value: data.funnel.signed_up, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
                      { label: 'Confirmed', value: data.funnel.confirmed, color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/20' },
                      { label: 'Active (7d)', value: data.funnel.active_7d, color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20' },
                    ].map((step, i, arr) => (
                      <div key={step.label} className="flex items-center gap-2 min-w-0">
                        <div className={`flex-1 min-w-[120px] p-4 rounded-lg border ${step.bg} text-center`}>
                          <div className={`text-2xl font-bold ${step.color}`}>{step.value}</div>
                          <div className="text-xs text-white/50 mt-1">{step.label}</div>
                          {i > 0 && arr[i - 1].value > 0 && (
                            <div className="text-xs text-white/30 mt-0.5">
                              {conversionPct(arr[i - 1].value, step.value)}
                            </div>
                          )}
                        </div>
                        {i < arr.length - 1 && (
                          <ChevronRight className="w-5 h-5 text-white/20 flex-shrink-0" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Metrics Grid */}
                <div className="mb-6">
                  <h2 className="text-sm font-medium text-white/40 uppercase tracking-wider mb-3">Platform Metrics</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    <MetricCard icon={Users} label="Total Users" value={data.funnel.signed_up} color="text-white" />
                    <MetricCard icon={Activity} label="Active (7d)" value={data.funnel.active_7d} color="text-green-400" />
                    <MetricCard icon={Activity} label="Active (30d)" value={data.funnel.active_30d} color="text-cyan-400" />
                    <MetricCard icon={UserPlus} label="New (7d)" value={data.funnel.new_7d} color="text-blue-400" />
                    <MetricCard icon={UserPlus} label="New (30d)" value={data.funnel.new_30d} color="text-purple-400" />
                    <MetricCard icon={Rss} label="Sources" value={data.engagement.total_sources} color="text-orange-400" />
                    <MetricCard icon={FileText} label="Content Items" value={data.engagement.total_content_items} color="text-yellow-400" />
                    <MetricCard icon={Heart} label="Likes" value={data.engagement.total_likes} color="text-red-400" />
                    <MetricCard icon={Bookmark} label="Saves" value={data.engagement.total_saves} color="text-sky-400" />
                    <MetricCard icon={Clock} label="Invites Pending" value={data.invites.pending} color="text-yellow-400" />
                  </div>
                </div>

                {/* Search */}
                <div className="mb-4">
                  <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                    <input
                      type="text"
                      placeholder="Search by name or email..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="glass-input w-full pl-10 pr-4 py-2 text-sm"
                    />
                  </div>
                </div>

                {/* User List */}
                <div className="space-y-2">
                  <h2 className="text-sm font-medium text-white/40 uppercase tracking-wider mb-3">
                    Users ({data.users.length})
                  </h2>
                  {data.users.map(user => (
                    <div
                      key={user.id}
                      className="flex items-center gap-4 p-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/[0.07] transition-colors"
                    >
                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center text-accent font-medium flex-shrink-0">
                        {(user.name?.[0] || user.email[0]).toUpperCase()}
                      </div>

                      {/* Name & Email */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-white truncate">
                            {user.name || 'No name'}
                          </span>
                          {user.is_super_admin && (
                            <span title="Super Admin"><Shield className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" /></span>
                          )}
                        </div>
                        <div className="text-white/40 text-sm truncate">{user.email}</div>
                      </div>

                      {/* Status */}
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${statusColors[user.status]}`}>
                        {user.status}
                      </span>

                      {/* Stats (hidden on small screens) */}
                      <div className="hidden md:flex items-center gap-4 text-sm text-white/50 flex-shrink-0">
                        <span title="Sources">{user.sources_count} sources</span>
                        <span title="Interactions">{user.interactions_count} actions</span>
                        {user.invites_sent > 0 && (
                          <span title="Invites sent">{user.invites_sent} invited</span>
                        )}
                      </div>

                      {/* Dates */}
                      <div className="text-right text-sm text-white/40 flex-shrink-0 hidden sm:block">
                        <div>Joined {formatDate(user.created_at)}</div>
                        <div>
                          {user.last_sign_in_at
                            ? `Active ${timeAgo(user.last_sign_in_at)}`
                            : 'Never signed in'}
                        </div>
                      </div>
                    </div>
                  ))}

                  {data.users.length === 0 && (
                    <div className="text-center py-8 text-white/40">
                      <Users className="w-8 h-8 mx-auto mb-2" />
                      <p>No users found</p>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="mt-6 text-center text-white/30 text-xs">
                  Generated {new Date(data.generated_at).toLocaleString()}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="p-4 rounded-lg bg-white/5 border border-white/10 text-center">
      <Icon className={`w-4 h-4 ${color} mx-auto mb-1`} />
      <div className={`text-2xl font-bold ${color}`}>{value.toLocaleString()}</div>
      <div className="text-xs text-white/40 mt-0.5">{label}</div>
    </div>
  );
}
