'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

interface OrderItem {
  id: string
  productName: string
  variantName: string | null
  categoryName: string | null
  productionTypeSnapshot: string | null
  width: number
  height: number
  quantity: number
}

interface Order {
  id: string
  status: string
  deliveryType: string
  createdAt: string
  trackingNumber: string | null
  shippingName: string | null
  shippingStreet: string | null
  shippingCity: string | null
  shippingZip: string | null
  shippingCountry: string | null
  user: { email: string; name: string | null } | null
  shippingMethod: { name: string } | null
  items: OrderItem[]
}

export default function PackingListPage() {
  const { id } = useParams<{ id: string }>()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/admin/production/${id}`)
      .then((r) => r.json())
      .then((o: Order) => { setOrder(o); setLoading(false) })
      .catch(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-7 h-7 border-2 border-gray-200 border-t-gray-800 rounded-full animate-spin" />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="p-8">
        <p className="text-sm text-red-600">Order not found.</p>
      </div>
    )
  }

  const customer = order.user?.name ?? order.user?.email ?? 'Guest'
  const shippingLines = [
    order.shippingName,
    order.shippingStreet,
    [order.shippingZip, order.shippingCity].filter(Boolean).join(' '),
    order.shippingCountry,
  ].filter(Boolean)

  return (
    <div className="max-w-[700px] mx-auto p-8 font-sans text-gray-900">
      {/* Print hide */}
      <div className="print:hidden mb-6 flex items-center gap-3">
        <Link href={`/admin/production/${id}`} className="text-sm text-gray-500 hover:text-gray-900">
          ← Back
        </Link>
        <button
          onClick={() => window.print()}
          className="text-sm px-4 py-2 rounded-lg bg-gray-900 text-white hover:bg-gray-700 transition-colors font-medium"
        >
          Print
        </button>
      </div>

      {/* Header */}
      <div className="border-b-2 border-gray-900 pb-4 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight">PACKING LIST</h1>
            <p className="text-sm text-gray-500 mt-1">
              Order #{order.id.slice(0, 8).toUpperCase()} &middot; {new Date(order.createdAt).toLocaleDateString()}
            </p>
          </div>
          <div className="text-right text-sm">
            <p className="font-semibold">{customer}</p>
            {order.shippingMethod && <p className="text-gray-500">{order.shippingMethod.name}</p>}
            <p className="text-gray-500">{order.deliveryType}</p>
          </div>
        </div>
      </div>

      {/* Shipping address */}
      {shippingLines.length > 0 && (
        <div className="mb-6 p-4 border border-gray-300 rounded-lg">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">
            {order.deliveryType === 'PICKUP' ? 'Pickup' : 'Ship to'}
          </p>
          {shippingLines.map((line, i) => (
            <p key={i} className={i === 0 ? 'font-semibold text-sm' : 'text-sm text-gray-700'}>{line}</p>
          ))}
        </div>
      )}

      {/* Tracking */}
      {order.trackingNumber && (
        <div className="mb-6">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Tracking</p>
          <p className="font-mono text-sm font-semibold">{order.trackingNumber}</p>
        </div>
      )}

      {/* Items table */}
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b-2 border-gray-900">
            <th className="text-left py-2 font-bold text-xs uppercase tracking-wider">Product</th>
            <th className="text-left py-2 font-bold text-xs uppercase tracking-wider">Size</th>
            <th className="text-left py-2 font-bold text-xs uppercase tracking-wider">Options</th>
            <th className="text-right py-2 font-bold text-xs uppercase tracking-wider">Qty</th>
            <th className="text-right py-2 font-bold text-xs uppercase tracking-wider w-8">✓</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item, idx) => (
            <tr key={item.id} className={idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
              <td className="py-3 pr-4 align-top">
                <p className="font-semibold">{item.productName}</p>
                {item.variantName && <p className="text-xs text-gray-500">{item.variantName}</p>}
                {item.categoryName && <p className="text-xs text-gray-400">{item.categoryName}</p>}
              </td>
              <td className="py-3 pr-4 align-top text-xs text-gray-600 whitespace-nowrap">
                {Number(item.width)} × {Number(item.height)} cm
              </td>
              <td className="py-3 pr-4 align-top text-xs text-gray-600">
                {item.productionTypeSnapshot ?? '—'}
              </td>
              <td className="py-3 align-top text-right font-bold text-base">{item.quantity}</td>
              <td className="py-3 align-top text-right">
                <div className="w-5 h-5 border border-gray-400 rounded inline-block" />
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-gray-900">
            <td colSpan={3} className="pt-3 text-xs text-gray-500 font-semibold uppercase tracking-wider">Total items</td>
            <td className="pt-3 text-right font-bold text-base">
              {order.items.reduce((sum, i) => sum + i.quantity, 0)}
            </td>
            <td />
          </tr>
        </tfoot>
      </table>

      {/* Footer */}
      <div className="mt-10 pt-4 border-t border-gray-200 flex justify-between text-xs text-gray-400">
        <span>Printed: {new Date().toLocaleString()}</span>
        <span>Order #{order.id.slice(0, 8).toUpperCase()}</span>
      </div>

      <style>{`
        @media print {
          .print\\:hidden { display: none !important; }
          body { print-color-adjust: exact; }
        }
      `}</style>
    </div>
  )
}
