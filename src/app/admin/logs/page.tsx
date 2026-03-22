'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useLocale } from '@/context/LocaleContext'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'

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

// ── Inner component (needs useSearchParams) ──────────────────────────────────

function LogsContent() {
  const { t, locale } = useLocale()
  const td = t.admin
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [tab, setTab] = useState<Tab>('errors')
  const [errors, setErrors] = useState<ErrorEntry[]>([])
  const [audits, setAudits] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

  // Draft filter state (before Apply)
  const [draftSearch,   setDraftSearch]   = useState(searchParams.get('search')   ?? '')
  const [draftDateFrom, setDraftDateFrom] = useState(searchParams.get('dateFrom') ?? '')
  const [draftDateTo,   setDraftDateTo]   = useState(searchParams.get('dateTo')   ?? '')

  // Active filter state (drives fetch)
  const activeSearch   = searchParams.get('search')   ?? ''
  const activeDateFrom = searchParams.get('dateFrom') ?? ''
  const activeDateTo   = searchParams.get('dateTo')   ?? ''
  const hasFilters = !!(activeSearch || activeDateFrom || activeDateTo)

  const buildParams = useCallback((overrides: Record<string, string> = {}) => {
    const p = new URLSearchParams()
    const s   = overrides.search   ?? activeSearch
    const dfr = overrides.dateFrom ?? activeDateFrom
    const dto = overrides.dateTo   ?? activeDateTo
    if (s)   p.set('search',   s)
    if (dfr) p.set('dateFrom', dfr)
    if (dto) p.set('dateTo',   dto)
    return p
  }, [activeSearch, activeDateFrom, activeDateTo])

  // Fetch data when URL filter params change
  useEffect(() => {
    setLoading(true)
    const params = buildParams()
    params.set('tab', 'both')
    fetch(`/api/admin/logs?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setErrors(data.errors ?? [])
        setAudits(data.audits ?? [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [buildParams])

  function applyFilters() {
    const p = new URLSearchParams()
    if (draftSearch)   p.set('search',   draftSearch)
    if (draftDateFrom) p.set('dateFrom', draftDateFrom)
    if (draftDateTo)   p.set('dateTo',   draftDateTo)
    router.push(`${pathname}?${p.toString()}`)
  }

  function clearFilters() {
    setDraftSearch('')
    setDraftDateFrom('')
    setDraftDateTo('')
    router.push(pathname)
  }

  async function exportCsv() {
    setExporting(true)
    const params = buildParams()
    params.set('export', 'csv')
    params.set('tab', tab)
    try {
      const res = await fetch(`/api/admin/logs?${params}`)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${tab}-logs-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString(locale, {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-4">
        <h1>{td.logsTitle}</h1>
        <button
          onClick={exportCsv}
          disabled={exporting}
          className="px-4 h-9 rounded-lg bg-gray-900 text-white text-xs font-bold hover:bg-gray-700 transition-colors disabled:opacity-50"
        >
          {exporting ? '…' : td.exportCsv}
        </button>
      </div>

      {/* Filter bar */}
      <div className="rounded-xl border border-gray-200 bg-white px-5 py-4 mb-4 flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-40">
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{td.search}</label>
          <input
            type="text"
            value={draftSearch}
            onChange={(e) => setDraftSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
            placeholder={`${td.search}…`}
            className="w-full h-9 rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{td.logDateFrom}</label>
          <input
            type="date"
            value={draftDateFrom}
            onChange={(e) => setDraftDateFrom(e.target.value)}
            className="h-9 rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{td.logDateTo}</label>
          <input
            type="date"
            value={draftDateTo}
            onChange={(e) => setDraftDateTo(e.target.value)}
            className="h-9 rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={applyFilters}
            className="px-4 h-9 rounded-lg bg-gray-900 text-white text-xs font-bold hover:bg-gray-700 transition-colors"
          >
            {td.applyFilters}
          </button>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="px-4 h-9 rounded-lg border border-gray-300 text-xs text-gray-600 hover:bg-gray-50"
            >
              {td.clear}
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4 border-b border-gray-200">
        {(['errors', 'audit'] as Tab[]).map((tabKey) => (
          <button
            key={tabKey}
            onClick={() => setTab(tabKey)}
            className={[
              'px-4 py-2 text-sm font-medium -mb-px border-b-2 transition-colors',
              tab === tabKey
                ? 'border-red-600 text-red-600'
                : 'border-transparent text-gray-500 hover:text-gray-700',
            ].join(' ')}
          >
            {tabKey === 'errors' ? td.errorsTab : td.auditTab}
            <span className="ml-1.5 text-xs text-gray-400">
              {tabKey === 'errors' ? errors.length : audits.length}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">{td.loading}</p>
      ) : tab === 'errors' ? (
        errors.length === 0 ? (
          <p className="text-sm text-gray-400">{td.noErrors}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs text-gray-400 uppercase tracking-wider">
                  <th className="pb-2 pr-4 font-semibold w-40">{td.dateCol}</th>
                  <th className="pb-2 pr-4 font-semibold">{td.messageCol}</th>
                  <th className="pb-2 font-semibold w-40">{td.pathCol}</th>
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
        <p className="text-sm text-gray-400">{td.noAuditEvents}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs text-gray-400 uppercase tracking-wider">
                <th className="pb-2 pr-4 font-semibold w-40">{td.dateCol}</th>
                <th className="pb-2 pr-4 font-semibold w-28">{td.actionCol}</th>
                <th className="pb-2 pr-4 font-semibold w-28">{td.entityCol}</th>
                <th className="pb-2 pr-4 font-semibold">{td.entityIdCol}</th>
                <th className="pb-2 font-semibold">{td.userIdCol}</th>
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

// ── Page export with Suspense boundary (required for useSearchParams) ─────────

export default function LogsPage() {
  return (
    <Suspense>
      <LogsContent />
    </Suspense>
  )
}
