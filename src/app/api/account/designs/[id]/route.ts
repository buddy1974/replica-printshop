import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { AppError, NotFoundError, UnauthorizedError } from '@/lib/errors'

interface Params {
  params: { id: string }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const userId = req.cookies.get('replica_uid')?.value ?? null
    if (!userId) throw new UnauthorizedError('Not logged in')

    const design = await db.design.findUnique({
      where: { id: params.id },
      select: { id: true, userId: true, _count: { select: { cartItems: true } } },
    })
    if (!design) throw new NotFoundError('Design not found')
    if (design.userId !== userId) throw new UnauthorizedError('Access denied')

    if (design._count.cartItems > 0) {
      return NextResponse.json({ error: 'Design is in an active cart and cannot be deleted' }, { status: 409 })
    }

    await db.design.delete({ where: { id: params.id } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
