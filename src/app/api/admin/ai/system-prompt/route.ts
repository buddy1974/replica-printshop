import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { getSetting, setSetting } from '@/lib/settings/settingsService'
import { AppError } from '@/lib/errors'

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req)
    const value = await getSetting('ai.systemPrompt')
    return NextResponse.json({ value })
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await requireAdmin(req)
    const body = await req.json() as { value?: unknown }
    if (typeof body.value !== 'string') {
      return NextResponse.json({ error: 'value must be a string' }, { status: 400 })
    }
    const value = body.value.trim().slice(0, 10000)
    await setSetting('ai.systemPrompt', value)
    return NextResponse.json({ value })
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
