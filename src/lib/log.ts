// Steps 340, 331, 337 — central audit + error log helpers
// logAction and logError are always non-throwing: failures are swallowed silently.

import { db } from '@/lib/db'

// ---------------------------------------------------------------------------
// Audit log  (step 331)
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue }

export interface LogActionOpts {
  userId?: string | null
  entityId?: string | null
  data?: Record<string, JsonValue> | null
}

/**
 * Writes an AuditLog entry.  Never throws.
 */
export async function logAction(
  action: string,
  entity: string,
  opts?: LogActionOpts,
): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        action,
        entity,
        entityId: opts?.entityId ?? null,
        userId: opts?.userId ?? null,
        data: opts?.data ?? undefined,
      },
    })
  } catch {
    // Logging must never break main flow
  }
}

// ---------------------------------------------------------------------------
// Error log  (step 337)
// ---------------------------------------------------------------------------

export interface LogErrorOpts {
  stack?: string | null
  path?: string | null
}

/**
 * Writes an ErrorLog entry for unexpected server errors.  Never throws.
 * Do NOT call for AppError (user-facing validation / auth errors).
 */
export async function logError(
  message: string,
  opts?: LogErrorOpts,
): Promise<void> {
  try {
    await db.errorLog.create({
      data: {
        message: String(message).slice(0, 2000),
        stack: opts?.stack ? String(opts.stack).slice(0, 5000) : null,
        path: opts?.path ?? null,
      },
    })
  } catch {
    // Logging must never break main flow
  }
}
