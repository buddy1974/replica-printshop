import { type MetadataRoute } from 'next'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

const BASE = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://replica.print').replace(/\/$/, '')

const STATIC_ROUTES: MetadataRoute.Sitemap = [
  { url: `${BASE}/`, changeFrequency: 'weekly', priority: 1.0 },
  { url: `${BASE}/shop`, changeFrequency: 'daily', priority: 0.9 },
  { url: `${BASE}/shop/graphic-installation`, changeFrequency: 'weekly', priority: 0.7 },
  { url: `${BASE}/contact`, changeFrequency: 'monthly', priority: 0.6 },
  { url: `${BASE}/about`, changeFrequency: 'monthly', priority: 0.5 },
  { url: `${BASE}/shipping`, changeFrequency: 'monthly', priority: 0.4 },
  { url: `${BASE}/payment`, changeFrequency: 'monthly', priority: 0.4 },
  { url: `${BASE}/legal`, changeFrequency: 'yearly', priority: 0.3 },
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  try {
    const [categories, products] = await Promise.all([
      db.productCategory.findMany({
        select: { slug: true },
        orderBy: { sortOrder: 'asc' },
      }),
      db.product.findMany({
        where: { active: true },
        select: { slug: true },
      }),
    ])

    const categoryRoutes: MetadataRoute.Sitemap = categories.map((c) => ({
      url: `${BASE}/shop/${c.slug}`,
      changeFrequency: 'weekly',
      priority: 0.8,
    }))

    const productRoutes: MetadataRoute.Sitemap = products.map((p) => ({
      url: `${BASE}/product/${p.slug}`,
      changeFrequency: 'weekly',
      priority: 0.7,
    }))

    return [...STATIC_ROUTES, ...categoryRoutes, ...productRoutes]
  } catch {
    return STATIC_ROUTES
  }
}
