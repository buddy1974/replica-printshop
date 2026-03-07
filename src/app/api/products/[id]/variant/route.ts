import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { AppError } from '@/lib/errors'

interface Params {
  params: { id: string }
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const body = await req.json()
    const { name, material, basePrice } = body

    if (!name || !material || basePrice === undefined) {
      return NextResponse.json({ error: 'name, material and basePrice are required' }, { status: 400 })
    }

    const variant = await db.productVariant.create({
      data: { productId: params.id, name, material, basePrice },
    })
    return NextResponse.json(variant, { status: 201 })
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
