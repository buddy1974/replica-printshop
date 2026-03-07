import { NextRequest, NextResponse } from 'next/server'
import { validateUpload } from '@/lib/validation'
import { AppError } from '@/lib/errors'

interface Params {
  params: { id: string }
}

export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const result = await validateUpload(params.id)
    return NextResponse.json(result)
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
