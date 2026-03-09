// Steps 275, 324, 326 — Safe checkout: ownership, rate limit, price integrity

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createCheckoutSession } from '@/lib/checkout'
import { AppError, ValidationError } from '@/lib/errors'
import { requireOwner } from '@/lib/requireOwner'
import { checkRateLimit, getClientKey } from '@/lib/rateLimit'
import { logInfo } from '@/lib/logger'

interface Params {
  params: { id: string }
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    // Step 324 — rate limit checkout: 10/min
    if (!checkRateLimit(`checkout:${getClientKey(req)}`, 10, 60_000)) {
      return NextResponse.json({ error: 'Too many requests. Try again in a minute.' }, { status: 429 })
    }

    const order = await db.order.findUnique({
      where: { id: params.id },
      include: { items: true },
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Step 321 — ownership check
    await requireOwner(req, order.userId)

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

    // Step 326 — price integrity: verify stored total matches sum of snapshots + shipping
    const itemsSubtotal = order.items.reduce(
      (sum, item) => sum + Number(item.priceSnapshot) * item.quantity,
      0,
    )
    const storedTotal = Number(order.total)
    const storedShipping = Number(order.shippingPrice)
    if (Math.abs(itemsSubtotal + storedShipping - storedTotal) > 0.02) {
      throw new ValidationError('Price integrity check failed. Please restart your order.')
    }

    logInfo('Checkout session created', { orderId: params.id, userId: order.userId ?? undefined })

    const result = await createCheckoutSession(params.id)
    return NextResponse.json(result)
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
