import enRaw from '@/locales/en.json'
import deRaw from '@/locales/de.json'
import frRaw from '@/locales/fr.json'

export type Locale = 'en' | 'de' | 'fr'

export const LOCALES: Locale[] = ['en', 'de', 'fr']
export const DEFAULT_LOCALE: Locale = 'en'

// Shape all translation files must conform to
export interface Dictionary {
  nav: {
    shop: string
    graphicInstallation: string
    designService: string
    contact: string
    account: string
    admin: string
    cart: string
  }
}

const dictionaries: Record<Locale, Dictionary> = {
  en: enRaw as Dictionary,
  de: deRaw as Dictionary,
  fr: frRaw as Dictionary,
}

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? dictionaries.en
}
