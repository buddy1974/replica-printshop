import enRaw from '@/locales/en.json'
import deRaw from '@/locales/de.json'
import frRaw from '@/locales/fr.json'
import checkoutEn from '@/locales/checkout.en.json'
import checkoutDe from '@/locales/checkout.de.json'
import checkoutFr from '@/locales/checkout.fr.json'
import homeEn from '@/locales/home.en.json'
import homeDe from '@/locales/home.de.json'
import homeFr from '@/locales/home.fr.json'

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

export interface AccountDictionary {
  overview: string
  orders: string
  profile: string
  addresses: string
  designs: string
  uploads: string
  email: string
  emailReadOnly: string
  displayName: string
  memberSince: string
  savedAddresses: string
  noAddresses: string
  savedDesigns: string
  noDesigns: string
  designPreview: string
  unknownProduct: string
  openEditor: string
  noOrders: string
  item: string
  items: string
}

export interface AdminDictionary {
  title: string
  revenue: string
  total: string
  today: string
  thisMonth: string
  avgOrder: string
  orders: string
  production: string
  uploads: string
  pending: string
  approved: string
  rejected: string
  queued: string
  inProgress: string
  done: string
  failed: string
  topProducts: string
  topCategories: string
  noData: string
  analyticsUnavailable: string
  manage: string
  products: string
  manageProducts: string
  viewAllOrders: string
  productionQueue: string
  shippingRules: string
  configShipping: string
  taxVat: string
  configVat: string
  categories: string
  editCategories: string
  search: string
  clear: string
  backToAdmin: string
  active: string
  inactive: string
  edit: string
  newProduct: string
  searchProducts: string
  searchOrders: string
  noProducts: string
  noMatchProducts: string
  noMatchOrders: string
  noOrders: string
  guest: string
  standard: string
  express: string
  pickup: string
  customer: string
  status: string
  payment: string
  delivery: string
  shipping: string
  items: string
  created: string
  name: string
  slug: string
  category: string
  page: string
  of: string
}

export interface HomeDictionary {
  hero: { title: string; subtitle: string; shop: string; contact: string }
  categories: { title: string }
  products: { title: string }
  services: { title: string; text: string }
  why: {
    title: string
    fast: string
    quality: string
    custom: string
    design: string
    install: string
    shipping: string
  }
  delivery: { title: string; text: string }
  contact: { title: string; text: string }
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
  home: HomeDictionary
  account: AccountDictionary
  admin: AdminDictionary
}

const dictionaries: Record<Locale, Dictionary> = {
  en: { ...(enRaw as unknown as Dictionary), checkout: checkoutEn, home: homeEn },
  de: { ...(deRaw as unknown as Dictionary), checkout: checkoutDe, home: homeDe },
  fr: { ...(frRaw as unknown as Dictionary), checkout: checkoutFr, home: homeFr },
}

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? dictionaries.en
}
