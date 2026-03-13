'use client'

import { useState } from 'react'

interface Props {
  designId: string
  productId: string
}

export default function AddToCartForm({ designId, productId }: Props) {
  const [open, setOpen] = useState(false)
  const [width, setWidth] = useState('20')
  const [height, setHeight] = useState('20')
  const [qty, setQty] = useState('1')
  const [state, setState] = useState<'idle' | 'loading' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  async function handleAdd() {
    setState('loading')
    setError(null)
    try {
      const res = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          designId,
          width: Number(width),
          height: Number(height),
          quantity: Number(qty),
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed to add'); setState('error'); return }
      window.location.href = '/cart'
    } catch {
      setError('Network error')
      setState('error')
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs px-2 py-1 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
      >
        Add to cart
      </button>
    )
  }

  return (
    <div className="flex flex-col gap-2 mt-2">
      <div className="flex gap-2">
        <div>
          <label className="text-[10px] text-gray-400 block mb-0.5">W (cm)</label>
          <input
            type="number"
            value={width}
            min="1"
            onChange={(e) => setWidth(e.target.value)}
            className="w-16 rounded-lg border border-gray-300 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-red-400"
          />
        </div>
        <div>
          <label className="text-[10px] text-gray-400 block mb-0.5">H (cm)</label>
          <input
            type="number"
            value={height}
            min="1"
            onChange={(e) => setHeight(e.target.value)}
            className="w-16 rounded-lg border border-gray-300 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-red-400"
          />
        </div>
        <div>
          <label className="text-[10px] text-gray-400 block mb-0.5">Qty</label>
          <input
            type="number"
            value={qty}
            min="1"
            onChange={(e) => setQty(e.target.value)}
            className="w-14 rounded-lg border border-gray-300 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-red-400"
          />
        </div>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={handleAdd}
          disabled={state === 'loading'}
          className="text-xs px-3 py-1 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
        >
          {state === 'loading' ? 'Adding…' : 'Add →'}
        </button>
        <button
          onClick={() => setOpen(false)}
          className="text-xs text-gray-400 hover:text-gray-700"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
