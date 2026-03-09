// Step 290 — Admin analytics API
import { NextRequest, NextResponse } from 'next/server'
import { getAnalytics } from '@/lib/analytics'
import { AppError } from '@/lib/errors'
import { requireAdmin } from '@/lib/adminAuth'

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req)
    const data = await getAnalytics()
    return NextResponse.json(data)
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
