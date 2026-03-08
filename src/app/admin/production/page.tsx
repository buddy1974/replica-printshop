'use client'

import { useEffect, useState } from 'react'
import ProductionQueue from '@/components/ProductionQueue'
import Container from '@/components/Container'

type JobStatus = 'QUEUED' | 'IN_PROGRESS' | 'DONE' | 'FAILED'
type MachineFilter = 'ALL' | 'MIMAKI' | 'PLOTTER' | 'DTF' | 'PRESS' | 'MANUAL'

interface Job {
  id: string
  status: JobStatus
  machine: string | null
  machineType: string | null
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

const FILTERS: MachineFilter[] = ['ALL', 'MIMAKI', 'PLOTTER', 'DTF', 'PRESS', 'MANUAL']

export default function ProductionPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<MachineFilter>('ALL')

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

  const visible = filter === 'ALL' ? jobs : jobs.filter((j) => j.machineType === filter)

  return (
    <Container>
      <div className="flex items-center justify-between mb-6">
        <h1>Production Queue</h1>
        <div className="flex gap-1.5 flex-wrap">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 text-xs rounded border ${filter === f ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-300 hover:border-gray-500'}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>
      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
      {visible.length === 0 && !error && <p className="text-sm text-gray-500">Queue is empty.</p>}
      <ProductionQueue jobs={visible} onStatusChange={handleStatusChange} />
    </Container>
  )
}
