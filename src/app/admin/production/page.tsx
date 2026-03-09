'use client'

import { useEffect, useState } from 'react'
import ProductionQueue from '@/components/ProductionQueue'
import Container from '@/components/Container'
import Link from 'next/link'

type JobStatus = 'QUEUED' | 'IN_PROGRESS' | 'DONE' | 'FAILED'
type MachineFilter = 'ALL' | 'MIMAKI' | 'PLOTTER' | 'DTF' | 'PRESS' | 'MANUAL'
type StatusFilter = 'ALL' | 'QUEUED' | 'IN_PROGRESS' | 'DONE' | 'FAILED'

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
    order: { id: string; deliveryType: string; shippingMethod: { name: string } | null }
  }
}

const MACHINE_FILTERS: MachineFilter[] = ['ALL', 'MIMAKI', 'PLOTTER', 'DTF', 'PRESS', 'MANUAL']
const STATUS_FILTERS: StatusFilter[] = ['ALL', 'QUEUED', 'IN_PROGRESS', 'DONE', 'FAILED']

export default function ProductionPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [error, setError] = useState('')
  const [machineFilter, setMachineFilter] = useState<MachineFilter>('ALL')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')

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

  const visible = jobs.filter((j) => {
    if (machineFilter !== 'ALL' && j.machineType !== machineFilter) return false
    if (statusFilter !== 'ALL' && j.status !== statusFilter) return false
    return true
  })

  return (
    <Container>
      <div className="flex items-center justify-between mb-4">
        <h1>Production Queue</h1>
        <span className="text-sm text-gray-500">{visible.length} job{visible.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        <div className="flex gap-1.5 flex-wrap">
          {MACHINE_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setMachineFilter(f)}
              className={`px-3 py-1 text-xs rounded border ${machineFilter === f ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-300 hover:border-gray-500'}`}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-3 py-1 text-xs rounded border ${statusFilter === f ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-gray-600 border-gray-300 hover:border-gray-500'}`}
            >
              {f === 'ALL' ? 'Any status' : f.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
      {visible.length === 0 && !error && <p className="text-sm text-gray-500">Queue is empty.</p>}
      <ProductionQueue jobs={visible} onStatusChange={handleStatusChange} />

      <div className="mt-6">
        <Link href="/admin" className="text-sm text-gray-500 hover:text-gray-900">← Back to admin</Link>
      </div>
    </Container>
  )
}
