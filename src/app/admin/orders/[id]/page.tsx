'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Badge from '@/components/Badge'
import Container from '@/components/Container'
import { orderStatusLabel } from '@/lib/statusLabel'

interface Upload {
  id: string
  filename: string
  mime: string | null
  status: string
  uploadType: string | null
  dpi: number | null
  widthPx: number | null
  heightPx: number | null
  size: number | null
  filePath: string | null
}

function DpiQualityBadge({ dpi }: { dpi: number | null }) {
  if (dpi === null) return <span className="text-xs text-gray-400">—</span>
  const cls = dpi >= 150 ? 'bg-green-100 text-green-700'
            : dpi >= 72  ? 'bg-yellow-100 text-yellow-700'
            : 'bg-red-100 text-red-700'
  const label = dpi >= 150 ? 'Good' : dpi >= 72 ? 'Low' : 'Poor'
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded ${cls}`}>
      {dpi} DPI · {label}
    </span>
  )
}

function FileIcon() {
  return (
    <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  )
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
  preflightScore: number | null
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
  trackingNumber: string | null
  taxPercent: number
  taxAmount: number
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
  const [fileDetails, setFileDetails] = useState<Record<string, Partial<Upload>>>({})
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [fetchError, setFetchError] = useState(false)
  const [replacingFileId, setReplacingFileId] = useState<string | null>(null)
  const replaceInputRef = useRef<HTMLInputElement>(null)
  // Inline notify panel: { fileId, status } waiting for message input
  const [notifyPrompt, setNotifyPrompt] = useState<{ fileId: string; status: string } | null>(null)
  const [notifyMessage, setNotifyMessage] = useState('')
  const [notifyLoading, setNotifyLoading] = useState(false)
  const [trackingInput, setTrackingInput] = useState('')
  const [trackingSaved, setTrackingSaved] = useState(false)
  const [trackingLoading, setTrackingLoading] = useState(false)

  useEffect(() => {
    fetch(`/api/orders/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error('Failed to load order')
        return r.json()
      })
      .then((o: Order) => {
        setOrder(o)
        setTrackingInput(o.trackingNumber ?? '')
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

  const setFileStatus = async (fileId: string, status: string, adminMessage?: string) => {
    const res = await fetch(`/api/upload/${fileId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, adminMessage: adminMessage ?? undefined }),
    })
    if (res.ok) setFileStatuses((prev) => ({ ...prev, [fileId]: status }))
  }

  const confirmNotify = async () => {
    if (!notifyPrompt) return
    setNotifyLoading(true)
    await setFileStatus(notifyPrompt.fileId, notifyPrompt.status, notifyMessage || undefined)
    setNotifyLoading(false)
    setNotifyPrompt(null)
    setNotifyMessage('')
  }

  const saveTracking = async () => {
    setTrackingLoading(true)
    setTrackingSaved(false)
    const res = await fetch(`/api/admin/orders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trackingNumber: trackingInput }),
    })
    setTrackingLoading(false)
    if (res.ok) {
      setOrder((prev) => prev ? { ...prev, trackingNumber: trackingInput || null } : prev)
      setTrackingSaved(true)
    }
  }

  const replaceFile = async (fileId: string, file: File) => {
    setReplacingFileId(fileId)
    const form = new FormData()
    form.append('file', file)
    const res = await fetch(`/api/admin/files/${fileId}/replace`, { method: 'POST', body: form })
    if (res.ok) {
      const updated = await res.json()
      setFileStatuses((prev) => ({ ...prev, [fileId]: updated.status }))
      setFileDetails((prev) => ({ ...prev, [fileId]: updated }))
    } else {
      const d = await res.json()
      alert(d.error ?? 'Replace failed')
    }
    setReplacingFileId(null)
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
          {order.taxAmount > 0 && (
            <p className="text-xs text-gray-400 mt-0.5">
              incl. {order.taxPercent}% VAT
            </p>
          )}
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">VAT</p>
          <p className="text-sm text-gray-700">
            {order.taxAmount > 0 ? `€${Number(order.taxAmount).toFixed(2)}` : '—'}
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Date</p>
          <p className="text-sm text-gray-700">{new Date(order.createdAt).toLocaleDateString()}</p>
        </div>
      </div>

      {/* Invoice download */}
      <div className="rounded-xl border border-gray-200 bg-white px-5 py-4 mb-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Invoice</p>
          <p className="text-xs text-gray-400">Generated on demand · includes all order details</p>
        </div>
        <a
          href={`/api/admin/orders/${order.id}/invoice`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors font-medium shrink-0"
        >
          Download PDF
        </a>
      </div>

      {/* Tracking number */}
      <div className="rounded-xl border border-gray-200 bg-white px-5 py-4 mb-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Tracking number</p>
        <div className="flex gap-2 items-center">
          <input
            value={trackingInput}
            onChange={(e) => { setTrackingInput(e.target.value); setTrackingSaved(false) }}
            placeholder="e.g. 1Z999AA10123456784"
            className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
          />
          <button
            onClick={saveTracking}
            disabled={trackingLoading}
            className="text-sm px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors font-medium"
          >
            {trackingLoading ? 'Saving…' : 'Save'}
          </button>
        </div>
        {trackingSaved && <p className="text-xs text-green-700 mt-2">Tracking number saved.</p>}
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
                <p className="font-semibold text-gray-900 mb-0.5 flex items-center gap-2 flex-wrap">
                  {item.productName}{item.variantName ? ` — ${item.variantName}` : ''}
                  {item.preflightScore != null && (
                    <span className={[
                      'text-xs px-1.5 py-0.5 rounded font-medium',
                      item.preflightScore >= 80 ? 'bg-green-100 text-green-700' :
                      item.preflightScore >= 50 ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700',
                    ].join(' ')}>
                      Preflight {item.preflightScore}/100
                    </span>
                  )}
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
                      src={`/api/admin/files/${f.id}?preview`}
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
                    {/* Hidden file input for replace */}
                    <input
                      ref={replaceInputRef}
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,.svg"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file && replacingFileId) replaceFile(replacingFileId, file)
                        e.target.value = ''
                      }}
                    />

                    <div className="flex flex-col gap-3">
                      {artFiles.map((f) => {
                        const currentStatus = fileStatuses[f.id] ?? f.status
                        const merged = { ...f, ...(fileDetails[f.id] ?? {}) }
                        const isImage = merged.mime === 'image/png' || merged.mime === 'image/jpeg'
                        const isPdf = merged.mime === 'application/pdf'
                        const previewUrl = (isImage && merged.filePath) ? `/api/admin/files/${f.id}?preview` : null
                        const isReplacing = replacingFileId === f.id

                        const statusPill: Record<string, string> = {
                          APPROVED:  'bg-green-100 text-green-700',
                          REJECTED:  'bg-red-100 text-red-700',
                          NEEDS_FIX: 'bg-orange-100 text-orange-700',
                          PENDING:   'bg-yellow-100 text-yellow-700',
                        }

                        return (
                          <div
                            key={f.id}
                            className={[
                              'rounded-lg border p-3 flex gap-3 items-start',
                              currentStatus === 'APPROVED'  ? 'border-green-200 bg-green-50' :
                              currentStatus === 'REJECTED'  ? 'border-red-200 bg-red-50' :
                              currentStatus === 'NEEDS_FIX' ? 'border-orange-200 bg-orange-50' :
                              'border-gray-200 bg-gray-50',
                            ].join(' ')}
                          >
                            {/* Preview thumbnail or icon */}
                            <div className="shrink-0 w-16 h-16 rounded-md border border-gray-200 bg-white flex items-center justify-center overflow-hidden">
                              {previewUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={previewUrl}
                                  alt="Preview"
                                  loading="lazy"
                                  className="w-full h-full object-contain"
                                />
                              ) : isPdf ? (
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">PDF</span>
                              ) : (
                                <FileIcon />
                              )}
                            </div>

                            {/* File details */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <p className="font-mono text-xs font-medium text-gray-800 truncate">
                                  {merged.filePath ? (
                                    <a href={`/api/admin/files/${f.id}`} className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
                                      {merged.filename}
                                    </a>
                                  ) : merged.filename}
                                </p>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${statusPill[currentStatus] ?? 'bg-gray-100 text-gray-500'}`}>
                                  {currentStatus}
                                </span>
                              </div>

                              <div className="flex flex-wrap gap-x-3 gap-y-1 mb-2">
                                {f.uploadType && (
                                  <span className="text-xs text-gray-500">{f.uploadType}</span>
                                )}
                                {merged.size != null && (
                                  <span className="text-xs text-gray-400">{((merged.size as number) / 1024).toFixed(0)} KB</span>
                                )}
                                {merged.widthPx != null && merged.heightPx != null && (
                                  <span className="text-xs text-gray-400">{merged.widthPx} × {merged.heightPx} px</span>
                                )}
                                <DpiQualityBadge dpi={merged.dpi as number | null} />
                              </div>

                              <div className="flex flex-wrap gap-1.5">
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
                                  onClick={() => { setNotifyPrompt({ fileId: f.id, status: 'REJECTED' }); setNotifyMessage('') }}
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
                                <button
                                  onClick={() => { setNotifyPrompt({ fileId: f.id, status: 'NEEDS_FIX' }); setNotifyMessage('') }}
                                  disabled={currentStatus === 'NEEDS_FIX'}
                                  className={[
                                    'text-[11px] px-2 py-1 rounded border font-medium transition-colors',
                                    currentStatus === 'NEEDS_FIX'
                                      ? 'border-orange-500 bg-orange-500 text-white cursor-default'
                                      : 'border-orange-500 text-orange-600 hover:bg-orange-50',
                                  ].join(' ')}
                                >
                                  Needs fix
                                </button>
                                <button
                                  onClick={() => { setReplacingFileId(f.id); replaceInputRef.current?.click() }}
                                  disabled={isReplacing}
                                  className="text-[11px] px-2 py-1 rounded border border-gray-400 text-gray-600 font-medium hover:bg-gray-100 transition-colors disabled:opacity-50"
                                >
                                  {isReplacing ? 'Uploading…' : 'Replace'}
                                </button>
                              </div>

                              {/* Inline notify panel — only shown for this file */}
                              {notifyPrompt?.fileId === f.id && (
                                <div className="mt-3 pt-3 border-t border-gray-200">
                                  <p className="text-[11px] font-semibold text-gray-600 mb-1.5">
                                    {notifyPrompt.status === 'REJECTED' ? 'Reject file' : 'Request fix'} — notify customer
                                  </p>
                                  <textarea
                                    value={notifyMessage}
                                    onChange={(e) => setNotifyMessage(e.target.value)}
                                    placeholder="Optional message (e.g. 'File too small — please upload at 150 DPI or higher')"
                                    rows={2}
                                    className="w-full text-xs rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-400 resize-none mb-2"
                                  />
                                  <div className="flex gap-2">
                                    <button
                                      onClick={confirmNotify}
                                      disabled={notifyLoading}
                                      className="text-[11px] px-3 py-1.5 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
                                    >
                                      {notifyLoading ? 'Sending…' : 'Confirm & notify customer'}
                                    </button>
                                    <button
                                      onClick={() => setNotifyPrompt(null)}
                                      className="text-[11px] px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
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
