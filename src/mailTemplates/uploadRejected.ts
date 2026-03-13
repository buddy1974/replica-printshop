// Legacy template — superseded by fileFixRequest.ts for per-item rejection.
// Kept for backward compatibility only.
import { emailWrap, sectionHeading, orderRef, infoBox, ctaButton } from './base'

export function uploadRejected(orderId: string, filename: string, appUrl: string): { subject: string; html: string } {
  const link = `${appUrl}/orders/${orderId}/upload`
  const body = `
    ${sectionHeading('File rejected — please re-upload')}
    <p style="margin:0 0 16px;font-size:14px">
      One of your uploaded files for order ${orderRef(orderId)} has been reviewed and cannot be used for printing.
    </p>
    ${infoBox(`<strong>File:</strong> ${filename}`, 'red')}
    <p style="margin:0 0 16px;font-size:14px">Please upload a corrected version.</p>
    ${ctaButton(link, 'Re-upload files →')}
  `
  return {
    subject: `File rejected — please re-upload — #${orderId.slice(0, 8).toUpperCase()}`,
    html: emailWrap(body),
  }
}
