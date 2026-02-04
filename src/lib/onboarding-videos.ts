/**
 * Onboarding video configuration.
 *
 * Videos are hosted externally (e.g. HeyGen CDN, YouTube, or S3) and referenced by key.
 * Update the `url` fields once final videos are produced and uploaded.
 */

export interface OnboardingVideo {
  /** Unique key used for localStorage "watched" tracking */
  key: string
  /** Display title shown in the modal header */
  title: string
  /** Short description shown below the title */
  description: string
  /** Video URL — mp4 path, YouTube URL, or YouTube embed URL */
  url: string | null
  /** Duration label, e.g. "2 min" */
  duration: string
  /** Timestamp (seconds) to use for the thumbnail frame. Defaults to 3. */
  thumbnailTime?: number
}

/**
 * Contextual videos mapped to product sections.
 * `null` url means the video is not yet available — the help button will be hidden.
 */
export const onboardingVideos: Record<string, OnboardingVideo> = {
  welcomeOverview: {
    key: 'welcomeOverview',
    title: 'Welcome to Radar',
    description: 'A quick overview of how Radar helps you stay ahead of what matters.',
    url: '/videos/welcomeOverview.mp4',
    duration: '2 min',
    thumbnailTime: 5,
  },
  addFirstSource: {
    key: 'addFirstSource',
    title: 'Adding Your First Source',
    description: 'Learn how to add RSS feeds, YouTube channels, and more to your feed.',
    url: '/videos/addFirstSource.mp4',
    duration: '1 min',
    thumbnailTime: 4,
  },
  createTopics: {
    key: 'createTopics',
    title: 'Creating Topics',
    description: 'Organize your feed with custom topics that auto-tag matching content.',
    url: '/videos/createTopics.mp4',
    duration: '2 min',
    thumbnailTime: 5,
  },
  aiSummaries: {
    key: 'aiSummaries',
    title: 'AI Summaries',
    description: 'See how AI summaries let you scan dozens of articles in seconds.',
    url: '/videos/aiSummaries.mp4',
    duration: '2 min',
    thumbnailTime: 4,
  },
  dailyDigest: {
    key: 'dailyDigest',
    title: 'Setting Up Daily Digest',
    description: 'Get a daily briefing delivered right when you need it.',
    url: '/videos/dailyDigest.mp4',
    duration: '2 min',
    thumbnailTime: 5,
  },
}

/**
 * Extract YouTube video ID from various URL formats:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * Returns null if the URL is not a YouTube URL.
 */
export function getYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?.*v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
  ]
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }
  return null
}

/** Get YouTube embed URL from any YouTube URL format */
export function getYouTubeEmbedUrl(url: string): string | null {
  const id = getYouTubeId(url)
  return id ? `https://www.youtube.com/embed/${id}?autoplay=1&rel=0` : null
}

/** Get YouTube thumbnail URL */
export function getYouTubeThumbnail(url: string): string | null {
  const id = getYouTubeId(url)
  return id ? `https://img.youtube.com/vi/${id}/mqdefault.jpg` : null
}

/** Get a linkable YouTube watch URL (for emails, external links) */
export function getYouTubeWatchUrl(url: string): string | null {
  const id = getYouTubeId(url)
  return id ? `https://www.youtube.com/watch?v=${id}` : null
}

const WATCHED_STORAGE_KEY = 'radar_videos_watched'

/** Check if a video has been watched */
export function isVideoWatched(key: string): boolean {
  if (typeof window === 'undefined') return false
  try {
    const watched = JSON.parse(localStorage.getItem(WATCHED_STORAGE_KEY) || '{}')
    return !!watched[key]
  } catch {
    return false
  }
}

/** Mark a video as watched */
export function markVideoWatched(key: string): void {
  if (typeof window === 'undefined') return
  try {
    const watched = JSON.parse(localStorage.getItem(WATCHED_STORAGE_KEY) || '{}')
    watched[key] = Date.now()
    localStorage.setItem(WATCHED_STORAGE_KEY, JSON.stringify(watched))
  } catch {
    // silently fail
  }
}
