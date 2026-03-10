'use client'

import { useEffect } from 'react'
import Link from 'next/link'

interface Props {
  error: Error & { digest?: string }
  reset: () => void
}

export default function Error({ error, reset }: Props) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center gap-6 px-4 py-16">
      <div className="text-5xl select-none">⚠</div>

      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h2>
        <p className="text-sm text-gray-500 max-w-sm">
          An unexpected error occurred. You can try reloading the page or return to the homepage.
        </p>
      </div>

      <div className="flex flex-wrap gap-3 justify-center">
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-700 transition-colors"
        >
          Try again
        </button>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:border-gray-400 transition-colors"
        >
          Go home
        </Link>
      </div>
    </div>
  )
}
