'use client'

import Container from '@/components/Container'
import Button from '@/components/Button'

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <Container>
      <div className="rounded border border-red-200 bg-red-50 p-4">
        <p className="text-sm font-medium text-red-800">Admin error</p>
        <p className="mt-1 text-sm text-red-600">Something went wrong. Please try again.</p>
        <div className="mt-3">
          <Button variant="secondary" onClick={reset}>Try again</Button>
        </div>
      </div>
    </Container>
  )
}
