/**
 * VAT / Tax configuration
 *
 * Prices in the system are VAT-inclusive (Bruttopreis / gross pricing) for B2C.
 * VAT is extracted from the gross total for display purposes — it does NOT change
 * the total amount charged.
 *
 * EU-ready: rates are keyed by ISO 3166-1 alpha-2 country code.
 * Add new countries here — no other code changes required.
 */

/** VAT rates per country code (percent). 0 = no VAT (e.g. non-EU). */
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
  NO: 25,    // Norway (non-EU but treated similarly)
  CH: 8.1,   // Switzerland (non-EU, standard rate)
  GB: 20,    // United Kingdom (post-Brexit)
}

/** Default rate applied when country is unknown or not in the table. */
export const DEFAULT_VAT_RATE = 19

/**
 * Return the VAT rate for a billing country.
 * Falls back to DEFAULT_VAT_RATE if the country is unknown.
 */
export function getVatRate(country?: string | null): number {
  if (!country) return DEFAULT_VAT_RATE
  return VAT_RATES[country.toUpperCase()] ?? DEFAULT_VAT_RATE
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
