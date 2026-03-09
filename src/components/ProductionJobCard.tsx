'use client'

import { useState, useEffect } from 'react'
import Badge from '@/components/Badge'
import Button from '@/components/Button'

type JobStatus = 'QUEUED' | 'IN_PROGRESS' | 'DONE' | 'FAILED'

interface Upload {
  id: string
  filename: string
  filePath: string | null
  status: string
  dpi: number | null
  widthPx: number | null
  heightPx: number | null
}

interface Job {
  id: string
  status: JobStatus
  machine: string | null
  machineType: string | null
  orderItem: {
    id: string
    productName: string
    width: number
    height: number
    quantity: number
    previewUrl: string | null
    categoryName: string | null
    order: { id: string; deliveryType: string; shippingMethod: { name: string } | null }
  }
}

export default function ProductionJobCard({
  job,
  onStatusChange,
}: {
  job: Job
  onStatusChange: (id: string, status: JobStatus) => void
}) {
  const [uploads, setUploads] = useState<Upload[]>([])

  useEffect(() => {
    fetch(`/api/upload/order-item/${job.orderItem.id}`)
      .then((r) => r.json())
      .then(setUploads)
  }, [job.orderItem.id])

  const update = (status: JobStatus) => onStatusChange(job.id, status)

  return (
    <div className="rounded border border-gray-200 bg-white p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <p className="font-medium text-sm">{job.orderItem.productName}</p>
            {job.orderItem.categoryName && (
              <span className="text-xs text-gray-500 bg-gray-100 rounded px-1.5 py-0.5">{job.orderItem.categoryName}</span>
            )}
          </div>
          <p className="text-xs text-gray-500">
            {Number(job.orderItem.width)} × {Number(job.orderItem.height)} cm &middot; Qty {job.orderItem.quantity}
          </p>
          <p className="text-xs text-gray-400">
            Order <span className="font-mono">{job.orderItem.order.id.slice(0, 8)}</span> &middot; {job.orderItem.order.shippingMethod?.name ?? job.orderItem.order.deliveryType}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <Badge label={job.status} />
          {job.machineType && (
            <span className="text-xs font-medium text-gray-600 bg-gray-100 rounded px-1.5 py-0.5">{job.machineType}</span>
          )}
          {job.machine && <span className="text-xs text-gray-400">{job.machine}</span>}
        </div>
      </div>

      <div className="flex gap-2">
        {job.status === 'QUEUED' && (
          <Button variant="primary" onClick={() => update('IN_PROGRESS')}>Start</Button>
        )}
        {job.status === 'IN_PROGRESS' && (
          <>
            <Button variant="primary" onClick={() => update('DONE')}>Mark done</Button>
            <Button variant="danger" onClick={() => update('FAILED')}>Mark failed</Button>
          </>
        )}
      </div>

      {job.orderItem.previewUrl && (
        <div>
          <p className="text-xs text-gray-500 mb-1">Preview</p>
          <img src={job.orderItem.previewUrl} alt="Print preview" loading="lazy" className="max-w-48 rounded border border-gray-200" />
        </div>
      )}

      {uploads.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-500 mb-1.5">Uploads</p>
          <div className="flex flex-col gap-1">
            {uploads.map((u) => (
              <div key={u.id} className="flex items-center gap-2 text-xs">
                {u.filePath ? (
                  <a
                    href={`/api/admin/files/${u.id}`}
                    className="text-blue-600 underline truncate max-w-48"
                    title={u.filename}
                  >
                    {u.filename}
                  </a>
                ) : (
                  <span className="text-gray-700 truncate max-w-48">{u.filename}</span>
                )}
                <Badge label={u.status} />
                {u.dpi != null && <span className="text-gray-400">{u.dpi} dpi</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
