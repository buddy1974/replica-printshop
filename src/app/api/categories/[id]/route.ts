import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { AppError } from '@/lib/errors'

interface Params {
  params: { id: string }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { name, description, sortOrder, defaultPriceMode } = await req.json()
    const category = await db.productCategory.update({
      where: { id: params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description: description || null }),
        ...(sortOrder !== undefined && { sortOrder }),
        ...(defaultPriceMode !== undefined && { defaultPriceMode: defaultPriceMode || null }),
      },
    })
    return NextResponse.json(category)
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
