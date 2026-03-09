import { sendMail } from '@/lib/mail'
import { orderCreated, type OrderCreatedData } from '@/mailTemplates/orderCreated'
import { uploadNeeded } from '@/mailTemplates/uploadNeeded'
import { uploadRejected } from '@/mailTemplates/uploadRejected'
import { approved } from '@/mailTemplates/approved'
import { done } from '@/mailTemplates/done'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? ''

// ---- Customer emails -------------------------------------------------------

export async function sendOrderConfirmed(orderId: string, userEmail: string, data?: OrderCreatedData) {
  if (data) {
    const { subject, html } = orderCreated(data)
    await sendMail(userEmail, subject, html)
  } else {
    await sendMail(userEmail, `Order received — #${orderId.slice(0, 8)}`, `<p>Your order <code>#${orderId.slice(0, 8)}</code> has been received.</p>`)
  }
}

export async function sendUploadNeeded(orderId: string, userEmail: string) {
  const { subject, html } = uploadNeeded(orderId, APP_URL)
  await sendMail(userEmail, subject, html)
}

export async function sendRejected(orderId: string, userEmail: string, filename: string) {
  const { subject, html } = uploadRejected(orderId, filename, APP_URL)
  await sendMail(userEmail, subject, html)
}

export async function sendApproved(orderId: string, userEmail: string) {
  const { subject, html } = approved(orderId)
  await sendMail(userEmail, subject, html)
}

export async function sendProductionStarted(orderId: string, userEmail: string) {
  await sendMail(
    userEmail,
    `Your order is in production — #${orderId.slice(0, 8)}`,
    `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111"><h2>In production</h2><p>Order <code>#${orderId.slice(0, 8)}</code> has started production. We'll notify you when it's done.</p></div>`,
  )
}

export async function sendDone(orderId: string, userEmail: string) {
  const { subject, html } = done(orderId)
  await sendMail(userEmail, subject, html)
}

// ---- Admin emails ----------------------------------------------------------

export async function sendAdminNewOrder(orderId: string, total: number) {
  if (!ADMIN_EMAIL) return
  await sendMail(
    ADMIN_EMAIL,
    `New order — #${orderId.slice(0, 8)}`,
    `<p>A new order has been placed: <strong>#${orderId.slice(0, 8)}</strong> — €${total.toFixed(2)}</p>`,
  )
}
