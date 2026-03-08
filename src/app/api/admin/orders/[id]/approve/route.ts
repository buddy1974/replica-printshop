import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { AppError, ValidationError } from '@/lib/errors'
import { assertExists } from '@/lib/assert'

interface Params {
  params: { id: string }
}

export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const order = await db.order.findUnique({
      where: { id: params.id },
      include: { items: { select: { id: true } } },
    })

    assertExists(order, `Order not found: ${params.id}`)

    if (order.status !== 'UPLOADED') {
      throw new ValidationError(
        `Cannot approve order with status ${order.status}. Order must be UPLOADED.`
      )
    }

    await db.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: params.id },
        data: { status: 'APPROVED' },
      })

      for (const item of order.items) {
        await tx.productionJob.create({
          data: { orderItemId: item.id, status: 'QUEUED' },
        })
      }

      await tx.order.update({
        where: { id: params.id },
        data: { status: 'READY' },
      })
    })

    const updated = await db.order.findUnique({ where: { id: params.id } })
    return NextResponse.json(updated)
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
