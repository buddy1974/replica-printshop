'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Badge from '@/components/Badge'
import ApproveButton from '@/components/ApproveButton'
import type { AdminDictionary } from '@/lib/i18n'

const ORDER_STATUSES = [
  'PENDING', 'CONFIRMED', 'UPLOADED', 'APPROVED',
  'READY', 'IN_PRODUCTION', 'DONE', 'SHIPPED', 'DELIVERED', 'CANCELLED',
]

export interface SerializedOrder {
  id: string
  status: string
  paymentStatus: string
  deliveryType: string
  total: number
  createdAt: string
  user: { email: string; name: string | null } | null
  shippingMethod: { name: string } | null
  _count: { items: number }
}

interface Props {
  orders: SerializedOrder[]
  locale: string
  td: AdminDictionary
}

export default function OrdersBatchTable({ orders, locale, td }: Props) {
  const router = useRouter()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [batchStatus, setBatchStatus] = useState(ORDER_STATUSES[0])
  const [applying, setApplying] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [applyError, setApplyError] = useState<string | null>(null)

  const allSelected = orders.length > 0 && selected.size === orders.length
  const someSelected = selected.size > 0

  function toggleAll() {
    if (allSelected) setSelected(new Set())
    else setSelected(new Set<string>(orders.map((o) => o.id)))
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function applyBatch() {
    if (!selected.size) return
    setApplying(true)
    setResult(null)
    setApplyError(null)
    try {
      const res = await fetch('/api/admin/orders/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selected), action: 'status', status: batchStatus }),
      })
      const data = await res.json()
      if (res.ok) {
        setResult(`${data.updated} ${td.batchUpdated}`)
        setSelected(new Set())
        router.refresh()
      } else {
        setApplyError(data.error ?? td.updateError)
      }
    } catch {
      setApplyError(td.updateError)
    } finally {
      setApplying(false)
    }
  }

  return (
    <div>
      {/* Bulk action bar */}
      {someSelected && (
        <div className="mb-3 flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3">
          <span className="text-sm font-medium text-gray-700">
            {selected.size} {td.batchSelected}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">{td.batchChangeStatus}</span>
            <select
              value={batchStatus}
              onChange={(e) => setBatchStatus(e.target.value)}
              className="h-8 rounded-lg border border-gray-300 px-2 text-xs focus:outline-none focus:ring-2 focus:ring-red-400"
            >
              {ORDER_STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <button
            onClick={applyBatch}
            disabled={applying}
            className="px-3 h-8 rounded-lg bg-gray-900 text-white text-xs font-bold hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            {applying ? '…' : td.batchApply}
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="text-xs text-gray-500 hover:text-gray-900 transition-colors"
          >
            {td.batchDeselectAll}
          </button>
          {result && <span className="text-xs text-green-700">{result}</span>}
          {applyError && <span className="text-xs text-red-600">{applyError}</span>}
        </div>
      )}

      <div className="overflow-x-auto card">
        <table className="table-base">
          <thead>
            <tr>
              <th className="w-8">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="rounded border-gray-300"
                  aria-label="Select all"
                />
              </th>
              <th>ID</th>
              <th>{td.customer}</th>
              <th>{td.status}</th>
              <th>{td.payment}</th>
              <th>{td.delivery}</th>
              <th>{td.shipping}</th>
              <th>{td.total}</th>
              <th>{td.items}</th>
              <th>{td.created}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className={selected.has(o.id) ? 'bg-red-50' : undefined}>
                <td>
                  <input
                    type="checkbox"
                    checked={selected.has(o.id)}
                    onChange={() => toggle(o.id)}
                    className="rounded border-gray-300"
                  />
                </td>
                <td>
                  <Link
                    href={`/admin/orders/${o.id}`}
                    className="font-mono text-xs text-gray-800 hover:text-red-600 underline underline-offset-2"
                  >
                    {o.id.slice(0, 8)}
                  </Link>
                </td>
                <td className="text-xs text-gray-600">
                  {o.user ? (
                    <span title={o.user.email}>{o.user.name ?? o.user.email}</span>
                  ) : (
                    <span className="text-gray-400">{td.guest}</span>
                  )}
                </td>
                <td><Badge label={o.status} /></td>
                <td><Badge label={o.paymentStatus} /></td>
                <td className="text-gray-600 text-xs">{o.deliveryType}</td>
                <td className="text-gray-600 text-xs">{o.shippingMethod?.name ?? '—'}</td>
                <td className="font-medium tabular-nums">€{o.total.toFixed(2)}</td>
                <td className="text-gray-600">{o._count.items}</td>
                <td className="text-gray-500 text-xs tabular-nums">
                  {new Date(o.createdAt).toLocaleDateString(locale)}
                </td>
                <td>
                  {o.status === 'UPLOADED' && <ApproveButton orderId={o.id} />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
