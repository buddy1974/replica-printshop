import Link from 'next/link'
import Container from '@/components/Container'
import Badge from '@/components/Badge'
import { db } from '@/lib/db'
import { orderStatusLabel } from '@/lib/statusLabel'

export const dynamic = 'force-dynamic'

export default async function OrdersPage({ searchParams }: { searchParams: { userId?: string } }) {
  const userId = searchParams.userId ?? null

  const orders = userId
    ? await db.order.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      })
    : []

  return (
    <Container>
      <h1 className="mb-6">My orders</h1>

      {!userId && (
        <p className="text-sm text-gray-500">No user session. Append <code>?userId=…</code> to the URL.</p>
      )}

      {userId && orders.length === 0 && (
        <p className="text-sm text-gray-500">No orders yet.</p>
      )}

      {orders.length > 0 && (
        <div className="overflow-x-auto rounded border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                {['Order', 'Status', 'Total', 'Date'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link href={`/orders/${o.id}`} className="font-mono text-xs text-blue-600 hover:underline">
                      {o.id.slice(0, 8)}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Badge label={orderStatusLabel(o.status)} statusKey={o.status} />
                  </td>
                  <td className="px-4 py-3 font-medium">€{Number(o.total).toFixed(2)}</td>
                  <td className="px-4 py-3 text-gray-500">{new Date(o.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Container>
  )
}
