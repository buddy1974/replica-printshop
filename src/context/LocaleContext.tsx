'use client'

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { type Locale, type Dictionary, DEFAULT_LOCALE, LOCALES, getDictionary } from '@/lib/i18n'

interface LocaleContextValue {
  locale: Locale
  setLocale: (l: Locale) => void
  t: Dictionary
}

const LocaleContext = createContext<LocaleContextValue | null>(null)

const STORAGE_KEY = 'printshop-locale'

function extractLocale(pathname: string): Locale | null {
  const seg = pathname.split('/')[1]
  return (LOCALES as string[]).includes(seg) ? (seg as Locale) : null
}

function stripLocale(pathname: string): string {
  const seg = pathname.split('/')[1]
  if ((LOCALES as string[]).includes(seg)) {
    return pathname.slice(seg.length + 1) || '/'
  }
  return pathname
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()

  // Locale is URL-first, fallback to localStorage/default for initial render
  const urlLocale = extractLocale(pathname)
  const [fallbackLocale, setFallbackLocale] = useState<Locale>(DEFAULT_LOCALE)

  const locale: Locale = urlLocale ?? fallbackLocale

  // On mount: read localStorage for fallback (before middleware redirect fires)
  useEffect(() => {
    if (!extractLocale(window.location.pathname)) {
      const stored = localStorage.getItem(STORAGE_KEY) as Locale | null
      if (stored && (LOCALES as string[]).includes(stored)) {
        setFallbackLocale(stored as Locale)
      }
    }
  }, [])

  function setLocale(l: Locale) {
    localStorage.setItem(STORAGE_KEY, l)
    setFallbackLocale(l)
    const stripped = stripLocale(pathname)
    router.push(`/${l}${stripped === '/' && pathname.endsWith('/') ? '/' : stripped}`)
  }

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t: getDictionary(locale) }}>
      {children}
    </LocaleContext.Provider>
  )
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext)
  if (!ctx) throw new Error('useLocale must be used within <LocaleProvider>')
  return ctx
}
