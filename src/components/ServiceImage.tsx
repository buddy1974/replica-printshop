'use client'

import { useState } from 'react'

interface Props {
  src: string
  alt: string
}

export default function ServiceImage({ src, alt }: Props) {
  const [error, setError] = useState(false)

  if (error) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-12 h-12 text-red-200"
          aria-hidden="true"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
      </div>
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
      onError={() => setError(true)}
    />
  )
}
