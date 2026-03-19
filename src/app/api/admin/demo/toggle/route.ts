import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { getSetting, setSetting } from '@/lib/settings/settingsService'
import { AppError } from '@/lib/errors'
import { logError } from '@/lib/log'

export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req)
    const current = await getSetting('demo.enabled')
    const enabled = current !== 'true'
    await setSetting('demo.enabled', enabled ? 'true' : 'false')
    return NextResponse.json({ enabled })
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.status })
    const err = e instanceof Error ? e : new Error(String(e))
    logError(err.message, { stack: err.stack, path: '/api/admin/demo/toggle' })
    return NextResponse.json({ error: 'Toggle failed' }, { status: 500 })
  }
}
