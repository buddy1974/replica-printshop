import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { getSetting } from '@/lib/settings/settingsService'
import { restoreOrders } from '@/lib/backup/backupService'
import { db } from '@/lib/db'
import { AppError } from '@/lib/errors'
import { logAction, logError } from '@/lib/log'

export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req)

    const raw = await getSetting('demo.snapshot')
    if (!raw) {
      return NextResponse.json(
        { error: 'No snapshot found. Create a snapshot first.' },
        { status: 400 },
      )
    }

    const bundle = JSON.parse(raw) as { orders?: object[]; meta?: object }
    const orders = Array.isArray(bundle.orders) ? bundle.orders : []

    // Wipe transactional tables in FK-safe order
    await db.productionJob.deleteMany({})
    await db.uploadFile.deleteMany({})
    await db.orderItem.deleteMany({})
    await db.order.deleteMany({})
    await db.cartItem.deleteMany({})
    await db.pendingUpload.deleteMany({})
    await db.cart.deleteMany({})
    await db.auditLog.deleteMany({})
    await db.errorLog.deleteMany({})

    const result = await restoreOrders(orders)

    const adminId = req.cookies.get('replica_uid')?.value ?? 'unknown'
    logAction('DEMO_RESTORE', 'system', {
      userId: adminId,
      data: {
        ordersTotal:    result.ordersTotal,
        ordersRestored: result.ordersRestored,
        ordersSkipped:  result.ordersSkipped,
      },
    })

    return NextResponse.json(result)
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.status })
    const err = e instanceof Error ? e : new Error(String(e))
    logError(err.message, { stack: err.stack, path: '/api/admin/demo/restore' })
    return NextResponse.json({ error: 'Restore failed' }, { status: 500 })
  }
}
