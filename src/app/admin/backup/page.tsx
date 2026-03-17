'use client'

import { useState, useRef } from 'react'
import Container from '@/components/Container'

type ExportType = 'orders' | 'invoices' | 'uploads' | 'all'
type Status = 'idle' | 'loading' | 'done' | 'error'

interface RestoreResult {
  ordersTotal: number
  ordersRestored: number
  ordersSkipped: number
  errors: string[]
}

function ExportCard({
  title,
  description,
  type,
}: {
  title: string
  description: string
  type: ExportType
}) {
  const [status, setStatus] = useState<Status>('idle')

  const urlMap: Record<ExportType, string> = {
    orders:   '/api/admin/export/orders',
    invoices: '/api/admin/export/invoices',
    uploads:  '/api/admin/export/uploads',
    all:      '/api/admin/backup',
  }

  const handleExport = async () => {
    setStatus('loading')
    try {
      const res = await fetch(urlMap[type])
      if (!res.ok) { setStatus('error'); return }
      const blob = await res.blob()
      const ts = new Date().toISOString().slice(0, 10)
      const name = type === 'all' ? `backup-${ts}.json` : `${type}-${ts}.json`
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = name
      a.click()
      URL.revokeObjectURL(url)
      setStatus('done')
      setTimeout(() => setStatus('idle'), 3000)
    } catch {
      setStatus('error')
      setTimeout(() => setStatus('idle'), 4000)
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white px-5 py-4 flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-semibold text-gray-800">{title}</p>
        <p className="text-xs text-gray-400 mt-0.5">{description}</p>
      </div>
      <button
        onClick={handleExport}
        disabled={status === 'loading'}
        className={[
          'shrink-0 text-sm px-4 py-2 rounded-lg font-medium border transition-colors disabled:opacity-50',
          type === 'all'
            ? 'bg-gray-900 text-white border-gray-900 hover:bg-gray-700'
            : 'bg-white text-gray-700 border-gray-300 hover:border-gray-500',
        ].join(' ')}
      >
        {status === 'loading' ? 'Preparing…' :
         status === 'done'    ? '✓ Downloaded' :
         status === 'error'   ? 'Error — retry' :
         'Download JSON'}
      </button>
    </div>
  )
}

export default function BackupPage() {
  const [restoreStatus, setRestoreStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [restoreResult, setRestoreResult] = useState<RestoreResult | null>(null)
  const [restoreError, setRestoreError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setRestoreStatus('loading')
    setRestoreResult(null)
    setRestoreError('')

    try {
      const text = await file.text()
      const json = JSON.parse(text)

      const res = await fetch('/api/admin/backup/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(json),
      })

      const data = await res.json()
      if (!res.ok) {
        setRestoreError(data.error ?? 'Restore failed')
        setRestoreStatus('error')
      } else {
        setRestoreResult(data)
        setRestoreStatus('done')
      }
    } catch (err) {
      setRestoreError(err instanceof Error ? err.message : 'Invalid backup file')
      setRestoreStatus('error')
    }

    // Reset file input
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <Container>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Backup & Export</h1>
          <p className="text-xs text-gray-400 mt-0.5">Download a snapshot of all shop data</p>
        </div>
      </div>

      {/* Export section */}
      <section className="mb-8">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Export</h2>
        <div className="flex flex-col gap-3">
          <ExportCard
            title="Full backup"
            description="All orders, invoices and upload metadata in one file"
            type="all"
          />
          <ExportCard
            title="Orders"
            description="All orders with items, addresses, status and payment info"
            type="orders"
          />
          <ExportCard
            title="Invoices"
            description="List of generated invoices with order references"
            type="invoices"
          />
          <ExportCard
            title="Uploads"
            description="Upload file metadata and storage paths"
            type="uploads"
          />
        </div>
      </section>

      {/* Restore section */}
      <section className="mb-8">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Restore</h2>
        <div className="rounded-xl border border-gray-200 bg-white px-5 py-5">
          <p className="text-sm font-medium text-gray-800 mb-1">Restore from backup</p>
          <p className="text-xs text-gray-400 mb-4">
            Upload a <code className="bg-gray-100 px-1 rounded">backup-*.json</code> file.
            Only missing orders are inserted — existing records are never overwritten.
          </p>

          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={handleRestore}
          />

          <button
            onClick={() => fileRef.current?.click()}
            disabled={restoreStatus === 'loading'}
            className="text-sm px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors font-medium"
          >
            {restoreStatus === 'loading' ? 'Restoring…' : 'Choose backup file'}
          </button>

          {restoreStatus === 'error' && (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {restoreError}
            </div>
          )}

          {restoreStatus === 'done' && restoreResult && (
            <div className="mt-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
              <p className="font-semibold mb-1">Restore complete</p>
              <p>Orders in file: <strong>{restoreResult.ordersTotal}</strong></p>
              <p>Restored (new): <strong>{restoreResult.ordersRestored}</strong></p>
              <p>Skipped (already exist): <strong>{restoreResult.ordersSkipped}</strong></p>
              {restoreResult.errors.length > 0 && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs text-red-600">{restoreResult.errors.length} error(s)</summary>
                  <ul className="mt-1 text-xs text-red-600 space-y-0.5">
                    {restoreResult.errors.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                </details>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Cron info */}
      <section>
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Auto backup</h2>
        <div className="rounded-xl border border-gray-200 bg-gray-50 px-5 py-4 text-sm text-gray-600 space-y-2">
          <p>
            Vercel Cron is configured to call{' '}
            <code className="bg-white px-1 py-0.5 rounded border border-gray-200 text-xs">/api/admin/backup/cron</code>{' '}
            daily at <strong>03:00 UTC</strong>.
          </p>
          <p>
            Set <code className="bg-white px-1 py-0.5 rounded border border-gray-200 text-xs">CRON_SECRET</code> in your
            Vercel environment variables to protect the cron endpoint.
            Each run is logged to the audit trail.
          </p>
          <p className="text-gray-400 text-xs">
            Note: Vercel Cron logs the backup event only — it does not store the file.
            Use the Download buttons above to save a copy locally.
          </p>
        </div>
      </section>

      {/* Quick link */}
      <div className="mt-6 text-xs text-gray-400">
        Files are exported as JSON. To restore the database completely, use your database
        provider&apos;s point-in-time restore (Neon → Branches).
      </div>
    </Container>
  )
}
