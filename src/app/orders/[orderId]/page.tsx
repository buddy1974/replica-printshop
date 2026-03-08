import { notFound } from 'next/navigation'
import Link from 'next/link'
import Container from '@/components/Container'
import Badge from '@/components/Badge'
import Button from '@/components/Button'
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

  const msg = STATUS_MESSAGES[order.status]

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

      <div className="mb-6 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">Delivery</p>
          <p className="font-medium">{order.deliveryType}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">Total</p>
          <p className="font-medium">€{Number(order.total).toFixed(2)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">Placed</p>
          <p className="font-medium">{new Date(order.createdAt).toLocaleDateString()}</p>
        </div>
      </div>

      <h2 className="mb-3">Items</h2>
      <div className="flex flex-col gap-3 mb-6">
        {order.items.map((item) => {
          const previews = item.uploadFiles.filter((u) => u.uploadType === 'PREVIEW')
          const artFiles = item.uploadFiles.filter((u) => u.uploadType !== 'PREVIEW')
          return (
            <div key={item.id} className="rounded border border-gray-200 bg-white p-4">
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
                  <img src={`/api/admin/files/${u.id}`} alt="Preview" className="max-w-xs rounded border border-gray-200" />
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

      {order.status === 'CONFIRMED' && (
        <Link href={`/orders/${order.id}/upload`}>
          <Button>Upload files</Button>
        </Link>
      )}

      <div className="mt-6">
        <Link href="/orders" className="text-sm text-gray-500 hover:text-gray-900">← Back to orders</Link>
      </div>
    </Container>
  )
}
