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
  designId: string | null
  previewUrl: string | null
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
  shippingPrice: number
  stripePaymentIntentId: string | null
  billingName: string | null
  billingStreet: string | null
  billingCity: string | null
  billingZip: string | null
  billingCountry: string | null
  shippingName: string | null
  shippingStreet: string | null
  shippingCity: string | null
  shippingZip: string | null
  shippingCountry: string | null
  createdAt: string
  user?: { email: string; name: string | null } | null
  shippingMethod?: { name: string } | null
  items: Item[]
}

// Contextual action buttons per status
const STATUS_ACTIONS: Record<string, { label: string; toStatus: string; variant: 'primary' | 'danger' | 'neutral' }[]> = {
  PENDING:       [{ label: 'Confirm Order', toStatus: 'CONFIRMED', variant: 'primary' }, { label: 'Cancel', toStatus: 'CANCELLED', variant: 'danger' }],
  CONFIRMED:     [{ label: 'Cancel', toStatus: 'CANCELLED', variant: 'danger' }],
  UPLOADED:      [{ label: 'Cancel', toStatus: 'CANCELLED', variant: 'danger' }],
  APPROVED:      [{ label: 'Cancel', toStatus: 'CANCELLED', variant: 'danger' }],
  READY:         [{ label: 'Start Production', toStatus: 'IN_PRODUCTION', variant: 'primary' }, { label: 'Cancel', toStatus: 'CANCELLED', variant: 'danger' }],
  IN_PRODUCTION: [{ label: 'Mark Done', toStatus: 'DONE', variant: 'primary' }, { label: 'Cancel', toStatus: 'CANCELLED', variant: 'danger' }],
  DONE:          [],
  CANCELLED:     [],
}

