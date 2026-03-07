import Stripe from 'stripe'
import { db } from '@/lib/db'
import { ValidationError } from '@/lib/errors'

export async function createCheckoutSession(orderId: string) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2026-02-25.clover',
  })

  const APP_URL = process.env.APP_URL ?? 'http://localhost:3000'
  const order = await db.order.findUniqueOrThrow({
    where: { id: orderId },
    include: { items: true },
  })

  if (order.paymentStatus === 'PAID') {
    throw new ValidationError('Order has already been paid — cannot create a new checkout session')
  }

  const itemsSubtotal = parseFloat(order.total.toString()) - parseFloat(order.shippingPrice.toString())
  const shippingCents = Math.round(parseFloat(order.shippingPrice.toString()) * 100)
  const itemsCents = Math.round(itemsSubtotal * 100)

  const deliveryLabel =
    order.deliveryType === 'EXPRESS' ? 'Express delivery' :
    order.deliveryType === 'PICKUP' ? 'Store pickup' :
    'Standard delivery'

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    currency: 'eur',
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: 'eur',
          unit_amount: itemsCents,
          product_data: {
            name: 'Print order',
            metadata: { orderId },
          },
        },
      },
      {
        quantity: 1,
        price_data: {
          currency: 'eur',
          unit_amount: shippingCents,
          product_data: {
            name: deliveryLabel,
          },
        },
      },
    ],
    metadata: { orderId },
    success_url: `${APP_URL}/orders/${orderId}?payment=success`,
    cancel_url: `${APP_URL}/orders/${orderId}?payment=cancelled`,
  })

  return { url: session.url, sessionId: session.id }
}
