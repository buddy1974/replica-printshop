'use client'

// Step 402 — Full-image popup modal

import { useEffect } from 'react'

interface Props {
  src: string
  alt: string
  onClose: () => void
}

export default function ImageModal({ src, alt, onClose }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-xl shadow-2xl p-3 max-w-4xl max-h-[90vh] flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={src}
          alt={alt}
          className="max-w-full max-h-[82vh] object-contain rounded-lg"
        />
        <button
          type="button"
          onClick={onClose}
          className="absolute -top-3 -right-3 w-7 h-7 rounded-full bg-gray-900 text-white text-sm font-bold flex items-center justify-center hover:bg-gray-700 shadow-md"
          aria-label="Close"
        >
          ×
        </button>
      </div>
    </div>
  )
}
