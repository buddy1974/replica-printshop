import { notFound } from 'next/navigation'
import { type Metadata } from 'next'
import Link from 'next/link'
import ConfiguratorForm from '@/components/ConfiguratorForm'
import Container from '@/components/Container'
import CategoryFooter from '@/components/CategoryFooter'
import ProductImageGallery from '@/components/ProductImageGallery'
import { db } from '@/lib/db'

export const revalidate = 60

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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
  type: string
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
  category: string
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
  specs: unknown
  // Step 435 — gallery images (populated when available)
  images: string[]
}

// ---------------------------------------------------------------------------
// Data fetching
// ---------------------------------------------------------------------------

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
    // gallery: parse from specs if it contains an { images: [] } key, else empty
    images: (() => {
      const s = p.specs
      if (s && typeof s === 'object' && !Array.isArray(s) && Array.isArray((s as Record<string, unknown>).images)) {
        return (s as Record<string, string[]>).images
      }
      return []
    })(),
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
      type: p.config.type,
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

// ---------------------------------------------------------------------------
// Sub-components (server, no state needed)
// ---------------------------------------------------------------------------

// Step 434 — Expanded specs: Material, Size, Print method, Options
function SpecsSection({ product }: { product: Product }) {
  const rows: { label: string; value: string }[] = []

  if (product.config?.type) {
    rows.push({ label: 'Print type', value: product.config.type })
  }

  // Material from variants
  if (product.variants.length > 0) {
    const seen = new Set<string>()
    const mats = product.variants.map((v) => v.material).filter((m): m is string => Boolean(m) && !seen.has(m) && (seen.add(m), true))
    if (mats.length > 0) rows.push({ label: 'Material', value: mats.join(', ') })
  }

  // Size info — prefer fixed sizes, then max dims, then print area
  if (product.config?.fixedSizes) {
    rows.push({ label: 'Sizes', value: product.config.fixedSizes })
  } else if (product.config?.maxWidthCm && product.config?.maxHeightCm) {
    rows.push({ label: 'Max size', value: `${product.config.maxWidthCm} × ${product.config.maxHeightCm} cm` })
  } else if (product.config?.printAreaWidthCm && product.config?.printAreaHeightCm) {
    rows.push({ label: 'Print area', value: `${product.config.printAreaWidthCm} × ${product.config.printAreaHeightCm} cm` })
  }

  // Options list
  if (product.options.length > 0) {
    rows.push({
      label: 'Options',
      value: product.options.map((o) => o.name).join(', '),
    })
  }

  const extraSpecs = Array.isArray(product.specs) ? (product.specs as string[]) : null
  const hasContent = rows.length > 0 || extraSpecs || product.notes

  if (!hasContent) return null

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Specifications</p>
      {rows.length > 0 && (
        <dl className="space-y-1.5 text-sm mb-3">
          {rows.map(({ label, value }) => (
            <div key={label} className="flex gap-2">
              <dt className="font-medium text-gray-500 w-24 shrink-0">{label}</dt>
              <dd className="text-gray-800">{value}</dd>
            </div>
          ))}
        </dl>
      )}
      {extraSpecs && extraSpecs.length > 0 && (
        <ul className="space-y-1">
          {extraSpecs.map((spec, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0 mt-1.5" />
              {String(spec)}
            </li>
          ))}
        </ul>
      )}
      {product.notes && !extraSpecs && (
        <p className="text-sm text-gray-600 italic">{product.notes}</p>
      )}
    </div>
  )
}

// File preparation guide
function FileGuide({ product }: { product: Product }) {
  const has = product.guideText || product.minDpi || product.bleedMm || product.allowedFormats
  if (!has) return null

  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
      <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-2">File requirements</p>
      <dl className="space-y-1 text-sm text-blue-800">
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
      </dl>
    </div>
  )
}

// Step 436 — Price info block
function PriceInfo({ product }: { product: Product }) {
  const minVariant = product.variants.length > 0
    ? Math.min(...product.variants.map((v) => v.basePrice))
    : null
  const minRule = product.pricingRules.length > 0
    ? Math.min(...product.pricingRules.map((r) => r.minPrice))
    : null
  const price = minVariant ?? minRule
  const isPerM2 = minVariant === null && minRule !== null

  if (!price) return null

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <p className="text-xs text-gray-500 mb-1">Starting price</p>
      <p className="text-2xl font-bold text-gray-900">
        {price.toFixed(2)}&nbsp;€
        {isPerM2 && <span className="text-sm font-normal text-gray-500 ml-1">/m²</span>}
      </p>
      <p className="text-xs text-gray-400 mt-1">Final price depends on size and options</p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const p = await db.product.findUnique({
    where: { slug: params.slug, active: true },
    select: { name: true, metaTitle: true, metaDescription: true, description: true, imageUrl: true },
  })
  if (!p) return {}
  const title = p.metaTitle ?? p.name
  const description = p.metaDescription ?? p.description ?? undefined
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: p.imageUrl ? [{ url: p.imageUrl, alt: title }] : [],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: description ?? undefined,
      images: p.imageUrl ? [p.imageUrl] : undefined,
    },
    alternates: { canonical: `/product/${params.slug}` },
  }
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const product = await getProduct(params.slug)
  if (!product) notFound()

  return (
    <Container>

      {/* Step 433 — 2-column layout: image left, details right */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">

        {/* Left — image + gallery */}
        <div>
          {product.imageUrl ? (
            <ProductImageGallery
              mainUrl={product.imageUrl}
              name={product.name}
              extraImages={product.images}
            />
          ) : (
            <div className="aspect-square rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-center text-gray-300">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="w-16 h-16">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="m21 15-5-5L5 21" />
              </svg>
            </div>
          )}
        </div>

        {/* Right — details */}
        <div className="flex flex-col gap-4">
          {/* Category + title */}
          <div>
            <p className="text-xs font-semibold text-red-600 uppercase tracking-wider mb-1">
              {product.category}
            </p>
            <h1 className="text-2xl font-bold text-gray-900 leading-tight mb-2">
              {product.name}
            </h1>
            {product.description && (
              <p className="text-sm text-gray-600 leading-relaxed">{product.description}</p>
            )}
          </div>

          {/* Help text */}
          {product.config?.helpText && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {product.config.helpText}
            </div>
          )}

          {/* Step 434 — Specs */}
          <SpecsSection product={product} />

          {/* Step 436 — Price block */}
          <PriceInfo product={product} />

          {/* File guide */}
          <FileGuide product={product} />

          {/* CTA: configure & order */}
          <div className="flex flex-col gap-2 pt-1">
            <Link href={`/editor/${product.id}`} className="btn-primary justify-center">
              Design & Order →
            </Link>
          </div>
        </div>
      </div>

      {/* Configurator */}
      <div id="configurator" className="rounded-xl border border-gray-200 bg-white p-6 mb-6">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-5">Configure & Order</p>
        <ConfiguratorForm product={product} />
      </div>

      {/* Step 438 — Footer info block */}
      <CategoryFooter />
    </Container>
  )
}
