import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { AppError, ValidationError } from '@/lib/errors'
import { assertExists } from '@/lib/assert'
import { requireAdmin } from '@/lib/adminAuth'
import { assertValidOrderTransition } from '@/lib/orderStatus'
import { logAction } from '@/lib/log'

interface Params {
  params: { id: string }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    await requireAdmin(req)

    const body = await req.json() as { status?: string; paymentStatus?: string }

    if (!body.status && !body.paymentStatus) {
      throw new ValidationError('Provide status or paymentStatus to update')
    }

    const order = await db.order.findUnique({ where: { id: params.id } })
    assertExists(order, 'Order not found')

    const data: Record<string, string> = {}
    const adminId = req.cookies.get('replica_uid')?.value ?? 'unknown'

    if (body.status) {
      assertValidOrderTransition(order.status, body.status)
      data.status = body.status
      logAction('ORDER_STATUS', 'order', {
        userId: adminId,
        entityId: params.id,
        data: { from: order.status, to: body.status },
      })
    }

    if (body.paymentStatus) {
      const allowed = ['UNPAID', 'PAID', 'REFUNDED']
      if (!allowed.includes(body.paymentStatus)) {
        throw new ValidationError(`Invalid paymentStatus: ${body.paymentStatus}`)
      }
      data.paymentStatus = body.paymentStatus
      logAction('ORDER_PAYMENT_STATUS', 'order', {
        userId: adminId,
        entityId: params.id,
        data: { from: order.paymentStatus, to: body.paymentStatus },
      })
    }

    const updated = await db.order.update({ where: { id: params.id }, data })
    return NextResponse.json(updated)
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
