'use client'

import { useLocale } from '@/context/LocaleContext'
import { getProductLabel, getCategoryLabel } from '@/lib/productTranslations'

export function ProductName({ slug, fallback }: { slug: string; fallback: string }) {
  const { locale } = useLocale()
  return <>{getProductLabel(slug, locale, fallback)}</>
}

export function CategoryName({ slug, fallback }: { slug: string; fallback: string }) {
  const { locale } = useLocale()
  return <>{getCategoryLabel(slug, locale, fallback)}</>
}
