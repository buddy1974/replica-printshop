import { emailWrap, sectionHeading, orderRef, infoBox, ctaButton, divider } from './base'

export function fileFixRequest(
  orderId: string,
  filename: string,
  reason: 'REJECTED' | 'NEEDS_FIX',
  itemId: string,
  appUrl: string,
  adminMessage?: string | null,
): { subject: string; html: string } {
  const link = `${appUrl}/upload-fix/${orderId}/${itemId}`

  const isRejected = reason === 'REJECTED'
  const heading = isRejected ? 'File rejected — action required' : 'File needs changes — action required'
  const intro = isRejected
    ? `Your uploaded file for order ${orderRef(orderId)} was reviewed and cannot be used for printing as-is.`
    : `Your uploaded file for order ${orderRef(orderId)} needs to be corrected before we can proceed with printing.`

  const messageBlock = adminMessage
    ? infoBox(`<strong>Message from our team:</strong><br/>${adminMessage}`, 'orange')
    : ''

  const body = `
    ${sectionHeading(heading)}
    <p style="margin:0 0 16px;font-size:14px">${intro}</p>
    ${infoBox(`<strong>File:</strong> ${filename}`, isRejected ? 'red' : 'orange')}
    ${messageBlock}
    <p style="margin:0 0 16px;font-size:14px">Please upload a corrected version using the link below.</p>
    ${ctaButton(link, 'Re-upload file →')}
    ${divider}
    <p style="font-size:13px;color:#888;margin:0">
      Once you upload the corrected file, our team will review it again and confirm before starting production.
    </p>
  `

  return {
    subject: `Action required: ${isRejected ? 'file rejected' : 'file needs changes'} — #${orderId.slice(0, 8).toUpperCase()}`,
    html: emailWrap(body),
  }
}
