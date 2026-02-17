import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth, AuthError, unauthorizedResponse } from '@/lib/auth';

export async function GET() {
  try {
    const auth = await requireAuth();

    // Fetch user profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('id', auth.userId)
      .single();

    if (profileError) {
      // Profile doesn't exist yet — use metadata from JWT (already resolved by requireAuth)
      return NextResponse.json({
        id: auth.userId,
        email: auth.email || null,
        name: auth.name || null,
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
