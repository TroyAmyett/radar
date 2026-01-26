'use client'

// Changelog Hook
// Manages changelog entries, unread counts, and read status for Radar

import { useState, useCallback, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export type ChangelogProduct = 'agentpm' | 'radar' | 'canvas' | 'leadgen' | 'all'

export interface ChangelogEntry {
  id: string
  product: ChangelogProduct
  title: string
  description?: string
  commitType: string
  commitHash?: string
  commitDate: string
  isHighlight: boolean
  createdAt: string
  isRead: boolean
}

// Helper to map database row to TypeScript interface
function mapDbRowToEntry(row: Record<string, unknown>): ChangelogEntry {
  return {
    id: row.id as string,
    product: row.product as ChangelogProduct,
    title: row.title as string,
    description: row.description as string | undefined,
    commitType: row.commit_type as string,
    commitHash: row.commit_hash as string | undefined,
    commitDate: row.commit_date as string,
    isHighlight: (row.is_highlight as boolean) || false,
    createdAt: row.created_at as string,
    isRead: (row.is_read as boolean) || false,
  }
}

export function useChangelog(userId: string | undefined, product: ChangelogProduct = 'radar') {
  const [entries, setEntries] = useState<ChangelogEntry[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [unreadHighlights, setUnreadHighlights] = useState<ChangelogEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [isWhatsNewOpen, setIsWhatsNewOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchEntries = useCallback(async () => {
    if (!supabase || !userId) {
      setEntries([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const { data, error: fetchError } = await supabase.rpc('get_changelog_entries', {
        p_user_id: userId,
        p_product: product,
        p_limit: 50,
        p_offset: 0,
      })

      if (fetchError) throw fetchError

      const mappedEntries: ChangelogEntry[] = (data || []).map(mapDbRowToEntry)
      setEntries(mappedEntries)
    } catch (err) {
      console.error('Failed to fetch changelog entries:', err)
      setError((err as Error).message)
    } finally {
      setIsLoading(false)
    }
  }, [userId, product])

  const fetchUnreadCount = useCallback(async () => {
    if (!supabase || !userId) {
      setUnreadCount(0)
      return
    }

    try {
      const { data, error: fetchError } = await supabase.rpc('get_unread_changelog_count', {
        p_user_id: userId,
        p_product: product,
      })

      if (fetchError) throw fetchError
      setUnreadCount(data || 0)
    } catch (err) {
      console.error('Failed to fetch unread count:', err)
    }
  }, [userId, product])

  const fetchUnreadHighlights = useCallback(async () => {
    if (!supabase || !userId) {
      setUnreadHighlights([])
      return
    }

    try {
      const { data, error: fetchError } = await supabase.rpc('get_unread_highlights', {
        p_user_id: userId,
        p_product: product,
      })

      if (fetchError) throw fetchError

      const highlights: ChangelogEntry[] = (data || []).map((row: Record<string, unknown>) => ({
        id: row.id as string,
        product: row.product as ChangelogProduct,
        title: row.title as string,
        description: row.description as string | undefined,
        commitType: row.commit_type as string,
        commitDate: row.commit_date as string,
        createdAt: row.created_at as string,
        isHighlight: true,
        isRead: false,
      }))

      setUnreadHighlights(highlights)

      // Auto-open What's New modal if there are highlights
      if (highlights.length > 0) {
        setIsWhatsNewOpen(true)
      }
    } catch (err) {
      console.error('Failed to fetch unread highlights:', err)
    }
  }, [userId, product])

  const markAsRead = useCallback(async (entryIds: string[]) => {
    if (!supabase || !userId || entryIds.length === 0) return

    try {
      const { error: markError } = await supabase.rpc('mark_changelog_read', {
        p_user_id: userId,
        p_entry_ids: entryIds,
      })

      if (markError) throw markError

      // Update local state
      setEntries((prev) =>
        prev.map((entry) =>
          entryIds.includes(entry.id) ? { ...entry, isRead: true } : entry
        )
      )
      setUnreadCount((prev) => Math.max(0, prev - entryIds.length))
    } catch (err) {
      console.error('Failed to mark entries as read:', err)
    }
  }, [userId])

  const markAllAsRead = useCallback(async () => {
    const unreadIds = entries.filter((e) => !e.isRead).map((e) => e.id)
    await markAsRead(unreadIds)
  }, [entries, markAsRead])

  const dismissHighlights = useCallback(async () => {
    const highlightIds = unreadHighlights.map((h) => h.id)
    await markAsRead(highlightIds)
    setUnreadHighlights([])
    setIsWhatsNewOpen(false)
  }, [unreadHighlights, markAsRead])

  const openDrawer = useCallback(() => setIsDrawerOpen(true), [])
  const closeDrawer = useCallback(() => setIsDrawerOpen(false), [])
  const openWhatsNew = useCallback(() => setIsWhatsNewOpen(true), [])
  const closeWhatsNew = useCallback(() => setIsWhatsNewOpen(false), [])
  const clearError = useCallback(() => setError(null), [])

  // Fetch unread count and highlights on mount
  useEffect(() => {
    if (userId) {
      fetchUnreadCount()
      fetchUnreadHighlights()
    }
  }, [userId, fetchUnreadCount, fetchUnreadHighlights])

  return {
    entries,
    unreadCount,
    unreadHighlights,
    isLoading,
    isDrawerOpen,
    isWhatsNewOpen,
    error,
    fetchEntries,
    fetchUnreadCount,
    fetchUnreadHighlights,
    markAsRead,
    markAllAsRead,
    dismissHighlights,
    openDrawer,
    closeDrawer,
    openWhatsNew,
    closeWhatsNew,
    clearError,
  }
}
