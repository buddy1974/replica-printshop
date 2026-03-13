import { emailWrap, sectionHeading, orderRef, divider } from './base'

export interface PaymentSuccessData {
  orderId: string
  items: { productName: string; quantity: number; width: number; height: number; priceSnapshot: number }[]
  total: number
  deliveryType?: string
}

export function paymentSuccess({ orderId, items, total, deliveryType }: PaymentSuccessData): { subject: string; html: string } {
  const rows = items
    .map(
      (i) =>
        `<tr>
          <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-size:14px">${i.productName}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-size:14px;text-align:center;color:#555">${i.width}×${i.height} cm</td>
          <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-size:14px;text-align:center;color:#555">×${i.quantity}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-size:14px;text-align:right;font-weight:600">€${(i.priceSnapshot * i.quantity).toFixed(2)}</td>
        </tr>`,
    )
    .join('')

  const deliveryLabel = deliveryType === 'EXPRESS' ? 'Express (1–2 business days)'
    : deliveryType === 'PICKUP' ? 'Pickup in store'
    : 'Standard (3–5 business days)'

  const body = `
    ${sectionHeading('Payment confirmed')}
    <p style="margin:0 0 8px;color:#555;font-size:14px">
      Your payment has been confirmed and order ${orderRef(orderId)} is now being processed.
    </p>
    <p style="margin:0 0 24px;font-size:13px;color:#888">
      You will receive a separate email with upload instructions if artwork is required.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #eee;border-radius:6px;overflow:hidden;font-size:14px;margin-bottom:8px">
      <thead>
        <tr style="background:#f7f7f7">
          <th style="padding:8px 12px;text-align:left;font-weight:600;font-size:12px;text-transform:uppercase;color:#888;letter-spacing:0.5px">Product</th>
          <th style="padding:8px 12px;text-align:center;font-weight:600;font-size:12px;text-transform:uppercase;color:#888;letter-spacing:0.5px">Size</th>
          <th style="padding:8px 12px;text-align:center;font-weight:600;font-size:12px;text-transform:uppercase;color:#888;letter-spacing:0.5px">Qty</th>
          <th style="padding:8px 12px;text-align:right;font-weight:600;font-size:12px;text-transform:uppercase;color:#888;letter-spacing:0.5px">Price</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
      <tfoot>
        <tr style="background:#f7f7f7">
          <td colspan="3" style="padding:10px 12px;font-weight:700;font-size:15px">Total paid</td>
          <td style="padding:10px 12px;font-weight:800;font-size:15px;text-align:right">€${total.toFixed(2)}</td>
        </tr>
      </tfoot>
    </table>
    <p style="font-size:13px;color:#888;margin:4px 0 0">Delivery: ${deliveryLabel}</p>

    ${divider}
    <p style="font-size:14px;color:#555;margin:0">
      We will keep you updated at every step. Thank you for your order!
    </p>
  `

  return {
    subject: `Payment confirmed — order #${orderId.slice(0, 8).toUpperCase()}`,
    html: emailWrap(body),
  }
}
