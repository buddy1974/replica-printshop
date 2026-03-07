import { NextRequest, NextResponse } from 'next/server'
import { AppError } from '@/lib/errors'

const MIN_CM = 1
const MAX_CM = 500

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { width, height } = body as { width: number; height: number; productId: string }

    const errors: string[] = []

    if (typeof width !== 'number' || width <= 0) {
      errors.push('width must be greater than 0')
    } else if (width < MIN_CM) {
      errors.push(`width must be at least ${MIN_CM} cm`)
    } else if (width > MAX_CM) {
      errors.push(`width must not exceed ${MAX_CM} cm`)
    }

    if (typeof height !== 'number' || height <= 0) {
      errors.push('height must be greater than 0')
    } else if (height < MIN_CM) {
      errors.push(`height must be at least ${MIN_CM} cm`)
    } else if (height > MAX_CM) {
      errors.push(`height must not exceed ${MAX_CM} cm`)
    }

    if (errors.length > 0) {
      return NextResponse.json({ valid: false, errors })
    }

    return NextResponse.json({ valid: true, width, height })
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
