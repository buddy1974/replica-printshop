export function uploadNeeded(orderId: string, appUrl: string): { subject: string; html: string } {
  const link = `${appUrl}/orders/${orderId}/upload`
  return {
    subject: `Action required: upload your print files — #${orderId.slice(0, 8)}`,
    html: `
<div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111">
  <h2>Please upload your print files</h2>
  <p>Your order <code>#${orderId.slice(0, 8)}</code> is confirmed and waiting for your artwork.</p>
  <p>
    <a href="${link}" style="display:inline-block;padding:10px 20px;background:#111;color:#fff;text-decoration:none;border-radius:4px;font-size:14px">
      Upload files
    </a>
  </p>
  <p style="font-size:13px;color:#555">
    Or copy this link:<br/>
    <a href="${link}" style="color:#555">${link}</a>
  </p>
</div>`,
  }
}
