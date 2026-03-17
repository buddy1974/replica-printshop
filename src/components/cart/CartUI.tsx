'use client'

import Link from 'next/link'
import { useLocale } from '@/context/LocaleContext'
import RemoveCartItemButton from '@/components/cart/RemoveCartItemButton'
import ImagePlaceholder from '@/components/ImagePlaceholder'

interface CartItem {
  id: string
  productName: string
  variantName: string | null
  width: number
  height: number
  quantity: number
  priceSnapshot: number
  imageUrl: string | null
  design: { id: string; preview: string | null; preflightScore: number | null } | null
  pendingUpload: { id: string; filename: string; validStatus: string; blobUrl: string | null; mime: string | null } | null
}

function scoreBadge(score: number | null | undefined) {
  if (score == null) return null
  const label = score >= 80 ? 'Good' : score >= 50 ? 'Warn' : 'Risky'
  const cls = score >= 80 ? 'bg-green-100 text-green-700'
    : score >= 50 ? 'bg-yellow-100 text-yellow-700'
    : 'bg-red-100 text-red-700'
  return <span className={`inline-block text-xs px-1.5 py-0.5 rounded-md ${cls}`}>{score} {label}</span>
}

export default function CartUI({ items, subtotal }: { items: CartItem[]; subtotal: number }) {
  const { t } = useLocale()
  const tc = t.checkout

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-5 text-center">
        <svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-200">
          <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
          <line x1="3" y1="6" x2="21" y2="6" />
          <path d="M16 10a4 4 0 01-8 0" />
        </svg>
        <div>
          <p className="text-gray-800 font-semibold text-lg mb-1">{tc.cartEmpty}</p>
          <p className="text-sm text-gray-500">{tc.cartEmptyDesc}</p>
        </div>
        <Link href="/shop" className="btn-primary">
          {tc.goToShop} →
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start">

      {/* Items */}
      <div className="flex-1 rounded-xl border border-gray-200 bg-white overflow-hidden">

        {/* Mobile card list */}
        <div className="sm:hidden divide-y divide-gray-100">
          {items.map((item) => {
            const previewUrl = item.design?.preview
              ? `/api/design/${item.design.id}/preview`
              : (item.pendingUpload?.blobUrl && item.pendingUpload.mime?.startsWith('image/'))
                ? item.pendingUpload.blobUrl
                : item.imageUrl
            const lineTotal = item.priceSnapshot * item.quantity
            const size = item.width > 0 && item.height > 0 ? `${item.width} × ${item.height} cm` : null

            return (
              <div key={item.id} className="p-4 flex gap-3 items-start">
                {previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={previewUrl} alt="preview" className="w-12 h-12 object-contain rounded-lg border border-gray-200 bg-gray-50 shrink-0" />
                ) : (
                  <ImagePlaceholder className="w-12 h-12 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-gray-800 truncate">{item.productName}</p>
                  {item.variantName && <p className="text-xs text-gray-500">{item.variantName}</p>}
                  <p className="text-xs text-gray-400 mt-0.5">
                    {size ? `${size} · ` : ''}{tc.qty} {item.quantity}
                  </p>
                  {item.design && (
                    <span className="inline-block mt-0.5 text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-md">
                      {tc.customDesign}
                    </span>
                  )}
                  {item.design && scoreBadge(item.design.preflightScore)}
                  {item.pendingUpload && (
                    <span className={[
                      'inline-block mt-0.5 text-xs px-1.5 py-0.5 rounded-md',
                      item.pendingUpload.validStatus === 'OK' ? 'bg-green-100 text-green-700' :
                      item.pendingUpload.validStatus === 'WARNING' ? 'bg-yellow-100 text-yellow-700' :
                      item.pendingUpload.validStatus === 'INVALID' ? 'bg-red-100 text-red-700' :
                      'bg-blue-100 text-blue-700',
                    ].join(' ')}>
                      {tc.fileUploaded}
                    </span>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <p className="text-sm font-semibold text-gray-900">€{lineTotal.toFixed(2)}</p>
                  <RemoveCartItemButton itemId={item.id} />
                </div>
              </div>
            )
          })}
        </div>

        {/* Desktop table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                {[tc.preview, tc.product, tc.size, tc.qty, tc.price, tc.total, ''].map((h, i) => (
                  <th key={i} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((item) => {
                const previewUrl = item.design?.preview
                  ? `/api/design/${item.design.id}/preview`
                  : (item.pendingUpload?.blobUrl && item.pendingUpload.mime?.startsWith('image/'))
                    ? item.pendingUpload.blobUrl
                    : item.imageUrl
                const lineTotal = item.priceSnapshot * item.quantity

                return (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      {previewUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={previewUrl} alt="preview" className="w-14 h-14 object-contain rounded-lg border border-gray-200 bg-gray-50" />
                      ) : (
                        <ImagePlaceholder className="w-14 h-14" />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">{item.productName}</p>
                      {item.variantName && <p className="text-xs text-gray-500">{item.variantName}</p>}
                      {item.design && (
                        <span className="inline-block mt-0.5 text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-md">
                          {tc.customDesign}
                        </span>
                      )}
                      {item.design && scoreBadge(item.design.preflightScore)}
                      {item.pendingUpload && (
                        <span className={[
                          'inline-block mt-0.5 text-xs px-1.5 py-0.5 rounded-md',
                          item.pendingUpload.validStatus === 'OK' ? 'bg-green-100 text-green-700' :
                          item.pendingUpload.validStatus === 'WARNING' ? 'bg-yellow-100 text-yellow-700' :
                          item.pendingUpload.validStatus === 'INVALID' ? 'bg-red-100 text-red-700' :
                          'bg-blue-100 text-blue-700',
                        ].join(' ')}>
                          {tc.fileUploaded}: {item.pendingUpload.filename.slice(0, 20)}{item.pendingUpload.filename.length > 20 ? '…' : ''}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {item.width > 0 && item.height > 0 ? `${item.width} × ${item.height} cm` : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-800">{item.quantity}</td>
                    <td className="px-4 py-3 text-gray-600">€{item.priceSnapshot.toFixed(2)}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">€{lineTotal.toFixed(2)}</td>
                    <td className="px-4 py-3"><RemoveCartItemButton itemId={item.id} /></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Totals card */}
      <div className="w-full lg:w-72 shrink-0 rounded-xl border border-gray-200 bg-white p-5">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">{tc.orderSummary}</p>
        <div className="flex flex-col gap-3 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>{tc.subtotal}</span>
            <span>€{subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-gray-400 text-xs">
            <span>{tc.shipping}</span>
            <span>{tc.calculatedAtCheckout}</span>
          </div>
          <div className="flex justify-between font-bold text-gray-900 text-base border-t border-gray-200 pt-3 mt-1">
            <span>{tc.total}</span>
            <span>€{subtotal.toFixed(2)}</span>
          </div>
        </div>
        <div className="mt-5 flex flex-col gap-2">
          <Link href="/checkout" className="btn-primary justify-center">
            {tc.proceedToCheckout} →
          </Link>
          <Link href="/shop" className="btn-ghost justify-center">
            {tc.continueShopping}
          </Link>
        </div>
      </div>

    </div>
  )
}
