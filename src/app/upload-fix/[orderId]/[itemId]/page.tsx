import { cookies } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import Container from '@/components/Container'
import { db } from '@/lib/db'
import FixUploadClient from './FixUploadClient'

export const dynamic = 'force-dynamic'

interface Props {
  params: { orderId: string; itemId: string }
}

export default async function UploadFixPage({ params }: Props) {
  const cookieStore = cookies()
  const userId = cookieStore.get('replica_uid')?.value ?? null
  if (!userId) redirect(`/login?next=/upload-fix/${params.orderId}/${params.itemId}`)

  const order = await db.order.findUnique({
    where: { id: params.orderId },
    select: { id: true, userId: true },
  })
  if (!order || order.userId !== userId) notFound()

  const item = await db.orderItem.findUnique({
    where: { id: params.itemId },
    select: {
      id: true,
      productName: true,
      variantName: true,
      width: true,
      height: true,
      productId: true,
      uploadFiles: {
        where: { NOT: { uploadType: 'PREVIEW' } },
        select: { id: true, filename: true, status: true, adminMessage: true },
        orderBy: { uploadIndex: 'asc' },
        take: 1,
      },
    },
  })
  if (!item || item.uploadFiles.length === 0) notFound()

  const upload = item.uploadFiles[0]

  // Fetch product specs for guidelines (optional — productId may be null)
  const productSpec = item.productId
    ? await db.product.findUnique({
        where: { id: item.productId },
        select: { minDpi: true, recommendedDpi: true, bleedMm: true, safeMarginMm: true, allowedFormats: true, notes: true },
      })
    : null

  // Already re-submitted if PENDING with no admin message (awaiting review)
  const alreadyResubmitted = upload.status === 'PENDING' && !upload.adminMessage

  return (
    <Container>
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link href={`/orders/${params.orderId}`} className="text-xs text-gray-400 hover:text-gray-700 mb-3 inline-flex items-center gap-1">
            ← Order #{params.orderId.slice(0, 8).toUpperCase()}
          </Link>
          <h1 className="text-xl font-bold text-gray-900">Re-upload file</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {item.productName}{item.variantName ? ` — ${item.variantName}` : ''} ·{' '}
            {Number(item.width)} × {Number(item.height)} cm
          </p>
        </div>

        {alreadyResubmitted ? (
          <div className="rounded-xl border border-green-200 bg-green-50 p-5 text-center">
            <p className="text-sm font-semibold text-green-800 mb-1">File submitted</p>
            <p className="text-xs text-green-700 mb-3">Your file has been uploaded and is awaiting review.</p>
            <Link href={`/orders/${params.orderId}`} className="text-sm text-green-700 underline">
              View order →
            </Link>
          </div>
        ) : (
          <FixUploadClient
            orderId={params.orderId}
            itemId={params.itemId}
            currentFilename={upload.filename}
            adminMessage={upload.adminMessage}
            status={upload.status}
            product={productSpec}
          />
        )}
      </div>
    </Container>
  )
}
