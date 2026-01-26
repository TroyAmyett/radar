'use client'

// What's New Modal
// Auto-popup modal for highlighted changelog entries

import { X, Sparkles } from 'lucide-react'
import type { ChangelogEntry } from '@/hooks/useChangelog'

interface WhatsNewModalProps {
  isOpen: boolean
  highlights: ChangelogEntry[]
  onDismiss: () => void
  onViewAll: () => void
}

export function WhatsNewModal({ isOpen, highlights, onDismiss, onViewAll }: WhatsNewModalProps) {
  if (!isOpen || highlights.length === 0) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-50 transition-opacity"
        onClick={onDismiss}
      />

      {/* Modal */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg rounded-xl shadow-2xl bg-slate-900 border border-slate-700 z-[51]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/15">
              <Sparkles size={20} className="text-amber-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">
                What&apos;s New
              </h2>
              <p className="text-sm text-slate-400">
                {highlights.length} new update{highlights.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onDismiss}
            className="p-2 rounded-lg transition-colors hover:bg-slate-800 text-slate-400"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 max-h-[60vh] overflow-y-auto">
          <div className="space-y-4">
            {highlights.map((highlight) => (
              <div
                key={highlight.id}
                className="p-4 rounded-lg bg-white/[0.03] border border-slate-700"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-500/20 text-green-500">
                    {highlight.commitType === 'feat' ? 'New Feature' : 'Update'}
                  </span>
                  <span className="text-xs text-slate-400">
                    {new Date(highlight.commitDate).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>
                <h3 className="text-base font-medium mb-1 text-white">
                  {highlight.title}
                </h3>
                {highlight.description && (
                  <p className="text-sm text-slate-300">
                    {highlight.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-700">
          <button
            onClick={onViewAll}
            className="text-sm font-medium transition-colors text-sky-500 hover:text-sky-400"
          >
            View all updates
          </button>
          <button
            onClick={onDismiss}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-sky-500 text-white hover:bg-sky-600"
          >
            Got it
          </button>
        </div>
      </div>
    </>
  )
}
