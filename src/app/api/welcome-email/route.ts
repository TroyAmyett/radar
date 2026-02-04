import { NextRequest, NextResponse } from 'next/server';
import { sendWelcomeEmail } from '@/lib/email/resend';
import { onboardingVideos } from '@/lib/onboarding-videos';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, name } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Determine the login URL based on environment
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://radar.funnelists.com';
    const loginUrl = baseUrl;

    // Resolve welcome video URL for the email CTA
    // Only include the video button if we have an external URL (e.g. YouTube).
    // Local video paths (starting with /) are shown during in-app onboarding,
    // so there's no need to link to them from the email.
    const welcomeVideo = onboardingVideos.welcomeOverview;
    let videoUrl: string | undefined;
    if (welcomeVideo.url && !welcomeVideo.url.startsWith('/')) {
      const ytId = welcomeVideo.url.match(/(?:youtube\.com\/watch\?.*v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
      if (ytId) {
        videoUrl = `https://www.youtube.com/watch?v=${ytId[1]}`;
      } else {
        videoUrl = welcomeVideo.url;
      }
    }

    const emailId = await sendWelcomeEmail({
      to: email,
      userName: name,
      loginUrl,
      videoUrl,
    });

    if (!emailId) {
      return NextResponse.json(
        { error: 'Failed to send welcome email' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      emailId,
    });
  } catch (error) {
    console.error('Failed to send welcome email:', error);
    return NextResponse.json(
      { error: 'Failed to send welcome email' },
      { status: 500 }
    );
  }
}
