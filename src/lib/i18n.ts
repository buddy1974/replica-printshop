import enRaw from '@/locales/en.json'
import deRaw from '@/locales/de.json'
import frRaw from '@/locales/fr.json'
import checkoutEn from '@/locales/checkout.en.json'
import checkoutDe from '@/locales/checkout.de.json'
import checkoutFr from '@/locales/checkout.fr.json'

export type Locale = 'en' | 'de' | 'fr'

export const LOCALES: Locale[] = ['en', 'de', 'fr']
export const DEFAULT_LOCALE: Locale = 'en'

export interface CheckoutDictionary {
  cart: string
  yourCart: string
  cartEmpty: string
  cartEmptyDesc: string
  goToShop: string
  checkout: string
  proceedToCheckout: string
  continueShopping: string
  continue: string
  back: string
  backToDelivery: string
  account: string
  howToContinue: string
  guest: string
  guestDesc: string
  google: string
  googleDesc: string
  create: string
  createDesc: string
  creating: string
  password: string
  address: string
  billingAddress: string
  deliveryAddress: string
  sameAddress: string
  firstName: string
  lastName: string
  email: string
  phone: string
  street: string
  city: string
  zip: string
  country: string
  fillBillingFields: string
  fillDeliveryFields: string
  austria: string
  germany: string
  switzerland: string
  other: string
  delivery: string
  deliveryMethod: string
  standard: string
  standardDesc: string
  pickup: string
  pickupDesc: string
  pickupNote: string
  free: string
  payment: string
  securePayment: string
  settingUpPayment: string
  paymentUnavailable: string
  connectionError: string
  processing: string
  pay: string
  orderSummary: string
  subtotal: string
  shipping: string
  calculatedAtCheckout: string
  total: string
  tax: string
  qty: string
  order: string
  preview: string
  product: string
  size: string
  price: string
  customDesign: string
  fileUploaded: string
}

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
  checkout: CheckoutDictionary
}

const dictionaries: Record<Locale, Dictionary> = {
  en: { ...(enRaw as Omit<Dictionary, 'checkout'>), checkout: checkoutEn },
  de: { ...(deRaw as Omit<Dictionary, 'checkout'>), checkout: checkoutDe },
  fr: { ...(frRaw as Omit<Dictionary, 'checkout'>), checkout: checkoutFr },
}

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? dictionaries.en
}
