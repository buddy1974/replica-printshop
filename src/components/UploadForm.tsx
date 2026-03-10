'use client'

import { useEffect, useState } from 'react'
import Badge from '@/components/Badge'
import UploadStatus from '@/components/UploadStatus'

interface Upload {
  id: string
  filename: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  dpi: number | null
  widthPx: number | null
  heightPx: number | null
  uploadType: string | null
  size: number | null
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
  const [uploadType, setUploadType] = useState('ARTWORK')
  const [uploading, setUploading] = useState(false)
  const [loadingUploads, setLoadingUploads] = useState(true)
  const [skipped, setSkipped] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialPreviewUrl ?? null)
  const [uploadSuccess, setUploadSuccess] = useState(false)

  useEffect(() => {
    fetch(`/api/upload/order-item/${orderItemId}`)
      .then((r) => r.json())
      .then((data) => { setUploads(data); setLoadingUploads(false) })
      .catch(() => setLoadingUploads(false))
  }, [orderItemId])

  const handleUpload = async () => {
    if (!file) return
    setUploading(true)
    setUploadSuccess(false)

    const formData = new FormData()
    formData.append('orderItemId', orderItemId)
    formData.append('file', file)
    formData.append('uploadType', uploadType)

    const createRes = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    })

    if (!createRes.ok) { setUploading(false); return }

    const upload: Upload = await createRes.json()
    setUploads((prev) => [...prev, upload])
    setUploadSuccess(true)
    setTimeout(() => setUploadSuccess(false), 4000)

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

  const previewFiles = uploads.filter((u) => u.uploadType === 'PREVIEW')
  const artFiles = uploads.filter((u) => u.uploadType !== 'PREVIEW')

  if (skipped) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-gray-500">Upload skipped — you can upload files later from your order page.</p>
        <button type="button" onClick={() => setSkipped(false)} className="btn-outline self-start">
          Upload now
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Preview images */}
      {(previewUrl || previewFiles.length > 0) && (
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Preview</p>
          <div className="flex flex-wrap gap-3">
            {previewUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt="Print preview"
                className="max-h-40 object-contain rounded-xl border border-gray-200 bg-gray-50 p-1"
              />
            )}
            {previewFiles.map((u) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={u.id}
                src={`/api/admin/files/${u.id}`}
                alt="Preview"
                className="max-h-40 object-contain rounded-xl border border-gray-200 bg-gray-50 p-1"
              />
            ))}
          </div>
        </div>
      )}

      {/* File list / loading / empty state */}
      {loadingUploads ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-4 border-gray-200 border-t-indigo-500 rounded-full animate-spin" />
        </div>
      ) : artFiles.length > 0 ? (
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Uploaded files</p>
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  {['File', 'Type', 'Size', 'Status'].map((h) => (
                    <th key={h} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {artFiles.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2.5 font-mono text-xs text-gray-700 max-w-[180px] truncate">
                      {u.filename}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-gray-500">{u.uploadType ?? '—'}</td>
                    <td className="px-3 py-2.5 text-xs text-gray-500">
                      {u.size ? `${(u.size / 1024).toFixed(0)} KB` : '—'}
                    </td>
                    <td className="px-3 py-2.5">
                      {validations[u.id] ? (
                        <UploadStatus
                          status={validations[u.id].status}
                          dpi={validations[u.id].dpi}
                          widthCm={validations[u.id].widthCm}
                          heightCm={validations[u.id].heightCm}
                          message={validations[u.id].message}
                        />
                      ) : (
                        <Badge label={u.status} />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : uploads.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center rounded-xl border border-dashed border-gray-300 bg-gray-50">
          <p className="text-sm font-medium text-gray-500">No files uploaded yet</p>
          <p className="text-xs text-gray-400 mt-0.5">Select a file below to get started</p>
        </div>
      ) : null}

      {/* Upload success */}
      {uploadSuccess && (
        <p className="text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-xl px-4 py-2.5">
          ✓ File uploaded successfully
        </p>
      )}

      {/* Upload controls */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <label className="text-xs font-medium text-gray-500 shrink-0">Type</label>
          <select
            value={uploadType}
            onChange={(e) => setUploadType(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            <option value="ARTWORK">Artwork</option>
            <option value="FRONT">Front</option>
            <option value="BACK">Back</option>
            <option value="PREVIEW">Preview</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
        <input
          type="file"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleUpload}
            disabled={!file || uploading}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? 'Uploading…' : 'Upload now'}
          </button>
          <button type="button" onClick={() => setSkipped(true)} className="btn-outline">
            Upload later
          </button>
        </div>
      </div>
    </div>
  )
}
