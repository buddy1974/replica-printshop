'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface ProductInfo {
  id: string
  name: string
  minDpi: number | null
  recommendedDpi: number | null
  bleedMm: number | null
  safeMarginMm: number | null
  allowedFormats: string | null
  notes: string | null
  uploadInstructions: string | null
}

interface Config {
  widthCm: number
  heightCm: number
  quantity: number
  variantId: string | null
  optionValueIds: string[]
  placement: string | null
  express: boolean
}

interface UploadResult {
  id: string
  filename: string
  size: number | null
  mime: string | null
  dpi: number | null
  widthPx: number | null
  heightPx: number | null
  validStatus: string
}

interface Props {
  product: ProductInfo
  config: Config
}

const STATUS_COLORS: Record<string, string> = {
  OK:      'text-green-700 bg-green-50 border-green-200',
  WARNING: 'text-yellow-700 bg-yellow-50 border-yellow-200',
  INVALID: 'text-red-700 bg-red-50 border-red-200',
  PENDING: 'text-blue-700 bg-blue-50 border-blue-200',
}

const STATUS_LABELS: Record<string, string> = {
  OK:      'File looks good',
  WARNING: 'Low resolution — may print blurry',
  INVALID: 'Resolution too low for print',
  PENDING: 'File accepted (resolution not checked)',
}

export default function UploadClient({ product, config }: Props) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<UploadResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [addingToCart, setAddingToCart] = useState(false)

  const handleFile = useCallback(async (file: File) => {
    setError(null)
    setResult(null)
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('productId', product.id)
      if (config.widthCm)  form.append('widthCm',  String(config.widthCm))
      if (config.heightCm) form.append('heightCm', String(config.heightCm))

      const res = await fetch('/api/upload/pending', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Upload failed')
      } else {
        setResult(data as UploadResult)
      }
    } catch {
      setError('Connection error. Please try again.')
    } finally {
      setUploading(false)
    }
  }, [product.id, config.widthCm, config.heightCm])

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const addToCart = async () => {
    if (!result) return
    setAddingToCart(true)
    setError(null)
    try {
      const res = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          variantId: config.variantId ?? undefined,
          width: config.widthCm,
          height: config.heightCm,
          quantity: config.quantity,
          express: config.express,
          optionValueIds: config.optionValueIds.length ? config.optionValueIds : undefined,
          placement: config.placement ?? undefined,
          pendingUploadId: result.id,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Could not add to cart')
        setAddingToCart(false)
      } else {
        router.push('/cart')
      }
    } catch {
      setError('Connection error. Please try again.')
      setAddingToCart(false)
    }
  }

  const hasGuide = product.minDpi || product.bleedMm || product.allowedFormats || product.notes

  return (
    <div className="max-w-xl mx-auto">
      {/* Product + config summary */}
      <div className="mb-6">
        <p className="text-xs text-gray-400 mb-1">Uploading for</p>
        <h1 className="text-xl font-bold text-gray-900 mb-1">{product.name}</h1>
        <p className="text-sm text-gray-500">
          {config.widthCm} × {config.heightCm} cm
          {config.quantity > 1 ? ` · Qty ${config.quantity}` : ''}
        </p>
      </div>

      {/* Custom upload instructions */}
      {product.uploadInstructions && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 mb-4">
          {product.uploadInstructions}
        </div>
      )}

      {/* File requirements */}
      {hasGuide && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 mb-5">
          <p className="text-xs font-semibold text-blue-800 uppercase tracking-wider mb-2">File requirements</p>
          <div className="space-y-1 text-xs text-blue-700">
            {product.minDpi && (
              <p>
                Min DPI: <strong>{product.minDpi}</strong>
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
      {!result && (
        <div
          className={[
            'rounded-xl border-2 border-dashed p-10 text-center cursor-pointer transition-colors mb-4',
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
                <p className="font-medium text-gray-700">Drop your file here</p>
                <p className="text-xs text-gray-400 mt-0.5">PDF, PNG, JPG, SVG · max 50 MB</p>
              </div>
              <span className="text-xs text-red-600 font-medium underline">Browse files</span>
            </div>
          )}
        </div>
      )}

      {/* Upload result */}
      {result && (
        <div className="mb-5 space-y-3">
          {/* File row */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center shrink-0 text-gray-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">{result.filename}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {result.size ? `${(result.size / 1024).toFixed(0)} KB` : ''}
                {result.widthPx && result.heightPx ? ` · ${result.widthPx} × ${result.heightPx} px` : ''}
                {result.dpi ? ` · ${result.dpi} DPI` : ''}
              </p>
            </div>
            <button
              onClick={() => { setResult(null); setError(null) }}
              className="text-xs text-gray-400 hover:text-gray-700 shrink-0"
            >
              Change
            </button>
          </div>

          {/* Validation status */}
          <div className={`rounded-xl border px-4 py-3 text-sm font-medium ${STATUS_COLORS[result.validStatus] ?? STATUS_COLORS.PENDING}`}>
            {STATUS_LABELS[result.validStatus] ?? 'Checked'}
            {result.dpi && result.validStatus !== 'OK' && result.validStatus !== 'PENDING' && (
              <span className="font-normal ml-1 opacity-80">
                ({result.dpi} DPI{product.minDpi ? `, min ${product.minDpi}` : ''})
              </span>
            )}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 mb-4">
          {error}
        </div>
      )}

      {/* Add to cart */}
      <div className="flex flex-col gap-3">
        <button
          onClick={addToCart}
          disabled={!result || addingToCart}
          className="bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {addingToCart ? 'Adding to cart…' : 'Add to cart →'}
        </button>
        <a
          href={`/configurator/${product.id}`}
          className="text-center text-sm text-gray-500 hover:text-gray-700 underline"
        >
          ← Back to configurator
        </a>
      </div>
    </div>
  )
}
