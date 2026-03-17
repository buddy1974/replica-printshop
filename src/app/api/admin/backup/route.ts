// Full backup — returns a single JSON bundle with all data.
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { backupAll } from '@/lib/backup/backupService'
import { AppError } from '@/lib/errors'
import { logError } from '@/lib/log'

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req)
    const bundle = await backupAll()
    const ts = new Date().toISOString().slice(0, 10)
    const json = JSON.stringify(bundle, null, 2)
    return new NextResponse(json, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="backup-${ts}.json"`,
      },
    })
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.status })
    const err = e instanceof Error ? e : new Error(String(e))
    logError(err.message, { stack: err.stack, path: '/api/admin/backup' })
    return NextResponse.json({ error: 'Backup failed' }, { status: 500 })
  }
}
