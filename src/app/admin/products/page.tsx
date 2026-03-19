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
        <div className="overflow-x-auto card">
          <table className="table-base">
            <thead>
              <tr>
                {tableHeaders.map((h, i) => (
                  <th key={i}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td className="w-10">
                    {p.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.imageUrl} alt="" loading="lazy" className="w-7 h-7 object-cover rounded border border-gray-200" />
                    ) : (
                      <div className="w-7 h-7 rounded border border-gray-200 bg-gray-100" />
                    )}
                  </td>
                  <td className="font-medium">{p.name}</td>
                  <td className="font-mono text-xs text-gray-400">{p.slug}</td>
                  <td className="text-gray-600 text-xs">{p.category}</td>
                  <td>
                    <Badge label={p.active ? td.active : td.inactive} color={p.active ? 'green' : 'gray'} />
                  </td>
                  <td>
                    <Link href={`/admin/products/${p.id}`} className="text-xs text-gray-500 hover:text-red-600 font-medium">{td.edit}</Link>
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
