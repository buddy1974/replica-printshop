import { sendMail } from '@/lib/mail'
import { db } from '@/lib/db'
import { orderCreated, type OrderCreatedData } from '@/mailTemplates/orderCreated'
import { paymentSuccess } from '@/mailTemplates/paymentSuccess'
import { uploadNeeded } from '@/mailTemplates/uploadNeeded'
import { uploadRejected } from '@/mailTemplates/uploadRejected'
import { fileFixRequest } from '@/mailTemplates/fileFixRequest'
import { fileApproved } from '@/mailTemplates/fileApproved'
import { approved } from '@/mailTemplates/approved'
import { orderReady } from '@/mailTemplates/orderReady'
import { done } from '@/mailTemplates/done'

const APP_URL = process.env.APP_URL ?? 'http://localhost:3000'
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? ''

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Fetch order data for rich email templates */
async function fetchOrderData(orderId: string): Promise<OrderCreatedData | null> {
  const order = await db.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      total: true,
      deliveryType: true,
      items: {
        select: {
          productName: true,
          quantity: true,
          width: true,
          height: true,
          priceSnapshot: true,
        },
      },
    },
  })
  if (!order) return null
  return {
    orderId: order.id,
    items: order.items.map((i) => ({
      productName: i.productName,
      quantity: i.quantity,
      width: Number(i.width),
      height: Number(i.height),
      priceSnapshot: Number(i.priceSnapshot),
    })),
    total: Number(order.total),
    deliveryType: order.deliveryType,
  }
}

// ── Customer emails ──────────────────────────────────────────────────────────

/** Order received (sent after order creation, with or without full data) */
export async function sendOrderConfirmed(orderId: string, userEmail: string, data?: OrderCreatedData) {
  const d = data ?? await fetchOrderData(orderId)
  if (d) {
    const { subject, html } = orderCreated(d)
    await sendMail(userEmail, subject, html)
  } else {
    await sendMail(
      userEmail,
      `Order received — #${orderId.slice(0, 8).toUpperCase()}`,
      `<p>Your order <strong>#${orderId.slice(0, 8).toUpperCase()}</strong> has been received.</p>`,
    )
  }
}

/** Payment confirmed (sent from Stripe webhook) */
export async function sendPaymentSuccess(orderId: string, userEmail: string) {
  const d = await fetchOrderData(orderId)
  if (d) {
    const { subject, html } = paymentSuccess(d)
    await sendMail(userEmail, subject, html)
  } else {
    await sendMail(
      userEmail,
      `Payment confirmed — #${orderId.slice(0, 8).toUpperCase()}`,
      `<p>Your payment for order <strong>#${orderId.slice(0, 8).toUpperCase()}</strong> has been confirmed.</p>`,
    )
  }
}

/** Upload link (sent when order requires customer artwork) */
export async function sendUploadNeeded(orderId: string, userEmail: string) {
  const { subject, html } = uploadNeeded(orderId, APP_URL)
  await sendMail(userEmail, subject, html)
}

/** File fix request (per-item rejection or needs-fix with optional message) */
export async function sendFileFixRequest(
  orderId: string,
  itemId: string,
  userEmail: string,
  filename: string,
  reason: 'REJECTED' | 'NEEDS_FIX',
  adminMessage?: string | null,
) {
  const { subject, html } = fileFixRequest(orderId, filename, reason, itemId, APP_URL, adminMessage)
  await sendMail(userEmail, subject, html)
}

/** Individual file approved (optional — send when file status set to APPROVED) */
export async function sendFileApproved(orderId: string, userEmail: string, filename: string) {
  const { subject, html } = fileApproved(orderId, filename)
  await sendMail(userEmail, subject, html)
}

/** All files approved + order queued for production */
export async function sendApproved(orderId: string, userEmail: string) {
  const { subject, html } = approved(orderId)
  await sendMail(userEmail, subject, html)
}

/** Order in production (status → IN_PRODUCTION) */
export async function sendProductionStarted(orderId: string, userEmail: string) {
  await sendMail(
    userEmail,
    `Your order is now in production — #${orderId.slice(0, 8).toUpperCase()}`,
    `<p>Order <strong>#${orderId.slice(0, 8).toUpperCase()}</strong> has started production. We will notify you when it is ready.</p>`,
  )
}

/** Order ready for pickup / shipping (status → READY) */
export async function sendOrderReady(orderId: string, userEmail: string) {
  const { subject, html } = orderReady(orderId)
  await sendMail(userEmail, subject, html)
}

/** Order completed / done */
export async function sendDone(orderId: string, userEmail: string) {
  const { subject, html } = done(orderId)
  await sendMail(userEmail, subject, html)
}

// ── Legacy ───────────────────────────────────────────────────────────────────

/** @deprecated Use sendFileFixRequest instead */
export async function sendRejected(orderId: string, userEmail: string, filename: string) {
  const { subject, html } = uploadRejected(orderId, filename, APP_URL)
  await sendMail(userEmail, subject, html)
}

// ── Admin emails ─────────────────────────────────────────────────────────────

export async function sendAdminNewOrder(orderId: string, total: number) {
  if (!ADMIN_EMAIL) return
  await sendMail(
    ADMIN_EMAIL,
    `New order — #${orderId.slice(0, 8).toUpperCase()}`,
    `<p>A new order has been placed: <strong>#${orderId.slice(0, 8).toUpperCase()}</strong> — €${total.toFixed(2)}</p>`,
  )
}
