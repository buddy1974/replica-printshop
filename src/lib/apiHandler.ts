import { NextRequest, NextResponse } from 'next/server'
import { AppError } from '@/lib/errors'

type Handler = (req: NextRequest, ctx: { params: Record<string, string> }) => Promise<NextResponse>

export function withErrorHandler(fn: Handler): Handler {
  return async (req, ctx) => {
    try {
      return await fn(req, ctx)
    } catch (e) {
      if (e instanceof AppError) {
        return NextResponse.json({ error: e.message }, { status: e.status })
      }
      console.error(e)
      return NextResponse.json({ error: 'Internal error' }, { status: 500 })
    }
  }
}
