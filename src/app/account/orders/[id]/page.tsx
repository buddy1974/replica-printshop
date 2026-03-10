import { notFound } from 'next/navigation'
import Link from 'next/link'
import Container from '@/components/Container'
import Badge from '@/components/Badge'
import ReorderButton from '@/components/ReorderButton'
import { db } from '@/lib/db'
import { orderStatusLabel } from '@/lib/statusLabel'

export const dynamic = 'force-dynamic'

const STATUS_MESSAGES: Record<string, { text: string; color: string }> = {
  CONFIRMED:     { text: 'Upload your print files to proceed.', color: 'text-blue-700 bg-blue-50 border-blue-200' },
  UPLOADED:      { text: 'Files received. Waiting for approval.', color: 'text-yellow-700 bg-yellow-50 border-yellow-200' },
  APPROVED:      { text: 'Order approved and queued for production.', color: 'text-green-700 bg-green-50 border-green-200' },
  IN_PRODUCTION: { text: 'Your order is currently in production.', color: 'text-purple-700 bg-purple-50 border-purple-200' },
  DONE:          { text: 'Order completed.', color: 'text-gray-700 bg-gray-50 border-gray-200' },
  CANCELLED:     { text: 'This order has been cancelled.', color: 'text-red-700 bg-red-50 border-red-200' },
}

function AddressBlock({ label, address }: {
  label: string
  address: { name: string; street: string; city: string; zip: string; country: string; company?: string | null; phone?: string | null } | null
}) {
  if (!address) return null
  return (
    <div>
      <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">{label}</p>
      <div className="text-sm text-gray-700 leading-relaxed">
        {address.company && <p>{address.company}</p>}
        <p>{address.name}</p>
        <p>{address.street}</p>
        <p>{address.zip} {address.city}</p>
        <p>{address.country}</p>
        {address.phone && <p className="text-gray-500">{address.phone}</p>}
      </div>
    </div>
  )
}

export default async function AccountOrderDetailPage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams: { userId?: string }
}) {
  const userId = searchParams.userId
  if (!userId) notFound()

  const order = await db.order.findUnique({
    where: { id: params.id },
    include: {
      shippingMethod: true,
      billingAddress: true,
      shippingAddress: true,
      items: {
        include: {
          uploadFiles: { orderBy: { uploadType: 'asc' } },
        },
      },
    },
  })

  if (!order || order.userId !== userId) notFound()

  const msg = STATUS_MESSAGES[order.status]

  // Resolve addresses — prefer linked Address record, fall back to inline fields
  const billing = order.billingAddress ?? (order.billingName ? {
    name: order.billingName,
    company: null,
    street: order.billingStreet ?? '',
    city: order.billingCity ?? '',
    zip: order.billingZip ?? '',
    country: order.billingCountry ?? '',
    phone: null,
  } : null)

  const shipping = order.shippingAddress ?? (order.shippingName ? {
    name: order.shippingName,
    company: null,
    street: order.shippingStreet ?? '',
    city: order.shippingCity ?? '',
    zip: order.shippingZip ?? '',
    country: order.shippingCountry ?? '',
    phone: null,
  } : null)

  const reorderItems = order.items.map((i) => ({
    productId: i.productId,
    variantId: i.variantId,
    width: Number(i.width),
    height: Number(i.height),
    quantity: i.quantity,
  }))

  return (
    <Container>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1>Order</h1>
        <span className="font-mono text-sm text-gray-400">{order.id.slice(0, 8)}</span>
        <Badge label={orderStatusLabel(order.status)} statusKey={order.status} />
      </div>

      {msg && (
        <div className={`mb-6 rounded border px-4 py-3 text-sm font-medium ${msg.color}`}>
          {msg.text}
        </div>
      )}

      {/* Order summary */}
      <div className="mb-6 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">Placed</p>
          <p className="font-medium">{new Date(order.createdAt).toLocaleDateString()}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">Delivery</p>
          <p className="font-medium">{order.shippingMethod?.name ?? order.deliveryType}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">Shipping</p>
          <p className="font-medium">€{Number(order.shippingPrice).toFixed(2)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">Total</p>
          <p className="font-medium">€{Number(order.total).toFixed(2)}</p>
        </div>
      </div>

      {/* Addresses */}
      {(billing || shipping) && (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <AddressBlock label="Billing address" address={billing} />
          <AddressBlock label="Shipping address" address={shipping} />
        </div>
      )}

      {/* Items */}
      <h2 className="mb-3">Items</h2>
      <div className="flex flex-col gap-3 mb-6">
        {order.items.map((item) => {
          const previews = item.uploadFiles.filter((u) => u.uploadType === 'PREVIEW')
          const artFiles = item.uploadFiles.filter((u) => u.uploadType !== 'PREVIEW')
          return (
            <div key={item.id} className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex justify-between items-start gap-4 mb-3">
                <div>
                  <p className="font-medium text-sm">{item.productName}</p>
                  {item.variantName && <p className="text-xs text-gray-500">{item.variantName}</p>}
                  <p className="text-xs text-gray-400 mt-0.5">
                    {Number(item.width)} × {Number(item.height)} cm &middot; Qty {item.quantity}
                  </p>
                </div>
                <p className="text-sm font-medium text-gray-700 shrink-0">
                  €{Number(item.priceSnapshot).toFixed(2)}
                </p>
              </div>

              {previews.map((u) => (
                <div key={u.id} className="mb-3">
                  <p className="text-xs text-gray-500 mb-1">Preview</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/api/admin/files/${u.id}`} alt="Preview" className="max-w-xs max-h-40 object-contain rounded-xl border border-gray-200" />
                </div>
              ))}

              {artFiles.length > 0 && (
                <div className="flex flex-col gap-1">
                  {artFiles.map((u) => (
                    <div key={u.id} className="flex items-center gap-2 text-xs">
                      <span className="text-gray-700 truncate max-w-[200px]">{u.filename}</span>
                      {u.uploadType && (
                        <span className="text-gray-400 bg-gray-100 rounded px-1">{u.uploadType}</span>
                      )}
                      <Badge label={u.status} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3 mb-6">
        {order.status === 'CONFIRMED' && (
          <Link
            href={`/orders/${order.id}/upload`}
            className="btn-primary"
          >
            Upload files
          </Link>
        )}
        <ReorderButton orderId={order.id} items={reorderItems} userId={userId} />
      </div>

      <Link href={`/account/orders?userId=${userId}`} className="text-sm text-gray-500 hover:text-gray-900">
        ← Back to my orders
      </Link>
    </Container>
  )
}
