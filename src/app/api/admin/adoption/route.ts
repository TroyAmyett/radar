import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth, AuthError, unauthorizedResponse } from '@/lib/auth';

// Check if user is super admin
async function isSuperAdmin(userId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('user_profiles')
    .select('is_super_admin')
    .eq('id', userId)
    .single();
  return data?.is_super_admin === true;
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = await requireAuth();
    if (!await isSuperAdmin(userId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const url = new URL(request.url);
    const search = url.searchParams.get('search')?.toLowerCase() || '';

    // 1. Fetch all auth users
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

    if (authError) {
      console.error('Failed to fetch auth users:', authError);
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }

    const authUsers = authData?.users || [];
    const userIds = authUsers.map(u => u.id);

    // 2. Fetch user profiles (name, is_super_admin)
    const { data: profiles } = await supabaseAdmin
      .from('user_profiles')
      .select('id, name, is_super_admin')
      .in('id', userIds);

    const profileMap = new Map(
      (profiles || []).map(p => [p.id, p])
    );

    // 3. Fetch user_accounts mapping (user_id → account_id)
    const { data: userAccounts } = await supabaseAdmin
      .from('user_accounts')
      .select('user_id, account_id')
      .in('user_id', userIds);

    const userToAccountMap = new Map<string, string>();
    const accountToUserMap = new Map<string, string>();
    for (const ua of userAccounts || []) {
      userToAccountMap.set(ua.user_id, ua.account_id);
      accountToUserMap.set(ua.account_id, ua.user_id);
    }

    const accountIds = Array.from(new Set((userAccounts || []).map(ua => ua.account_id)));

    // 4. Fetch per-account source counts
    const sourceCounts = new Map<string, number>();
    if (accountIds.length > 0) {
      const { data: sources } = await supabaseAdmin
        .from('sources')
        .select('account_id')
        .in('account_id', accountIds);

      for (const s of sources || []) {
        sourceCounts.set(s.account_id, (sourceCounts.get(s.account_id) || 0) + 1);
      }
    }

    // 5. Fetch per-account interaction counts (with like/save breakdown)
    const interactionCounts = new Map<string, { total: number; likes: number; saves: number }>();
    if (accountIds.length > 0) {
      const { data: interactions } = await supabaseAdmin
        .from('content_interactions')
        .select('account_id, is_liked, is_saved')
        .in('account_id', accountIds);

      for (const i of interactions || []) {
        const existing = interactionCounts.get(i.account_id) || { total: 0, likes: 0, saves: 0 };
        existing.total += 1;
        if (i.is_liked) existing.likes += 1;
        if (i.is_saved) existing.saves += 1;
        interactionCounts.set(i.account_id, existing);
      }
    }

    // 6. Fetch per-user invite counts
    const inviteCounts = new Map<string, number>();
    const { data: invites } = await supabaseAdmin
      .from('user_invites')
      .select('invited_by_user_id, status');

    let invitesPending = 0;
    let invitesAccepted = 0;
    let invitesExpired = 0;
    let invitesTotal = 0;

    for (const inv of invites || []) {
      invitesTotal++;
      if (inv.status === 'pending') invitesPending++;
      if (inv.status === 'accepted') invitesAccepted++;
      if (inv.status === 'expired') invitesExpired++;
      inviteCounts.set(
        inv.invited_by_user_id,
        (inviteCounts.get(inv.invited_by_user_id) || 0) + 1
      );
    }

    // 7. Fetch total content items count
    const { count: totalContentItems } = await supabaseAdmin
      .from('content_items')
      .select('*', { count: 'exact', head: true });

    // 8. Compute time boundaries
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // 9. Build user list with enriched data
    type UserStatus = 'active' | 'inactive' | 'unconfirmed';

    const users = authUsers.map(u => {
      const profile = profileMap.get(u.id);
      const accountId = userToAccountMap.get(u.id);
      const sourceCount = accountId ? (sourceCounts.get(accountId) || 0) : 0;
      const interactions = accountId ? (interactionCounts.get(accountId) || { total: 0, likes: 0, saves: 0 }) : { total: 0, likes: 0, saves: 0 };
      const invitesSent = inviteCounts.get(u.id) || 0;

      let status: UserStatus = 'inactive';
      if (!u.email_confirmed_at) {
        status = 'unconfirmed';
      } else if (u.last_sign_in_at && new Date(u.last_sign_in_at) > thirtyDaysAgo) {
        status = 'active';
      }

      return {
        id: u.id,
        email: u.email || '',
        name: profile?.name || null,
        status,
        is_super_admin: profile?.is_super_admin || false,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at || null,
        sources_count: sourceCount,
        interactions_count: interactions.total,
        invites_sent: invitesSent,
      };
    });

    // 10. Apply search filter
    const filteredUsers = search
      ? users.filter(u =>
          u.email.toLowerCase().includes(search) ||
          (u.name && u.name.toLowerCase().includes(search))
        )
      : users;

    // Sort by created_at descending (newest first)
    filteredUsers.sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    // 11. Compute funnel metrics
    const totalSignedUp = authUsers.length;
    const totalConfirmed = authUsers.filter(u => u.email_confirmed_at).length;
    const active7d = authUsers.filter(
      u => u.last_sign_in_at && new Date(u.last_sign_in_at) > sevenDaysAgo
    ).length;
    const active30d = authUsers.filter(
      u => u.last_sign_in_at && new Date(u.last_sign_in_at) > thirtyDaysAgo
    ).length;
    const new7d = authUsers.filter(
      u => new Date(u.created_at) > sevenDaysAgo
    ).length;
    const new30d = authUsers.filter(
      u => new Date(u.created_at) > thirtyDaysAgo
    ).length;

    // 12. Compute engagement totals
    let totalSources = 0;
    let totalInteractions = 0;
    let totalLikes = 0;
    let totalSaves = 0;
    interactionCounts.forEach((counts) => {
      totalInteractions += counts.total;
      totalLikes += counts.likes;
      totalSaves += counts.saves;
    });
    sourceCounts.forEach((count) => {
      totalSources += count;
    });

    return NextResponse.json({
      funnel: {
        invited: invitesTotal,
        signed_up: totalSignedUp,
        confirmed: totalConfirmed,
        active_7d: active7d,
        active_30d: active30d,
        new_7d: new7d,
        new_30d: new30d,
      },
      engagement: {
        total_sources: totalSources,
        total_content_items: totalContentItems || 0,
        total_interactions: totalInteractions,
        total_likes: totalLikes,
        total_saves: totalSaves,
      },
      invites: {
        total: invitesTotal,
        pending: invitesPending,
        accepted: invitesAccepted,
        expired: invitesExpired,
      },
      users: filteredUsers,
      generated_at: now.toISOString(),
    });
  } catch (e) {
    if (e instanceof AuthError) return unauthorizedResponse();
    console.error('Adoption API error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
