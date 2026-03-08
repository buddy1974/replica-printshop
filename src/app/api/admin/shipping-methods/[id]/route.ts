import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { AppError } from '@/lib/errors'

interface Params { params: { id: string } }

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { name, price, active } = await req.json()
    const method = await db.shippingMethod.update({
      where: { id: params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(price !== undefined && { price }),
        ...(active !== undefined && { active }),
      },
    })
    return NextResponse.json(method)
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    await db.shippingMethod.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
