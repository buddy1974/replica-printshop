'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Container from '@/components/Container'

// ── Types ──────────────────────────────────────────────────────────────────

interface ProductionJob {
  id: string
  status: string
  notes: string | null
  machine: string | null
  machineType: string | null
}

interface UploadFile {
  id: string
  filename: string
  mime: string | null
  dpi: number | null
  status: string
  uploadType: string | null
  widthPx: number | null
  heightPx: number | null
  size: number | null
  filePath: string | null
}

interface OrderItem {
  id: string
  productName: string
  variantName: string | null
  categoryName: string | null
  productionTypeSnapshot: string | null
  width: number
  height: number
  quantity: number
  priceSnapshot: number
  designId: string | null
  preflightScore: number | null
  uploadFiles: UploadFile[]
  productionJob: ProductionJob | null
}

interface Order {
  id: string
  status: string
  paymentStatus: string
  deliveryType: string
  total: number
  shippingPrice: number
  trackingNumber: string | null
  createdAt: string
  user: { email: string; name: string | null } | null
  shippingMethod: { name: string } | null
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
  items: OrderItem[]
}

// ── Status mapping ──────────────────────────────────────────────────────────

const NEW_DB = new Set(['CONFIRMED', 'UPLOADED', 'APPROVED'])

function workshopLabel(dbStatus: string): string {
  if (NEW_DB.has(dbStatus)) return 'NEW'
  const map: Record<string, string> = {
    READY:         'IN QUEUE',
    IN_PRODUCTION: 'IN PRODUCTION',
    DONE:          'PRINTED',
    SHIPPED:       'SHIPPED',
    DELIVERED:     'DONE',
    CANCELLED:     'CANCELLED',
  }
  return map[dbStatus] ?? dbStatus
}

function statusBadgeCls(dbStatus: string): string {
  if (NEW_DB.has(dbStatus)) return 'bg-yellow-100 text-yellow-700'
  const map: Record<string, string> = {
    READY:         'bg-blue-100 text-blue-700',
    IN_PRODUCTION: 'bg-orange-100 text-orange-700',
    DONE:          'bg-green-100 text-green-700',
    SHIPPED:       'bg-purple-100 text-purple-700',
    DELIVERED:     'bg-gray-100 text-gray-500',
    CANCELLED:     'bg-red-100 text-red-700',
  }
  return map[dbStatus] ?? 'bg-gray-100 text-gray-500'
}

// Buttons to show per DB status
interface ActionDef {
  label: string
  toStatus: string
  cls: string
  title?: string
}

function getActions(dbStatus: string): ActionDef[] {
  switch (dbStatus) {
    case 'READY':
      return [
        { label: 'Start Production', toStatus: 'IN_PRODUCTION', cls: 'bg-orange-500 hover:bg-orange-600 text-white' },
        { label: 'Cancel Order',     toStatus: 'CANCELLED',    cls: 'border border-red-300 text-red-700 hover:bg-red-50' },
      ]
    case 'IN_PRODUCTION':
      return [
        { label: 'Mark Printed',  toStatus: 'DONE',      cls: 'bg-green-600 hover:bg-green-700 text-white' },
        { label: 'Cancel Order',  toStatus: 'CANCELLED', cls: 'border border-red-300 text-red-700 hover:bg-red-50' },
      ]
    case 'DONE':
      return [
        { label: 'Mark Shipped',  toStatus: 'SHIPPED',   cls: 'bg-purple-600 hover:bg-purple-700 text-white' },
        { label: 'Cancel Order',  toStatus: 'CANCELLED', cls: 'border border-red-300 text-red-700 hover:bg-red-50' },
      ]
    case 'SHIPPED':
      return [
        { label: 'Mark Delivered', toStatus: 'DELIVERED', cls: 'bg-gray-700 hover:bg-gray-800 text-white' },
      ]
    default:
      return []
  }
}

// ── Components ──────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-5 py-4 mb-4">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">{title}</p>
      {children}
    </div>
  )
}

