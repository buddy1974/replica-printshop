import { NextRequest, NextResponse } from 'next/server'
import { getQueue } from '@/lib/production'
import { AppError } from '@/lib/errors'
import { requireAdmin } from '@/lib/adminAuth'

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req)
    const queue = await getQueue()
    return NextResponse.json(queue)
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
