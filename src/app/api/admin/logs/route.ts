import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [errors, audits] = await Promise.all([
    db.errorLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: { id: true, message: true, path: true, createdAt: true },
    }),
    db.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: { id: true, action: true, entity: true, entityId: true, userId: true, createdAt: true },
    }),
  ])

  return NextResponse.json({ errors, audits })
}
