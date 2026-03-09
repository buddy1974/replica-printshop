import ProductCard from '@/components/ProductCard'

interface Product {
  id: string
  slug: string
  name: string
  category: string
}

export default function ProductList({ products }: { products: Product[] }) {
  if (products.length === 0) {
    return <p className="text-sm text-gray-500">No products available.</p>
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {products.map((p) => (
        <ProductCard key={p.id} id={p.id} slug={p.slug} name={p.name} category={p.category} />
      ))}
    </div>
  )
}
