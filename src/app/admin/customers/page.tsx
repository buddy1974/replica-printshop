import Link from 'next/link'
import Container from '@/components/Container'
import { db } from '@/lib/db'
import { type Prisma } from '@/generated/prisma/client'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 30

export default async function CustomersPage({ searchParams }: { searchParams: { page?: string; q?: string } }) {
  const page = Math.max(1, Number(searchParams.page ?? 1))
  const q = searchParams.q?.trim() ?? ''

  const where: Prisma.UserWhereInput = q
    ? {
        OR: [
          { email: { contains: q, mode: 'insensitive' } },
          { name: { contains: q, mode: 'insensitive' } },
        ],
      }
    : {}

  const [users, total] = await Promise.all([
    db.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        isAdmin: true,
        createdAt: true,
        _count: { select: { orders: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.user.count({ where }),
  ])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  const buildHref = (p: number) => {
    const params = new URLSearchParams()
    if (p > 1) params.set('page', String(p))
    if (q) params.set('q', q)
    const s = params.toString()
    return `/admin/customers${s ? `?${s}` : ''}`
  }

  return (
    <Container>
      <h1 className="mb-6">Customers</h1>

      <form method="GET" action="/admin/customers" className="mb-4 flex gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search by name or email…"
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 w-64"
        />
        <button type="submit" className="rounded border border-gray-300 px-3 py-1.5 text-sm hover:border-gray-500">
          Search
        </button>
        {q && (
          <Link href="/admin/customers" className="rounded border border-gray-200 px-3 py-1.5 text-sm text-gray-500 hover:text-gray-900">
            Clear
          </Link>
        )}
      </form>

      {users.length === 0 ? (
        <p className="text-sm text-gray-500">{q ? 'No customers match that search.' : 'No customers yet.'}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                {['Email', 'Name', 'Orders', 'Role', 'Joined'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-800">{u.email}</td>
                  <td className="px-4 py-3 text-gray-600">{u.name ?? <span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/orders?q=${encodeURIComponent(u.email)}`} className="text-gray-800 hover:text-red-600 underline underline-offset-2">
                      {u._count.orders}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    {u.isAdmin ? (
                      <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-700">Admin</span>
                    ) : (
                      <span className="text-gray-400 text-xs">Customer</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{new Date(u.createdAt).toLocaleDateString()}</td>
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
    </Container>
  )
}
