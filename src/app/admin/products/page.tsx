import Link from 'next/link'
import Container from '@/components/Container'
import Badge from '@/components/Badge'
import { db } from '@/lib/db'
import { type Prisma } from '@/generated/prisma/client'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 20

export default async function ProductsPage({ searchParams }: { searchParams: { page?: string; q?: string } }) {
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

  return (
    <Container>
      <div className="flex items-center justify-between mb-6">
        <h1>Products</h1>
        <Link href="/admin/products/new" className="btn-primary">
          + New product
        </Link>
      </div>

      <form method="GET" action="/admin/products" className="mb-4 flex gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search by name…"
          className="rounded border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 w-64"
        />
        <button type="submit" className="rounded border border-gray-300 px-3 py-1.5 text-sm hover:border-gray-500">Search</button>
        {q && (
          <Link href="/admin/products" className="rounded border border-gray-200 px-3 py-1.5 text-sm text-gray-500 hover:text-gray-900">Clear</Link>
        )}
      </form>

      {products.length === 0 ? (
        <p className="text-sm text-gray-500">{q ? 'No products match that search.' : 'No products yet. Create your first product above.'}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                {['', 'Name', 'Slug', 'Category', 'Status', ''].map((h, i) => (
                  <th key={i} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 w-10">
                    {p.imageUrl ? (
                      <img src={p.imageUrl} alt="" loading="lazy" className="w-8 h-8 object-cover rounded border border-gray-200" />
                    ) : (
                      <div className="w-8 h-8 rounded border border-gray-200 bg-gray-100" />
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{p.slug}</td>
                  <td className="px-4 py-3 text-gray-600">{p.category}</td>
                  <td className="px-4 py-3">
                    <Badge label={p.active ? 'Active' : 'Inactive'} color={p.active ? 'green' : 'gray'} />
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/products/${p.id}`} className="text-sm text-gray-500 hover:text-gray-900">Edit →</Link>
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
            <Link href={buildHref(page - 1)} className="rounded border border-gray-300 px-3 py-1.5 hover:border-gray-500">← Prev</Link>
          )}
          <span className="text-gray-500">Page {page} of {totalPages} ({total} total)</span>
          {page < totalPages && (
            <Link href={buildHref(page + 1)} className="rounded border border-gray-300 px-3 py-1.5 hover:border-gray-500">Next →</Link>
          )}
        </div>
      )}

      <div className="mt-4">
        <Link href="/admin" className="text-sm text-gray-500 hover:text-gray-900">← Back to admin</Link>
      </div>
    </Container>
  )
}
