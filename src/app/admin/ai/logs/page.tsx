'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import Container from '@/components/Container'

interface ChatLogRow {
  id: string
  sessionId: string
  role: string
  content: string
  language: string
  hasFile: boolean
  createdAt: string
}

interface LogsResponse {
  logs: ChatLogRow[]
  total: number
  pages: number
}

export default function ConversationLogsPage() {
  const [logs, setLogs] = useState<ChatLogRow[]>([])
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [page, setPage] = useState(1)
  const [sessionFilter, setSessionFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (p: number, session: string) => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ page: String(p), pageSize: '20' })
      if (session.trim()) params.set('sessionId', session.trim())
      const res = await fetch(`/api/admin/ai/logs?${params}`)
      if (!res.ok) throw new Error('Failed to load logs')
      const data = await res.json() as LogsResponse
      setLogs(data.logs)
      setTotal(data.total)
      setPages(data.pages)
    } catch {
      setError('Failed to load conversation logs')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load(page, sessionFilter) }, [load, page, sessionFilter])

  const applyFilter = (value: string) => {
    setSessionFilter(value)
    setPage(1)
  }

  const fmt = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      + ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  }

  const truncate = (s: string, n: number) => s.length > n ? s.slice(0, n) + '…' : s

  return (
    <Container>
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/admin/ai" className="text-xs text-gray-400 hover:text-gray-700 transition-colors">
            ← AI Configuration
          </Link>
          <h1 className="mt-1">Conversation Logs</h1>
          <p className="text-xs text-gray-400 mt-0.5">{total} messages total</p>
        </div>
      </div>

      {/* Session filter */}
      <div className="mb-4 flex gap-2">
        <input
          type="text"
          placeholder="Filter by session ID…"
          value={sessionFilter}
          onChange={(e) => applyFilter(e.target.value)}
          className="w-72 h-9 rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
        />
        {sessionFilter && (
          <button
            onClick={() => applyFilter('')}
            className="px-3 h-9 rounded-lg border border-gray-300 text-xs text-gray-500 hover:bg-gray-50"
          >
            Clear
          </button>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">{error}</p>
      )}

      <div className="rounded-xl border border-gray-200 bg-white overflow-x-auto mb-4">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-gray-200 border-t-red-600 rounded-full animate-spin" />
          </div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center text-sm text-gray-400">No logs found</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest px-5 py-3">Time</th>
                <th className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest px-3 py-3">Session</th>
                <th className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest px-3 py-3">Role</th>
                <th className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest px-3 py-3">Message</th>
                <th className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest px-3 py-3">File</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                  <td className="px-5 py-3 text-xs text-gray-500 whitespace-nowrap">{fmt(log.createdAt)}</td>
                  <td className="px-3 py-3 text-xs text-gray-400 font-mono">{log.sessionId.slice(0, 12)}…</td>
                  <td className="px-3 py-3">
                    {log.role === 'user' ? (
                      <span className="text-[10px] font-semibold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">user</span>
                    ) : (
                      <span className="text-[10px] font-semibold bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">assistant</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-xs text-gray-700 max-w-xs">{truncate(log.content, 80)}</td>
                  <td className="px-3 py-3 text-xs text-gray-400">{log.hasFile ? '📎' : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center gap-3">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-4 h-9 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40"
          >
            ← Prev
          </button>
          <span className="text-xs text-gray-500">Page {page} of {pages}</span>
          <button
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
            disabled={page >= pages}
            className="px-4 h-9 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40"
          >
            Next →
          </button>
        </div>
      )}
    </Container>
  )
}
