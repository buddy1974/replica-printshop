'use client'

import { useState } from 'react'
import Button from '@/components/Button'

interface OrderItem {
  productId: string | null
  variantId: string | null
  width: number
  height: number
  quantity: number
}

interface Props {
  orderId: string
  items: OrderItem[]
  userId: string
}

export default function ReorderButton({ items, userId }: Props) {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')

  const handleReorder = async () => {
    setState('loading')
    const reorderable = items.filter((i) => i.productId)
    if (reorderable.length === 0) { setState('error'); return }

    const results = await Promise.all(
      reorderable.map((item) =>
        fetch('/api/cart', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            productId: item.productId,
            variantId: item.variantId || undefined,
            width: item.width,
            height: item.height,
            quantity: item.quantity,
          }),
        })
      )
    )

    const allOk = results.every((r) => r.ok)
    setState(allOk ? 'done' : 'error')
    if (allOk) setTimeout(() => setState('idle'), 3000)
  }

  return (
    <Button variant="secondary" onClick={handleReorder} disabled={state === 'loading'}>
      {state === 'loading' ? 'Adding…' : state === 'done' ? 'Added to cart!' : state === 'error' ? 'Some items unavailable' : 'Reorder'}
    </Button>
  )
}
