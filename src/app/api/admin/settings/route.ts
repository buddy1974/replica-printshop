import { NextRequest, NextResponse } from 'next/server'
import { getAllSettings, saveSettings } from '@/lib/settings/settingsService'
import { AppError, ValidationError } from '@/lib/errors'
import { requireAdmin } from '@/lib/adminAuth'

// GET /api/admin/settings — return all settings merged with defaults
export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req)
    const settings = await getAllSettings()
    return NextResponse.json(settings)
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// PATCH /api/admin/settings — save (upsert) provided key-value pairs
export async function PATCH(req: NextRequest) {
  try {
    await requireAdmin(req)
    const body = await req.json() as Record<string, unknown>

    if (typeof body !== 'object' || body === null) {
      throw new ValidationError('Expected a JSON object of key-value pairs')
    }

    // Sanitise: only string values, max 2000 chars per value
    const clean: Record<string, string> = {}
    for (const [k, v] of Object.entries(body)) {
      if (typeof v === 'string') {
        clean[k] = v.slice(0, 2000)
      }
    }

    await saveSettings(clean)
    const updated = await getAllSettings()
    return NextResponse.json(updated)
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
