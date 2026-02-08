'use client';

import { useState, useEffect } from 'react';
import { authFetch } from '@/lib/api';
import {
  Mail,
  User,
  Send,
  RefreshCw,
  X,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react';

interface Invite {
  id: string;
  email: string;
  name: string | null;
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
  reminder_count: number;
  token_expires_at: string;
  accepted_at: string | null;
  created_at: string;
}

interface InviteStats {
  total: number;
  pending: number;
  accepted: number;
  expired: number;
  cancelled: number;
}

export default function InvitePanel() {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [stats, setStats] = useState<InviteStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  useEffect(() => {
    loadInvites();
  }, []);

  const loadInvites = async () => {
    setIsLoading(true);
    try {
      const response = await authFetch('/api/invites');
      if (response.ok) {
        const data = await response.json();
        setInvites(data.invites || []);
        setStats(data.stats || null);
      } else {
        const errData = await response.json();
        setError(errData.error || 'Failed to load invites');
      }
    } catch (err) {
      console.error('Failed to load invites:', err);
      setError('Failed to load invites');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsSending(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await authFetch('/api/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), name: name.trim() || undefined }),
      });

      if (response.ok) {
        setSuccess('Invite sent successfully!');
        setEmail('');
        setName('');
        loadInvites();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to send invite');
      }
    } catch (err) {
      console.error('Failed to send invite:', err);
      setError('Failed to send invite');
    } finally {
      setIsSending(false);
    }
  };

  const handleResend = async (id: string) => {
    setResendingId(id);
    setError(null);
    setSuccess(null);

    try {
      const response = await authFetch(`/api/invites/${id}`, {
        method: 'POST',
      });

      if (response.ok) {
        setSuccess('Invite resent successfully!');
        loadInvites();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to resend invite');
      }
    } catch (err) {
      console.error('Failed to resend invite:', err);
      setError('Failed to resend invite');
    } finally {
      setResendingId(null);
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this invite?')) return;

    setCancellingId(id);
    setError(null);
    setSuccess(null);

    try {
      const response = await authFetch(`/api/invites/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setSuccess('Invite cancelled');
        loadInvites();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to cancel invite');
      }
    } catch (err) {
      console.error('Failed to cancel invite:', err);
      setError('Failed to cancel invite');
    } finally {
      setCancellingId(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-400" />;
      case 'accepted':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'expired':
        return <AlertCircle className="w-4 h-4 text-gray-400" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-red-400" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-400';
      case 'accepted':
        return 'bg-green-500/20 text-green-400';
      case 'expired':
        return 'bg-gray-500/20 text-gray-400';
      case 'cancelled':
        return 'bg-red-500/20 text-red-400';
      default:
        return 'bg-white/10 text-white/60';
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getDaysUntilExpiry = (expiresAt: string) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diffMs = expiry.getTime() - now.getTime();
    const days = Math.ceil(diffMs / (24 * 60 * 60 * 1000));
    return days;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-white">Beta Invites</h2>
        <p className="text-white/60 text-sm">
          Send invites to new beta users. They&apos;ll receive an email with a signup link.
        </p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          <div className="p-3 rounded-lg bg-white/5 border border-white/10 text-center">
            <div className="text-2xl font-bold text-white">{stats.total}</div>
            <div className="text-xs text-white/40">Total</div>
          </div>
          <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-center">
            <div className="text-2xl font-bold text-yellow-400">{stats.pending}</div>
            <div className="text-xs text-yellow-400/70">Pending</div>
          </div>
          <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-center">
            <div className="text-2xl font-bold text-green-400">{stats.accepted}</div>
            <div className="text-xs text-green-400/70">Accepted</div>
          </div>
          <div className="p-3 rounded-lg bg-gray-500/10 border border-gray-500/20 text-center">
            <div className="text-2xl font-bold text-gray-400">{stats.expired + stats.cancelled}</div>
            <div className="text-xs text-gray-400/70">Expired</div>
          </div>
        </div>
      )}

      {/* Send Invite Form */}
      <form onSubmit={handleSendInvite} className="p-4 rounded-lg bg-white/5 border border-white/10">
        <div className="flex gap-3">
          <div className="flex-1">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-accent"
                required
              />
            </div>
          </div>
          <div className="w-40">
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Name (optional)"
                className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={isSending || !email.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Send
          </button>
        </div>
      </form>

      {/* Messages */}
      {error && (
        <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="p-3 rounded-lg bg-green-500/20 border border-green-500/30 text-green-400 text-sm">
          {success}
        </div>
      )}

      {/* Invites List */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-white/40" />
        </div>
      ) : invites.length === 0 ? (
        <div className="text-center py-8 text-white/40">
          No invites sent yet. Send your first invite above.
        </div>
      ) : (
        <div className="space-y-2">
          {invites.map((invite) => (
            <div
              key={invite.id}
              className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10"
            >
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  {getStatusIcon(invite.status)}
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(invite.status)}`}>
                    {invite.status}
                  </span>
                </div>
                <div>
                  <div className="font-medium text-white">{invite.email}</div>
                  <div className="text-white/40 text-sm">
                    {invite.name && <span>{invite.name} &middot; </span>}
                    Sent {formatDate(invite.created_at)}
                    {invite.status === 'pending' && (
                      <>
                        {' '}&middot; {getDaysUntilExpiry(invite.token_expires_at) > 0
                          ? `Expires in ${getDaysUntilExpiry(invite.token_expires_at)} days`
                          : 'Expired'}
                        {invite.reminder_count > 0 && (
                          <> &middot; {invite.reminder_count} reminder{invite.reminder_count !== 1 ? 's' : ''} sent</>
                        )}
                      </>
                    )}
                    {invite.status === 'accepted' && invite.accepted_at && (
                      <> &middot; Accepted {formatDate(invite.accepted_at)}</>
                    )}
                  </div>
                </div>
              </div>

              {invite.status === 'pending' && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleResend(invite.id)}
                    disabled={resendingId === invite.id}
                    className="p-2 text-white/40 hover:text-accent transition-colors disabled:opacity-50"
                    title="Resend invite"
                  >
                    {resendingId === invite.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => handleCancel(invite.id)}
                    disabled={cancellingId === invite.id}
                    className="p-2 text-white/40 hover:text-red-400 transition-colors disabled:opacity-50"
                    title="Cancel invite"
                  >
                    {cancellingId === invite.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <X className="w-4 h-4" />
                    )}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
