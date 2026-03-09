// Step 289 — Admin dashboard with analytics cards
import Link from 'next/link'
import Container from '@/components/Container'
import { getAnalytics } from '@/lib/analytics'

export const dynamic = 'force-dynamic'

const fmt = (n: number) => `€${n.toFixed(2)}`

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded border border-gray-200 bg-white p-4">
      <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-2xl font-semibold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">{title}</h2>
      {children}
    </section>
  )
}

const navLinks = [
  { href: '/admin/products', label: 'Products', desc: 'Manage product catalogue' },
  { href: '/admin/orders', label: 'Orders', desc: 'View all orders' },
  { href: '/admin/production', label: 'Production', desc: 'Production queue' },
  { href: '/admin/shipping', label: 'Shipping rules', desc: 'Configure shipping prices' },
  { href: '/admin/categories', label: 'Categories', desc: 'Edit category names and descriptions' },
]

export default async function AdminPage() {
  let analytics
  try {
    analytics = await getAnalytics()
  } catch {
    analytics = null
  }

  const a = analytics

  return (
    <Container>
      <h1 className="mb-6">Admin</h1>

      {a ? (
        <>
          {/* Revenue — steps 281, 287 */}
          <Section title="Revenue (paid orders)">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard label="Total" value={fmt(a.revenue.total)} />
              <StatCard label="Today" value={fmt(a.revenue.today)} />
              <StatCard label="This month" value={fmt(a.revenue.month)} />
              <StatCard label="Avg order" value={fmt(a.revenue.avg)} />
            </div>
          </Section>

          {/* Orders — steps 282, 288 */}
          <Section title="Orders">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 mb-3">
              <StatCard label="Total" value={a.orders.total} />
              <StatCard label="Today" value={a.orders.today} />
              <StatCard label="This month" value={a.orders.month} />
              <StatCard label="Standard" value={a.orders.byDelivery.STANDARD} />
              <StatCard label="Express" value={a.orders.byDelivery.EXPRESS} />
              <StatCard label="Pickup" value={a.orders.byDelivery.PICKUP} />
            </div>
          </Section>

          {/* Production — step 283 */}
          <Section title="Production">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard label="Queued" value={a.production.queued} />
              <StatCard label="In progress" value={a.production.inProgress} />
              <StatCard label="Done" value={a.production.done} />
              <StatCard label="Failed" value={a.production.failed} />
            </div>
          </Section>

          {/* Uploads — step 284 */}
          <Section title="Uploads">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <StatCard label="Pending" value={a.uploads.pending} />
              <StatCard label="Approved" value={a.uploads.approved} />
              <StatCard label="Rejected" value={a.uploads.rejected} />
            </div>
          </Section>

          {/* Top products + categories — steps 285, 286 */}
          <div className="grid gap-4 mb-6 sm:grid-cols-2">
            <div className="rounded border border-gray-200 bg-white overflow-hidden">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 pt-4 pb-2">Top products</p>
              <table className="w-full text-sm">
                <tbody className="divide-y divide-gray-100">
                  {a.topProducts.length === 0 && (
                    <tr><td className="px-4 py-3 text-gray-400 text-xs">No data yet</td></tr>
                  )}
                  {a.topProducts.map((p) => (
                    <tr key={p.name}>
                      <td className="px-4 py-2 text-gray-700 truncate max-w-[180px]">{p.name}</td>
                      <td className="px-4 py-2 text-right font-medium text-gray-900">{p.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="rounded border border-gray-200 bg-white overflow-hidden">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 pt-4 pb-2">Top categories</p>
              <table className="w-full text-sm">
                <tbody className="divide-y divide-gray-100">
                  {a.topCategories.length === 0 && (
                    <tr><td className="px-4 py-3 text-gray-400 text-xs">No data yet</td></tr>
                  )}
                  {a.topCategories.map((c) => (
                    <tr key={c.name}>
                      <td className="px-4 py-2 text-gray-700 truncate max-w-[180px]">{c.name}</td>
                      <td className="px-4 py-2 text-right font-medium text-gray-900">{c.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <p className="text-sm text-gray-400 mb-6">Analytics unavailable.</p>
      )}

      {/* Navigation */}
      <Section title="Manage">
        <div className="grid gap-3">
          {navLinks.map(({ href, label, desc }) => (
            <Link key={href} href={href} className="flex items-center justify-between rounded border border-gray-200 bg-white p-4 hover:border-gray-400 transition-colors">
              <div>
                <p className="font-medium text-sm">{label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
              </div>
              <span className="text-gray-400 text-sm">→</span>
            </Link>
          ))}
        </div>
      </Section>
    </Container>
  )
}
