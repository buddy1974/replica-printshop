import { type Metadata } from 'next'
import { db } from '@/lib/db'
import ProductCard from '@/components/ProductCard'
import Container from '@/components/Container'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Shop',
  description: 'Browse our full range of print products.',
  alternates: { canonical: '/shop' },
}

export default async function ShopPage() {
  const categories = await db.productCategory.findMany({
    orderBy: { sortOrder: 'asc' },
    include: {
      products: {
        where: { active: true },
        orderBy: { name: 'asc' },
        select: { id: true, name: true, slug: true, category: true, active: true, shortDescription: true },
      },
    },
  })

  const uncategorised = await db.product.findMany({
    where: { active: true, categoryId: null },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, slug: true, category: true, active: true, shortDescription: true },
  })

  const groups = categories.filter((c) => c.products.length > 0)

  return (
    <Container>
      <h1 className="mb-6">Shop</h1>

      {groups.map((cat) => (
        <section key={cat.id} className="mb-10">
          <h2 className="text-base font-semibold text-gray-700 mb-1 pb-2 border-b border-gray-200">{cat.name}</h2>
          {cat.description && (
            <p className="text-sm text-gray-500 mb-4">{cat.description}</p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            {cat.products.map((p) => (
              <ProductCard key={p.id} id={p.id} slug={p.slug} name={p.name} category={cat.name} shortDescription={p.shortDescription} />
            ))}
          </div>
        </section>
      ))}

      {uncategorised.length > 0 && (
        <section className="mb-10">
          <h2 className="text-base font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-200">Other</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {uncategorised.map((p) => (
              <ProductCard key={p.id} id={p.id} slug={p.slug} name={p.name} category={p.category} shortDescription={p.shortDescription} />
            ))}
          </div>
        </section>
      )}

      {groups.length === 0 && uncategorised.length === 0 && (
        <p className="text-sm text-gray-500">No products available.</p>
      )}
    </Container>
  )
}
