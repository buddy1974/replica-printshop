import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { AppError } from '@/lib/errors'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req)

    const { searchParams } = new URL(req.url)
    const page     = Math.max(1, parseInt(searchParams.get('page')     ?? '1',  10))
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') ?? '20', 10)))
    const sessionFilter = searchParams.get('sessionId')?.trim() || undefined

    const where = sessionFilter ? { sessionId: sessionFilter } : {}

    const [logs, total] = await Promise.all([
      db.chatLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.chatLog.count({ where }),
    ])

    return NextResponse.json({
      logs,
      total,
      pages: Math.ceil(total / pageSize),
    })
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
