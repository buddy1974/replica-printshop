'use client'

import type { PrintCheckResult, Severity } from '@/lib/ai/printAssist'

interface Props {
  result: PrintCheckResult
  /** Compact mode: show summary + status dots only, no detail messages */
  compact?: boolean
  className?: string
}

const DOT_COLOR: Record<Severity, string> = {
  ok:       'bg-green-500',
  warning:  'bg-yellow-400',
  critical: 'bg-red-500',
}

const BORDER_COLOR: Record<Severity, string> = {
  ok:       'border-green-200 bg-green-50',
  warning:  'border-yellow-200 bg-yellow-50',
  critical: 'border-red-200 bg-red-50',
}

const TEXT_COLOR: Record<Severity, string> = {
  ok:       'text-green-700',
  warning:  'text-yellow-700',
  critical: 'text-red-700',
}

const ICON: Record<Severity, string> = {
  ok:       '✓',
  warning:  '⚠',
  critical: '✕',
}

export default function PrintCheckPanel({ result, compact = false, className = '' }: Props) {
  const checks = [result.resolution, result.safeArea, result.bleed, result.sizeMatch]
  const issues = checks.filter((c) => c.status !== 'ok')

  return (
    <div className={`rounded-lg border p-3 space-y-2 ${BORDER_COLOR[result.overall]} ${className}`}>
      {/* Header row */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Print Check</span>
        <div className="flex items-center gap-1.5">
          {checks.map((c) => (
            <span
              key={c.label}
              title={`${c.label}: ${c.message}`}
              className={`w-2 h-2 rounded-full inline-block ${DOT_COLOR[c.status]}`}
            />
          ))}
        </div>
      </div>

      {/* Status grid (4 checks) */}
      {!compact && (
        <div className="grid grid-cols-2 gap-x-3 gap-y-1">
          {checks.map((c) => (
            <div key={c.label} className="flex items-center gap-1.5 min-w-0">
              <span className={`text-xs font-bold shrink-0 ${TEXT_COLOR[c.status]}`}>
                {ICON[c.status]}
              </span>
              <span className="text-xs text-gray-600 truncate">{c.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Summary line */}
      <p className={`text-xs leading-snug ${TEXT_COLOR[result.overall]}`}>
        {result.summary}
      </p>

      {/* Issue details */}
      {!compact && issues.length > 0 && (
        <div className="space-y-1 pt-1 border-t border-gray-200">
          {issues.map((c) => (
            <p key={c.label} className={`text-xs ${TEXT_COLOR[c.status]}`}>
              <strong className="font-medium">{c.label}:</strong> {c.message}
            </p>
          ))}
        </div>
      )}

      {compact && issues.length > 0 && (
        <div className="space-y-0.5">
          {issues.map((c) => (
            <p key={c.label} className={`text-xs ${TEXT_COLOR[c.status]} truncate`}>
              {ICON[c.status]} {c.label}: {c.message}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}
