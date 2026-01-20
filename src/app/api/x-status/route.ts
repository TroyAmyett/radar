import { NextResponse } from 'next/server';
import { isXConfigured } from '@/lib/social/x-client';

export async function GET() {
  try {
    const connected = isXConfigured();
    return NextResponse.json({ connected });
  } catch (error) {
    console.error('Error checking X status:', error);
    return NextResponse.json({ connected: false });
  }
}
