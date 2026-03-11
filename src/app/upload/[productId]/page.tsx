import { notFound } from 'next/navigation'
import Link from 'next/link'
import Container from '@/components/Container'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

async function getProduct(productId: string) {
  return db.product.findUnique({
    where: { id: productId, active: true },
    select: {
      id: true,
      name: true,
      guideText: true,
      minDpi: true,
      recommendedDpi: true,
      bleedMm: true,
      safeMarginMm: true,
      allowedFormats: true,
      notes: true,
      config: { select: { uploadInstructions: true } },
    },
  })
}

export default async function UploadLandingPage({
  params,
  searchParams,
}: {
  params: { productId: string }
  searchParams: { w?: string; h?: string }
}) {
  const product = await getProduct(params.productId)
  if (!product) notFound()

  const w = searchParams.w ? Number(searchParams.w) : null
  const h = searchParams.h ? Number(searchParams.h) : null

  const hasGuide = product.guideText || product.minDpi || product.bleedMm || product.allowedFormats || product.notes

  return (
    <Container>
      <div className="max-w-xl mx-auto">
        <h1 className="mb-1">{product.name}</h1>

        {w && h && (
          <p className="text-sm text-gray-500 mb-6">
            Size: {w} × {h} cm
          </p>
        )}

        {product.config?.uploadInstructions && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 mb-4">
            {product.config.uploadInstructions}
          </div>
        )}

        {hasGuide && (
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 mb-6">
            <p className="text-xs font-semibold text-blue-800 uppercase tracking-wider mb-2">File requirements</p>
            <div className="space-y-1 text-xs text-blue-700">
              {product.guideText && <p>{product.guideText}</p>}
              {product.minDpi && (
                <p>
                  Min DPI: {product.minDpi}
                  {product.recommendedDpi ? ` (recommended: ${product.recommendedDpi})` : ''}
                </p>
              )}
              {product.bleedMm && <p>Bleed: {product.bleedMm} mm</p>}
              {product.safeMarginMm && <p>Safe margin: {product.safeMarginMm} mm</p>}
              {product.allowedFormats && <p>Formats: {product.allowedFormats}</p>}
              {product.notes && <p className="italic">{product.notes}</p>}
            </div>
          </div>
        )}

        <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 text-center mb-6">
          <p className="text-gray-700 font-medium mb-1">Ready to upload your print file?</p>
          <p className="text-sm text-gray-500">
            Add your product to the cart and place your order. You will be able to upload your print file immediately after checkout.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <Link
            href={`/configurator/${product.id}`}
            className="btn-primary text-center"
          >
            ← Back to configurator
          </Link>
          <Link
            href="/cart"
            className="btn-secondary text-center"
          >
            Go to cart
          </Link>
        </div>
      </div>
    </Container>
  )
}
