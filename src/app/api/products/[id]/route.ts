import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { AppError } from '@/lib/errors'
import { assertExists } from '@/lib/assert'

const productInclude = {
  variants: true,
  options: { include: { values: true } },
  pricingRules: true,
  config: true,
} as const

interface Params {
  params: { id: string }
}

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const product = await db.product.findUnique({
      where: { id: params.id },
      include: productInclude,
    })
    assertExists(product, 'Product not found')
    return NextResponse.json(product)
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const body = await req.json()
    const { name, slug, category, categoryId, active } = body

    const product = await db.product.update({
      where: { id: params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(slug !== undefined && { slug }),
        ...(category !== undefined && { category }),
        ...(categoryId !== undefined && { categoryId: categoryId || null }),
        ...(active !== undefined && { active }),
      },
      include: productInclude,
    })
    return NextResponse.json(product)
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const product = await db.product.update({
      where: { id: params.id },
      data: { active: false },
    })
    return NextResponse.json(product)
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
