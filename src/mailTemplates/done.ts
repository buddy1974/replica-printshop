import { emailWrap, sectionHeading, orderRef, divider } from './base'

export function done(orderId: string): { subject: string; html: string } {
  const body = `
    ${sectionHeading('Order completed')}
    <p style="margin:0 0 16px;color:#555;font-size:14px">
      Order ${orderRef(orderId)} has been completed in production.
    </p>
    <p style="margin:0 0 16px;font-size:14px">
      We will be in touch shortly with pickup or shipping details.
    </p>
    ${divider}
    <p style="font-size:14px;color:#555;margin:0">Thank you for choosing Printshop.</p>
  `
  return {
    subject: `Order completed — #${orderId.slice(0, 8).toUpperCase()}`,
    html: emailWrap(body),
  }
}
