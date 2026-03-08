'use client'

import { useState } from 'react'

export default function ApproveButton({ orderId }: { orderId: string }) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')

  const handleApprove = async () => {
    setStatus('loading')
    const res = await fetch(`/api/admin/orders/${orderId}/approve`, { method: 'POST' })
    if (res.ok) {
      setStatus('done')
    } else {
      const body = await res.json().catch(() => ({}))
      alert(body.error ?? 'Approval failed')
      setStatus('error')
    }
  }

  if (status === 'done') {
    return <span className="text-xs text-green-600 font-medium">Approved</span>
  }

  return (
    <button
      onClick={handleApprove}
      disabled={status === 'loading'}
      className="rounded bg-green-600 px-2 py-1 text-xs text-white font-medium hover:bg-green-700 disabled:opacity-50"
    >
      {status === 'loading' ? '…' : 'Approve'}
    </button>
  )
}
