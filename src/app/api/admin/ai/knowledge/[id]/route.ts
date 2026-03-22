import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { AppError } from '@/lib/errors'
import { db } from '@/lib/db'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdmin(req)
    const body = await req.json() as {
      title?: unknown
      content?: unknown
      category?: unknown
      active?: unknown
    }

    const data: Record<string, string | boolean> = {}
    if (typeof body.title   === 'string') data.title    = body.title.trim().slice(0, 200)
    if (typeof body.content === 'string') data.content  = body.content.trim()
    if (typeof body.category === 'string') data.category = body.category.trim().slice(0, 100)
    if (typeof body.active  === 'boolean') data.active   = body.active

    const entry = await db.knowledgeEntry.update({
      where: { id: params.id },
      data,
    })
    return NextResponse.json(entry)
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdmin(req)
    await db.knowledgeEntry.delete({ where: { id: params.id } })
    return new NextResponse(null, { status: 204 })
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
