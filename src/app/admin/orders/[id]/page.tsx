'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Badge from '@/components/Badge'
import Container from '@/components/Container'
import { orderStatusLabel } from '@/lib/statusLabel'

interface Upload {
  id: string
  filename: string
  status: string
  uploadType: string | null
  dpi: number | null
  widthPx: number | null
  heightPx: number | null
  size: number | null
  filePath: string | null
}

interface Item {
  id: string
  productName: string
  variantName: string | null
  width: number
  height: number
  quantity: number
  priceSnapshot: number
  uploadFiles: Upload[]
}

interface Order {
  id: string
  status: string
  paymentStatus: string
  deliveryType: string
  total: number
  createdAt: string
  user?: { email: string; name: string | null } | null
  items: Item[]
}

export default function AdminOrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [order, setOrder] = useState<Order | null>(null)
  const [fileStatuses, setFileStatuses] = useState<Record<string, string>>({})
  const [fetchError, setFetchError] = useState(false)

  useEffect(() => {
    fetch(`/api/orders/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error('Failed to load order')
        return r.json()
      })
      .then((o: Order) => {
        setOrder(o)
        const statuses: Record<string, string> = {}
        for (const item of o.items) {
          for (const f of item.uploadFiles) statuses[f.id] = f.status
        }
        setFileStatuses(statuses)
      })
      .catch(() => setFetchError(true))
  }, [id])

  const setFileStatus = async (fileId: string, status: string) => {
    const res = await fetch(`/api/upload/${fileId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (res.ok) setFileStatuses((prev) => ({ ...prev, [fileId]: status }))
  }

  if (fetchError) {
    return (
      <Container>
        <div className="rounded-xl border border-red-200 bg-red-50 p-6">
          <p className="text-sm font-semibold text-red-800">Could not load this order</p>
          <p className="mt-1 text-sm text-red-600">Something went wrong. Please try again.</p>
          <div className="mt-4">
            <Link href="/admin/orders" className="btn-primary">← Back to orders</Link>
          </div>
        </div>
      </Container>
    )
  }

  if (!order) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <Container>
      {/* Page header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-xs text-gray-400 mb-1">Order</p>
          <h1 className="text-2xl font-bold font-mono tracking-tight">{order.id.slice(0, 8)}</h1>
        </div>
        <Link href="/admin/orders" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
          ← Orders
        </Link>
      </div>

      {/* Meta row */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-4">
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Status</p>
          <Badge label={orderStatusLabel(order.status)} statusKey={order.status} />
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Payment</p>
          <Badge label={order.paymentStatus} />
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Delivery</p>
          <p className="text-sm font-medium text-gray-800">{order.deliveryType}</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Total</p>
          <p className="text-sm font-bold text-gray-900">€{Number(order.total).toFixed(2)}</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Date</p>
          <p className="text-sm text-gray-700">{new Date(order.createdAt).toLocaleDateString()}</p>
        </div>
      </div>

      {/* Customer */}
      {order.user && (
        <div className="rounded-xl border border-gray-200 bg-white px-5 py-4 mb-6">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Customer</p>
          <p className="text-sm font-medium text-gray-900">{order.user.name ?? order.user.email}</p>
          {order.user.name && <p className="text-xs text-gray-500 mt-0.5">{order.user.email}</p>}
        </div>
      )}

      {/* Items */}
      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
        Items ({order.items.length})
      </h2>

      {order.items.length === 0 ? (
        <p className="text-sm text-gray-400 italic">No items in this order.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {order.items.map((item) => {
            const previews = item.uploadFiles.filter((f) => f.uploadType === 'PREVIEW')
            const artFiles = item.uploadFiles.filter((f) => f.uploadType !== 'PREVIEW')
            return (
              <div key={item.id} className="rounded-xl border border-gray-200 bg-white p-5">
                <p className="font-semibold text-gray-900 mb-0.5">
                  {item.productName}{item.variantName ? ` — ${item.variantName}` : ''}
                </p>
                <p className="text-xs text-gray-500 mb-4">
                  {Number(item.width)} × {Number(item.height)} cm &middot; Qty {item.quantity} &middot; €{Number(item.priceSnapshot).toFixed(2)}
                </p>

                {previews.map((f) => (
                  <div key={f.id} className="mb-4">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Preview</p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/admin/files/${f.id}`}
                      alt="Preview"
                      loading="lazy"
                      className="max-w-[200px] rounded-lg border border-gray-200"
                    />
                  </div>
                ))}

                {item.uploadFiles.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">No files uploaded yet.</p>
                ) : artFiles.length === 0 ? null : (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Uploaded files</p>
                    <div className="overflow-x-auto rounded-lg border border-gray-200">
                      <table className="w-full">
                        <thead className="border-b border-gray-200 bg-gray-50">
                          <tr>
                            {['File', 'Type', 'DPI', 'W px', 'H px', 'Size', 'Status', ''].map((h) => (
                              <th key={h} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {artFiles.map((f) => {
                            const currentStatus = fileStatuses[f.id] ?? f.status
                            return (
                              <tr key={f.id} className="hover:bg-gray-50">
                                <td className="px-3 py-2.5 font-mono text-xs">
                                  {f.filePath ? (
                                    <a href={`/api/admin/files/${f.id}`} className="text-blue-600 hover:underline">{f.filename}</a>
                                  ) : f.filename}
                                </td>
                                <td className="px-3 py-2.5 text-xs text-gray-500">{f.uploadType ?? '—'}</td>
                                <td className="px-3 py-2.5 text-xs">{f.dpi ?? '—'}</td>
                                <td className="px-3 py-2.5 text-xs">{f.widthPx ?? '—'}</td>
                                <td className="px-3 py-2.5 text-xs">{f.heightPx ?? '—'}</td>
                                <td className="px-3 py-2.5 text-xs">{f.size ? `${(f.size / 1024).toFixed(0)} KB` : '—'}</td>
                                <td className="px-3 py-2.5"><Badge label={currentStatus} /></td>
                                <td className="px-3 py-2.5">
                                  <div className="flex gap-1.5">
                                    <button
                                      onClick={() => setFileStatus(f.id, 'APPROVED')}
                                      disabled={currentStatus === 'APPROVED'}
                                      className={[
                                        'text-[11px] px-2 py-1 rounded border font-medium transition-colors',
                                        currentStatus === 'APPROVED'
                                          ? 'border-green-600 bg-green-600 text-white cursor-default'
                                          : 'border-green-600 text-green-700 hover:bg-green-50',
                                      ].join(' ')}
                                    >
                                      Approve
                                    </button>
                                    <button
                                      onClick={() => setFileStatus(f.id, 'REJECTED')}
                                      disabled={currentStatus === 'REJECTED'}
                                      className={[
                                        'text-[11px] px-2 py-1 rounded border font-medium transition-colors',
                                        currentStatus === 'REJECTED'
                                          ? 'border-red-600 bg-red-600 text-white cursor-default'
                                          : 'border-red-600 text-red-700 hover:bg-red-50',
                                      ].join(' ')}
                                    >
                                      Reject
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </Container>
  )
}
