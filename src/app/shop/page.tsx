import ProductList from '@/components/ProductList'
import Container from '@/components/Container'

interface Product {
  id: string
  name: string
  category: string
  active: boolean
}

async function getProducts(): Promise<Product[]> {
  const res = await fetch('http://localhost:3000/api/products', { cache: 'no-store' })
  if (!res.ok) return []
  return res.json()
}

export default async function ShopPage() {
  const products = await getProducts()
  const active = products.filter((p) => p.active)

  return (
    <Container>
      <h1 className="mb-6">Shop</h1>
      <ProductList products={active} />
    </Container>
  )
}
