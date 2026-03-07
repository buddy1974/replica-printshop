import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { AppError } from '@/lib/errors'

const productInclude = {
  variants: true,
  options: { include: { values: true } },
  pricingRules: true,
} as const

export async function GET() {
  try {
    const products = await db.product.findMany({ include: productInclude })
    return NextResponse.json(products)
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, slug, category } = body

    if (!name || !slug || !category) {
      return NextResponse.json({ error: 'name, slug and category are required' }, { status: 400 })
    }

    const product = await db.product.create({
      data: { name, slug, category },
      include: productInclude,
    })
    return NextResponse.json(product, { status: 201 })
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
