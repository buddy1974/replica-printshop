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
  // Order detail
  order: string
  placed: string
  deliveryLabel: string
  trackingLabel: string
  billingAddress: string
  shippingAddress: string
  itemsSection: string
  previewLabel: string
  uploadFiles: string
  uploadNow: string
  downloadInvoice: string
  fixResubmit: string
  resubmit: string
  backToOrders: string
  vatIncl: string
  qty: string
  statusConfirmed: string
  statusUploaded: string
  statusApproved: string
  statusReady: string
  statusInProduction: string
  statusShipped: string
  statusDelivered: string
  statusDone: string
  statusCancelled: string
  uploadNowLink: string
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
  // Production
  inQueue: string
  inProduction: string
  new: string
  printed: string
  allActive: string
  workshopQueue: string
  refresh: string
  noNewOrders: string
  nothingQueued: string
  nothingInProduction: string
  nothingPrinted: string
  noActiveOrders: string
  download: string
  downloadDesign: string
  goodDpi: string
  lowDpi: string
  poorDpi: string
  optionsLabel: string
  printSheet: string
  detail: string
  start: string
  markPrinted: string
  markShipped: string
  qty: string
  loadError: string
  updateError: string
  // Backup
  backupTitle: string
  backupSubtitle: string
  exportSection: string
  fullBackup: string
  fullBackupDesc: string
  ordersExport: string
  ordersExportDesc: string
  invoicesExport: string
  invoicesExportDesc: string
  uploadsExport: string
  uploadsExportDesc: string
  preparing: string
  downloaded: string
  errorRetry: string
  downloadJson: string
  restoreSection: string
  restoreFromBackup: string
  restoreDesc: string
  restoring: string
  chooseBackupFile: string
  restoreComplete: string
  ordersInFile: string
  restoredNew: string
  skippedExist: string
  autoBackupSection: string
  autoBackupNote: string
  filesExportedNote: string
  // AI
  aiTitle: string
  aiSubtitle: string
  knowledgeBase: string
  knowledgeBaseDesc: string
  systemPromptOverride: string
  systemPromptDesc: string
  conversationLogs: string
  conversationLogsDesc: string
  fileAnalysisRules: string
  fileAnalysisDesc: string
  comingSoon: string
  currentlyActive: string
  currentlyActiveDesc: string
  // Logs
  logsTitle: string
  errorsTab: string
  auditTab: string
  loading: string
  noErrors: string
  noAuditEvents: string
  dateCol: string
  messageCol: string
  pathCol: string
  actionCol: string
  entityCol: string
  entityIdCol: string
  userIdCol: string
  // Categories
  noCategories: string
  sortOrder: string
  defaultPriceMode: string
  descriptionLabel: string
  descriptionPlaceholder: string
  metaTitleLabel: string
  metaDescriptionLabel: string
  metaDescPlaceholder: string
  noneOption: string
  save: string
  savedLabel: string
  // Settings
  settingsTitle: string
  settingsSubtitle: string
  smtpSection: string
  configured: string
  notConfigured: string
  variableCol: string
  statusCol: string
  valueCol: string
  setStatus: string
  notSet: string
  smtpHowTo: string
  settingsBusiness: string
  settingsBusinessDesc: string
  settingsInvoice: string
  settingsInvoiceDesc: string
  settingsEmail: string
  settingsEmailDesc: string
  settingsTax: string
  settingsTaxDesc: string
  settingsShipping: string
  settingsShippingDesc: string
  settingsBranding: string
  settingsBrandingDesc: string
  emailTriggers: string
  eventCol: string
  recipientCol: string
  includesCol: string
  triggerOrderPlaced: string
  triggerPaymentConfirmed: string
  triggerUploadNeeded: string
  triggerFileRejected: string
  triggerFileApproved: string
  triggerAllFilesApproved: string
  triggerInProduction: string
  triggerOrderReady: string
  triggerOrderDone: string
  triggerNewOrder: string
  triggerContactForm: string
  triggerCustomer: string
  triggerAdminEmail: string
  triggerInclOrderSummary: string
  triggerInclPaymentConf: string
  triggerInclUploadLink: string
  triggerInclFilenameNote: string
  triggerInclFileName: string
  triggerInclProdNotice: string
  triggerInclStatusUpdate: string
  triggerInclPickupNotice: string
  triggerInclCompletionNotice: string
  triggerInclOrderIdTotal: string
  triggerInclFormContents: string
  // Demo mode
  settingsDemo: string
  settingsDemoDesc: string
  demoTitle: string
  demoSubtitle: string
  demoEnabled: string
  demoDisabled: string
  demoToggle: string
  demoSeedData: string
  demoSeedDesc: string
  demoSeedBtn: string
  demoSeeded: string
  demoSnapshotSection: string
  demoSnapshotBtn: string
  demoSnapshotTaken: string
  demoSnapshotDate: string
  demoSnapshotOrders: string
  demoNoSnapshot: string
  demoRestoreSection: string
  demoRestoreBtn: string
  demoRestoreConfirm: string
  demoRestored: string
  demoRestoreError: string
}

export interface CommonDictionary {
  notFound: string
  notFoundDesc: string
  goToShop: string
  homepage: string
  errorTitle: string
  errorDesc: string
  tryAgain: string
  goHome: string
  cart: string
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
  common: CommonDictionary
}

const dictionaries: Record<Locale, Dictionary> = {
  en: { ...(enRaw as unknown as Dictionary), checkout: checkoutEn, home: homeEn },
  de: { ...(deRaw as unknown as Dictionary), checkout: checkoutDe, home: homeDe },
  fr: { ...(frRaw as unknown as Dictionary), checkout: checkoutFr, home: homeFr },
}

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? dictionaries.en
}
