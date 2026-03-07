import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { AppError } from '@/lib/errors'

interface Params {
  params: { id: string }
}

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const templates = await db.mockupTemplate.findMany({
      where: { productId: params.id },
    })
    return NextResponse.json(templates)
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const body = await req.json()
    const { name, imageUrl, printAreaX, printAreaY, printAreaWidth, printAreaHeight } = body

    if (!name || !imageUrl) {
      return NextResponse.json({ error: 'name and imageUrl are required' }, { status: 400 })
    }

    const template = await db.mockupTemplate.create({
      data: {
        productId: params.id,
        name,
        imageUrl,
        printAreaX: printAreaX ?? null,
        printAreaY: printAreaY ?? null,
        printAreaWidth: printAreaWidth ?? null,
        printAreaHeight: printAreaHeight ?? null,
      },
    })
    return NextResponse.json(template, { status: 201 })
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
