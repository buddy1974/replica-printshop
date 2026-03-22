import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/adminAuth'
import { AppError, ValidationError } from '@/lib/errors'
import { OrderStatus, PaymentStatus } from '@/generated/prisma/client'

const VALID_STATUSES = Object.values(OrderStatus)

export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req)

    const body = await req.json() as {
      ids: string[]
      action: 'approve' | 'status' | 'delete'
      status?: string
    }

    if (!Array.isArray(body.ids) || body.ids.length === 0) {
      throw new ValidationError('ids must be a non-empty array')
    }

    const ids = body.ids.slice(0, 200) // safety cap
    let updated = 0

    if (body.action === 'approve') {
      const res = await db.order.updateMany({
        where: { id: { in: ids } },
        data: { paymentStatus: PaymentStatus.PAID },
      })
      updated = res.count

    } else if (body.action === 'status') {
      if (!body.status) throw new ValidationError('status is required for status action')
      if (!VALID_STATUSES.includes(body.status as OrderStatus)) {
        throw new ValidationError(`Invalid status: ${body.status}`)
      }
      const res = await db.order.updateMany({
        where: { id: { in: ids } },
        data: { status: body.status as OrderStatus },
      })
      updated = res.count

    } else if (body.action === 'delete') {
      const res = await db.order.deleteMany({
        where: {
          id: { in: ids },
          status: { notIn: [OrderStatus.IN_PRODUCTION, OrderStatus.DONE] },
        },
      })
      updated = res.count

    } else {
      throw new ValidationError('Invalid action')
    }

    return NextResponse.json({ updated })
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
