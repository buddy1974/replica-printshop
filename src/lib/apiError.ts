// Step 272 — Standard API error wrapper
// Ensures consistent { error: string, code?: string } response shape across all routes.

import { NextResponse } from 'next/server'
import { AppError } from './errors'
import { logError } from './logger'

export function handleApiError(error: unknown, context?: Record<string, unknown>): NextResponse {
  if (error instanceof AppError) {
    return NextResponse.json({ error: error.message }, { status: error.status })
  }
  logError('Unhandled API error', error, context)
  return NextResponse.json({ error: 'Internal error' }, { status: 500 })
}
