import { NextRequest, NextResponse } from 'next/server'
import { removeFromCart } from '@/lib/cart'
import { AppError } from '@/lib/errors'

interface Params {
  params: { id: string }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    await removeFromCart(params.id)
    return NextResponse.json({ success: true })
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
