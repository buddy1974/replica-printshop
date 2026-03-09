import { notFound } from 'next/navigation'
import { type Metadata } from 'next'
import { db } from '@/lib/db'
import ProductCard from '@/components/ProductCard'
import Container from '@/components/Container'
import CategoryFooter from '@/components/CategoryFooter'
import Link from 'next/link'

export const revalidate = 60

export async function generateMetadata({ params }: { params: { categorySlug: string } }): Promise<Metadata> {
  const cat = await db.productCategory.findUnique({
    where: { slug: params.categorySlug },
    select: { name: true, metaTitle: true, metaDescription: true, description: true },
  })
  if (!cat) return {}
  const title = cat.metaTitle ?? cat.name
  const description = cat.metaDescription ?? cat.description ?? undefined
  return {
    title,
    description,
    openGraph: { title, description },
    alternates: { canonical: `/shop/${params.categorySlug}` },
  }
}

export default async function CategoryShopPage({ params }: { params: { categorySlug: string } }) {
  const cat = await db.productCategory.findUnique({
    where: { slug: params.categorySlug },
    include: {
      products: {
        where: { active: true },
        orderBy: { name: 'asc' },
        select: { id: true, name: true, slug: true, category: true, shortDescription: true, imageUrl: true },
      },
    },
  })
  if (!cat) notFound()

  return (
    <Container>
      {cat.imageUrl && (
        <div className="w-full aspect-[3/1] rounded-lg overflow-hidden mb-6 bg-gray-100">
          <img
            src={cat.imageUrl}
            alt={cat.name}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <h1 className="mb-2">{cat.name}</h1>
      {cat.description && (
        <p className="text-sm text-gray-500 mb-6">{cat.description}</p>
      )}
      {cat.products.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cat.products.map((p) => (
            <ProductCard key={p.id} id={p.id} slug={p.slug} name={p.name} category={cat.name} shortDescription={p.shortDescription} imageUrl={p.imageUrl} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500">No products in this category.</p>
      )}
      <div className="mt-8">
        <Link href="/shop" className="text-sm text-gray-500 hover:text-gray-900">← All products</Link>
      </div>
      <CategoryFooter />
    </Container>
  )
}
