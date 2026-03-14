'use client'

// Step 401 — Product card: object-contain image, step 402 — modal viewer

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import { useLocale } from '@/context/LocaleContext'
import { getProductLabel, getCategoryLabel, getDescriptions } from '@/lib/productTranslations'

const ImageModal = dynamic(() => import('./ImageModal'))

interface ProductCardProps {
  id: string
  slug: string
  name: string
  category: string
  categorySlug?: string
  shortDescription?: string | null
  imageUrl?: string | null
}

export default function ProductCard({ slug, name, category, categorySlug, shortDescription, imageUrl }: ProductCardProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const { t, locale } = useLocale()
  const translatedName = getProductLabel(slug, locale, name)
  const translatedCategory = categorySlug ? getCategoryLabel(categorySlug, locale, category) : category
  const descEntry = getDescriptions(slug, locale)
  const translatedShort = descEntry?.short ?? shortDescription

  return (
    <>
      <div className="group rounded-xl border border-gray-200 bg-white overflow-hidden flex flex-col hover:border-red-300 hover:shadow-sm transition-all">
        {/* Image — clicking navigates to product page */}
        <Link href={`/product/${slug}`} className="relative aspect-square bg-white flex items-center justify-center overflow-hidden">
          {imageUrl ? (
            <>
              <Image
                src={imageUrl}
                alt={name}
                fill
                sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                className="object-contain p-2"
              />
              {/* Zoom button opens modal — stops link navigation */}
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setModalOpen(true) }}
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 hover:bg-white rounded-full w-7 h-7 flex items-center justify-center shadow text-gray-500 hover:text-gray-900 text-sm"
                aria-label="View full image"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" />
                </svg>
              </button>
            </>
          ) : (
            <Image
              src="/products/window-graphics.png"
              alt={name}
              fill
              sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-contain p-2"
            />
          )}
        </Link>

        <div className="p-4 flex flex-col gap-3 flex-1">
          <div className="flex-1">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{translatedCategory}</p>
            <h2 className="font-semibold text-sm leading-tight">{translatedName}</h2>
            {translatedShort && (
              <p className="text-xs text-gray-500 leading-snug mt-1 line-clamp-2">{translatedShort}</p>
            )}
          </div>
          <Link
            href={`/product/${slug}`}
            className="btn-primary w-fit"
          >
            {t.buttons.select} →
          </Link>
        </div>
      </div>

      {modalOpen && imageUrl && (
        <ImageModal src={imageUrl} alt={name} onClose={() => setModalOpen(false)} />
      )}
    </>
  )
}
