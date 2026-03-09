// Step 271 — Central logger
// Uses console for now; can be swapped for a remote logger later.

const ts = () => new Date().toISOString()

export function logInfo(message: string, context?: Record<string, unknown>) {
  console.log(JSON.stringify({ level: 'INFO', ts: ts(), message, ...context }))
}

export function logWarn(message: string, context?: Record<string, unknown>) {
  console.warn(JSON.stringify({ level: 'WARN', ts: ts(), message, ...context }))
}

export function logError(message: string, error?: unknown, context?: Record<string, unknown>) {
  const err = error instanceof Error
    ? { name: error.name, message: error.message }
    : { raw: String(error) }
  console.error(JSON.stringify({ level: 'ERROR', ts: ts(), message, error: err, ...context }))
}
