import Container from '@/components/Container'
import Badge from '@/components/Badge'
import ApproveButton from '@/components/ApproveButton'
import Link from 'next/link'
import { db } from '@/lib/db'
import { type Prisma } from '@/generated/prisma/client'
import { cookies } from 'next/headers'
import { getDictionary, type Locale, DEFAULT_LOCALE, LOCALES } from '@/lib/i18n'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 20

export default async function OrdersPage({ searchParams }: { searchParams: { page?: string; q?: string } }) {
  const cookieLocale = cookies().get('replica_locale')?.value
  const locale: Locale = cookieLocale && LOCALES.includes(cookieLocale as Locale) ? cookieLocale as Locale : DEFAULT_LOCALE
  const td = getDictionary(locale).admin

  const page = Math.max(1, Number(searchParams.page ?? 1))
  const q = searchParams.q?.trim() ?? ''

  const where: Prisma.OrderWhereInput = q
    ? {
        OR: [
          { id: { startsWith: q } },
          { user: { email: { contains: q, mode: 'insensitive' } } },
        ],
      }
    : {}

  const [orders, total] = await Promise.all([
    db.order.findMany({
      where,
      select: {
        id: true,
        status: true,
        paymentStatus: true,
        deliveryType: true,
        total: true,
        createdAt: true,
        user: { select: { email: true, name: true } },
        shippingMethod: { select: { name: true } },
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.order.count({ where }),
  ])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  const buildHref = (p: number) => {
    const params = new URLSearchParams()
    if (p > 1) params.set('page', String(p))
    if (q) params.set('q', q)
    const s = params.toString()
    return `/admin/orders${s ? `?${s}` : ''}`
  }

  const tableHeaders = ['ID', td.customer, td.status, td.payment, td.delivery, td.shipping, td.total, td.items, td.created, '']

  return (
    <Container>
      <h1 className="mb-6">{td.orders}</h1>

      <form method="GET" action="/admin/orders" className="mb-4 flex gap-2 flex-wrap">
        <input
          name="q"
          defaultValue={q}
          placeholder={td.searchOrders}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 flex-1 sm:flex-none sm:w-64"
        />
        <button type="submit" className="rounded border border-gray-300 px-3 py-1.5 text-sm hover:border-gray-500">{td.search}</button>
        {q && (
          <Link href="/admin/orders" className="rounded border border-gray-200 px-3 py-1.5 text-sm text-gray-500 hover:text-gray-900">{td.clear}</Link>
        )}
      </form>

      {orders.length === 0 ? (
        <p className="text-sm text-gray-500">{q ? td.noMatchOrders : td.noOrders}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                {tableHeaders.map((h, i) => (
                  <th key={i} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link href={`/admin/orders/${o.id}`} className="font-mono text-xs text-gray-800 hover:text-red-600 underline underline-offset-2">{o.id.slice(0, 8)}</Link>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">
                    {o.user ? (
                      <span title={o.user.email}>{o.user.name ?? o.user.email}</span>
                    ) : (
                      <span className="text-gray-400">{td.guest}</span>
                    )}
                  </td>
                  <td className="px-4 py-3"><Badge label={o.status} /></td>
                  <td className="px-4 py-3"><Badge label={o.paymentStatus} /></td>
                  <td className="px-4 py-3 text-gray-600">{o.deliveryType}</td>
                  <td className="px-4 py-3 text-gray-600">{o.shippingMethod?.name ?? '—'}</td>
                  <td className="px-4 py-3 font-medium">€{Number(o.total).toFixed(2)}</td>
                  <td className="px-4 py-3 text-gray-600">{o._count.items}</td>
                  <td className="px-4 py-3 text-gray-500">{new Date(o.createdAt).toLocaleDateString(locale)}</td>
                  <td className="px-4 py-3">
                    {o.status === 'UPLOADED' && <ApproveButton orderId={o.id} />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-4 flex items-center gap-2 text-sm">
          {page > 1 && (
            <Link href={buildHref(page - 1)} className="rounded border border-gray-300 px-3 py-1.5 hover:border-gray-500">←</Link>
          )}
          <span className="text-gray-500">{td.page} {page} {td.of} {totalPages} ({total})</span>
          {page < totalPages && (
            <Link href={buildHref(page + 1)} className="rounded border border-gray-300 px-3 py-1.5 hover:border-gray-500">→</Link>
          )}
        </div>
      )}

      <div className="mt-4">
        <Link href="/admin" className="text-sm text-gray-500 hover:text-gray-900">{td.backToAdmin}</Link>
      </div>
    </Container>
  )
}
