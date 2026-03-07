import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { AppError } from '@/lib/errors'

interface Params {
  params: { id: string }
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const body = await req.json()
    const { name, priceModifier = 0 } = body

    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 })
    }

    const value = await db.productOptionValue.create({
      data: { optionId: params.id, name, priceModifier },
    })
    return NextResponse.json(value, { status: 201 })
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
