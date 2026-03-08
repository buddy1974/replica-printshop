import Container from '@/components/Container'
import Badge from '@/components/Badge'
import ApproveButton from '@/components/ApproveButton'
import Link from 'next/link'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export default async function OrdersPage() {
  const orders = await db.order.findMany({
    include: { items: true, shippingMethod: true },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <Container>
      <h1 className="mb-6">Orders</h1>
      {orders.length === 0 ? (
        <p className="text-sm text-gray-500">No orders yet.</p>
      ) : (
        <div className="overflow-x-auto rounded border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                {['ID', 'Status', 'Payment', 'Delivery', 'Shipping', 'Total', 'Items', 'Created', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link href={`/admin/orders/${o.id}`} className="font-mono text-xs text-blue-600 hover:underline">{o.id.slice(0, 8)}</Link>
                  </td>
                  <td className="px-4 py-3"><Badge label={o.status} /></td>
                  <td className="px-4 py-3"><Badge label={o.paymentStatus} /></td>
                  <td className="px-4 py-3 text-gray-600">{o.deliveryType}</td>
                  <td className="px-4 py-3 text-gray-600">{o.shippingMethod?.name ?? '—'}</td>
                  <td className="px-4 py-3 font-medium">€{Number(o.total).toFixed(2)}</td>
                  <td className="px-4 py-3 text-gray-600">{o.items.length}</td>
                  <td className="px-4 py-3 text-gray-500">{new Date(o.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    {o.status === 'UPLOADED' && <ApproveButton orderId={o.id} />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="mt-4">
        <Link href="/admin" className="text-sm text-gray-500 hover:text-gray-900">← Back to admin</Link>
      </div>
    </Container>
  )
}