function DpiLabel({ dpi }: { dpi: number | null }) {
  if (!dpi) return null
  const cls = dpi >= 150 ? 'bg-green-100 text-green-700' : dpi >= 72 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
  const label = dpi >= 150 ? 'Good DPI' : dpi >= 72 ? 'Low DPI' : 'Poor DPI'
  return (
    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${cls}`}>
      {dpi} · {label}
    </span>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function ProductionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actioning, setActioning] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [notesSaved, setNotesSaved] = useState(false)
  const [notesSaving, setNotesSaving] = useState(false)
  const [trackingInput, setTrackingInput] = useState('')
  const [trackingSaved, setTrackingSaved] = useState(false)
  const [trackingSaving, setTrackingSaving] = useState(false)
  const [reprinting, setReprinting] = useState(false)
  const [shippingMsg, setShippingMsg] = useState(false)
  const [refundMsg, setRefundMsg] = useState(false)
  const notesTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    fetch(`/api/admin/production/${id}`)
      .then((r) => { if (!r.ok) throw new Error('Not found'); return r.json() })
      .then((o: Order) => {
        setOrder(o)
        setTrackingInput(o.trackingNumber ?? '')
        // Restore notes from first item's production job
        const firstJob = o.items[0]?.productionJob
        setNotes(firstJob?.notes ?? '')
        setLoading(false)
      })
      .catch(() => { setError('Failed to load order'); setLoading(false) })
  }, [id])

  useEffect(() => { load() }, [load])

  const advance = async (toStatus: string) => {
    if (!order) return
    setActioning(true)
    setActionError(null)
    const res = await fetch(`/api/admin/orders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: toStatus }),
    })
    const data = await res.json()
    setActioning(false)
    if (!res.ok) {
      setActionError(data.error ?? 'Failed to update status')
    } else {
      setOrder((prev) => prev ? { ...prev, status: data.status } : prev)
    }
  }

  const saveNotes = async (value: string) => {
    setNotesSaving(true)
    setNotesSaved(false)
    const res = await fetch(`/api/admin/production/${id}/notes`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes: value }),
    })
    setNotesSaving(false)
    if (res.ok) setNotesSaved(true)
  }

  const onNotesChange = (v: string) => {
    setNotes(v)
    setNotesSaved(false)
    if (notesTimer.current) clearTimeout(notesTimer.current)
    notesTimer.current = setTimeout(() => saveNotes(v), 1500)
  }

  const doReprint = async () => {
    setReprinting(true)
    const stamp = new Date().toLocaleString()
    const updated = notes ? `${notes}\n[REPRINT REQUESTED – ${stamp}]` : `[REPRINT REQUESTED – ${stamp}]`
    setNotes(updated)
    await saveNotes(updated)
    setReprinting(false)
  }

  const saveTracking = async () => {
    setTrackingSaving(true)
    setTrackingSaved(false)
    const res = await fetch(`/api/admin/orders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trackingNumber: trackingInput }),
    })
    setTrackingSaving(false)
    if (res.ok) {
      setOrder((prev) => prev ? { ...prev, trackingNumber: trackingInput || null } : prev)
      setTrackingSaved(true)
    }
  }

  if (loading) {
    return (
      <Container>
        <div className="flex items-center justify-center py-20">
          <div className="w-7 h-7 border-2 border-gray-200 border-t-red-600 rounded-full animate-spin" />
        </div>
      </Container>
    )
  }

  if (error || !order) {
    return (
      <Container>
        <div className="rounded-xl border border-red-200 bg-red-50 p-6">
          <p className="text-sm font-semibold text-red-800">{error ?? 'Order not found'}</p>
          <Link href="/admin/production" className="mt-3 text-sm text-red-700 underline block">← Production queue</Link>
        </div>
      </Container>
    )
  }

  const actions = getActions(order.status)
  const customer = order.user?.name ?? order.user?.email ?? 'Guest'
  const wLabel = workshopLabel(order.status)
  const wCls   = statusBadgeCls(order.status)

  const canReprint = ['IN_PRODUCTION', 'DONE', 'SHIPPED', 'DELIVERED'].includes(order.status)
  const canRefund  = ['DONE', 'SHIPPED', 'DELIVERED'].includes(order.status)
  const showShippingLabel = ['DONE', 'SHIPPED', 'DELIVERED'].includes(order.status)

  return (
    <Container>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <Link href="/admin/production" className="text-xs text-gray-400 hover:text-gray-700 transition-colors">
            ← Production
          </Link>
          <h1 className="text-lg font-bold font-mono tracking-tight mt-1">
            #{order.id.slice(0, 8).toUpperCase()}
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">
            {new Date(order.createdAt).toLocaleDateString()} · {customer}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide ${wCls}`}>
            {wLabel}
          </span>
          <Link
            href={`/admin/orders/${order.id}`}
            className="text-xs px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Admin order
          </Link>
        </div>
      </div>

      {/* Status actions */}
      <Section title="Actions">
        {actionError && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">
            {actionError}
          </p>
        )}

        {/* New / not started: show info + link */}
        {NEW_DB.has(order.status) && (
          <p className="text-sm text-gray-500 mb-3">
            This order is awaiting file approval. Use the{' '}
            <Link href={`/admin/orders/${order.id}`} className="text-blue-600 underline">
              admin order page
            </Link>{' '}
            to approve files and mark it ready.
          </p>
        )}

        <div className="flex flex-wrap gap-2 items-center">
          {/* Status transition buttons */}
          {actions.map(({ label, toStatus, cls }) => (
            <button
              key={toStatus}
              onClick={() => advance(toStatus)}
              disabled={actioning}
              className={`text-sm px-4 py-2 rounded-lg font-bold transition-colors disabled:opacity-50 ${cls}`}
            >
              {actioning ? '…' : label}
            </button>
          ))}

          {/* Print sheet */}
          <a
            href={`/api/admin/orders/${order.id}/order-sheet`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm px-4 py-2 rounded-lg border border-gray-900 bg-gray-900 text-white hover:bg-gray-700 transition-colors font-medium"
          >
            Print sheet
          </a>

          {/* Packing list */}
          <Link
            href={`/admin/production/${order.id}/packing-list`}
            target="_blank"
            className="text-sm px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors font-medium"
          >
            Packing list
          </Link>

          {/* Reprint */}
          {canReprint && (
            <button
              onClick={doReprint}
              disabled={reprinting}
              className="text-sm px-4 py-2 rounded-lg border border-blue-300 text-blue-700 hover:bg-blue-50 transition-colors font-medium disabled:opacity-50"
            >
              {reprinting ? '…' : 'Reprint'}
            </button>
          )}

          {/* Shipping label placeholder */}
          {showShippingLabel && (
            <div className="relative">
              <button
                onClick={() => setShippingMsg(true)}
                onBlur={() => setShippingMsg(false)}
                className="text-sm px-4 py-2 rounded-lg border border-gray-300 text-gray-500 hover:bg-gray-50 transition-colors font-medium"
              >
                Shipping label
              </button>
              {shippingMsg && (
                <div className="absolute bottom-full mb-1 left-0 bg-gray-800 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-lg z-10">
                  Not connected yet
                </div>
              )}
            </div>
          )}

          {/* Refund placeholder */}
          {canRefund && (
            <div className="relative">
              <button
                onClick={() => setRefundMsg(true)}
                onBlur={() => setRefundMsg(false)}
                className="text-sm px-4 py-2 rounded-lg border border-yellow-300 text-yellow-700 hover:bg-yellow-50 transition-colors font-medium"
              >
                Refund
              </button>
              {refundMsg && (
                <div className="absolute bottom-full mb-1 left-0 bg-gray-800 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-lg z-10">
                  Not connected yet — process refund in Stripe
                </div>
              )}
            </div>
          )}
        </div>
      </Section>

      {/* Tracking */}
      <Section title="Tracking number">
        <div className="flex gap-2 items-center">
          <input
            value={trackingInput}
            onChange={(e) => { setTrackingInput(e.target.value); setTrackingSaved(false) }}
            placeholder="e.g. 1Z999AA10123456784"
            className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
          />
          <button
            onClick={saveTracking}
            disabled={trackingSaving}
            className="text-sm px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            {trackingSaving ? 'Saving…' : 'Save'}
          </button>
        </div>
        {trackingSaved && <p className="text-xs text-green-700 mt-2">Saved.</p>}
      </Section>

      {/* Order info */}
      <Section title="Order">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Payment</p>
            <p className="font-medium">{order.paymentStatus}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Delivery</p>
            <p className="font-medium">{order.deliveryType}</p>
            {order.shippingMethod && <p className="text-xs text-gray-400">{order.shippingMethod.name}</p>}
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Shipping</p>
            <p className="font-medium">{Number(order.shippingPrice) === 0 ? 'Free' : `€${Number(order.shippingPrice).toFixed(2)}`}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Total</p>
            <p className="font-bold">€{Number(order.total).toFixed(2)}</p>
          </div>
        </div>
      </Section>

      {/* Customer + addresses */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        {order.user && (
          <Section title="Customer">
            <p className="text-sm font-medium">{order.user.name ?? order.user.email}</p>
            {order.user.name && <p className="text-xs text-gray-500">{order.user.email}</p>}
          </Section>
        )}
        {order.shippingName && (
          <Section title={order.deliveryType === 'PICKUP' ? 'Pickup' : 'Delivery address'}>
            <p className="text-sm font-medium">{order.shippingName}</p>
            {order.shippingStreet && <p className="text-xs text-gray-500">{order.shippingStreet}</p>}
            {(order.shippingZip || order.shippingCity) && (
              <p className="text-xs text-gray-500">
                {[order.shippingZip, order.shippingCity].filter(Boolean).join(' ')}
                {order.shippingCountry ? `, ${order.shippingCountry}` : ''}
              </p>
            )}
          </Section>
        )}
      </div>

      {/* Items */}
      <Section title={`Items (${order.items.length})`}>
        <div className="flex flex-col gap-5">
          {order.items.map((item) => {
            const artFiles = item.uploadFiles.filter((f) => f.uploadType !== 'PREVIEW')
            const previewFiles = item.uploadFiles.filter((f) => f.uploadType === 'PREVIEW')
            const primaryArt = artFiles[0] ?? null
            const isImage = primaryArt && (primaryArt.mime === 'image/png' || primaryArt.mime === 'image/jpeg')

            return (
              <div key={item.id} className="border border-gray-100 rounded-xl p-4">
                {/* Item header */}
                <div className="flex gap-4 items-start mb-3">
                  {/* Thumb */}
                  <div className="w-16 h-16 shrink-0 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden">
                    {item.designId ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={`/api/design/${item.designId}/preview`} alt="design" loading="lazy" className="w-full h-full object-contain" />
                    ) : isImage && primaryArt.filePath ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={`/api/admin/files/${primaryArt.id}?preview`} alt="upload" loading="lazy" className="w-full h-full object-contain" />
                    ) : previewFiles[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={`/api/admin/files/${previewFiles[0].id}?preview`} alt="preview" loading="lazy" className="w-full h-full object-contain" />
                    ) : (
                      <span className="text-[9px] font-bold text-gray-400 uppercase">
                        {primaryArt?.mime === 'application/pdf' ? 'PDF' : primaryArt ? 'FILE' : 'NONE'}
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm">
                      {item.productName}
                      {item.variantName && <span className="font-normal text-gray-400"> — {item.variantName}</span>}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {Number(item.width)} × {Number(item.height)} cm &middot; Qty <strong>{item.quantity}</strong>
                      {item.categoryName && <span className="text-gray-400"> · {item.categoryName}</span>}
                    </p>
                    {item.productionTypeSnapshot && (
                      <p className="text-xs text-gray-600 mt-1">
                        Options: <span className="font-medium">{item.productionTypeSnapshot}</span>
                      </p>
                    )}
                    {item.productionJob?.machineType && (
                      <p className="text-xs text-gray-400 mt-0.5">Machine: {item.productionJob.machineType}</p>
                    )}
                  </div>
                </div>

                {/* Art files */}
                {artFiles.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Files</p>
                    {artFiles.map((f) => (
                      <div key={f.id} className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs text-gray-500 truncate max-w-[200px]">{f.filename}</span>
                        <DpiLabel dpi={f.dpi} />
                        {f.widthPx && f.heightPx && (
                          <span className="text-[10px] text-gray-400">{f.widthPx}×{f.heightPx}px</span>
                        )}
                        <span className={[
                          'text-[10px] font-semibold px-1.5 py-0.5 rounded',
                          f.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                          f.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                          f.status === 'NEEDS_FIX' ? 'bg-orange-100 text-orange-700' :
                          'bg-yellow-100 text-yellow-700',
                        ].join(' ')}>
                          {f.status}
                        </span>
                        {f.filePath && (
                          <a
                            href={`/api/admin/files/${f.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] px-2 py-0.5 rounded border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors font-medium"
                          >
                            Download
                          </a>
                        )}
                        {f.filePath && (f.mime === 'image/png' || f.mime === 'image/jpeg') && (
                          <a
                            href={`/api/admin/files/${f.id}?preview`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] px-2 py-0.5 rounded border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors font-medium"
                          >
                            Preview
                          </a>
                        )}
                      </div>
                    ))}
                    {item.designId && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 font-mono">Design: {item.designId.slice(0, 12)}…</span>
                        <a
                          href={`/api/design/${item.designId}/preview`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] px-2 py-0.5 rounded border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors font-medium"
                        >
                          Download design
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </Section>

      {/* Notes */}
      <Section title="Internal notes">
        <textarea
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          rows={4}
          placeholder="Workshop notes, job details, issues…"
          className="w-full text-sm rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
        />
        <div className="flex items-center gap-3 mt-2">
          <button
            onClick={() => saveNotes(notes)}
            disabled={notesSaving}
            className="text-xs px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            {notesSaving ? 'Saving…' : 'Save notes'}
          </button>
          {notesSaved && <span className="text-xs text-green-700">Saved.</span>}
        </div>
      </Section>
    </Container>
  )
}
