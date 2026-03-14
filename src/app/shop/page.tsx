import { type Metadata } from 'next'
import Link from 'next/link'
import { db } from '@/lib/db'
import Container from '@/components/Container'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'Shop',
  description: 'Browse our full range of print products.',
  alternates: { canonical: '/shop' },
}

type ShopCategory = {
  id: string
  name: string
  slug: string
  description: string | null
  imageUrl: string | null
  _count: { products: number }
}

export default async function ShopPage() {
  let categories: ShopCategory[] = []

  try {
    categories = await db.productCategory.findMany({
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        imageUrl: true,
        _count: { select: { products: { where: { active: true } } } },
      },
    })
  } catch {
    // DB unavailable at build time — page will regenerate on first request
  }

  const visible = categories.filter((c) => c._count.products > 0)

  return (
    <Container>
      <div className="mb-8">
        <h1 className="mb-1">Shop</h1>
        <p className="text-sm text-gray-500">Browse our full range of print products and display solutions.</p>
      </div>

      {visible.length === 0 ? (
        <p className="text-sm text-gray-500">No products available.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {visible.map((cat) => (
            <Link
              key={cat.id}
              href={`/shop/${cat.slug}`}
              className="group rounded-xl border border-gray-200 bg-white overflow-hidden hover:border-red-300 hover:shadow-sm transition-all"
            >
              <div className="aspect-[4/3] bg-gray-100 flex items-center justify-center overflow-hidden">
                {cat.imageUrl ? (
                  <img
                    src={cat.imageUrl}
                    alt={cat.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <img src="/placeholder.svg" alt="" className="w-16 h-16 opacity-30" />
                )}
              </div>
              <div className="p-3">
                <p className="font-semibold text-sm leading-tight">{cat.name}</p>
                {cat.description && (
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-snug">{cat.description}</p>
                )}
                <p className="text-xs text-gray-400 mt-2 group-hover:text-gray-700 transition-colors">
                  {cat._count.products} {cat._count.products === 1 ? 'product' : 'products'} →
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
      {/* ── Services ──────────────────────────────────────────────────────── */}
      <div className="mt-12">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Services</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          <Link
            href="/shop/graphic-installation"
            className="group rounded-xl border border-gray-200 bg-white overflow-hidden hover:border-red-300 hover:shadow-sm transition-all"
          >
            <div className="aspect-[4/3] bg-gray-100 flex items-center justify-center overflow-hidden">
              <img
                src="/products/graphic-installation-hero.png"
                alt="Graphic Installation"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </div>
            <div className="p-3">
              <p className="font-semibold text-sm leading-tight">Graphic Installation</p>
              <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-snug">
                Car lettering, window foil, signs, banners and event graphics.
              </p>
              <p className="text-xs text-gray-400 mt-2 group-hover:text-gray-700 transition-colors">View service →</p>
            </div>
          </Link>
          <Link
            href="/shop/graphic-design-layout"
            className="group rounded-xl border border-gray-200 bg-white overflow-hidden hover:border-red-300 hover:shadow-sm transition-all"
          >
            <div className="aspect-[4/3] bg-gray-100 flex items-center justify-center overflow-hidden">
              <img
                src="/images/products/design-services.png"
                alt="Graphic Design & Layout"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </div>
            <div className="p-3">
              <p className="font-semibold text-sm leading-tight">Graphic Design &amp; Layout</p>
              <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-snug">
                Professional layout and design for flyers, brochures, banners, logos, and print materials.
              </p>
              <p className="text-xs text-gray-400 mt-2 group-hover:text-gray-700 transition-colors">View service →</p>
            </div>
          </Link>
        </div>
      </div>
    </Container>
  )
}
