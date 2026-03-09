export function approved(orderId: string): { subject: string; html: string } {
  return {
    subject: `Order approved and queued for production — #${orderId.slice(0, 8)}`,
    html: `
<div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111">
  <h2>Order approved</h2>
  <p>Great news! Your order <code>#${orderId.slice(0, 8)}</code> has been reviewed and approved.</p>
  <p>It is now queued for production. We will notify you when it is ready.</p>
  <p style="font-size:13px;color:#555">Thank you for your order.</p>
</div>`,
  }
}
