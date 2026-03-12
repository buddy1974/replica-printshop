import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { db } from '@/lib/db'
import { createOrderFromCart } from '@/lib/order'
import { DeliveryType } from '@/generated/prisma/client'
import { AppError } from '@/lib/errors'
import { sendOrderConfirmed, sendUploadNeeded, sendAdminNewOrder } from '@/lib/email'

interface BillingPayload {
  firstName: string
  lastName: string
  email: string
  phone?: string
  country: string
  street: string
  city: string
  postalCode: string
}

interface DeliveryPayload {
  firstName: string
  lastName: string
  phone?: string
  country: string
  street: string
  city: string
  postalCode: string
}

export async function POST(req: NextRequest) {
  try {
    const userId = req.cookies.get('replica_uid')?.value ?? null
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = await req.json()
    const { paymentIntentId, deliveryType, billing, deliveryAddr, sameAsBilling } = body as {
      paymentIntentId: string
      deliveryType: DeliveryType
      billing: BillingPayload
      deliveryAddr: DeliveryPayload | null
      sameAsBilling: boolean
    }

    if (!paymentIntentId || !deliveryType || !billing) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Verify payment with Stripe — PI must be succeeded and belong to this user
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2026-02-25.clover',
    })
    const intent = await stripe.paymentIntents.retrieve(paymentIntentId)

    if (intent.metadata?.userId !== userId) {
      return NextResponse.json({ error: 'Payment intent does not belong to this session' }, { status: 403 })
    }
    if (intent.status !== 'succeeded') {
      return NextResponse.json(
        { error: `Payment not confirmed (status: ${intent.status})` },
        { status: 400 },
      )
    }

    // Idempotency: return existing order if this PI was already confirmed
    const existingOrder = await db.order.findFirst({
      where: { stripePaymentIntentId: paymentIntentId },
      select: { id: true },
    })
    if (existingOrder) {
      return NextResponse.json({ orderId: existingOrder.id })
    }

    // Map wizard address format to GuestAddress
    const billingAddress = {
      name: `${billing.firstName} ${billing.lastName}`.trim(),
      street: billing.street,
      city: billing.city,
      zip: billing.postalCode,
      country: billing.country,
    }
    const shippingAddress =
      !sameAsBilling && deliveryAddr
        ? {
            name: `${deliveryAddr.firstName} ${deliveryAddr.lastName}`.trim(),
            street: deliveryAddr.street,
            city: deliveryAddr.city,
            zip: deliveryAddr.postalCode,
            country: deliveryAddr.country,
          }
        : billingAddress

    // Create order from cart (also clears cart items)
    const order = await createOrderFromCart(userId, deliveryType, {
      orderUserId: userId,
      billingAddress,
      shippingAddress,
    })

    // Mark order as paid and store PI ID for idempotency
    await db.order.update({
      where: { id: order.id },
      data: {
        paymentStatus: 'PAID',
        status: 'CONFIRMED',
        stripePaymentIntentId: paymentIntentId,
      },
    })

    // Email notifications
    const email = billing.email
    if (email) {
      sendOrderConfirmed(order.id, email).catch(() => {})
      sendUploadNeeded(order.id, email).catch(() => {})
    }
    sendAdminNewOrder(order.id, Number(order.total)).catch(() => {})

    return NextResponse.json({ orderId: order.id })
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
