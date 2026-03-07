'use client'

import Container from '@/components/Container'

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <Container>
      <div className="rounded border border-red-200 bg-red-50 p-4">
        <p className="text-sm font-medium text-red-800">Could not load order</p>
        <p className="mt-1 text-sm text-red-600">{error.message}</p>
        <button onClick={reset} className="mt-3 text-sm text-red-700 underline">Try again</button>
      </div>
    </Container>
  )
}
