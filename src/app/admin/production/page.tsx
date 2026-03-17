'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Container from '@/components/Container'
import { orderStatusLabel } from '@/lib/statusLabel'

// ── Types ──────────────────────────────────────────────────────────────────

interface UploadFile {
  id: string
  filename: string
  mime: string | null
  dpi: number | null
  status: string
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
  designId: string | null
  uploadFiles: UploadFile[]
}

interface Order {
  id: string
  status: string
  paymentStatus: string
  deliveryType: string
  total: number
  createdAt: string
  user: { email: string; name: string | null } | null
  shippingName: string | null
  shippingCity: string | null
  shippingCountry: string | null
  items: OrderItem[]
}

// ── Workshop status mapping ────────────────────────────────────────────────
//
//  DB status          Workshop label
//  ──────────────     ──────────────
//  CONFIRMED/
//  UPLOADED/
//  APPROVED/
//  READY         →   NEW   (queued, not yet started)
//  IN_PRODUCTION →   IN_PRODUCTION
//  DONE          →   DONE  (hidden by default)
//
// Button: START   → moves DB status to IN_PRODUCTION
// Button: PRINTED → moves DB status to READY → means printed, ready to pack
// Button: DONE    → moves DB status to DONE

const NEW_STATUSES = new Set(['CONFIRMED', 'UPLOADED', 'APPROVED'])

type WorkshopFilter = 'NEW' | 'IN_PRODUCTION' | 'PRINTED' | 'ALL'

const FILTERS: { key: WorkshopFilter; label: string }[] = [
  { key: 'ALL',           label: 'All active'    },
  { key: 'NEW',           label: 'New'            },
  { key: 'IN_PRODUCTION', label: 'In production'  },
  { key: 'PRINTED',       label: 'Printed'        },
]

function workshopFilter(o: Order, f: WorkshopFilter): boolean {
  if (f === 'NEW')           return NEW_STATUSES.has(o.status)
  if (f === 'IN_PRODUCTION') return o.status === 'IN_PRODUCTION'
  if (f === 'PRINTED')       return o.status === 'READY'
  // ALL → hide DONE / SHIPPED / DELIVERED / CANCELLED
  return !['DONE', 'SHIPPED', 'DELIVERED', 'CANCELLED'].includes(o.status)
}

// DB status → workshop pill label + colour
function statusBadge(dbStatus: string) {
  if (NEW_STATUSES.has(dbStatus))
    return { label: 'NEW',           cls: 'bg-yellow-100 text-yellow-700' }
  if (dbStatus === 'IN_PRODUCTION')
    return { label: 'IN PRODUCTION', cls: 'bg-orange-100 text-orange-700' }
  if (dbStatus === 'READY')
    return { label: 'PRINTED',       cls: 'bg-green-100 text-green-700'   }
  if (dbStatus === 'DONE')
    return { label: 'DONE',          cls: 'bg-gray-100 text-gray-500'     }
  return { label: orderStatusLabel(dbStatus), cls: 'bg-gray-100 text-gray-500' }
}

// DB status → next action buttons
const ACTIONS: Record<string, { label: string; toStatus: string; color: string }[]> = {
  CONFIRMED:     [{ label: 'START',   toStatus: 'IN_PRODUCTION', color: 'bg-orange-500 hover:bg-orange-600 text-white' }],
  UPLOADED:      [{ label: 'START',   toStatus: 'IN_PRODUCTION', color: 'bg-orange-500 hover:bg-orange-600 text-white' }],
  APPROVED:      [{ label: 'START',   toStatus: 'IN_PRODUCTION', color: 'bg-orange-500 hover:bg-orange-600 text-white' }],
  IN_PRODUCTION: [{ label: 'PRINTED', toStatus: 'READY',         color: 'bg-green-600  hover:bg-green-700  text-white' }],
  READY:         [{ label: 'DONE',    toStatus: 'DONE',          color: 'bg-gray-700   hover:bg-gray-800   text-white' }],
}

// ── File thumbnail ─────────────────────────────────────────────────────────

