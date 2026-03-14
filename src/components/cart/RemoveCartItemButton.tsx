'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  itemId: string
  /** Called after successful removal instead of router.refresh(). */
  onRemoved?: (id: string) => void
  /** 'icon' = compact X button (checkout summary), 'text' = "Remove" link (cart page) */
  variant?: 'icon' | 'text'
}

export default function RemoveCartItemButton({ itemId, onRemoved, variant = 'text' }: Props) {
  const router = useRouter()
  const [removing, setRemoving] = useState(false)

  const handleRemove = async () => {
    setRemoving(true)
    try {
      const res = await fetch(`/api/cart/item/${itemId}`, { method: 'DELETE' })
      if (res.ok) {
        if (onRemoved) {
          onRemoved(itemId)
        } else {
          router.refresh()
        }
      }
    } catch {
      // ignore network errors silently
    } finally {
      setRemoving(false)
    }
  }

  if (variant === 'icon') {
    return (
      <button
        type="button"
        onClick={handleRemove}
        disabled={removing}
        title="Remove item"
        className="w-5 h-5 flex items-center justify-center rounded text-red-500 hover:text-red-700 hover:bg-red-50 disabled:opacity-40 transition-colors"
        aria-label="Remove item"
      >
        {removing ? (
          <span className="text-xs leading-none">…</span>
        ) : (
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        )}
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={handleRemove}
      disabled={removing}
      className="text-xs text-gray-400 hover:text-red-600 transition-colors disabled:opacity-40"
      aria-label="Remove item"
    >
      {removing ? '…' : 'Remove'}
    </button>
  )
}
