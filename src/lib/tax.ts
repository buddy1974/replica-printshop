/**
 * VAT / Tax configuration
 *
 * Prices in the system are VAT-inclusive (Bruttopreis / gross pricing) for B2C.
 * VAT is extracted from the gross total for display purposes — it does NOT change
 * the total amount charged.
 *
 * EU-ready: rates are keyed by ISO 3166-1 alpha-2 country code.
 *
 * Resolution order for getVatRateAsync():
 *   1. TaxRate DB table (admin-configurable)
 *   2. TaxRate DB entry with country = "DEFAULT"
 *   3. Hardcoded VAT_RATES map below
 *   4. DEFAULT_VAT_RATE (19%)
 */

import { db } from '@/lib/db'

/** Hardcoded fallback rates per country code (percent). 0 = no VAT. */
export const VAT_RATES: Record<string, number> = {
  AT: 20,    // Austria
  DE: 19,    // Germany
  FR: 20,    // France
  IT: 22,    // Italy
  ES: 21,    // Spain
  NL: 21,    // Netherlands
  BE: 21,    // Belgium
  PL: 23,    // Poland
  PT: 23,    // Portugal
  SE: 25,    // Sweden
  DK: 25,    // Denmark
  FI: 24,    // Finland
  NO: 25,    // Norway
  CH: 8.1,   // Switzerland
  GB: 20,    // United Kingdom
}

/** Hardcoded default rate when country is unknown. */
export const DEFAULT_VAT_RATE = 19

/**
 * Synchronous rate lookup using the hardcoded map.
 * Use getVatRateAsync() for production code — this is a fallback.
 */
export function getVatRate(country?: string | null): number {
  if (!country) return DEFAULT_VAT_RATE
  return VAT_RATES[country.toUpperCase()] ?? DEFAULT_VAT_RATE
}

/**
 * Async rate lookup: reads from the TaxRate DB table first.
 * Falls back to getVatRate() if no DB entry exists.
 */
export async function getVatRateAsync(country?: string | null): Promise<number> {
  try {
    const upper = country?.toUpperCase() ?? null
    const rows = await db.taxRate.findMany({
      where: upper
        ? { country: { in: [upper, 'DEFAULT'] } }
        : { country: 'DEFAULT' },
    })

    // Prefer exact country match, then DEFAULT
    if (upper) {
      const exact = rows.find((r) => r.country === upper)
      if (exact) return parseFloat(exact.rate.toString())
    }
    const fallback = rows.find((r) => r.country === 'DEFAULT')
    if (fallback) return parseFloat(fallback.rate.toString())
  } catch {
    // DB unavailable — fall through to hardcoded
  }

  return getVatRate(country)
}

/**
 * Extract VAT from a VAT-inclusive (gross) amount.
 * Formula: VAT = gross × rate / (100 + rate)
 * Returns the VAT portion, rounded to 2 decimal places.
 */
export function extractVat(gross: number, rate: number): number {
  if (rate <= 0) return 0
  return Math.round((gross * rate / (100 + rate)) * 100) / 100
}
