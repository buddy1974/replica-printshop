import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { db } from '@/lib/db'
import { sendOrderConfirmed, sendUploadNeeded, sendAdminNewOrder } from '@/lib/email'
import { logInfo, logWarn } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2026-02-25.clover',
  })
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Signature verification failed'
    return NextResponse.json({ error: message }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const orderId = session.metadata?.orderId

    if (!orderId) {
      return NextResponse.json({ error: 'Missing orderId in metadata' }, { status: 400 })
    }

    // Step 277 — Idempotent webhook: skip if already processed
    const existing = await db.order.findUnique({
      where: { id: orderId },
      select: { paymentStatus: true, status: true, total: true, user: { select: { email: true } } },
    })
    if (!existing) {
      logWarn('Webhook: orderId not found', { orderId })
      return NextResponse.json({ received: true })
    }
    if (existing.paymentStatus === 'PAID') {
      logWarn('Webhook: order already paid, skipping', { orderId })
      return NextResponse.json({ received: true })
    }

    const order = await db.order.update({
      where: { id: orderId },
      data: { paymentStatus: 'PAID', status: 'CONFIRMED' },
      include: { user: { select: { email: true } } },
    })

    logInfo('Order payment confirmed', { orderId }) // step 279

    // Non-blocking email hooks (user may be null for guest orders)
    const email = order.user?.email ?? ''
    if (email) {
      sendOrderConfirmed(orderId, email).catch(() => {})
      sendUploadNeeded(orderId, email).catch(() => {})
    }
    sendAdminNewOrder(orderId, Number(order.total)).catch(() => {})
  }

  return NextResponse.json({ received: true })
}
