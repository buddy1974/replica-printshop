'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function DeleteDesignButton({ id }: { id: string }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleDelete() {
    if (!confirm('Delete this design? This cannot be undone.')) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/account/designs/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed to delete'); return }
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <button
        onClick={handleDelete}
        disabled={loading}
        className="text-xs text-red-600 hover:text-red-800 disabled:opacity-50"
      >
        {loading ? 'Deleting…' : 'Delete'}
      </button>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  )
}
