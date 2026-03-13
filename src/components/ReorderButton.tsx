'use client'

import { useState } from 'react'
import Button from '@/components/Button'

interface Props {
  orderId: string
  // legacy props kept for compatibility, no longer used
  items?: unknown[]
  userId?: string
}

export default function ReorderButton({ orderId }: Props) {
  const [state, setState] = useState<'idle' | 'loading' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleReorder = async () => {
    setState('loading')
    setErrorMsg(null)
    try {
      const res = await fetch('/api/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      })
      const data = await res.json()
      if (!res.ok) {
        setErrorMsg(data.error ?? 'Could not reorder')
        setState('error')
        return
      }
      // Redirect to cart after successful reorder
      window.location.href = '/cart'
    } catch {
      setState('error')
      setErrorMsg('Network error')
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <Button variant="secondary" onClick={handleReorder} disabled={state === 'loading'}>
        {state === 'loading' ? 'Adding to cart…' : 'Reorder'}
      </Button>
      {state === 'error' && errorMsg && (
        <p className="text-xs text-red-600">{errorMsg}</p>
      )}
    </div>
  )
}
