import { notFound } from 'next/navigation'
import Link from 'next/link'
import Badge from '@/components/Badge'
import ReorderButton from '@/components/ReorderButton'
import { db } from '@/lib/db'
import { orderStatusLabel } from '@/lib/statusLabel'
import { cookies } from 'next/headers'
import { getDictionary, type Locale, DEFAULT_LOCALE, LOCALES } from '@/lib/i18n'

export const dynamic = 'force-dynamic'

const FILE_STATUS_COLOR: Record<string, string> = {
  PENDING:   'bg-gray-100 text-gray-600',
  APPROVED:  'bg-green-100 text-green-700',
  REJECTED:  'bg-red-100 text-red-700',
  NEEDS_FIX: 'bg-orange-100 text-orange-700',
}

function AddressBlock({ label, address }: {
  label: string
  address: { name: string; street: string; city: string; zip: string; country: string; company?: string | null; phone?: string | null } | null
}) {
  if (!address) return null
  return (
    <div>
      <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">{label}</p>
      <div className="text-sm text-gray-700 leading-relaxed">
        {address.company && <p>{address.company}</p>}
        <p>{address.name}</p>
        <p>{address.street}</p>
        <p>{address.zip} {address.city}</p>
        <p>{address.country}</p>
        {address.phone && <p className="text-gray-500">{address.phone}</p>}
      </div>
    </div>
  )
}

