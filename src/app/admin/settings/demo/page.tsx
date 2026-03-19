'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Container from '@/components/Container'
import { useLocale } from '@/context/LocaleContext'

interface SnapshotMeta {
  date: string
  counts: { orders?: number; invoices?: number; uploads?: number }
}

interface SeedResult {
  users: number
  orders: number
}

interface RestoreResult {
  ordersTotal: number
  ordersRestored: number
  ordersSkipped: number
  errors: string[]
}

type BtnState = 'idle' | 'loading' | 'done' | 'error'

function StatusPill({ enabled }: { enabled: boolean }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
      enabled ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-600'
    }`}>
      {enabled ? 'ON' : 'OFF'}
    </span>
  )
}

export default function DemoSettingsPage() {
  const { t } = useLocale()
  const td = t.admin

  const [enabled, setEnabled] = useState(false)
  const [snapshot, setSnapshot] = useState<SnapshotMeta | null>(null)
  const [loading, setLoading] = useState(true)

  const [toggleState, setToggleState]   = useState<BtnState>('idle')
  const [seedState, setSeedState]       = useState<BtnState>('idle')
  const [seedResult, setSeedResult]     = useState<SeedResult | null>(null)
  const [snapState, setSnapState]       = useState<BtnState>('idle')
  const [restoreState, setRestoreState] = useState<BtnState>('idle')
  const [restoreResult, setRestoreResult] = useState<RestoreResult | null>(null)
  const [restoreError, setRestoreError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/settings')
      .then((r) => r.json())
      .then((s: Record<string, string>) => {
        setEnabled(s['demo.enabled'] === 'true')
        const date = s['demo.snapshot.date'] ?? ''
        if (date) {
          let counts: SnapshotMeta['counts'] = {}
          try { counts = JSON.parse(s['demo.snapshot.counts'] ?? '{}') } catch { /* */ }
          setSnapshot({ date, counts })
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const toggle = async () => {
    setToggleState('loading')
    const res = await fetch('/api/admin/demo/toggle', { method: 'POST' })
    if (res.ok) {
      const d = await res.json() as { enabled: boolean }
      setEnabled(d.enabled)
      setToggleState('done')
      setTimeout(() => setToggleState('idle'), 2000)
    } else {
      setToggleState('error')
      setTimeout(() => setToggleState('idle'), 3000)
    }
  }

  const seed = async () => {
    setSeedState('loading')
    setSeedResult(null)
    const res = await fetch('/api/admin/demo/seed', { method: 'POST' })
    if (res.ok) {
      const d = await res.json() as SeedResult
      setSeedResult(d)
      setSeedState('done')
    } else {
      setSeedState('error')
      setTimeout(() => setSeedState('idle'), 3000)
    }
  }

  const createSnapshot = async () => {
    setSnapState('loading')
    const res = await fetch('/api/admin/demo/snapshot', { method: 'POST' })
    if (res.ok) {
      const d = await res.json() as { date: string; counts: SnapshotMeta['counts'] }
      setSnapshot({ date: d.date, counts: d.counts })
      setSnapState('done')
      setTimeout(() => setSnapState('idle'), 2000)
    } else {
      setSnapState('error')
      setTimeout(() => setSnapState('idle'), 3000)
    }
  }

  const restore = async () => {
    if (!window.confirm(td.demoRestoreConfirm)) return
    setRestoreState('loading')
    setRestoreResult(null)
    setRestoreError(null)
    const res = await fetch('/api/admin/demo/restore', { method: 'POST' })
    if (res.ok) {
      const d = await res.json() as RestoreResult
      setRestoreResult(d)
      setRestoreState('done')
    } else {
      const d = await res.json() as { error?: string }
      setRestoreError(d.error ?? td.demoRestoreError)
      setRestoreState('error')
    }
  }

  const btnLabel = (state: BtnState, idle: string) => {
    if (state === 'loading') return td.loading
    if (state === 'done')    return '✓ ' + td.savedLabel
    if (state === 'error')   return td.errorRetry
    return idle
  }

  const btnClass = (state: BtnState) =>
    `px-4 py-2 rounded-lg text-sm font-bold transition-colors disabled:opacity-50 ${
      state === 'done'  ? 'bg-green-600 text-white' :
      state === 'error' ? 'bg-red-600 text-white' :
      'bg-gray-900 text-white hover:bg-gray-700'
    }`

  if (loading) {
    return (
      <Container>
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-gray-200 border-t-red-600 rounded-full animate-spin" />
        </div>
      </Container>
    )
  }

  return (
    <Container>
      <div className="mb-6">
        <Link href="/admin/settings" className="text-xs text-gray-400 hover:text-gray-700 transition-colors">
          ← {td.settingsTitle}
        </Link>
        <h1 className="mt-1">{td.demoTitle}</h1>
        <p className="text-xs text-gray-400 mt-0.5">{td.demoSubtitle}</p>
      </div>

      {/* Demo mode toggle */}
      <div className="rounded-xl border border-gray-200 bg-white px-6 py-5 mb-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-gray-900">{td.demoToggle}</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {enabled ? td.demoEnabled : td.demoDisabled}
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <StatusPill enabled={enabled} />
            <button
              onClick={toggle}
              disabled={toggleState === 'loading'}
              className={btnClass(toggleState)}
            >
              {btnLabel(toggleState, enabled ? 'Disable' : 'Enable')}
            </button>
          </div>
        </div>
      </div>

      {/* Seed demo data */}
      <div className="rounded-xl border border-gray-200 bg-white px-6 py-5 mb-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-gray-900">{td.demoSeedData}</p>
            <p className="text-xs text-gray-500 mt-0.5">{td.demoSeedDesc}</p>
            {seedState === 'done' && seedResult && (
              <p className="text-xs text-green-700 mt-1">
                ✓ {td.demoSeeded} ({seedResult.users} users, {seedResult.orders} orders)
              </p>
            )}
          </div>
          <button
            onClick={seed}
            disabled={seedState === 'loading'}
            className={`shrink-0 ${btnClass(seedState)}`}
          >
            {btnLabel(seedState, td.demoSeedBtn)}
          </button>
        </div>
      </div>

      {/* Snapshot */}
      <div className="rounded-xl border border-gray-200 bg-white px-6 py-5 mb-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-gray-900">{td.demoSnapshotSection}</p>
            {snapshot ? (
              <div className="text-xs text-gray-500 mt-0.5 space-y-0.5">
                <p>{td.demoSnapshotDate}: {new Date(snapshot.date).toLocaleString()}</p>
                {snapshot.counts.orders !== undefined && (
                  <p>{td.demoSnapshotOrders}: {snapshot.counts.orders}</p>
                )}
              </div>
            ) : (
              <p className="text-xs text-gray-400 mt-0.5">{td.demoNoSnapshot}</p>
            )}
            {snapState === 'done' && (
              <p className="text-xs text-green-700 mt-1">✓ {td.demoSnapshotTaken}</p>
            )}
          </div>
          <button
            onClick={createSnapshot}
            disabled={snapState === 'loading'}
            className={`shrink-0 ${btnClass(snapState)}`}
          >
            {btnLabel(snapState, td.demoSnapshotBtn)}
          </button>
        </div>
      </div>

      {/* Restore */}
      <div className="rounded-xl border border-gray-200 bg-white px-6 py-5 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-gray-900">{td.demoRestoreSection}</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {snapshot
                ? `${td.demoSnapshotDate}: ${new Date(snapshot.date).toLocaleString()}`
                : td.demoNoSnapshot}
            </p>
            {restoreState === 'done' && restoreResult && (
              <p className="text-xs text-green-700 mt-1">
                ✓ {td.demoRestored} ({restoreResult.ordersRestored} {td.restoredNew})
              </p>
            )}
            {restoreError && (
              <p className="text-xs text-red-600 mt-1">{restoreError}</p>
            )}
          </div>
          <button
            onClick={restore}
            disabled={restoreState === 'loading' || !snapshot}
            className={`shrink-0 ${btnClass(restoreState)}`}
          >
            {restoreState === 'loading' ? td.restoring : td.demoRestoreBtn}
          </button>
        </div>
      </div>

      <Link href="/admin/settings" className="text-xs text-gray-500 hover:text-gray-800 transition-colors">
        ← {td.backToAdmin.replace('admin', td.settingsTitle)}
      </Link>
    </Container>
  )
}
