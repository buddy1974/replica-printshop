'use client'

import { useEffect, useState } from 'react'
import ProductionQueue from '@/components/ProductionQueue'
import Container from '@/components/Container'

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

export default function ProductionPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/production')
      .then((r) => r.json())
      .then(setJobs)
      .catch(() => setError('Failed to load production queue'))
  }, [])

  const handleStatusChange = async (id: string, status: JobStatus) => {
    const res = await fetch(`/api/production/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (res.ok) {
      const updated = await res.json()
      setJobs((prev) => prev.map((j) => (j.id === id ? updated : j)))
    } else {
      const data = await res.json()
      alert(data.error ?? 'Failed to update status')
    }
  }

  return (
    <Container>
      <h1 className="mb-6">Production Queue</h1>
      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
      {jobs.length === 0 && !error && <p className="text-sm text-gray-500">Queue is empty.</p>}
      <ProductionQueue jobs={jobs} onStatusChange={handleStatusChange} />
    </Container>
  )
}
