'use client'

import Container from '@/components/Container'

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <Container>
      <div className="rounded-xl border border-red-200 bg-red-50 p-6">
        <p className="text-sm font-semibold text-red-800">Checkout failed</p>
        <p className="mt-1 text-sm text-red-600">Something went wrong. Please try again.</p>
        <div className="mt-4">
          <button type="button" onClick={reset} className="btn-primary">
            Try again
          </button>
        </div>
      </div>
    </Container>
  )
}