export default async function AccountOrderDetailPage({ params }: { params: { id: string } }) {
  const userId = cookies().get('replica_uid')?.value
  if (!userId) notFound()

  const cookieLocale = cookies().get('replica_locale')?.value
  const locale: Locale = cookieLocale && LOCALES.includes(cookieLocale as Locale) ? cookieLocale as Locale : DEFAULT_LOCALE
  const dict = getDictionary(locale)
  const ta = dict.account
  const td = dict.admin

  const STATUS_MESSAGES: Record<string, { text: string; color: string }> = {
    CONFIRMED:     { text: ta.statusConfirmed,     color: 'text-blue-700 bg-blue-50 border-blue-200'     },
    UPLOADED:      { text: ta.statusUploaded,      color: 'text-yellow-700 bg-yellow-50 border-yellow-200' },
    APPROVED:      { text: ta.statusApproved,      color: 'text-green-700 bg-green-50 border-green-200'   },
    READY:         { text: ta.statusReady,         color: 'text-green-700 bg-green-50 border-green-200'   },
    IN_PRODUCTION: { text: ta.statusInProduction,  color: 'text-purple-700 bg-purple-50 border-purple-200' },
    SHIPPED:       { text: ta.statusShipped,       color: 'text-blue-700 bg-blue-50 border-blue-200'     },
    DELIVERED:     { text: ta.statusDelivered,     color: 'text-green-700 bg-green-50 border-green-200'   },
    DONE:          { text: ta.statusDone,          color: 'text-gray-700 bg-gray-50 border-gray-200'      },
    CANCELLED:     { text: ta.statusCancelled,     color: 'text-red-700 bg-red-50 border-red-200'        },
  }

  const order = await db.order.findUnique({
    where: { id: params.id },
    include: {
      shippingMethod: true,
      billingAddress: true,
      shippingAddress: true,
      items: {
        include: {
          uploadFiles: { orderBy: { uploadType: 'asc' } },
        },
      },
    },
  })

  if (!order || order.userId !== userId) notFound()

  const msg = STATUS_MESSAGES[order.status]

  const billing = order.billingAddress ?? (order.billingName ? {
    name: order.billingName,
    company: null,
    street: order.billingStreet ?? '',
    city: order.billingCity ?? '',
    zip: order.billingZip ?? '',
    country: order.billingCountry ?? '',
    phone: null,
  } : null)

  const shipping = order.shippingAddress ?? (order.shippingName ? {
    name: order.shippingName,
    company: null,
    street: order.shippingStreet ?? '',
    city: order.shippingCity ?? '',
    zip: order.shippingZip ?? '',
    country: order.shippingCountry ?? '',
    phone: null,
  } : null)

  const reorderItems = order.items.map((i) => ({
    productId: i.productId,
    variantId: i.variantId,
    width: Number(i.width),
    height: Number(i.height),
    quantity: i.quantity,
  }))

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-lg font-semibold text-gray-900">{ta.order}</h1>
        <span className="font-mono text-sm text-gray-400">{order.id.slice(0, 8)}</span>
        <Badge label={orderStatusLabel(order.status)} statusKey={order.status} />
      </div>

      {/* Status message */}
      {msg && (
        <div className={`rounded border px-4 py-3 text-sm font-medium ${msg.color}`}>
          {msg.text}
          {order.status === 'CONFIRMED' && (
            <span className="ml-2">
              <Link href={`/orders/${order.id}/upload`} className="underline">{ta.uploadNowLink}</Link>
            </span>
          )}
        </div>
      )}

      {/* Order summary */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">{ta.placed}</p>
          <p className="font-medium">{new Date(order.createdAt).toLocaleDateString(locale)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">{ta.deliveryLabel}</p>
          <p className="font-medium">{order.shippingMethod?.name ?? order.deliveryType}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">{td.shipping}</p>
          <p className="font-medium">€{Number(order.shippingPrice).toFixed(2)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">{td.total}</p>
          <p className="font-bold">€{Number(order.total).toFixed(2)}</p>
          {Number(order.taxAmount) > 0 && (
            <p className="text-xs text-gray-400 mt-0.5">
              {ta.vatIncl
                .replace('{rate}', String(Number(order.taxPercent)))
                .replace('{amount}', Number(order.taxAmount).toFixed(2))}
            </p>
          )}
        </div>
      </div>

      {/* Tracking */}
      {order.trackingNumber && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm">
          <p className="text-xs text-blue-500 uppercase tracking-wider mb-0.5">{ta.trackingLabel}</p>
          <p className="font-mono font-medium text-blue-800">{order.trackingNumber}</p>
        </div>
      )}

      {/* Addresses */}
      {(billing || shipping) && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <AddressBlock label={ta.billingAddress}  address={billing}   />
          <AddressBlock label={ta.shippingAddress} address={shipping}  />
        </div>
      )}

      {/* Items */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
          {ta.itemsSection} ({order.items.length})
        </p>
        <div className="flex flex-col gap-3">
          {order.items.map((item) => {
            const previews = item.uploadFiles.filter((u) => u.uploadType === 'PREVIEW')
            const artFiles = item.uploadFiles.filter((u) => u.uploadType !== 'PREVIEW')
            const needsAction = artFiles.some((u) => u.status === 'REJECTED' || u.status === 'NEEDS_FIX')
            return (
              <div
                key={item.id}
                className={`rounded-xl border p-4 ${needsAction ? 'border-orange-300 bg-orange-50' : 'border-gray-200 bg-white'}`}
              >
                <div className="flex justify-between items-start gap-4 mb-3">
                  <div>
                    <p className="font-medium text-sm">{item.productName}</p>
                    {item.variantName && <p className="text-xs text-gray-500">{item.variantName}</p>}
                    <p className="text-xs text-gray-400 mt-0.5">
                      {Number(item.width)} × {Number(item.height)} cm · {ta.qty} {item.quantity}
                    </p>
                  </div>
                  <p className="text-sm font-medium text-gray-700 shrink-0">
                    €{Number(item.priceSnapshot).toFixed(2)}
                  </p>
                </div>

                {previews.map((u) => (
                  <div key={u.id} className="mb-3">
                    <p className="text-xs text-gray-500 mb-1">{ta.previewLabel}</p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/api/admin/files/${u.id}`} alt={ta.previewLabel} className="max-w-xs max-h-40 object-contain rounded-xl border border-gray-200" />
                  </div>
                ))}

                {artFiles.length > 0 && (
                  <div className="flex flex-col gap-2">
                    {artFiles.map((u) => (
                      <div key={u.id} className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="text-gray-700 truncate max-w-[200px]">{u.filename}</span>
                        <span className={`rounded-md px-1.5 py-0.5 font-medium ${FILE_STATUS_COLOR[u.status] ?? 'bg-gray-100 text-gray-600'}`}>
                          {u.status}
                        </span>
                        {(u.status === 'REJECTED' || u.status === 'NEEDS_FIX') && (
                          <Link
                            href={`/upload-fix/${order.id}/${item.id}`}
                            className="underline text-orange-700 hover:text-orange-900"
                          >
                            {u.status === 'NEEDS_FIX' ? ta.fixResubmit : ta.resubmit}
                          </Link>
                        )}
                        {u.adminMessage && (
                          <span className="text-gray-500 italic">{u.adminMessage}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        {order.status === 'CONFIRMED' && (
          <Link href={`/orders/${order.id}/upload`} className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors">
            {ta.uploadFiles}
          </Link>
        )}
        {order.paymentStatus === 'PAID' && (
          <a
            href={`/api/orders/${order.id}/invoice`}
            className="text-sm px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors font-medium"
          >
            {ta.downloadInvoice}
          </a>
        )}
        <ReorderButton orderId={order.id} items={reorderItems} userId={userId} />
      </div>

      <Link href="/account/orders" className="text-sm text-gray-500 hover:text-gray-900">
        {ta.backToOrders}
      </Link>
    </div>
  )
}
