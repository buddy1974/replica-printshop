import { NextRequest, NextResponse } from 'next/server'
import { getUploadsForOrderItem } from '@/lib/upload'
import { AppError } from '@/lib/errors'

interface Params {
  params: { id: string }
}

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const uploads = await getUploadsForOrderItem(params.id)
    return NextResponse.json(uploads)
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
