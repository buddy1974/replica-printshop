import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { AppError } from '@/lib/errors'
import { assertExists } from '@/lib/assert'

interface Params {
  params: { id: string }
}

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const product = await db.product.findUnique({
      where: { id: params.id, active: true },
      include: {
        variants: true,
        options: { include: { values: true } },
        pricingRules: true,
        config: true,
      },
    })
    assertExists(product, 'Product not found')
    return NextResponse.json(product)
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
