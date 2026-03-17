import { db } from '@/lib/db'

// ── Defaults ────────────────────────────────────────────────────────────────
// All defaults use generic "PRINTSHOP" placeholder.
// Override via the admin settings pages (stored in the Setting DB table).

export const SETTING_DEFAULTS: Record<string, string> = {
  // Company
  'company.name':      'PRINTSHOP',
  'company.street':    'Street 1',
  'company.zip':       '00000',
  'company.city':      'City',
  'company.country':   'Country',
  'company.phone':     '+000000000',
  'company.email':     'info@printshop.com',
  'company.website':   '',
  'company.vatNumber': '',
  'company.currency':  'EUR',
  // Invoice
  'invoice.prefix':     'INV',
  'invoice.nextNumber': '1001',
  'invoice.footer':     'Thank you for your order',
  // Email sender
  'email.senderName':  'PRINTSHOP',
  'email.senderEmail': 'no-reply@printshop.com',
  // Branding
  'branding.logoUrl':      '',
  'branding.faviconUrl':   '',
  'branding.footerText':   '© PRINTSHOP. All rights reserved.',
  'branding.primaryColor': '#dc2626',
}

// ── getSetting ───────────────────────────────────────────────────────────────

/** Get a single setting value. Returns default if missing. Never throws. */
export async function getSetting(key: string): Promise<string> {
  try {
    const row = await db.setting.findUnique({ where: { key } })
    return row?.value ?? SETTING_DEFAULTS[key] ?? ''
  } catch {
    return SETTING_DEFAULTS[key] ?? ''
  }
}

// ── setSetting ───────────────────────────────────────────────────────────────

/** Upsert a single setting. */
export async function setSetting(key: string, value: string): Promise<void> {
  await db.setting.upsert({
    where:  { key },
    update: { value },
    create: { key, value },
  })
}

// ── getAllSettings ────────────────────────────────────────────────────────────

/**
 * Get all settings merged with defaults.
 * DB values override defaults. Returns complete map. Never throws.
 */
export async function getAllSettings(): Promise<Record<string, string>> {
  const map: Record<string, string> = { ...SETTING_DEFAULTS }
  try {
    const rows = await db.setting.findMany()
    for (const row of rows) {
      map[row.key] = row.value
    }
  } catch {
    // Return defaults on DB error
  }
  return map
}

// ── saveSettings ─────────────────────────────────────────────────────────────

/** Save multiple settings at once (upserts each key). */
export async function saveSettings(data: Record<string, string>): Promise<void> {
  await Promise.all(
    Object.entries(data).map(([key, value]) => setSetting(key, value))
  )
}

// ── Typed helpers ─────────────────────────────────────────────────────────────

export interface CompanySettings {
  name:      string
  street:    string
  zip:       string
  city:      string
  country:   string
  phone:     string
  email:     string
  website:   string
  vatNumber: string
  currency:  string
}

/** Get all company settings as a typed object. */
export async function getCompanySettings(): Promise<CompanySettings> {
  const s = await getAllSettings()
  return {
    name:      s['company.name']      || SETTING_DEFAULTS['company.name'],
    street:    s['company.street']    || SETTING_DEFAULTS['company.street'],
    zip:       s['company.zip']       || SETTING_DEFAULTS['company.zip'],
    city:      s['company.city']      || SETTING_DEFAULTS['company.city'],
    country:   s['company.country']   || SETTING_DEFAULTS['company.country'],
    phone:     s['company.phone']     || SETTING_DEFAULTS['company.phone'],
    email:     s['company.email']     || SETTING_DEFAULTS['company.email'],
    website:   s['company.website']   ?? '',
    vatNumber: s['company.vatNumber'] ?? '',
    currency:  s['company.currency']  || 'EUR',
  }
}
