import { notFound } from 'next/navigation'
import { type Metadata } from 'next'
import ConfiguratorForm from '@/components/ConfiguratorForm'
import Container from '@/components/Container'
import { db } from '@/lib/db'

export const revalidate = 60

interface Option {
  id: string
  name: string
  values: { id: string; name: string; priceModifier: number }[]
}

interface Variant {
  id: string
  name: string
  material: string
  basePrice: number
}

interface ProductConfig {
  hasCustomSize: boolean
  hasFixedSizes: boolean
  hasVariants: boolean
  hasOptions: boolean
  fixedSizes: string | null
  minWidth: number | null
  maxWidth: number | null
  minHeight: number | null
  maxHeight: number | null
  pickupAllowed: boolean | null
  maxWidthCm: number | null
  maxHeightCm: number | null
  rollWidthCm: number | null
  dtfMaxWidthCm: number | null
  printAreaWidthCm: number | null
  printAreaHeightCm: number | null
  placementMode: string | null
  isTextile: boolean
  isRoll: boolean
  isCut: boolean
  needsPlacement: boolean
  helpText: string | null
}

interface Product {
  id: string
  name: string
  slug: string
  imageUrl: string | null
  variants: Variant[]
  options: Option[]
  pricingRules: { pricePerM2: number; minPrice: number; expressMultiplier: number }[]
  config: ProductConfig | null
  description: string | null
  guideText: string | null
  minDpi: number | null
  recommendedDpi: number | null
  bleedMm: number | null
  safeMarginMm: number | null
  allowedFormats: string | null
  notes: string | null
}

async function getProduct(slug: string): Promise<Product | null> {
  const p = await db.product.findUnique({
    where: { slug, active: true },
    include: {
      variants: true,
      options: { include: { values: true } },
      pricingRules: true,
      config: true,
    },
  })
  if (!p) return null
  return {
    ...p,
    imageUrl: p.imageUrl ?? null,
    variants: p.variants.map((v) => ({ ...v, basePrice: Number(v.basePrice) })),
    options: p.options.map((o) => ({
      ...o,
      values: o.values.map((val) => ({ ...val, priceModifier: Number(val.priceModifier) })),
    })),
    pricingRules: p.pricingRules.map((r) => ({
      ...r,
      pricePerM2: Number(r.pricePerM2),
      minPrice: Number(r.minPrice),
      expressMultiplier: Number(r.expressMultiplier),
    })),
    config: p.config ? {
      hasCustomSize: p.config.hasCustomSize,
      hasFixedSizes: p.config.hasFixedSizes,
      hasVariants: p.config.hasVariants,
      hasOptions: p.config.hasOptions,
      fixedSizes: p.config.fixedSizes,
      minWidth: p.config.minWidth,
      maxWidth: p.config.maxWidth,
      minHeight: p.config.minHeight,
      maxHeight: p.config.maxHeight,
      pickupAllowed: p.config.pickupAllowed,
      maxWidthCm: p.config.maxWidthCm != null ? Number(p.config.maxWidthCm) : null,
      maxHeightCm: p.config.maxHeightCm != null ? Number(p.config.maxHeightCm) : null,
      rollWidthCm: p.config.rollWidthCm != null ? Number(p.config.rollWidthCm) : null,
      dtfMaxWidthCm: p.config.dtfMaxWidthCm != null ? Number(p.config.dtfMaxWidthCm) : null,
      printAreaWidthCm: p.config.printAreaWidthCm != null ? Number(p.config.printAreaWidthCm) : null,
      printAreaHeightCm: p.config.printAreaHeightCm != null ? Number(p.config.printAreaHeightCm) : null,
      placementMode: p.config.placementMode,
      isTextile: p.config.isTextile,
      isRoll: p.config.isRoll,
      isCut: p.config.isCut,
      needsPlacement: p.config.needsPlacement,
      helpText: p.config.helpText,
    } : null,
  }
}

function ProductGuide({ product }: { product: Product }) {
  const hasGuide = product.guideText || product.minDpi || product.bleedMm || product.allowedFormats || product.notes
  if (!hasGuide) return null

  return (
    <section className="rounded border border-blue-200 bg-blue-50 p-4 mb-6">
      <h2 className="text-sm font-semibold text-blue-800 mb-2">File requirements</h2>
      <dl className="space-y-1 text-sm text-blue-700">
        {product.guideText && <p>{product.guideText}</p>}
        {product.minDpi && (
          <div className="flex gap-2">
            <dt className="font-medium">Min DPI:</dt>
            <dd>{product.minDpi}{product.recommendedDpi ? ` (recommended: ${product.recommendedDpi})` : ''}</dd>
          </div>
        )}
        {product.bleedMm && (
          <div className="flex gap-2"><dt className="font-medium">Bleed:</dt><dd>{product.bleedMm} mm</dd></div>
        )}
        {product.safeMarginMm && (
          <div className="flex gap-2"><dt className="font-medium">Safe margin:</dt><dd>{product.safeMarginMm} mm</dd></div>
        )}
        {product.allowedFormats && (
          <div className="flex gap-2"><dt className="font-medium">Formats:</dt><dd>{product.allowedFormats}</dd></div>
        )}
        {product.notes && <p className="italic">{product.notes}</p>}
      </dl>
    </section>
  )
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const p = await db.product.findUnique({
    where: { slug: params.slug, active: true },
    select: { name: true, metaTitle: true, metaDescription: true, description: true },
  })
  if (!p) return {}
  const title = p.metaTitle ?? p.name
  const description = p.metaDescription ?? p.description ?? undefined
  return {
    title,
    description,
    openGraph: { title, description },
    alternates: { canonical: `/product/${params.slug}` },
  }
}

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const product = await getProduct(params.slug)
  if (!product) notFound()

  return (
    <Container>
      {product.imageUrl && (
        <div className="mb-6 rounded-lg overflow-hidden border border-gray-200 max-w-xs">
          <img src={product.imageUrl} alt={product.name} className="w-full object-cover aspect-[4/3]" loading="lazy" />
        </div>
      )}
      <h1 className="mb-2">{product.name}</h1>
      {product.description && (
        <p className="text-sm text-gray-600 mb-4 leading-relaxed">{product.description}</p>
      )}
      {product.config?.helpText && (
        <div className="mb-4 rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {product.config.helpText}
        </div>
      )}
      <ProductGuide product={product} />
      <ConfiguratorForm product={product} />
    </Container>
  )
}
