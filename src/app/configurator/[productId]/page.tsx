import { notFound } from 'next/navigation'
import ConfiguratorForm from '@/components/ConfiguratorForm'
import Container from '@/components/Container'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

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
}

interface Product {
  id: string
  name: string
  variants: Variant[]
  options: Option[]
  pricingRules: { pricePerM2: number; minPrice: number; expressMultiplier: number }[]
  config: ProductConfig | null
  guideText: string | null
  minDpi: number | null
  recommendedDpi: number | null
  bleedMm: number | null
  safeMarginMm: number | null
  allowedFormats: string | null
  notes: string | null
}

async function getProduct(productId: string): Promise<Product | null> {
  const p = await db.product.findUnique({
    where: { id: productId, active: true },
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

export default async function ConfiguratorPage({ params }: { params: { productId: string } }) {
  const product = await getProduct(params.productId)
  if (!product) notFound()

  return (
    <Container>
      <h1 className="mb-2">{product.name}</h1>
      <ProductGuide product={product} />
      <ConfiguratorForm product={product} />
    </Container>
  )
}
