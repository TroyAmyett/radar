'use client'

// Changelog Badge
// Bell icon with unread count badge

import { Bell } from 'lucide-react'

interface ChangelogBadgeProps {
  unreadCount: number
  onClick: () => void
}

export function ChangelogBadge({ unreadCount, onClick }: ChangelogBadgeProps) {
  return (
    <button
      onClick={onClick}
      title="What's New"
      className="relative p-2 rounded-lg transition-colors hover:bg-slate-800 text-slate-300"
    >
      <Bell size={18} />
      {unreadCount > 0 && (
        <span
          className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-medium rounded-full bg-red-500 text-white"
          style={{ padding: '0 4px' }}
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  )
}
