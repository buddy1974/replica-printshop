'use client'

import { useEffect, useState } from 'react'

interface ErrorEntry {
  id: string
  message: string
  path: string | null
  createdAt: string
}

interface AuditEntry {
  id: string
  action: string
  entity: string
  entityId: string | null
  userId: string | null
  createdAt: string
}

type Tab = 'errors' | 'audit'

export default function LogsPage() {
  const [tab, setTab] = useState<Tab>('errors')
  const [errors, setErrors] = useState<ErrorEntry[]>([])
  const [audits, setAudits] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/logs')
      .then((r) => r.json())
      .then((data) => {
        setErrors(data.errors ?? [])
        setAudits(data.audits ?? [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })

  return (
    <div className="p-6 max-w-5xl">
      <h1 className="text-xl font-bold text-gray-900 mb-4">Logs</h1>

      {/* Tabs */}
      <div className="flex gap-2 mb-4 border-b border-gray-200">
        {(['errors', 'audit'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={[
              'px-4 py-2 text-sm font-medium -mb-px border-b-2 transition-colors',
              tab === t
                ? 'border-red-600 text-red-600'
                : 'border-transparent text-gray-500 hover:text-gray-700',
            ].join(' ')}
          >
            {t === 'errors' ? 'Errors' : 'Audit'}
            <span className="ml-1.5 text-xs text-gray-400">
              {t === 'errors' ? errors.length : audits.length}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : tab === 'errors' ? (
        errors.length === 0 ? (
          <p className="text-sm text-gray-400">No errors logged.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs text-gray-400 uppercase tracking-wider">
                  <th className="pb-2 pr-4 font-semibold w-40">Date</th>
                  <th className="pb-2 pr-4 font-semibold">Message</th>
                  <th className="pb-2 font-semibold w-40">Path</th>
                </tr>
              </thead>
              <tbody>
                {errors.map((e) => (
                  <tr key={e.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 pr-4 text-gray-400 whitespace-nowrap text-xs">{fmt(e.createdAt)}</td>
                    <td className="py-2 pr-4 text-red-700 font-medium break-all">{e.message}</td>
                    <td className="py-2 text-gray-400 text-xs">{e.path ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : audits.length === 0 ? (
        <p className="text-sm text-gray-400">No audit events logged.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs text-gray-400 uppercase tracking-wider">
                <th className="pb-2 pr-4 font-semibold w-40">Date</th>
                <th className="pb-2 pr-4 font-semibold w-28">Action</th>
                <th className="pb-2 pr-4 font-semibold w-28">Entity</th>
                <th className="pb-2 pr-4 font-semibold">Entity ID</th>
                <th className="pb-2 font-semibold">User ID</th>
              </tr>
            </thead>
            <tbody>
              {audits.map((a) => (
                <tr key={a.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-2 pr-4 text-gray-400 whitespace-nowrap text-xs">{fmt(a.createdAt)}</td>
                  <td className="py-2 pr-4 font-medium text-gray-900">{a.action}</td>
                  <td className="py-2 pr-4 text-gray-600">{a.entity}</td>
                  <td className="py-2 pr-4 text-gray-400 text-xs font-mono">{a.entityId ?? '—'}</td>
                  <td className="py-2 text-gray-400 text-xs font-mono">{a.userId ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
