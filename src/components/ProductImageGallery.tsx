'use client'

// Step 435 — Product image gallery: main image + thumbnails + modal

import { useState } from 'react'
import Image from 'next/image'
import dynamic from 'next/dynamic'

const ImageModal = dynamic(() => import('./ImageModal'))

interface Props {
  mainUrl: string
  name: string
  extraImages?: string[]
}

export default function ProductImageGallery({ mainUrl, name, extraImages = [] }: Props) {
  const allImages = [mainUrl, ...extraImages]
  const [active, setActive] = useState(mainUrl)
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <div className="flex flex-col gap-3">
      {/* Main image — click to open modal */}
      <div
        className="aspect-square rounded-xl border border-gray-200 bg-white p-4 flex items-center justify-center overflow-hidden cursor-zoom-in group relative"
        onClick={() => setModalOpen(true)}
      >
        <Image
          src={active}
          alt={name}
          fill
          sizes="(max-width: 1024px) 100vw, 50vw"
          className="object-contain p-4 transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          <div className="bg-black/20 rounded-full p-2">
            <svg className="w-5 h-5 text-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Thumbnails — only shown when there are multiple images */}
      {allImages.length > 1 && (
        <div className="grid grid-cols-4 gap-2">
          {allImages.map((url, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActive(url)}
              className={[
                'relative aspect-square rounded-lg border p-1 overflow-hidden transition-colors',
                url === active
                  ? 'border-indigo-500 ring-1 ring-indigo-400'
                  : 'border-gray-200 hover:border-indigo-300',
              ].join(' ')}
            >
              <Image src={url} alt="" fill sizes="(max-width: 768px) 25vw, 12vw" className="object-contain" />
            </button>
          ))}
        </div>
      )}

      {/* Full-image modal */}
      {modalOpen && (
        <ImageModal src={active} alt={name} onClose={() => setModalOpen(false)} />
      )}
    </div>
  )
}
