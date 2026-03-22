import Container from '@/components/Container'
import Link from 'next/link'
import { db } from '@/lib/db'
import { type Prisma } from '@/generated/prisma/client'
import { cookies } from 'next/headers'
import { getDictionary, type Locale, DEFAULT_LOCALE, LOCALES } from '@/lib/i18n'
import OrdersBatchTable from './OrdersBatchTable'

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

  // Serialize Prisma Decimal + Date for client component
  const serializedOrders = orders.map((o) => ({
    ...o,
    total: Number(o.total),
    createdAt: o.createdAt.toISOString(),
  }))

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
        <OrdersBatchTable orders={serializedOrders} locale={locale} td={td} />
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
