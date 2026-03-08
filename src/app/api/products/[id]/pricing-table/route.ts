import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { AppError } from '@/lib/errors'

interface Params {
  params: { id: string }
}

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const tables = await db.pricingTable.findMany({
      where: { productId: params.id },
      orderBy: { type: 'asc' },
    })
    return NextResponse.json(tables)
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const body = await req.json()
    const { type, minQty, maxQty, minWidth, maxWidth, minHeight, maxHeight, price, pricePerM2, pricePerMeter } = body

    if (!type || price === undefined) {
      return NextResponse.json({ error: 'type and price are required' }, { status: 400 })
    }

    const row = await db.pricingTable.create({
      data: {
        productId: params.id,
        type,
        minQty: minQty ?? null,
        maxQty: maxQty ?? null,
        minWidth: minWidth ?? null,
        maxWidth: maxWidth ?? null,
        minHeight: minHeight ?? null,
        maxHeight: maxHeight ?? null,
        price,
        pricePerM2: pricePerM2 ?? null,
        pricePerMeter: pricePerMeter ?? null,
      },
    })
    return NextResponse.json(row, { status: 201 })
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json()
    await db.pricingTable.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
