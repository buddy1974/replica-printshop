import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/adminAuth'
import { AppError } from '@/lib/errors'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req)
    const entries = await db.knowledgeEntry.findMany({
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(entries)
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req)
    const body = await req.json() as { title?: unknown; content?: unknown; category?: unknown }

    if (typeof body.title !== 'string' || !body.title.trim()) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 })
    }
    if (typeof body.content !== 'string' || !body.content.trim()) {
      return NextResponse.json({ error: 'content is required' }, { status: 400 })
    }

    const entry = await db.knowledgeEntry.create({
      data: {
        title: body.title.trim().slice(0, 200),
        content: body.content.trim(),
        category: typeof body.category === 'string' && body.category.trim()
          ? body.category.trim().slice(0, 100)
          : 'general',
      },
    })
    return NextResponse.json(entry, { status: 201 })
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
