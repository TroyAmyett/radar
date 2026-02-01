import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth, AuthError, unauthorizedResponse } from '@/lib/auth';

export async function GET() {
  try {
    const { userId } = await requireAuth();

    // Fetch user profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError) {
      // Profile might not exist yet, return default values
      const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(userId);
      return NextResponse.json({
        id: userId,
        email: user?.email || null,
        name: user?.user_metadata?.name || null,
        is_super_admin: false,
      });
    }

    return NextResponse.json(profile);
  } catch (e) {
    if (e instanceof AuthError) return unauthorizedResponse();
    console.error('Error fetching profile:', e);
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
  }
}
