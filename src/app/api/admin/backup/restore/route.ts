// Restore endpoint — accepts a backup JSON bundle, inserts missing orders.
// Never overwrites existing records. Admin only.
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { restoreOrders } from '@/lib/backup/backupService'
import { AppError, ValidationError } from '@/lib/errors'
import { logAction, logError } from '@/lib/log'

export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req)

    const adminId = req.cookies.get('replica_uid')?.value ?? 'unknown'

    const body = await req.json() as {
      orders?: object[]
      meta?: { version?: number; counts?: object }
    }

    if (!body || (!body.orders && !body.meta)) {
      throw new ValidationError('Invalid backup JSON — expected { orders: [...], meta: {...} }')
    }

    const orders = Array.isArray(body.orders) ? body.orders : []

    const result = await restoreOrders(orders)

    logAction('BACKUP_RESTORE', 'system', {
      userId: adminId,
      data: {
        ordersTotal: result.ordersTotal,
        ordersRestored: result.ordersRestored,
        ordersSkipped: result.ordersSkipped,
      },
    })

    return NextResponse.json(result)
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.status })
    const err = e instanceof Error ? e : new Error(String(e))
    logError(err.message, { stack: err.stack, path: '/api/admin/backup/restore' })
    return NextResponse.json({ error: 'Restore failed' }, { status: 500 })
  }
}
