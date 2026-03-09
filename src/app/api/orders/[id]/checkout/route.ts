// Step 275 — Safe checkout validation
// Validates order before creating a Stripe checkout session.

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createCheckoutSession } from '@/lib/checkout'
import { AppError, ValidationError } from '@/lib/errors'
import { logInfo } from '@/lib/logger'

interface Params {
  params: { id: string }
}

export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const order = await db.order.findUnique({
      where: { id: params.id },
      include: { items: true },
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Cart must exist and have items
    if (order.items.length === 0) {
      throw new ValidationError('Cannot checkout: order has no items')
    }

    // Every item must have a valid priceSnapshot
    for (const item of order.items) {
      if (!item.priceSnapshot || Number(item.priceSnapshot) <= 0) {
        throw new ValidationError('Cannot checkout: one or more items have no valid price')
      }
    }

    // Order total must be positive
    if (Number(order.total) <= 0) {
      throw new ValidationError('Cannot checkout: order total must be greater than zero')
    }

    logInfo('Checkout session created', { orderId: params.id, userId: order.userId ?? undefined }) // step 279

    const result = await createCheckoutSession(params.id)
    return NextResponse.json(result)
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
