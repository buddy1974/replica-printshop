import Link from 'next/link'
import Container from '@/components/Container'
import Badge from '@/components/Badge'
import { db } from '@/lib/db'
import { type Prisma } from '@/generated/prisma/client'
import { cookies } from 'next/headers'
import { getDictionary, type Locale, DEFAULT_LOCALE, LOCALES } from '@/lib/i18n'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 20

export default async function ProductsPage({ searchParams }: { searchParams: { page?: string; q?: string } }) {
  const cookieLocale = cookies().get('replica_locale')?.value
  const locale: Locale = cookieLocale && LOCALES.includes(cookieLocale as Locale) ? cookieLocale as Locale : DEFAULT_LOCALE
  const td = getDictionary(locale).admin

  const page = Math.max(1, Number(searchParams.page ?? 1))
  const q = searchParams.q?.trim() ?? ''

  const where: Prisma.ProductWhereInput = q
    ? { name: { contains: q, mode: 'insensitive' } }
    : {}

  const [products, total] = await Promise.all([
    db.product.findMany({
      where,
      select: { id: true, name: true, slug: true, category: true, active: true, imageUrl: true },
      orderBy: { name: 'asc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.product.count({ where }),
  ])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  const buildHref = (p: number) => {
    const params = new URLSearchParams()
    if (p > 1) params.set('page', String(p))
    if (q) params.set('q', q)
    const s = params.toString()
    return `/admin/products${s ? `?${s}` : ''}`
  }

  const tableHeaders = ['', td.name, td.slug, td.category, td.status, '']

  return (
    <Container>
      <div className="flex items-center justify-between mb-6">
        <h1>{td.products}</h1>
        <Link href="/admin/products/new" className="btn-primary">
          {td.newProduct}
        </Link>
      </div>

      <form method="GET" action="/admin/products" className="mb-4 flex gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder={td.searchProducts}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 w-64"
        />
        <button type="submit" className="rounded border border-gray-300 px-3 py-1.5 text-sm hover:border-gray-500">{td.search}</button>
        {q && (
          <Link href="/admin/products" className="rounded border border-gray-200 px-3 py-1.5 text-sm text-gray-500 hover:text-gray-900">{td.clear}</Link>
        )}
      </form>

      {products.length === 0 ? (
        <p className="text-sm text-gray-500">{q ? td.noMatchProducts : td.noProducts}</p>
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
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 w-10">
                    {p.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.imageUrl} alt="" loading="lazy" className="w-8 h-8 object-cover rounded border border-gray-200" />
                    ) : (
                      <div className="w-8 h-8 rounded border border-gray-200 bg-gray-100" />
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{p.slug}</td>
                  <td className="px-4 py-3 text-gray-600">{p.category}</td>
                  <td className="px-4 py-3">
                    <Badge label={p.active ? td.active : td.inactive} color={p.active ? 'green' : 'gray'} />
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/products/${p.id}`} className="text-sm text-gray-500 hover:text-gray-900">{td.edit}</Link>
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
