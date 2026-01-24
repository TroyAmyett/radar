// Timezone utilities for Radar
// Uses browser timezone by default - can be enhanced with user profile later

/**
 * Get the user's timezone (browser default for now)
 */
export function getUserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
}

/**
 * Format a date/time in the specified timezone
 */
export function formatDateTime(
  date: string | Date,
  timezone?: string,
  options?: Intl.DateTimeFormatOptions
): string {
  const tz = timezone || getUserTimezone()
  const d = typeof date === 'string' ? new Date(date) : date

  const defaultOptions: Intl.DateTimeFormatOptions = {
    timeZone: tz,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }

  return d.toLocaleString('en-US', { ...defaultOptions, ...options })
}

/**
 * Format just the date portion
 */
export function formatDate(
  date: string | Date,
  timezone?: string,
  format: 'short' | 'medium' | 'long' = 'medium'
): string {
  const tz = timezone || getUserTimezone()
  const d = typeof date === 'string' ? new Date(date) : date

  const options: Intl.DateTimeFormatOptions = {
    timeZone: tz,
  }

  switch (format) {
    case 'short':
      options.month = 'numeric'
      options.day = 'numeric'
      options.year = '2-digit'
      break
    case 'medium':
      options.month = 'short'
      options.day = 'numeric'
      options.year = 'numeric'
      break
    case 'long':
      options.weekday = 'long'
      options.month = 'long'
      options.day = 'numeric'
      options.year = 'numeric'
      break
  }

  return d.toLocaleDateString('en-US', options)
}

/**
 * Format just the time portion
 */
export function formatTime(
  date: string | Date,
  timezone?: string,
  use24Hour: boolean = false
): string {
  const tz = timezone || getUserTimezone()
  const d = typeof date === 'string' ? new Date(date) : date

  return d.toLocaleTimeString('en-US', {
    timeZone: tz,
    hour: 'numeric',
    minute: '2-digit',
    hour12: !use24Hour,
  })
}

/**
 * Format relative time (e.g., "2 hours ago", "in 3 days")
 */
export function formatRelativeTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)
  const diffWeek = Math.floor(diffDay / 7)
  const diffMonth = Math.floor(diffDay / 30)
  const diffYear = Math.floor(diffDay / 365)

  // Future dates
  if (diffMs < 0) {
    const absDiffMin = Math.abs(diffMin)
    const absDiffHour = Math.abs(diffHour)
    const absDiffDay = Math.abs(diffDay)

    if (absDiffMin < 1) return 'in a moment'
    if (absDiffMin < 60) return `in ${absDiffMin}m`
    if (absDiffHour < 24) return `in ${absDiffHour}h`
    if (absDiffDay < 7) return `in ${absDiffDay}d`
    return `in ${Math.abs(diffWeek)}w`
  }

  // Past dates
  if (diffSec < 30) return 'just now'
  if (diffMin < 1) return `${diffSec}s ago`
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHour < 24) return `${diffHour}h ago`
  if (diffDay < 7) return `${diffDay}d ago`
  if (diffWeek < 4) return `${diffWeek}w ago`
  if (diffMonth < 12) return `${diffMonth}mo ago`
  return `${diffYear}y ago`
}
