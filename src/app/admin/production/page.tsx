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
  status: string   // PENDING | APPROVED | REJECTED | NEEDS_FIX
  filePath: string | null
}

// File status → pill styles
const FILE_STATUS_PILL: Record<string, string> = {
  APPROVED:  'bg-green-100 text-green-700',
  REJECTED:  'bg-red-100 text-red-700',
  NEEDS_FIX: 'bg-orange-100 text-orange-700',
  PENDING:   'bg-yellow-100 text-yellow-700',
}

function fileStatusLabel(s: string) {
  if (s === 'NEEDS_FIX') return 'needs fix'
  return s.toLowerCase()
}

/** Returns true if order has upload files that are not all approved */
function hasUnapprovedFiles(order: Order): boolean {
  return order.items.some(
    (item) => item.uploadFiles.length > 0 && item.uploadFiles.some((f) => f.status !== 'APPROVED')
  )
}

interface OrderItem {
  id: string
  productName: string
  variantName: string | null
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
  items: OrderItem[]
}

// ── Constants ──────────────────────────────────────────────────────────────

type FilterKey = 'ALL' | 'PAID' | 'IN_PRODUCTION' | 'READY' | 'DONE'

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'ALL',           label: 'All active'   },
  { key: 'PAID',         label: 'Paid / queued' },
  { key: 'IN_PRODUCTION', label: 'In production' },
  { key: 'READY',         label: 'Ready'         },
  { key: 'DONE',          label: 'Completed'     },
]

const PAID_STATUSES = new Set(['CONFIRMED', 'UPLOADED', 'APPROVED'])

// Map order status → display pill styles
const STATUS_PILL: Record<string, string> = {
  CONFIRMED:     'bg-blue-100 text-blue-700',
  UPLOADED:      'bg-blue-100 text-blue-700',
  APPROVED:      'bg-blue-200 text-blue-800',
  IN_PRODUCTION: 'bg-orange-100 text-orange-700',
  READY:         'bg-green-100 text-green-700',
  DONE:          'bg-gray-100 text-gray-500',
}

// Map order status → action buttons
const STATUS_ACTIONS: Record<string, { label: string; next: string }[]> = {
  CONFIRMED:     [{ label: 'Start production', next: 'IN_PRODUCTION' }],
  UPLOADED:      [{ label: 'Start production', next: 'IN_PRODUCTION' }],
  APPROVED:      [{ label: 'Start production', next: 'IN_PRODUCTION' }],
  IN_PRODUCTION: [{ label: 'Mark ready',       next: 'READY'         }],
  READY:         [{ label: 'Complete order',   next: 'DONE'           }],
  DONE:          [],
}

// ── Helpers ────────────────────────────────────────────────────────────────

function filterMatches(o: Order, f: FilterKey): boolean {
  if (f === 'ALL')           return o.status !== 'DONE'
  if (f === 'PAID')          return PAID_STATUSES.has(o.status)
  if (f === 'IN_PRODUCTION') return o.status === 'IN_PRODUCTION'
  if (f === 'READY')         return o.status === 'READY'
  if (f === 'DONE')          return o.status === 'DONE'
  return true
}

