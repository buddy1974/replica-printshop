import { emailWrap, sectionHeading, orderRef, divider } from './base'

export function approved(orderId: string): { subject: string; html: string } {
  const body = `
    ${sectionHeading('Files approved')}
    <p style="margin:0 0 16px;color:#555;font-size:14px">
      Great news! Your files for order ${orderRef(orderId)} have been reviewed and approved.
    </p>
    <p style="margin:0 0 16px;font-size:14px">
      Your order is now queued for production. We will notify you when it is ready for pickup or shipping.
    </p>
    ${divider}
    <p style="font-size:14px;color:#555;margin:0">Thank you for your patience.</p>
  `
  return {
    subject: `Files approved — order #${orderId.slice(0, 8).toUpperCase()} is in the queue`,
    html: emailWrap(body),
  }
}
