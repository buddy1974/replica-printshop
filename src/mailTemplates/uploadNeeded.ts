import { emailWrap, sectionHeading, orderRef, ctaButton, divider } from './base'

export function uploadNeeded(orderId: string, appUrl: string): { subject: string; html: string } {
  const link = `${appUrl}/orders/${orderId}/upload`
  const body = `
    ${sectionHeading('Please upload your print files')}
    <p style="margin:0 0 16px;font-size:14px">
      Your order ${orderRef(orderId)} is confirmed and waiting for your artwork files before we can begin production.
    </p>
    ${ctaButton(link, 'Upload files →')}
    ${divider}
    <p style="font-size:13px;color:#888;margin:0">
      Once your files are uploaded, our team will review them and confirm they meet our quality standards.
    </p>
  `
  return {
    subject: `Action required: upload your print files — #${orderId.slice(0, 8).toUpperCase()}`,
    html: emailWrap(body),
  }
}
