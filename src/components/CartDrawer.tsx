'use client'

import { useCart } from '@/context/CartContext'
import Image from 'next/image'

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4h6v2" />
    </svg>
  )
}

function XIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

export default function CartDrawer() {
  const { items, count, total, isOpen, closeDrawer, removeItem } = useCart()

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40"
          onClick={closeDrawer}
          aria-hidden="true"
        />
      )}

      {/* Drawer panel */}
      <div
        className={[
          'fixed top-0 right-0 h-full w-full max-w-sm bg-white shadow-2xl z-50 flex flex-col',
          'transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
        aria-label="Shopping cart"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-900">Your Cart</span>
            {count > 0 && (
              <span className="bg-red-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {count > 9 ? '9+' : count}
              </span>
            )}
          </div>
          <button
            onClick={closeDrawer}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            aria-label="Close cart"
          >
            <XIcon />
          </button>
        </div>

        {/* Item list */}
        <div className="flex-1 overflow-y-auto">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400 px-6">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
              </svg>
              <p className="text-sm">Your cart is empty</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {items.map((item) => {
                // Use design preview only if the preview file was actually saved
                const imgSrc = item.design?.preview
                  ? `/api/design/${item.design.id}/preview`
                  : item.product.imageUrl ?? null
                const lineTotal = (item.priceSnapshot * item.quantity).toFixed(2)
                const size = item.width && item.height ? `${item.width}×${item.height} cm` : null

                return (
                  <li key={item.id} className="flex gap-3 px-5 py-4">
                    {/* Thumbnail */}
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 shrink-0 border border-gray-200">
                      {imgSrc ? (
                        <Image
                          src={imgSrc}
                          alt={item.product.name}
                          width={64}
                          height={64}
                          className="w-full h-full object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">
                          No img
                        </div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{item.product.name}</p>
                      {item.variant && (
                        <p className="text-xs text-gray-500">{item.variant.name}</p>
                      )}
                      {size && <p className="text-xs text-gray-400">{size}</p>}
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-gray-500">Qty: {item.quantity}</span>
                        <span className="text-sm font-semibold text-gray-900">€{lineTotal}</span>
                      </div>
                    </div>

                    {/* Remove */}
                    <button
                      onClick={() => removeItem(item.id)}
                      className="p-1.5 text-red-600 hover:text-red-700 transition-colors self-start shrink-0"
                      aria-label="Remove item"
                    >
                      <TrashIcon />
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-gray-200 px-5 py-4 space-y-3 shrink-0">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Subtotal</span>
              <span className="text-base font-bold text-gray-900">€{total.toFixed(2)}</span>
            </div>
            <a
              href="/cart"
              onClick={closeDrawer}
              className="block w-full py-2.5 rounded-lg border border-gray-300 text-center text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              View Cart →
            </a>
            <a
              href="/checkout"
              onClick={closeDrawer}
              className="block w-full py-2.5 rounded-lg bg-red-600 text-center text-sm font-semibold text-white hover:bg-red-700 transition-colors"
            >
              Checkout →
            </a>
          </div>
        )}
      </div>
    </>
  )
}
