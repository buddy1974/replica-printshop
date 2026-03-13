import { emailWrap, sectionHeading, orderRef, divider } from './base'

export function orderReady(orderId: string): { subject: string; html: string } {
  const body = `
    ${sectionHeading('Your order is ready')}
    <p style="margin:0 0 16px;font-size:14px">
      Order ${orderRef(orderId)} has been completed in production and is ready for pickup or shipping.
    </p>
    <p style="margin:0 0 16px;font-size:14px">
      We will contact you shortly with the next steps — either pickup instructions or tracking details.
    </p>
    ${divider}
    <p style="font-size:14px;color:#555;margin:0">Thank you for choosing Printshop.</p>
  `
  return {
    subject: `Your order is ready — #${orderId.slice(0, 8).toUpperCase()}`,
    html: emailWrap(body),
  }
}
