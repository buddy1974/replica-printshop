'use client'

import { useEffect, useState } from 'react'
import UploadStatus from '@/components/UploadStatus'
import Button from '@/components/Button'

interface Upload {
  id: string
  filename: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  dpi: number | null
  widthPx: number | null
  heightPx: number | null
}

interface ValidationResult {
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  dpi: number
  widthCm: number
  heightCm: number
  message: string
}

interface Props {
  orderItemId: string
  initialPreviewUrl?: string | null
}

export default function UploadForm({ orderItemId, initialPreviewUrl }: Props) {
  const [uploads, setUploads] = useState<Upload[]>([])
  const [validations, setValidations] = useState<Record<string, ValidationResult>>({})
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [skipped, setSkipped] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialPreviewUrl ?? null)

  useEffect(() => {
    fetch(`/api/upload/order-item/${orderItemId}`)
      .then((r) => r.json())
      .then(setUploads)
  }, [orderItemId])

  const handleUpload = async () => {
    if (!file) return
    setUploading(true)

    // Send actual file via multipart
    const formData = new FormData()
    formData.append('orderItemId', orderItemId)
    formData.append('file', file)

    const createRes = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    })

    if (!createRes.ok) { setUploading(false); return }

    const upload: Upload = await createRes.json()
    setUploads((prev) => [...prev, upload])

    const validateRes = await fetch(`/api/upload/${upload.id}/validate`, { method: 'POST' })
    if (validateRes.ok) {
      const result: ValidationResult = await validateRes.json()
      setValidations((prev) => ({ ...prev, [upload.id]: result }))
      setUploads((prev) => prev.map((u) => (u.id === upload.id ? { ...u, status: result.status } : u)))

      if (result.status === 'APPROVED') {
        const previewRes = await fetch('/api/mockup/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderItemId, filename: file.name }),
        })
        if (previewRes.ok) {
          const { previewUrl: url } = await previewRes.json()
          setPreviewUrl(url)
        }
      }
    }

    setFile(null)
    setUploading(false)
  }

  if (skipped) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm text-gray-500">Upload skipped — you can upload files later from your order page.</p>
        <Button variant="secondary" onClick={() => setSkipped(false)}>Upload now</Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {previewUrl && (
        <div>
          <p className="text-xs font-medium text-gray-500 mb-1">Preview</p>
          <img src={previewUrl} alt="Print preview" className="max-w-xs rounded border border-gray-200" />
        </div>
      )}

      {uploads.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-gray-500">Uploaded files</p>
          {uploads.map((u) => (
            <div key={u.id} className="rounded border border-gray-200 bg-gray-50 p-3">
              <p className="text-sm font-medium text-gray-700 mb-1">{u.filename}</p>
              {validations[u.id] ? (
                <UploadStatus
                  status={validations[u.id].status}
                  dpi={validations[u.id].dpi}
                  widthCm={validations[u.id].widthCm}
                  heightCm={validations[u.id].heightCm}
                  message={validations[u.id].message}
                />
              ) : (
                <UploadStatus status={u.status} dpi={u.dpi} />
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <input
          type="file"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="text-sm text-gray-600 file:mr-3 file:rounded file:border-0 file:bg-gray-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-gray-700 hover:file:bg-gray-200"
        />
        <div className="flex gap-2">
          <Button onClick={handleUpload} disabled={!file || uploading}>
            {uploading ? 'Uploading…' : 'Upload now'}
          </Button>
          <Button variant="secondary" onClick={() => setSkipped(true)}>Upload later</Button>
        </div>
      </div>
    </div>
  )
}
