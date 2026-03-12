import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export default async function OrderSuccessPage({
  searchParams,
}: {
  searchParams: { order?: string }
}) {
  const orderId = searchParams.order
  if (!orderId) notFound()

  const userId = cookies().get('replica_uid')?.value ?? null

  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  })
  if (!order) notFound()
  // Guest orders (userId null) are accessible to anyone with the link
  if (order.userId && order.userId !== userId) notFound()

  const itemsSubtotal = order.items.reduce(
    (s, i) => s + Number(i.priceSnapshot) * i.quantity,
    0,
  )

  const deliveryLabel =
    order.deliveryType === 'EXPRESS' ? 'Express shipping' :
    order.deliveryType === 'PICKUP' ? 'In-store pickup' :
    'Standard shipping'

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-xl mx-auto px-4 py-12">

        {/* Success header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Order confirmed!</h1>
          <p className="text-sm text-gray-500 mt-1">
            Thank you — we&apos;ve received your order and will start processing it shortly.
          </p>
        </div>

        {/* Order card */}
        <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">

          {/* Order number */}
          <div className="px-5 py-4 flex items-center justify-between text-sm">
            <span className="text-gray-400">Order number</span>
            <span className="font-mono font-medium text-gray-900">{order.id.slice(0, 8).toUpperCase()}</span>
          </div>

          {/* Items */}
          <div className="px-5 py-4 space-y-3">
            {order.items.map(item => (
              <div key={item.id} className="flex items-start justify-between text-sm gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{item.productName}</p>
                  {item.variantName && (
                    <p className="text-xs text-gray-400">{item.variantName}</p>
                  )}
                  {(Number(item.width) > 0 && Number(item.height) > 0) && (
                    <p className="text-xs text-gray-400">{Number(item.width)} × {Number(item.height)} cm</p>
                  )}
                  <p className="text-xs text-gray-400">Qty {item.quantity}</p>
                </div>
                <span className="font-medium text-gray-900 shrink-0">
                  €{(Number(item.priceSnapshot) * item.quantity).toFixed(2)}
                </span>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="px-5 py-4 space-y-1.5 text-sm">
            <div className="flex justify-between text-gray-500">
              <span>Subtotal</span>
              <span>€{itemsSubtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>{deliveryLabel}</span>
              <span>
                {Number(order.shippingPrice) === 0 ? 'Free' : `€${Number(order.shippingPrice).toFixed(2)}`}
              </span>
            </div>
            <div className="flex justify-between font-bold text-gray-900 text-base pt-1 border-t border-gray-100 mt-1">
              <span>Total paid</span>
              <span>€{Number(order.total).toFixed(2)}</span>
            </div>
          </div>

          {/* Delivery address */}
          {order.shippingName && (
            <div className="px-5 py-4 text-sm">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">
                {order.deliveryType === 'PICKUP' ? 'Billing address' : 'Delivery address'}
              </p>
              <p className="text-gray-700">{order.shippingName}</p>
              {order.shippingStreet && <p className="text-gray-500">{order.shippingStreet}</p>}
              {(order.shippingZip || order.shippingCity) && (
                <p className="text-gray-500">
                  {[order.shippingZip, order.shippingCity].filter(Boolean).join(' ')}
                  {order.shippingCountry ? `, ${order.shippingCountry}` : ''}
                </p>
              )}
            </div>
          )}
        </div>

        {/* What's next */}
        <div className="mt-5 bg-blue-50 border border-blue-200 rounded-xl px-5 py-4 text-sm text-blue-800">
          <p className="font-medium mb-1">What happens next?</p>
          <p className="text-blue-600">
            {order.deliveryType === 'PICKUP'
              ? 'We will contact you when your order is ready for pickup.'
              : 'You will receive an email to upload your print files. Your order enters production once files are approved.'}
          </p>
        </div>

        {/* Actions */}
        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <Link
            href={`/orders/${order.id}`}
            className="flex-1 text-center py-2.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            View order details →
          </Link>
          <Link
            href="/shop"
            className="flex-1 text-center py-2.5 rounded-lg bg-red-600 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
          >
            Continue shopping
          </Link>
        </div>

      </div>
    </div>
  )
}
