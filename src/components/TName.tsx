'use client'

import { useLocale } from '@/context/LocaleContext'
import { getProductLabel, getCategoryLabel, getDescriptions } from '@/lib/productTranslations'

export function ProductName({ slug, fallback }: { slug: string; fallback: string }) {
  const { locale } = useLocale()
  return <>{getProductLabel(slug, locale, fallback)}</>
}

export function CategoryName({ slug, fallback }: { slug: string; fallback: string }) {
  const { locale } = useLocale()
  return <>{getCategoryLabel(slug, locale, fallback)}</>
}

export function ProductDescription({
  slug,
  fallback,
  className,
}: {
  slug: string
  fallback: string | null | undefined
  className?: string
}) {
  const { locale } = useLocale()
  const entry = getDescriptions(slug, locale)
  const text = entry?.long ?? fallback
  if (!text) return null
  return <p className={className}>{text}</p>
}

export function ProductShortDescription({
  slug,
  fallback,
  className,
}: {
  slug: string
  fallback: string | null | undefined
  className?: string
}) {
  const { locale } = useLocale()
  const entry = getDescriptions(slug, locale)
  const text = entry?.short ?? fallback
  if (!text) return null
  return <p className={className}>{text}</p>
}
