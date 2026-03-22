import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

function escapeCsv(val: unknown): string {
  const s = val === null || val === undefined ? '' : String(val)
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

function toCsvRow(fields: unknown[]): string {
  return fields.map(escapeCsv).join(',')
}

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const sp = req.nextUrl.searchParams
  const search    = sp.get('search')?.trim()   || undefined
  const dateFrom  = sp.get('dateFrom')?.trim() || undefined
  const dateTo    = sp.get('dateTo')?.trim()   || undefined
  const tab       = (sp.get('tab') || 'both') as 'errors' | 'audit' | 'both'
  const exportCsv = sp.get('export') === 'csv'

  // ── Build Prisma where clauses ──────────────────────────────────────────

  const createdAtFilter = (dateFrom || dateTo)
    ? {
        ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
        ...(dateTo   ? { lte: new Date(`${dateTo}T23:59:59.999Z`) } : {}),
      }
    : undefined

  const errorWhere = {
    ...(search       ? { message: { contains: search, mode: 'insensitive' as const } } : {}),
    ...(createdAtFilter ? { createdAt: createdAtFilter } : {}),
  }

  const auditWhere = {
    ...(search ? {
      OR: [
        { action: { contains: search, mode: 'insensitive' as const } },
        { entity: { contains: search, mode: 'insensitive' as const } },
      ],
    } : {}),
    ...(createdAtFilter ? { createdAt: createdAtFilter } : {}),
  }

  // ── CSV export ──────────────────────────────────────────────────────────

  if (exportCsv) {
    const today = new Date().toISOString().slice(0, 10)

    if (tab === 'audit') {
      const rows = await db.auditLog.findMany({
        where: auditWhere,
        orderBy: { createdAt: 'desc' },
        take: 10_000,
        select: { id: true, action: true, entity: true, entityId: true, userId: true, createdAt: true },
      })
      const header = 'id,action,entity,entityId,userId,createdAt'
      const body = rows.map((r) =>
        toCsvRow([r.id, r.action, r.entity, r.entityId, r.userId, r.createdAt.toISOString()])
      ).join('\n')
      return new Response(`${header}\n${body}`, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="audit-logs-${today}.csv"`,
        },
      })
    }

    // default: errors
    const rows = await db.errorLog.findMany({
      where: errorWhere,
      orderBy: { createdAt: 'desc' },
      take: 10_000,
      select: { id: true, message: true, path: true, createdAt: true },
    })
    const header = 'id,message,path,createdAt'
    const body = rows.map((r) =>
      toCsvRow([r.id, r.message, r.path, r.createdAt.toISOString()])
    ).join('\n')
    return new Response(`${header}\n${body}`, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="error-logs-${today}.csv"`,
      },
    })
  }

  // ── JSON response ───────────────────────────────────────────────────────

  const fetchErrors = tab === 'errors' || tab === 'both'
  const fetchAudit  = tab === 'audit'  || tab === 'both'

  const [errors, audits] = await Promise.all([
    fetchErrors
      ? db.errorLog.findMany({
          where: errorWhere,
          orderBy: { createdAt: 'desc' },
          take: 500,
          select: { id: true, message: true, path: true, createdAt: true },
        })
      : Promise.resolve([]),
    fetchAudit
      ? db.auditLog.findMany({
          where: auditWhere,
          orderBy: { createdAt: 'desc' },
          take: 500,
          select: { id: true, action: true, entity: true, entityId: true, userId: true, createdAt: true },
        })
      : Promise.resolve([]),
  ])

  return NextResponse.json({ errors, audits })
}
