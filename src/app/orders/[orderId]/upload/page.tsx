import { notFound } from 'next/navigation'
import UploadForm from '@/components/UploadForm'
import Container from '@/components/Container'
import Badge from '@/components/Badge'
import { db } from '@/lib/db'
import { orderStatusLabel } from '@/lib/statusLabel'

export const dynamic = 'force-dynamic'

interface ProductGuide {
  guideText: string | null
  minDpi: number | null
  recommendedDpi: number | null
  bleedMm: number | null
  safeMarginMm: number | null
  allowedFormats: string | null
  notes: string | null
}

function GuidePanel({ guide }: { guide: ProductGuide }) {
  const hasGuide = guide.guideText || guide.minDpi || guide.bleedMm || guide.allowedFormats || guide.notes
  if (!hasGuide) return null

  return (
    <div className="rounded border border-blue-200 bg-blue-50 p-3 mt-3">
      <p className="text-xs font-semibold text-blue-800 mb-1">File requirements</p>
      <div className="space-y-0.5 text-xs text-blue-700">
        {guide.guideText && <p>{guide.guideText}</p>}
        {guide.minDpi && <p>Min DPI: {guide.minDpi}{guide.recommendedDpi ? ` (rec. ${guide.recommendedDpi})` : ''}</p>}
        {guide.bleedMm && <p>Bleed: {guide.bleedMm} mm</p>}
        {guide.allowedFormats && <p>Formats: {guide.allowedFormats}</p>}
      </div>
    </div>
  )
}

export default async function UploadPage({ params }: { params: { orderId: string } }) {
  const order = await db.order.findUnique({
    where: { id: params.orderId },
    include: { items: true },
  })
  if (!order) notFound()

  const guides = await Promise.all(
    order.items.map((item) =>
      db.product.findFirst({
        where: { name: item.productName },
        select: {
          guideText: true, minDpi: true, recommendedDpi: true, bleedMm: true,
          safeMarginMm: true, allowedFormats: true, notes: true,
          config: { select: { uploadInstructions: true } },
        },
      })
    )
  )

  return (
    <Container>
      <div className="mb-6 flex items-center gap-3">
        <h1>Upload files</h1>
        <Badge label={orderStatusLabel(order.status)} statusKey={order.status} />
        <span className="text-sm text-gray-500 font-mono">{order.id.slice(0, 8)}</span>
      </div>

      <div className="flex flex-col gap-6">
        {order.items.map((item, i) => (
          <section key={item.id} className="rounded border border-gray-200 bg-white p-5">
            <h2 className="mb-1">{item.productName}{item.variantName ? ` — ${item.variantName}` : ''}</h2>
            <p className="text-sm text-gray-500 mb-3">
              {Number(item.width)} × {Number(item.height)} cm &middot; Qty {item.quantity}
            </p>
            {guides[i]?.config?.uploadInstructions && (
              <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2 mt-3 text-xs text-amber-800">
                {guides[i]!.config!.uploadInstructions}
              </div>
            )}
            {guides[i] && <GuidePanel guide={guides[i]!} />}
            <div className="mt-4">
              <UploadForm orderItemId={item.id} initialPreviewUrl={item.previewUrl} />
            </div>
          </section>
        ))}
      </div>
    </Container>
  )
}
