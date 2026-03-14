import productsEn from '@/locales/products.en.json'
import productsDe from '@/locales/products.de.json'
import productsFr from '@/locales/products.fr.json'
import categoriesEn from '@/locales/categories.en.json'
import categoriesDe from '@/locales/categories.de.json'
import categoriesFr from '@/locales/categories.fr.json'
import descriptionsEn from '@/locales/descriptions.en.json'
import descriptionsDe from '@/locales/descriptions.de.json'
import descriptionsFr from '@/locales/descriptions.fr.json'
import type { Locale } from '@/lib/i18n'

type TranslationDict = Record<string, string>

export interface DescriptionEntry {
  short?: string
  long?: string
}

type DescriptionDict = Record<string, DescriptionEntry>

const productDicts: Record<Locale, TranslationDict> = {
  en: productsEn,
  de: productsDe,
  fr: productsFr,
}

const categoryDicts: Record<Locale, TranslationDict> = {
  en: categoriesEn,
  de: categoriesDe,
  fr: categoriesFr,
}

const descriptionDicts: Record<Locale, DescriptionDict> = {
  en: descriptionsEn as DescriptionDict,
  de: descriptionsDe as DescriptionDict,
  fr: descriptionsFr as DescriptionDict,
}

export function getProductLabel(slug: string, locale: Locale, fallback: string): string {
  return productDicts[locale]?.[slug] ?? productDicts.en[slug] ?? fallback
}

export function getCategoryLabel(slug: string, locale: Locale, fallback: string): string {
  return categoryDicts[locale]?.[slug] ?? categoryDicts.en[slug] ?? fallback
}

export function getDescriptions(slug: string, locale: Locale): DescriptionEntry | null {
  return descriptionDicts[locale]?.[slug] ?? descriptionDicts.en[slug] ?? null
}
