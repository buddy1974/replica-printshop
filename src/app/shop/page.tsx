import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'
import ProductList from '@/components/ProductList'
import Container from '@/components/Container'

export default async function ShopPage() {
  const products = await db.product.findMany({
    where: { active: true },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, category: true, active: true },
  })

  return (
    <Container>
      <h1 className="mb-6">Shop</h1>
      <ProductList products={products} />
    </Container>
  )
}
