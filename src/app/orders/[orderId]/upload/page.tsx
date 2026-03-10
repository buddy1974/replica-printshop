import { notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import Link from 'next/link'
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
    <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 mt-3">
      <p className="text-xs font-semibold text-blue-800 uppercase tracking-wider mb-2">File requirements</p>
      <div className="space-y-1 text-xs text-blue-700">
        {guide.guideText && <p>{guide.guideText}</p>}
        {guide.minDpi && <p>Min DPI: {guide.minDpi}{guide.recommendedDpi ? ` (recommended: ${guide.recommendedDpi})` : ''}</p>}
        {guide.bleedMm && <p>Bleed: {guide.bleedMm} mm</p>}
        {guide.safeMarginMm && <p>Safe margin: {guide.safeMarginMm} mm</p>}
        {guide.allowedFormats && <p>Formats: {guide.allowedFormats}</p>}
      </div>
    </div>
  )
}

export default async function UploadPage({ params }: { params: { orderId: string } }) {
  const cookieStore = cookies()
  const viewerId = cookieStore.get('replica_uid')?.value ?? ''

  const order = await db.order.findUnique({
    where: { id: params.orderId },
    include: { items: true },
  })
  if (!order) notFound()
  if (order.userId && order.userId !== viewerId) notFound()

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
      <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div>
          <p className="text-xs text-gray-400 mb-0.5">Upload files</p>
          <div className="flex items-center gap-2">
            <h1 className="font-mono">{order.id.slice(0, 8)}</h1>
            <Badge label={orderStatusLabel(order.status)} statusKey={order.status} />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-5">
        {order.items.map((item, i) => (
          <section key={item.id} className="rounded-xl border border-gray-200 bg-white p-5">
            <p className="font-semibold text-gray-900">
              {item.productName}{item.variantName ? ` — ${item.variantName}` : ''}
            </p>
            <p className="text-sm text-gray-500 mt-0.5 mb-4">
              {Number(item.width)} × {Number(item.height)} cm · Qty {item.quantity}
            </p>

            {guides[i]?.config?.uploadInstructions && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 mb-3">
                {guides[i]!.config!.uploadInstructions}
              </div>
            )}
            {guides[i] && <GuidePanel guide={guides[i]!} />}

            <div className="mt-5">
              <UploadForm orderItemId={item.id} initialPreviewUrl={item.previewUrl} />
            </div>
          </section>
        ))}
      </div>

      <div className="mt-6">
        <Link href={`/orders/${order.id}`} className="btn-ghost">
          ← Back to order
        </Link>
      </div>
      </div>
    </Container>
  )
}
