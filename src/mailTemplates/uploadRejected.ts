export function uploadRejected(orderId: string, filename: string, appUrl: string): { subject: string; html: string } {
  const link = `${appUrl}/orders/${orderId}/upload`
  return {
    subject: `File rejected — please re-upload — #${orderId.slice(0, 8)}`,
    html: `
<div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111">
  <h2>A file was rejected</h2>
  <p>One of your uploaded files for order <code>#${orderId.slice(0, 8)}</code> has been reviewed and rejected.</p>
  <p style="padding:10px 14px;background:#fff3f3;border-left:4px solid #e00;border-radius:2px;font-size:14px">
    <strong>File:</strong> ${filename}
  </p>
  <p>Please re-upload a corrected version.</p>
  <p>
    <a href="${link}" style="display:inline-block;padding:10px 20px;background:#111;color:#fff;text-decoration:none;border-radius:4px;font-size:14px">
      Re-upload files
    </a>
  </p>
</div>`,
  }
}
