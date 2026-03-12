import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { db } from '@/lib/db'
import { calculateShipping } from '@/lib/shipping'
import { DeliveryType } from '@/generated/prisma/client'
import { checkRateLimit, getClientIp } from '@/lib/rateLimit'

export async function POST(req: NextRequest) {
  try {
    if (!checkRateLimit(getClientIp(req), 10, 60_000)) {
      return NextResponse.json({ error: 'Too many requests.' }, { status: 429 })
    }

    const userId = req.cookies.get('replica_uid')?.value ?? null
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = await req.json()
    const { deliveryType } = body as { deliveryType: DeliveryType }
    if (!deliveryType) {
      return NextResponse.json({ error: 'deliveryType required' }, { status: 400 })
    }

    const cart = await db.cart.findUnique({
      where: { userId },
      select: { items: { select: { priceSnapshot: true, quantity: true } } },
    })
    if (!cart || cart.items.length === 0) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 })
    }

    const itemsSubtotal = cart.items.reduce(
      (s, i) => s + Number(i.priceSnapshot) * i.quantity,
      0,
    )
    const shippingPrice = await calculateShipping(itemsSubtotal, deliveryType)
    const total = parseFloat((itemsSubtotal + shippingPrice).toFixed(2))
    const amountCents = Math.round(total * 100)

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2026-02-25.clover',
    })

    const intent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'eur',
      // Explicit allowlist: card covers Apple Pay + Google Pay (wallet buttons)
      // Klarna, Bancontact, EPS, iDEAL, giropay etc. are excluded
      payment_method_types: ['card'],
      metadata: { userId },
    })

    return NextResponse.json({
      clientSecret: intent.client_secret,
      intentId: intent.id,
      total,
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
