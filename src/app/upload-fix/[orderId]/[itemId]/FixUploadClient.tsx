'use client'

import { useState, useRef, useCallback } from 'react'
import Link from 'next/link'

interface ProductSpec {
  minDpi: number | null
  recommendedDpi: number | null
  bleedMm: number | null
  safeMarginMm: number | null
  allowedFormats: string | null
  notes: string | null
}

interface Props {
  orderId: string
  itemId: string
  currentFilename: string
  adminMessage: string | null
  status: string
  product: ProductSpec | null
}

export default function FixUploadClient({ orderId, itemId, currentFilename, adminMessage, status, product }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const upload = useCallback(async (file: File) => {
    setUploading(true)
    setError(null)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch(`/api/upload-fix/${orderId}/${itemId}`, { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Upload failed. Please try again.')
      } else {
        setDone(true)
      }
    } catch {
      setError('Connection error. Please try again.')
    } finally {
      setUploading(false)
    }
  }, [orderId, itemId])

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) upload(file)
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) upload(file)
  }

  if (done) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-center">
        <p className="text-sm font-semibold text-green-800 mb-1">File uploaded successfully</p>
        <p className="text-xs text-green-700 mb-4">Your file has been submitted and is awaiting review by our team.</p>
        <Link href={`/orders/${orderId}`} className="text-sm text-green-700 underline">
          View order →
        </Link>
      </div>
    )
  }

  const statusLabel = status === 'REJECTED' ? 'rejected' : 'needs changes'
  const statusColor = status === 'REJECTED'
    ? 'border-red-200 bg-red-50 text-red-800'
    : 'border-orange-200 bg-orange-50 text-orange-800'

  return (
    <div className="space-y-4">
      {/* Status banner */}
      <div className={`rounded-xl border p-4 ${statusColor}`}>
        <p className="text-sm font-semibold mb-1">
          Your file was {statusLabel}
        </p>
        <p className="text-xs opacity-80 mb-1">
          Current file: <span className="font-mono">{currentFilename}</span>
        </p>
        {adminMessage && (
          <div className="mt-2 pt-2 border-t border-current/20">
            <p className="text-xs font-semibold mb-0.5">Message from our team:</p>
            <p className="text-sm">{adminMessage}</p>
          </div>
        )}
      </div>

      {/* File requirements */}
      {product && (product.minDpi || product.bleedMm || product.allowedFormats || product.notes) && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <p className="text-xs font-semibold text-blue-800 uppercase tracking-wider mb-2">File requirements</p>
          <div className="space-y-1 text-xs text-blue-700">
            {product.minDpi && (
              <p>Min DPI: <strong>{product.minDpi}</strong>
                {product.recommendedDpi ? ` (recommended: ${product.recommendedDpi})` : ''}
              </p>
            )}
            {product.bleedMm && <p>Bleed: {product.bleedMm} mm</p>}
            {product.safeMarginMm && <p>Safe margin: {product.safeMarginMm} mm</p>}
            {product.allowedFormats && <p>Formats: {product.allowedFormats}</p>}
            {product.notes && <p className="italic">{product.notes}</p>}
          </div>
        </div>
      )}

      {/* Drop zone */}
      <div
        className={[
          'rounded-xl border-2 border-dashed p-10 text-center cursor-pointer transition-colors',
          dragging ? 'border-red-400 bg-red-50' : 'border-gray-300 hover:border-gray-400 bg-white',
        ].join(' ')}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.svg"
          className="hidden"
          onChange={onInputChange}
        />
        {uploading ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-gray-200 border-t-red-600 rounded-full animate-spin" />
            <p className="text-sm text-gray-500">Uploading…</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <svg className="w-10 h-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            <div>
              <p className="font-medium text-gray-700">Drop corrected file here</p>
              <p className="text-xs text-gray-400 mt-0.5">PDF, PNG, JPG, SVG · max 50 MB</p>
            </div>
            <span className="text-xs text-red-600 font-medium underline">Browse files</span>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <a href={`/orders/${orderId}`} className="block text-center text-sm text-gray-400 hover:text-gray-700">
        ← Back to order
      </a>
    </div>
  )
}
