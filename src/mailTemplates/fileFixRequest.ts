export function fileFixRequest(
  orderId: string,
  filename: string,
  reason: 'REJECTED' | 'NEEDS_FIX',
  itemId: string,
  appUrl: string,
  adminMessage?: string | null,
): { subject: string; html: string } {
  const short = orderId.slice(0, 8).toUpperCase()
  const link = `${appUrl}/upload-fix/${orderId}/${itemId}`

  const heading = reason === 'REJECTED'
    ? 'File rejected — please re-upload'
    : 'File needs changes — please re-upload'

  const intro = reason === 'REJECTED'
    ? `Your file for order <code>#${short}</code> was reviewed and cannot be used for printing.`
    : `Your file for order <code>#${short}</code> needs to be corrected before we can proceed.`

  const messageBlock = adminMessage
    ? `<div style="margin:16px 0;padding:12px 16px;background:#fff8e6;border-left:4px solid #f59e0b;border-radius:2px;font-size:14px;color:#92400e">
        <strong>Message from our team:</strong><br/>${adminMessage}
      </div>`
    : ''

  return {
    subject: `Action required: ${heading} — #${short}`,
    html: `
<div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111">
  <h2 style="margin-top:0">${heading}</h2>
  <p>${intro}</p>
  <p style="padding:10px 14px;background:#f5f5f5;border-left:4px solid #ccc;border-radius:2px;font-size:14px">
    <strong>File:</strong> ${filename}
  </p>
  ${messageBlock}
  <p>Please upload a corrected version using the link below.</p>
  <p>
    <a href="${link}" style="display:inline-block;padding:10px 20px;background:#111;color:#fff;text-decoration:none;border-radius:4px;font-size:14px;font-weight:600">
      Re-upload file →
    </a>
  </p>
  <p style="font-size:12px;color:#888;margin-top:24px">
    Or copy this link:<br/>
    <a href="${link}" style="color:#888">${link}</a>
  </p>
</div>`,
  }
}
