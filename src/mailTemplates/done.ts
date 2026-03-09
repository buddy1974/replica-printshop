export function done(orderId: string): { subject: string; html: string } {
  return {
    subject: `Your order is ready — #${orderId.slice(0, 8)}`,
    html: `
<div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111">
  <h2>Your order is ready</h2>
  <p>Order <code>#${orderId.slice(0, 8)}</code> has been completed in production.</p>
  <p>We will be in touch regarding pickup or shipping details.</p>
  <p style="font-size:13px;color:#555">Thank you for choosing us.</p>
</div>`,
  }
}
