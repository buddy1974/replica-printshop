import Link from 'next/link'
import Container from '@/components/Container'
import Badge from '@/components/Badge'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export default async function ProductsPage() {
  const products = await db.product.findMany({ orderBy: { name: 'asc' } })

  return (
    <Container>
      <div className="flex items-center justify-between mb-6">
        <h1>Products</h1>
        <Link href="/admin/products/new" className="inline-flex items-center rounded bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-700 transition-colors">
          + New product
        </Link>
      </div>
      <div className="overflow-x-auto rounded border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              {['Name', 'Slug', 'Category', 'Status', ''].map((h, i) => (
                <th key={i} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {products.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50">
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
      <div className="mt-4">
        <Link href="/admin" className="text-sm text-gray-500 hover:text-gray-900">← Back to admin</Link>
      </div>
    </Container>
  )
}