function ItemThumb({ item }: { item: OrderItem }) {
  const upload = item.uploadFiles[0] ?? null
  const isImage = upload && (upload.mime === 'image/png' || upload.mime === 'image/jpeg')

  if (item.designId) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`/api/design/${item.designId}/preview`}
        alt="design"
        loading="lazy"
        className="w-12 h-12 object-contain rounded border border-gray-200 bg-gray-50 shrink-0"
      />
    )
  }
  if (isImage && upload.filePath) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`/api/admin/files/${upload.id}?preview`}
        alt="upload"
        loading="lazy"
        className="w-12 h-12 object-contain rounded border border-gray-200 bg-gray-50 shrink-0"
      />
    )
  }
  if (upload) {
    return (
      <div className="w-12 h-12 rounded border border-gray-200 bg-gray-50 shrink-0 flex items-center justify-center">
        <span className="text-[9px] font-bold text-gray-400 uppercase">
          {upload.mime === 'application/pdf' ? 'PDF' : 'FILE'}
        </span>
      </div>
    )
  }
  return (
    <div className="w-12 h-12 rounded border border-gray-200 bg-gray-50 shrink-0 flex items-center justify-center">
      <span className="text-[9px] text-gray-300 uppercase">No file</span>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function ProductionPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterKey>('ALL')
  const [actioning, setActioning] = useState<string | null>(null) // orderId being updated

  const load = (done: boolean) => {
    setLoading(true)
    fetch(`/api/admin/production${done ? '?done=1' : ''}`)
      .then((r) => r.json())
      .then((data) => { setOrders(data); setLoading(false) })
      .catch(() => { setError('Failed to load orders'); setLoading(false) })
  }

  useEffect(() => { load(filter === 'DONE') }, [filter]) // eslint-disable-line react-hooks/exhaustive-deps

  const advance = async (orderId: string, toStatus: string) => {
    setActioning(orderId)
    const res = await fetch(`/api/admin/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: toStatus }),
    })
    if (res.ok) {
      const updated = await res.json()
      setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status: updated.status } : o))
    } else {
      const d = await res.json()
      alert(d.error ?? 'Failed to update status')
    }
    setActioning(null)
  }

  const visible = orders.filter((o) => filterMatches(o, filter))

  // Count per filter for badges
  const counts: Record<FilterKey, number> = {
    ALL:           orders.filter((o) => o.status !== 'DONE').length,
    PAID:          orders.filter((o) => PAID_STATUSES.has(o.status)).length,
    IN_PRODUCTION: orders.filter((o) => o.status === 'IN_PRODUCTION').length,
    READY:         orders.filter((o) => o.status === 'READY').length,
    DONE:          orders.filter((o) => o.status === 'DONE').length,
  }

  return (
    <Container>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Production</h1>
          <p className="text-xs text-gray-400 mt-0.5">Orders ready for print</p>
        </div>
        <Link href="/admin" className="text-sm text-gray-400 hover:text-gray-700">← Admin</Link>
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
        <p className="text-sm text-gray-400 italic py-10 text-center">No orders in this category.</p>
      )}

      {!loading && !error && visible.length > 0 && (
        <div className="flex flex-col gap-4">
          {visible.map((order) => {
            const actions = STATUS_ACTIONS[order.status] ?? []
            const isActioning = actioning === order.id
            const customer = order.user?.name ?? order.user?.email ?? 'Guest'

            const unapproved = hasUnapprovedFiles(order)

            return (
              <div
                key={order.id}
                className={[
                  'rounded-xl border bg-white p-5',
                  order.status === 'IN_PRODUCTION' ? 'border-orange-200' :
                  order.status === 'READY'         ? 'border-green-200' :
                  order.status === 'DONE'          ? 'border-gray-200 opacity-70' :
                  'border-gray-200',
                ].join(' ')}
              >
                {/* Order header */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3 flex-wrap">
                    {/* Status pill */}
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_PILL[order.status] ?? 'bg-gray-100 text-gray-500'}`}>
                      {orderStatusLabel(order.status)}
                    </span>
                    {/* Order ID link */}
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="font-mono text-xs text-blue-600 hover:underline"
                    >
                      #{order.id.slice(0, 8).toUpperCase()}
                    </Link>
                    {/* Customer */}
                    <span className="text-xs text-gray-500">{customer}</span>
                    {/* Date */}
                    <span className="text-xs text-gray-400">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  {/* Total */}
                  <span className="text-sm font-bold text-gray-900 shrink-0">
                    €{Number(order.total).toFixed(2)}
                  </span>
                </div>

                {/* Items */}
                <div className="flex flex-col gap-2 mb-4">
                  {order.items.map((item) => {
                    const upload = item.uploadFiles[0] ?? null
                    return (
                      <div key={item.id} className="flex items-center gap-3">
                        {/* Thumbnail */}
                        {item.designId ? (
                          <Link href={`/admin/orders/${order.id}`} className="shrink-0">
                            <ItemThumb item={item} />
                          </Link>
                        ) : upload?.filePath ? (
                          <a href={`/api/admin/files/${upload.id}`} target="_blank" rel="noopener noreferrer" className="shrink-0">
                            <ItemThumb item={item} />
                          </a>
                        ) : (
                          <ItemThumb item={item} />
                        )}

                        {/* Item info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">
                            {item.productName}
                            {item.variantName ? <span className="text-gray-400"> — {item.variantName}</span> : null}
                          </p>
                          <p className="text-xs text-gray-400">
                            {Number(item.width)} × {Number(item.height)} cm · Qty {item.quantity}
                          </p>
                          {upload && (
                            <p className="text-xs text-gray-400 truncate flex items-center gap-1.5 flex-wrap">
                              {upload.filename}
                              {upload.dpi ? ` · ${upload.dpi} DPI` : ''}
                              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${FILE_STATUS_PILL[upload.status] ?? 'bg-gray-100 text-gray-500'}`}>
                                {fileStatusLabel(upload.status)}
                              </span>
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Action buttons */}
                {actions.length > 0 && (
                  <div className="pt-3 border-t border-gray-100">
                    {/* Unapproved files warning */}
                    {unapproved && actions.some((a) => a.next === 'READY') && (
                      <p className="text-xs text-orange-700 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 mb-2">
                        Files not all approved — review files before marking ready.
                      </p>
                    )}
                    <div className="flex gap-2 flex-wrap">
                      {actions.map(({ label, next }) => {
                        const blockedByFiles = next === 'READY' && unapproved
                        return (
                          <button
                            key={next}
                            onClick={() => !blockedByFiles && advance(order.id, next)}
                            disabled={isActioning || blockedByFiles}
                            title={blockedByFiles ? 'Approve all files first' : undefined}
                            className={[
                              'text-sm px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50',
                              next === 'IN_PRODUCTION' ? 'bg-orange-500 text-white hover:bg-orange-600' :
                              next === 'READY'          ? 'bg-green-600 text-white hover:bg-green-700' :
                              next === 'DONE'           ? 'bg-gray-700 text-white hover:bg-gray-800' :
                              'bg-red-600 text-white hover:bg-red-700',
                            ].join(' ')}
                          >
                            {isActioning ? '…' : label}
                          </button>
                        )
                      })}
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="text-sm px-4 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
                      >
                        View order
                      </Link>
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
