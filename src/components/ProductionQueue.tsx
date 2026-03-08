'use client'

import ProductionJobCard from '@/components/ProductionJobCard'

type JobStatus = 'QUEUED' | 'IN_PROGRESS' | 'DONE' | 'FAILED'

interface Job {
  id: string
  status: JobStatus
  machine: string | null
  orderItem: {
    id: string
    productName: string
    categoryName: string | null
    width: number
    height: number
    quantity: number
    previewUrl: string | null
    order: { id: string; deliveryType: string }
  }
}

export default function ProductionQueue({
  jobs,
  onStatusChange,
}: {
  jobs: Job[]
  onStatusChange: (id: string, status: JobStatus) => void
}) {
  if (jobs.length === 0) return null

  return (
    <div className="grid gap-3">
      {jobs.map((job) => (
        <ProductionJobCard key={job.id} job={job} onStatusChange={onStatusChange} />
      ))}
    </div>
  )
}
