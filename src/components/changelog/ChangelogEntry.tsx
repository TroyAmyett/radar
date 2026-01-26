'use client'

// Changelog Entry
// Single changelog entry card

import { Sparkles, Bug, Wrench, BookOpen, RefreshCw, Zap } from 'lucide-react'
import type { ChangelogEntry as Entry } from '@/hooks/useChangelog'

interface ChangelogEntryProps {
  entry: Entry
}

// Map commit types to icons and colors
const TYPE_CONFIG: Record<string, { icon: typeof Sparkles; color: string; label: string }> = {
  feat: { icon: Sparkles, color: '#22c55e', label: 'New Feature' },
  fix: { icon: Bug, color: '#ef4444', label: 'Bug Fix' },
  chore: { icon: Wrench, color: '#6b7280', label: 'Maintenance' },
  docs: { icon: BookOpen, color: '#3b82f6', label: 'Documentation' },
  refactor: { icon: RefreshCw, color: '#8b5cf6', label: 'Improvement' },
  perf: { icon: Zap, color: '#f59e0b', label: 'Performance' },
}

const DEFAULT_CONFIG = { icon: Sparkles, color: '#6b7280', label: 'Update' }

export function ChangelogEntry({ entry }: ChangelogEntryProps) {
  const config = TYPE_CONFIG[entry.commitType] || DEFAULT_CONFIG
  const Icon = config.icon

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
    })
  }

  return (
    <div
      className="p-4 rounded-lg transition-colors border border-slate-700/50"
      style={{
        background: entry.isRead ? 'transparent' : 'rgba(14, 165, 233, 0.05)',
      }}
    >
      <div className="flex items-start gap-3">
        {/* Type Icon */}
        <div
          className="p-2 rounded-lg flex-shrink-0"
          style={{ background: `${config.color}20` }}
        >
          <Icon size={16} style={{ color: config.color }} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ background: `${config.color}20`, color: config.color }}
            >
              {config.label}
            </span>
            {entry.isHighlight && (
              <span
                className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b' }}
              >
                Highlight
              </span>
            )}
            <span className="text-xs ml-auto text-slate-400">
              {formatDate(entry.commitDate)}
            </span>
          </div>

          <h4 className="text-sm font-medium mb-1 text-white">
            {entry.title}
          </h4>

          {entry.description && (
            <p className="text-sm text-slate-300">
              {entry.description}
            </p>
          )}

          {/* Product badge */}
          {entry.product !== 'radar' && entry.product !== 'all' && (
            <span className="inline-block mt-2 text-xs px-2 py-0.5 rounded bg-slate-700/50 text-slate-400">
              {entry.product.charAt(0).toUpperCase() + entry.product.slice(1)}
            </span>
          )}
        </div>

        {/* Unread indicator */}
        {!entry.isRead && (
          <div className="w-2 h-2 rounded-full flex-shrink-0 mt-2 bg-sky-500" />
        )}
      </div>
    </div>
  )
}
