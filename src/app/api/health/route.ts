import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

const REQUIRED_ENV = [
  'DATABASE_URL',
  'STRIPE_SECRET_KEY',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'NEXT_PUBLIC_APP_URL',
]

export async function GET() {
  // Check DB
  let dbOk = false
  try {
    await db.$queryRaw`SELECT 1`
    dbOk = true
  } catch {
    dbOk = false
  }

  // Check env
  const missingEnv = REQUIRED_ENV.filter((key) => !process.env[key])
  const envOk = missingEnv.length === 0

  const ok = dbOk && envOk

  return NextResponse.json(
    {
      ok,
      db: dbOk ? 'ok' : 'error',
      env: envOk ? 'ok' : `missing: ${missingEnv.join(', ')}`,
    },
    { status: ok ? 200 : 503 },
  )
}
