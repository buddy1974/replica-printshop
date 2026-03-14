import enRaw from '@/locales/en.json'
import deRaw from '@/locales/de.json'
import frRaw from '@/locales/fr.json'

export type Locale = 'en' | 'de' | 'fr'

export const LOCALES: Locale[] = ['en', 'de', 'fr']
export const DEFAULT_LOCALE: Locale = 'en'

export interface Dictionary {
  menu: {
    shop: string
    installation: string
    design: string
    contact: string
    account: string
    admin: string
    cart: string
  }
  buttons: {
    select: string
    upload: string
    designer: string
    calculate: string
    addToCart: string
    continue: string
    back: string
    contact: string
  }
  shop: {
    title: string
    services: string
    products: string
  }
  upload: {
    title: string
    requirements: string
    drop: string
    browse: string
  }
  designer: {
    title: string
    text: string
    image: string
    shape: string
    layer: string
    center: string
    fit: string
    delete: string
  }
  designService: {
    title: string
    desc: string
    contact: string
  }
  contact: {
    title: string
    call: string
    email: string
    message: string
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
