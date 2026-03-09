export interface OrderCreatedData {
  orderId: string
  items: { productName: string; quantity: number; width: number; height: number; priceSnapshot: number }[]
  total: number
}

export function orderCreated({ orderId, items, total }: OrderCreatedData): { subject: string; html: string } {
  const rows = items
    .map(
      (i) =>
        `<tr>
          <td style="padding:6px 12px;border-bottom:1px solid #eee">${i.productName}</td>
          <td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:center">${i.quantity}</td>
          <td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:center">${i.width}×${i.height} cm</td>
          <td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right">€${i.priceSnapshot.toFixed(2)}</td>
        </tr>`
    )
    .join('')

  return {
    subject: `Order received — #${orderId.slice(0, 8)}`,
    html: `
<div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111">
  <h2 style="margin-bottom:4px">Order received</h2>
  <p style="color:#666;margin-top:0">Order <code>#${orderId.slice(0, 8)}</code></p>

  <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px">
    <thead>
      <tr style="background:#f5f5f5">
        <th style="padding:6px 12px;text-align:left;font-weight:600">Product</th>
        <th style="padding:6px 12px;text-align:center;font-weight:600">Qty</th>
        <th style="padding:6px 12px;text-align:center;font-weight:600">Size</th>
        <th style="padding:6px 12px;text-align:right;font-weight:600">Price</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
    <tfoot>
      <tr>
        <td colspan="3" style="padding:8px 12px;text-align:right;font-weight:600">Total</td>
        <td style="padding:8px 12px;text-align:right;font-weight:700">€${total.toFixed(2)}</td>
      </tr>
    </tfoot>
  </table>

  <p style="font-size:13px;color:#555">We will send you another email when your order moves to the next step.</p>
</div>`,
  }
}
