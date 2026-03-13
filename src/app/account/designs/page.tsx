import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import DeleteDesignButton from './DeleteDesignButton'
import AddToCartForm from './AddToCartForm'

export const dynamic = 'force-dynamic'

export default async function DesignsPage() {
  const userId = cookies().get('replica_uid')?.value
  if (!userId) notFound()

  const designs = await db.design.findMany({
    where: { userId },
    include: {
      cartItems: { select: { id: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  // Resolve product names in a single query
  const productIds = Array.from(new Set(designs.map((d) => d.productId)))
  const products = await db.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, name: true },
  })
  const productMap = Object.fromEntries(products.map((p) => [p.id, p.name]))

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold text-gray-900">Saved designs</h1>

      {designs.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-6 text-sm text-gray-500">
          No saved designs yet. Use the editor to create and save designs.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {designs.map((design) => (
            <div key={design.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              {/* Preview */}
              <div className="aspect-video bg-gray-50 flex items-center justify-center overflow-hidden">
                {design.preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`/api/design/${design.id}/preview`}
                    alt="Design preview"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <span className="text-xs text-gray-400">No preview</span>
                )}
              </div>

              {/* Info + actions */}
              <div className="p-4">
                <p className="text-sm font-medium text-gray-800 mb-0.5">
                  {productMap[design.productId] ?? 'Unknown product'}
                </p>
                <p className="text-xs text-gray-400 mb-3">
                  {new Date(design.createdAt).toLocaleDateString()}
                </p>

                <AddToCartForm designId={design.id} productId={design.productId} />

                <div className="mt-3 flex items-center justify-between">
                  <a
                    href={`/editor/${design.productId}`}
                    className="text-xs text-gray-500 hover:text-gray-800 underline"
                  >
                    Open editor
                  </a>
                  <DeleteDesignButton id={design.id} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