export default function AdminOrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [order, setOrder] = useState<Order | null>(null)
  const [fileStatuses, setFileStatuses] = useState<Record<string, string>>({})
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
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

  const patchOrder = async (body: { status?: string; paymentStatus?: string }) => {
    setActionLoading(true)
    setActionError(null)
    const res = await fetch(`/api/admin/orders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    setActionLoading(false)
    if (!res.ok) {
      setActionError(data.error ?? 'Failed to update order')
    } else {
      setOrder((prev) => prev ? { ...prev, status: data.status, paymentStatus: data.paymentStatus } : prev)
    }
  }

  const approveOrder = async () => {
    setActionLoading(true)
    setActionError(null)
    const res = await fetch(`/api/admin/orders/${id}/approve`, { method: 'POST' })
    const data = await res.json()
    setActionLoading(false)
    if (!res.ok) {
      setActionError(data.error ?? 'Approval failed')
    } else {
      setOrder((prev) => prev ? { ...prev, status: data.status ?? prev.status } : prev)
    }
  }

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
        <div className="w-8 h-8 border-4 border-gray-200 border-t-red-600 rounded-full animate-spin" />
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
      <div className="rounded-xl border border-gray-200 bg-white p-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-4">
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
          {order.shippingMethod && (
            <p className="text-xs text-gray-400 mt-0.5">{order.shippingMethod.name}</p>
          )}
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Shipping</p>
          <p className="text-sm text-gray-700">
            {Number(order.shippingPrice) === 0 ? 'Free' : `€${Number(order.shippingPrice).toFixed(2)}`}
          </p>
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

      {/* Actions */}
      <div className="rounded-xl border border-gray-200 bg-white px-5 py-4 mb-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Actions</p>

        {actionError && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">{actionError}</p>
        )}

        <div className="flex flex-wrap gap-2 items-center">
          {/* Approve files button — only for UPLOADED status */}
          {order.status === 'UPLOADED' && (
            <button
              onClick={approveOrder}
              disabled={actionLoading}
              className="text-sm px-3 py-1.5 rounded-lg border border-green-600 bg-green-600 text-white font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              Approve Files
            </button>
          )}

          {/* Contextual status transitions */}
          {(STATUS_ACTIONS[order.status] ?? []).map(({ label, toStatus, variant }) => (
            <button
              key={toStatus}
              onClick={() => patchOrder({ status: toStatus })}
              disabled={actionLoading}
              className={[
                'text-sm px-3 py-1.5 rounded-lg border font-medium disabled:opacity-50 transition-colors',
                variant === 'primary' ? 'border-red-600 bg-red-600 text-white hover:bg-red-700' :
                variant === 'danger'  ? 'border-red-300 text-red-700 hover:bg-red-50' :
                'border-gray-300 text-gray-700 hover:bg-gray-50',
              ].join(' ')}
            >
              {label}
            </button>
          ))}

          {/* Payment status toggle */}
          <div className="ml-auto flex gap-2">
            {order.paymentStatus !== 'PAID' && (
              <button
                onClick={() => patchOrder({ paymentStatus: 'PAID' })}
                disabled={actionLoading}
                className="text-sm px-3 py-1.5 rounded-lg border border-green-600 text-green-700 hover:bg-green-50 disabled:opacity-50 transition-colors font-medium"
              >
                Mark Paid
              </button>
            )}
            {order.paymentStatus !== 'UNPAID' && (
              <button
                onClick={() => patchOrder({ paymentStatus: 'UNPAID' })}
                disabled={actionLoading}
                className="text-sm px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors font-medium"
              >
                Mark Unpaid
              </button>
            )}
            {order.paymentStatus !== 'REFUNDED' && (
              <button
                onClick={() => patchOrder({ paymentStatus: 'REFUNDED' })}
                disabled={actionLoading}
                className="text-sm px-3 py-1.5 rounded-lg border border-yellow-500 text-yellow-700 hover:bg-yellow-50 disabled:opacity-50 transition-colors font-medium"
              >
                Mark Refunded
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Customer */}
      {order.user && (
        <div className="rounded-xl border border-gray-200 bg-white px-5 py-4 mb-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Customer</p>
          <p className="text-sm font-medium text-gray-900">{order.user.name ?? order.user.email}</p>
          {order.user.name && <p className="text-xs text-gray-500 mt-0.5">{order.user.email}</p>}
        </div>
      )}

      {/* Addresses */}
      {(order.billingName || order.shippingName) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          {order.billingName && (
            <div className="rounded-xl border border-gray-200 bg-white px-5 py-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Billing address</p>
              <p className="text-sm text-gray-900">{order.billingName}</p>
              {order.billingStreet && <p className="text-xs text-gray-500">{order.billingStreet}</p>}
              {(order.billingZip || order.billingCity) && (
                <p className="text-xs text-gray-500">
                  {[order.billingZip, order.billingCity].filter(Boolean).join(' ')}
                  {order.billingCountry ? `, ${order.billingCountry}` : ''}
                </p>
              )}
            </div>
          )}
          {order.shippingName && (
            <div className="rounded-xl border border-gray-200 bg-white px-5 py-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                {order.deliveryType === 'PICKUP' ? 'Pickup address' : 'Delivery address'}
              </p>
              <p className="text-sm text-gray-900">{order.shippingName}</p>
              {order.shippingStreet && <p className="text-xs text-gray-500">{order.shippingStreet}</p>}
              {(order.shippingZip || order.shippingCity) && (
                <p className="text-xs text-gray-500">
                  {[order.shippingZip, order.shippingCity].filter(Boolean).join(' ')}
                  {order.shippingCountry ? `, ${order.shippingCountry}` : ''}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Payment */}
      {order.stripePaymentIntentId && (
        <div className="rounded-xl border border-gray-200 bg-white px-5 py-4 mb-6">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Payment</p>
          <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
            <div>
              <span className="text-gray-400 text-xs">Status </span>
              <span className="font-medium text-gray-900">{order.paymentStatus}</span>
            </div>
            <div>
              <span className="text-gray-400 text-xs">Amount </span>
              <span className="font-medium text-gray-900">€{Number(order.total).toFixed(2)}</span>
            </div>
            <div className="min-w-0">
              <span className="text-gray-400 text-xs">Stripe PI </span>
              <span className="font-mono text-xs text-gray-600 break-all">{order.stripePaymentIntentId}</span>
            </div>
          </div>
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
                <p className="text-xs text-gray-500 mb-3">
                  {Number(item.width)} × {Number(item.height)} cm &middot; Qty {item.quantity} &middot; €{Number(item.priceSnapshot).toFixed(2)}
                </p>

                {/* Design link */}
                {item.designId && (
                  <div className="mb-4 flex items-start gap-4">
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Design</p>
                      <p className="font-mono text-xs text-gray-500 mb-2">{item.designId}</p>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/api/design/${item.designId}/preview`}
                        alt="Design preview"
                        loading="lazy"
                        className="max-w-[120px] rounded-lg border border-gray-200 bg-gray-50"
                      />
                    </div>
                  </div>
                )}

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
