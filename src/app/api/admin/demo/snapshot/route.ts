import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { backupAll } from '@/lib/backup/backupService'
import { setSetting } from '@/lib/settings/settingsService'
import { AppError } from '@/lib/errors'
import { logError } from '@/lib/log'

export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req)
    const bundle = await backupAll()
    await Promise.all([
      setSetting('demo.snapshot', JSON.stringify(bundle)),
      setSetting('demo.snapshot.date', bundle.meta.createdAt),
      setSetting('demo.snapshot.counts', JSON.stringify(bundle.meta.counts)),
    ])
    return NextResponse.json({ date: bundle.meta.createdAt, counts: bundle.meta.counts })
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.status })
    const err = e instanceof Error ? e : new Error(String(e))
    logError(err.message, { stack: err.stack, path: '/api/admin/demo/snapshot' })
    return NextResponse.json({ error: 'Snapshot failed' }, { status: 500 })
  }
}
