/**
 * Input validation helpers used across API routes.
 * Keep this file free of DB imports.
 */

/** Strip HTML / script tags from a string */
export function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, '').trim()
}

/** Validate an ID (Prisma CUID/UUID-style): alphanumeric + hyphen, 1–64 chars */
export function isValidId(id: unknown): id is string {
  return typeof id === 'string' && id.length > 0 && id.length <= 64 && /^[a-zA-Z0-9_-]+$/.test(id)
}

/** Validate a URL slug: lowercase alphanumeric + hyphens, 1–128 chars */
export function isValidSlug(slug: unknown): slug is string {
  return typeof slug === 'string' && /^[a-z0-9-]{1,128}$/.test(slug)
}

/** Validate quantity: integer 1–1000 */
export function isValidQuantity(qty: unknown): qty is number {
  return typeof qty === 'number' && Number.isInteger(qty) && qty >= 1 && qty <= 1000
}

/** Basic email format check */
export function isValidEmail(email: unknown): email is string {
  return (
    typeof email === 'string' &&
    email.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  )
}

/** Max size for design canvas JSON (2 MB serialised) */
export const MAX_DESIGN_JSON_BYTES = 2 * 1024 * 1024

/** Max size for preview data URL (~3 MB covers ≤2 MB PNG base64-encoded) */
export const MAX_PREVIEW_BYTES = 3 * 1024 * 1024
