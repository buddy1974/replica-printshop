// Step 289 — Admin dashboard with analytics cards
import Link from 'next/link'
import Container from '@/components/Container'
import { getAnalytics } from '@/lib/analytics'
import { cookies } from 'next/headers'
import { getDictionary, type Locale, DEFAULT_LOCALE, LOCALES } from '@/lib/i18n'

export const dynamic = 'force-dynamic'

const fmt = (n: number) => `€${n.toFixed(2)}`

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="card p-4">
      <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900 tabular-nums">{value}</p>
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

export default async function AdminPage() {
  const cookieLocale = cookies().get('replica_locale')?.value
  const locale: Locale = cookieLocale && LOCALES.includes(cookieLocale as Locale) ? cookieLocale as Locale : DEFAULT_LOCALE
  const td = getDictionary(locale).admin

  const navLinks = [
    { href: '/admin/products', label: td.products, desc: td.manageProducts },
    { href: '/admin/orders', label: td.orders, desc: td.viewAllOrders },
    { href: '/admin/production', label: td.production, desc: td.productionQueue },
    { href: '/admin/shipping', label: td.shippingRules, desc: td.configShipping },
    { href: '/admin/tax', label: td.taxVat, desc: td.configVat },
    { href: '/admin/categories', label: td.categories, desc: td.editCategories },
  ]

  let analytics
  try {
    analytics = await getAnalytics()
  } catch {
    analytics = null
  }

  const a = analytics

  return (
    <Container>
      <h1 className="mb-6">{td.title}</h1>

      {a ? (
        <>
          <Section title={td.revenue}>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard label={td.total} value={fmt(a.revenue.total)} />
              <StatCard label={td.today} value={fmt(a.revenue.today)} />
              <StatCard label={td.thisMonth} value={fmt(a.revenue.month)} />
              <StatCard label={td.avgOrder} value={fmt(a.revenue.avg)} />
            </div>
          </Section>

          <Section title={td.orders}>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 mb-3">
              <StatCard label={td.total} value={a.orders.total} />
              <StatCard label={td.today} value={a.orders.today} />
              <StatCard label={td.thisMonth} value={a.orders.month} />
              <StatCard label={td.standard} value={a.orders.byDelivery.STANDARD} />
              <StatCard label={td.express} value={a.orders.byDelivery.EXPRESS} />
              <StatCard label={td.pickup} value={a.orders.byDelivery.PICKUP} />
            </div>
          </Section>

          <Section title={td.production}>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard label={td.queued} value={a.production.queued} />
              <StatCard label={td.inProgress} value={a.production.inProgress} />
              <StatCard label={td.done} value={a.production.done} />
              <StatCard label={td.failed} value={a.production.failed} />
            </div>
          </Section>

          <Section title={td.uploads}>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <StatCard label={td.pending} value={a.uploads.pending} />
              <StatCard label={td.approved} value={a.uploads.approved} />
              <StatCard label={td.rejected} value={a.uploads.rejected} />
            </div>
          </Section>

          <div className="grid gap-4 mb-6 sm:grid-cols-2">
            <div className="card overflow-hidden">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-4 pt-4 pb-2">{td.topProducts}</p>
              <table className="w-full text-sm">
                <tbody className="divide-y divide-gray-100">
                  {a.topProducts.length === 0 && (
                    <tr><td className="px-4 py-3 text-gray-400 text-xs">{td.noData}</td></tr>
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

            <div className="card overflow-hidden">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-4 pt-4 pb-2">{td.topCategories}</p>
              <table className="w-full text-sm">
                <tbody className="divide-y divide-gray-100">
                  {a.topCategories.length === 0 && (
                    <tr><td className="px-4 py-3 text-gray-400 text-xs">{td.noData}</td></tr>
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
        <p className="text-sm text-gray-400 mb-6">{td.analyticsUnavailable}</p>
      )}

      <Section title={td.manage}>
        <div className="grid gap-3">
          {navLinks.map(({ href, label, desc }) => (
            <Link key={href} href={href} className="card flex items-center justify-between p-4 hover:border-red-200 hover:shadow-md transition-all">
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
