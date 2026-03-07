import { notFound } from 'next/navigation'
import UploadForm from '@/components/UploadForm'
import Container from '@/components/Container'
import Badge from '@/components/Badge'

interface ProductGuide {
  guideText: string | null
  minDpi: number | null
  recommendedDpi: number | null
  bleedMm: number | null
  safeMarginMm: number | null
  allowedFormats: string | null
  notes: string | null
}

interface OrderItem {
  id: string
  productName: string
  variantName: string | null
  width: number
  height: number
  quantity: number
  previewUrl: string | null
}

interface Order {
  id: string
  status: string
  items: OrderItem[]
}

async function getOrder(orderId: string): Promise<Order | null> {
  const res = await fetch(`http://localhost:3000/api/orders/${orderId}`, { cache: 'no-store' })
  if (!res.ok) return null
  return res.json()
}

async function getProductGuide(productName: string): Promise<ProductGuide | null> {
  const res = await fetch('http://localhost:3000/api/products', { cache: 'no-store' })
  if (!res.ok) return null
  const products: (ProductGuide & { name: string })[] = await res.json()
  return products.find((p) => p.name === productName) ?? null
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
  const order = await getOrder(params.orderId)
  if (!order) notFound()

  const guides = await Promise.all(order.items.map((item) => getProductGuide(item.productName)))

  return (
    <Container>
      <div className="mb-6 flex items-center gap-3">
        <h1>Upload files</h1>
        <Badge label={order.status} />
        <span className="text-sm text-gray-500 font-mono">{order.id.slice(0, 8)}</span>
      </div>

      <div className="flex flex-col gap-6">
        {order.items.map((item, i) => (
          <section key={item.id} className="rounded border border-gray-200 bg-white p-5">
            <h2 className="mb-1">{item.productName}{item.variantName ? ` — ${item.variantName}` : ''}</h2>
            <p className="text-sm text-gray-500 mb-3">
              {Number(item.width)} × {Number(item.height)} cm &middot; Qty {item.quantity}
            </p>
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
