'use client'

// Changelog Drawer
// Slide-out panel showing changelog entries

import { useEffect, useRef } from 'react'
import { X, CheckCheck, Loader2 } from 'lucide-react'
import { ChangelogEntry } from './ChangelogEntry'
import type { ChangelogEntry as Entry } from '@/hooks/useChangelog'

interface ChangelogDrawerProps {
  isOpen: boolean
  onClose: () => void
  entries: Entry[]
  isLoading: boolean
  onMarkAllRead: () => void
  onMarkAsRead: (ids: string[]) => void
  onFetchEntries: () => void
}

export function ChangelogDrawer({
  isOpen,
  onClose,
  entries,
  isLoading,
  onMarkAllRead,
  onMarkAsRead,
  onFetchEntries,
}: ChangelogDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null)

  // Fetch entries when drawer opens
  useEffect(() => {
    if (isOpen) {
      onFetchEntries()
    }
  }, [isOpen, onFetchEntries])

  // Mark visible entries as read after a short delay
  useEffect(() => {
    if (isOpen && entries.length > 0) {
      const unreadIds = entries.filter((e) => !e.isRead).map((e) => e.id)
      if (unreadIds.length > 0) {
        const timer = setTimeout(() => {
          onMarkAsRead(unreadIds)
        }, 2000)
        return () => clearTimeout(timer)
      }
    }
  }, [isOpen, entries, onMarkAsRead])

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  const unreadCount = entries.filter((e) => !e.isRead).length

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        className="fixed top-0 right-0 h-full w-full max-w-md flex flex-col bg-slate-900 border-l border-slate-700 z-50 transform transition-transform duration-300"
        style={{ transform: isOpen ? 'translateX(0)' : 'translateX(100%)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 flex-shrink-0 border-b border-slate-700">
          <h2 className="text-lg font-medium text-white">
            What&apos;s New
          </h2>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={onMarkAllRead}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-slate-800 text-slate-300"
              >
                <CheckCheck size={14} />
                Mark all read
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-lg transition-colors hover:bg-slate-800 text-slate-300"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="animate-spin text-slate-400" />
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm text-slate-400">
                No updates yet. Check back later!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {entries.map((entry) => (
                <ChangelogEntry key={entry.id} entry={entry} />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
