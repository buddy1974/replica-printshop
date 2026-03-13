import { notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import Link from 'next/link'
import Container from '@/components/Container'
import Badge from '@/components/Badge'
import { db } from '@/lib/db'
import { orderStatusLabel } from '@/lib/statusLabel'

export const dynamic = 'force-dynamic'

const STATUS_MESSAGES: Record<string, { text: string; color: string }> = {
  CONFIRMED:    { text: 'Upload your print files to proceed.', color: 'text-blue-700 bg-blue-50 border-blue-200' },
  UPLOADED:     { text: 'Files received. Waiting for approval.', color: 'text-yellow-700 bg-yellow-50 border-yellow-200' },
  APPROVED:     { text: 'Order approved and queued for production.', color: 'text-green-700 bg-green-50 border-green-200' },
  READY:        { text: 'Ready for production.', color: 'text-green-700 bg-green-50 border-green-200' },
  IN_PRODUCTION: { text: 'Your order is currently in production.', color: 'text-purple-700 bg-purple-50 border-purple-200' },
  DONE:         { text: 'Order completed.', color: 'text-gray-700 bg-gray-50 border-gray-200' },
  CANCELLED:    { text: 'This order has been cancelled.', color: 'text-red-700 bg-red-50 border-red-200' },
}

export default async function OrderDetailPage({ params }: { params: { orderId: string } }) {
  const cookieStore = cookies()
  const viewerId = cookieStore.get('replica_uid')?.value ?? ''

  const order = await db.order.findUnique({
    where: { id: params.orderId },
    include: {
      items: {
        include: {
          uploadFiles: { orderBy: { uploadType: 'asc' } },
        },
      },
    },
  })
  if (!order) notFound()
  if (order.userId && order.userId !== viewerId) notFound()

  const msg = STATUS_MESSAGES[order.status]

  return (
    <Container>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div>
          <p className="text-xs text-gray-400 mb-0.5">Order</p>
          <div className="flex items-center gap-2">
            <h1 className="font-mono">{order.id.slice(0, 8)}</h1>
            <Badge label={orderStatusLabel(order.status)} statusKey={order.status} />
          </div>
        </div>
      </div>

      {/* Status message */}
      {msg && (
        <div className={`mb-6 rounded-xl border px-4 py-3 text-sm font-medium ${msg.color}`}>
          {msg.text}
          {order.status === 'CONFIRMED' && (
            <span className="ml-2">
              <Link href={`/orders/${order.id}/upload`} className="underline">Upload now →</Link>
            </span>
          )}
        </div>
      )}

      {/* Meta */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6 text-sm">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Delivery</p>
          <p className="font-medium text-gray-800">{order.deliveryType}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Total</p>
          <p className="font-bold text-gray-900">€{Number(order.total).toFixed(2)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Placed</p>
          <p className="font-medium text-gray-800">{new Date(order.createdAt).toLocaleDateString()}</p>
        </div>
      </div>

      {/* Items */}
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
        Items ({order.items.length})
      </p>
      <div className="flex flex-col gap-3 mb-6">
        {order.items.map((item) => {
          const previews = item.uploadFiles.filter((u) => u.uploadType === 'PREVIEW')
          const artFiles = item.uploadFiles.filter((u) => u.uploadType !== 'PREVIEW')
          return (
            <div key={item.id} className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="flex justify-between items-start gap-4 mb-3">
                <div>
                  <p className="font-medium text-gray-900">{item.productName}</p>
                  {item.variantName && <p className="text-xs text-gray-500 mt-0.5">{item.variantName}</p>}
                  <p className="text-xs text-gray-400 mt-0.5">
                    {Number(item.width)} × {Number(item.height)} cm · Qty {item.quantity}
                  </p>
                </div>
                <p className="text-sm font-semibold text-gray-900 shrink-0">
                  €{Number(item.priceSnapshot).toFixed(2)}
                </p>
              </div>

              {previews.map((u) => (
                <div key={u.id} className="mb-3">
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Preview</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/admin/files/${u.id}`}
                    alt="Preview"
                    loading="lazy"
                    className="max-w-xs rounded-lg border border-gray-200"
                  />
                </div>
              ))}

              {artFiles.length > 0 && (
                <div className="flex flex-col gap-1.5 mt-2">
                  {artFiles.map((u) => (
                    <div key={u.id} className="flex items-center gap-2 text-xs">
                      <span className="text-gray-700 truncate max-w-[200px]">{u.filename}</span>
                      {u.uploadType && (
                        <span className="text-gray-400 bg-gray-100 rounded-md px-1.5 py-0.5">{u.uploadType}</span>
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
      <div className="flex flex-wrap items-center gap-3">
        {order.status === 'CONFIRMED' && (
          <Link href={`/orders/${order.id}/upload`} className="btn-primary">
            Upload files →
          </Link>
        )}
        {order.paymentStatus === 'PAID' && (
          <a
            href={`/api/orders/${order.id}/invoice`}
            className="text-sm px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors font-medium"
          >
            Download invoice
          </a>
        )}
        <Link href="/orders" className="btn-ghost">
          ← Back to orders
        </Link>
      </div>
    </Container>
  )
}