function Thumb({ item }: { item: OrderItem }) {
  const f = item.uploadFiles[0] ?? null
  const isImage = f && (f.mime === 'image/png' || f.mime === 'image/jpeg')

  if (item.designId) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`/api/design/${item.designId}/preview`}
        alt="design"
        loading="lazy"
        className="w-14 h-14 object-contain rounded-lg border border-gray-200 bg-gray-50 shrink-0"
      />
    )
  }
  if (isImage && f.filePath) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`/api/admin/files/${f.id}?preview`}
        alt="upload"
        loading="lazy"
        className="w-14 h-14 object-contain rounded-lg border border-gray-200 bg-gray-50 shrink-0"
      />
    )
  }
  const label = f?.mime === 'application/pdf' ? 'PDF' : f ? 'FILE' : 'NONE'
  return (
    <div className="w-14 h-14 rounded-lg border border-gray-200 bg-gray-50 shrink-0 flex items-center justify-center">
      <span className="text-[9px] font-bold text-gray-400 uppercase">{label}</span>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function ProductionPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<WorkshopFilter>('ALL')
  const [actioning, setActioning] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    // Fetch all active + done so filter tabs can count them client-side
    fetch('/api/admin/production?done=1')
      .then((r) => r.json())
      .then((data: Order[]) => {
        // Drop DONE / SHIPPED / DELIVERED / CANCELLED from default data
        setOrders(data.filter((o) => !['SHIPPED', 'DELIVERED', 'CANCELLED'].includes(o.status)))
        setLoading(false)
      })
      .catch(() => { setError('Failed to load production queue'); setLoading(false) })
  }

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const advance = async (orderId: string, toStatus: string) => {
    setActioning(orderId)
    const res = await fetch(`/api/admin/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: toStatus }),
    })
    if (res.ok) {
      const updated = await res.json()
      setOrders((prev) =>
        toStatus === 'DONE'
          ? prev.filter((o) => o.id !== orderId) // remove DONE from list
          : prev.map((o) => o.id === orderId ? { ...o, status: updated.status } : o)
      )
    } else {
      const d = await res.json()
      alert(d.error ?? 'Failed to update status')
    }
    setActioning(null)
  }

  const visible = orders.filter((o) => workshopFilter(o, filter))

  const counts: Record<WorkshopFilter, number> = {
    ALL:           orders.filter((o) => workshopFilter(o, 'ALL')).length,
    NEW:           orders.filter((o) => workshopFilter(o, 'NEW')).length,
    IN_PRODUCTION: orders.filter((o) => workshopFilter(o, 'IN_PRODUCTION')).length,
    PRINTED:       orders.filter((o) => workshopFilter(o, 'PRINTED')).length,
  }

  return (
    <Container>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Production</h1>
          <p className="text-xs text-gray-400 mt-0.5">Workshop queue — print / cut / pack</p>
        </div>
        <button
          onClick={load}
          className="text-xs px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1.5 flex-wrap mb-5">
        {FILTERS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={[
              'px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
              filter === key
                ? 'bg-gray-900 text-white border-gray-900'
                : 'bg-white text-gray-600 border-gray-300 hover:border-gray-500',
            ].join(' ')}
          >
            {label}
            {counts[key] > 0 && (
              <span className={[
                'ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold',
                filter === key ? 'bg-white text-gray-900' : 'bg-gray-100 text-gray-600',
              ].join(' ')}>
                {counts[key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="w-7 h-7 border-2 border-gray-200 border-t-red-600 rounded-full animate-spin" />
        </div>
      )}

      {!loading && error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      {!loading && !error && visible.length === 0 && (
        <p className="text-sm text-gray-400 italic py-10 text-center">
          {filter === 'NEW' ? 'No new orders.' :
           filter === 'IN_PRODUCTION' ? 'Nothing in production.' :
           filter === 'PRINTED' ? 'Nothing printed yet.' :
           'No active orders.'}
        </p>
      )}

      {!loading && !error && visible.length > 0 && (
        <div className="flex flex-col gap-4">
          {visible.map((order) => {
            const actions = ACTIONS[order.status] ?? []
            const isActioning = actioning === order.id
            const { label: statusLabel, cls: statusCls } = statusBadge(order.status)
            const customer = order.user?.name ?? order.user?.email ?? 'Guest'

            return (
              <div
                key={order.id}
                className={[
                  'rounded-xl border bg-white overflow-hidden',
                  order.status === 'IN_PRODUCTION' ? 'border-orange-300' :
                  order.status === 'READY'          ? 'border-green-300'  :
                  'border-gray-200',
                ].join(' ')}
              >
                {/* Order header bar */}
                <div className={[
                  'px-5 py-3 flex items-center justify-between gap-3 flex-wrap',
                  order.status === 'IN_PRODUCTION' ? 'bg-orange-50' :
                  order.status === 'READY'          ? 'bg-green-50'  :
                  'bg-gray-50',
                ].join(' ')}>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wide ${statusCls}`}>
                      {statusLabel}
                    </span>
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="font-mono text-xs font-bold text-blue-600 hover:underline"
                    >
                      #{order.id.slice(0, 8).toUpperCase()}
                    </Link>
                    <span className="text-xs text-gray-500">{customer}</span>
                    <span className="text-xs text-gray-400">
                      {new Date(order.createdAt).toLocaleDateString()} · {order.deliveryType}
                    </span>
                    {order.shippingCity && (
                      <span className="text-xs text-gray-400">
                        → {order.shippingName ?? ''} {order.shippingCity}{order.shippingCountry ? `, ${order.shippingCountry}` : ''}
                      </span>
                    )}
                  </div>
                  <span className="text-sm font-bold text-gray-900">€{Number(order.total).toFixed(2)}</span>
                </div>

                {/* Items */}
                <div className="px-5 py-4 flex flex-col gap-4">
                  {order.items.map((item) => {
                    const artFiles = item.uploadFiles.filter(
                      (f) => f.filePath || item.designId
                    )
                    const primaryFile = item.uploadFiles[0] ?? null

                    return (
                      <div key={item.id} className="flex gap-4 items-start">
                        {/* Thumbnail */}
                        <Thumb item={item} />

                        {/* Item details */}
                        <div className="flex-1 min-w-0">
                          {/* Product + variant */}
                          <p className="text-sm font-semibold text-gray-900">
                            {item.productName}
                            {item.variantName && (
                              <span className="font-normal text-gray-400"> — {item.variantName}</span>
                            )}
                          </p>

                          {/* Size + qty */}
                          <p className="text-xs text-gray-500 mt-0.5">
                            {Number(item.width)} × {Number(item.height)} cm &nbsp;·&nbsp; Qty <strong>{item.quantity}</strong>
                            {item.categoryName && <span className="text-gray-400"> · {item.categoryName}</span>}
                          </p>

                          {/* Options (production type) */}
                          {item.productionTypeSnapshot && (
                            <p className="text-xs text-gray-600 mt-1 font-medium">
                              Options: <span className="font-normal">{item.productionTypeSnapshot}</span>
                            </p>
                          )}

                          {/* File info + download */}
                          {primaryFile && (
                            <div className="mt-2 flex items-center gap-2 flex-wrap">
                              <span className="text-[11px] text-gray-400 font-mono truncate max-w-[200px]">
                                {primaryFile.filename}
                                {primaryFile.dpi ? ` · ${primaryFile.dpi} DPI` : ''}
                              </span>
                              {primaryFile.filePath && (
                                <a
                                  href={`/api/admin/files/${primaryFile.id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[11px] px-2 py-0.5 rounded border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors font-medium whitespace-nowrap"
                                >
                                  Download
                                </a>
                              )}
                              {item.designId && (
                                <a
                                  href={`/api/design/${item.designId}/preview`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[11px] px-2 py-0.5 rounded border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors font-medium whitespace-nowrap"
                                >
                                  Download design
                                </a>
                              )}
                              {/* DPI quality indicator */}
                              {primaryFile.dpi != null && (
                                <span className={[
                                  'text-[10px] font-semibold px-1.5 py-0.5 rounded',
                                  primaryFile.dpi >= 150 ? 'bg-green-100 text-green-700' :
                                  primaryFile.dpi >= 72  ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-red-100 text-red-700',
                                ].join(' ')}>
                                  {primaryFile.dpi >= 150 ? 'Good DPI' : primaryFile.dpi >= 72 ? 'Low DPI' : 'Poor DPI'}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Extra art files (if >1) */}
                          {artFiles.length > 1 && (
                            <div className="mt-1 flex gap-1.5 flex-wrap">
                              {artFiles.slice(1).map((f) => f.filePath && (
                                <a
                                  key={f.id}
                                  href={`/api/admin/files/${f.id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[11px] text-blue-600 hover:underline font-mono truncate max-w-[160px]"
                                >
                                  {f.filename}
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Action buttons */}
                <div className="px-5 pb-4 flex items-center gap-2 flex-wrap">
                  {actions.map(({ label, toStatus, color }) => (
                    <button
                      key={toStatus}
                      onClick={() => advance(order.id, toStatus)}
                      disabled={isActioning}
                      className={`text-sm px-5 py-2 rounded-lg font-bold transition-colors disabled:opacity-50 ${color}`}
                    >
                      {isActioning ? '…' : label}
                    </button>
                  ))}
                  <a
                    href={`/api/admin/orders/${order.id}/order-sheet`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm px-4 py-2 rounded-lg border border-gray-900 bg-gray-900 text-white hover:bg-gray-700 transition-colors font-medium"
                  >
                    Print sheet
                  </a>
                  <Link
                    href={`/admin/orders/${order.id}`}
                    className="text-sm px-4 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    View order
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Container>
  )
}
