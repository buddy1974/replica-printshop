'use client'

// Step 346 — Upload panel: picks a local file and pushes it onto the Fabric canvas

import { useRef, useState } from 'react'

interface Props {
  onImageReady: (objectUrl: string) => void
  disabled?: boolean
}

const ALLOWED = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']
const MAX_MB = 20

export default function DesignUploadPanel({ onImageReady, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)

  function handleFile(file: File | null | undefined) {
    if (!file) return
    setError(null)

    if (!ALLOWED.includes(file.type)) {
      setError('Only PNG, JPEG, SVG or WebP files are supported.')
      return
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      setError(`File must be under ${MAX_MB} MB.`)
      return
    }

    const url = URL.createObjectURL(file)
    setPreview(url)
    onImageReady(url)
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Your Design</p>

      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        className="w-full rounded-lg border-2 border-dashed border-gray-300 hover:border-indigo-400 bg-white px-4 py-6 text-sm text-gray-500 hover:text-indigo-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-center"
      >
        <span className="block text-2xl mb-1">↑</span>
        Click to upload image
        <span className="block text-xs text-gray-400 mt-1">PNG · JPEG · SVG · WebP — max {MAX_MB} MB</span>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept=".png,.jpg,.jpeg,.svg,.webp"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      {error && <p className="text-xs text-red-600">{error}</p>}

      {preview && (
        <div className="rounded-md border border-gray-200 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Design preview" className="w-full max-h-32 object-contain bg-gray-50 p-2" />
        </div>
      )}
    </div>
  )
}
