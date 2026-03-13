import { emailWrap, sectionHeading, orderRef, infoBox, divider } from './base'

export function fileApproved(orderId: string, filename: string): { subject: string; html: string } {
  const body = `
    ${sectionHeading('File approved')}
    <p style="margin:0 0 16px;font-size:14px">
      Your file for order ${orderRef(orderId)} has been reviewed and approved for printing.
    </p>
    ${infoBox(`<strong>File:</strong> ${filename}`, 'green')}
    <p style="margin:0 0 16px;font-size:14px">
      Your order will proceed to production. We will notify you when it is ready.
    </p>
    ${divider}
    <p style="font-size:14px;color:#555;margin:0">Thank you for your patience.</p>
  `
  return {
    subject: `File approved — order #${orderId.slice(0, 8).toUpperCase()} proceeds to production`,
    html: emailWrap(body),
  }
}
