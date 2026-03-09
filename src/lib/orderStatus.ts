// Step 309 — Order status transition guard
import { ValidationError } from './errors'

// Valid order status transitions — no skipping allowed
const ORDER_TRANSITIONS: Record<string, string[]> = {
  PENDING:       ['CONFIRMED', 'CANCELLED'],
  CONFIRMED:     ['UPLOADED', 'CANCELLED'],
  UPLOADED:      ['APPROVED', 'CONFIRMED', 'CANCELLED'], // allow re-upload (back to CONFIRMED)
  APPROVED:      ['READY', 'CANCELLED'],
  READY:         ['IN_PRODUCTION', 'CANCELLED'],
  IN_PRODUCTION: ['DONE', 'CANCELLED'],
  DONE:          [], // terminal
  CANCELLED:     [], // terminal
}

export function assertValidOrderTransition(from: string, to: string) {
  const allowed = ORDER_TRANSITIONS[from] ?? []
  if (!allowed.includes(to)) {
    throw new ValidationError(
      `Invalid order status transition: ${from} → ${to}. Allowed: ${allowed.join(', ') || 'none'}`
    )
  }
}
