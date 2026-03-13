import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

const STATUS_COLOR: Record<string, string> = {
  PENDING:   'bg-gray-100 text-gray-600',
  APPROVED:  'bg-green-100 text-green-700',
  REJECTED:  'bg-red-100 text-red-700',
  NEEDS_FIX: 'bg-orange-100 text-orange-700',
}

export default async function UploadsPage() {
  const userId = cookies().get('replica_uid')?.value
  if (!userId) notFound()

  // Get all non-preview upload files from user's orders
  const orders = await db.order.findMany({
    where: { userId },
    select: {
      id: true,
      createdAt: true,
      items: {
        select: {
          id: true,
          productName: true,
          uploadFiles: {
            where: { NOT: { uploadType: 'PREVIEW' } },
            orderBy: { uploadIndex: 'asc' },
            select: {
              id: true,
              filename: true,
              status: true,
              mime: true,
              size: true,
              dpi: true,
              adminMessage: true,
              uploadType: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  // Flatten into a list of items that have uploads
  const rows = orders.flatMap((order) =>
    order.items
      .filter((item) => item.uploadFiles.length > 0)
      .map((item) => ({ order, item }))
  )

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold text-gray-900">Uploaded files</h1>

      {rows.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-6 text-sm text-gray-500">
          No uploaded files yet. Files uploaded for orders will appear here.
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {rows.map(({ order, item }) => (
            <div key={item.id} className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <p className="text-sm font-medium text-gray-800">{item.productName}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Order{' '}
                    <Link href={`/account/orders/${order.id}`} className="underline hover:text-gray-700">
                      {order.id.slice(0, 8)}
                    </Link>
                    {' · '}{new Date(order.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <Link
                  href={`/account/orders/${order.id}`}
                  className="text-xs px-2 py-1 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors shrink-0"
                >
                  View order
                </Link>
              </div>

              <div className="flex flex-col gap-2">
                {item.uploadFiles.map((f) => (
                  <div key={f.id} className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-gray-700 font-medium truncate max-w-[200px]">{f.filename}</span>
                    <span className={`rounded-md px-1.5 py-0.5 font-medium ${STATUS_COLOR[f.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {f.status}
                    </span>
                    {f.dpi && <span className="text-gray-400">{f.dpi} DPI</span>}
                    {f.size && <span className="text-gray-400">{(f.size / 1024 / 1024).toFixed(1)} MB</span>}
                    {f.adminMessage && (
                      <span className="text-gray-500 italic">&ldquo;{f.adminMessage}&rdquo;</span>
                    )}
                    {(f.status === 'REJECTED' || f.status === 'NEEDS_FIX') && (
                      <Link
                        href={`/upload-fix/${order.id}/${item.id}`}
                        className="text-orange-700 underline hover:text-orange-900"
                      >
                        {f.status === 'NEEDS_FIX' ? 'Fix & resubmit →' : 'Resubmit →'}
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
