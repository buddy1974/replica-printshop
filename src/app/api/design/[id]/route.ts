// Step 355 — Load saved design (ownership protected)

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { AppError, NotFoundError, UnauthorizedError } from '@/lib/errors'
import { logError } from '@/lib/log'

interface Params {
  params: { id: string }
}

export async function GET(req: NextRequest, { params }: Params) {
  try {
    if (!/^[a-zA-Z0-9_-]{1,64}$/.test(params.id)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
    }

    const design = await db.design.findUnique({
      where: { id: params.id },
      select: { id: true, userId: true, productId: true, data: true, preview: true, createdAt: true },
    })

    if (!design) throw new NotFoundError('Design not found')

    // Step 358 — ownership check: user can only load their own designs
    const cookieUserId = req.cookies.get('replica_uid')?.value ?? null
    const role = cookieUserId
      ? (await db.user.findUnique({ where: { id: cookieUserId }, select: { role: true } }))?.role
      : undefined
    const isAdmin = role === 'ADMIN' || role === 'SUPERADMIN'

    if (design.userId && !isAdmin && design.userId !== cookieUserId) {
      throw new UnauthorizedError('Access denied')
    }

    return NextResponse.json(design)
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.status })
    const err = e instanceof Error ? e : new Error(String(e))
    logError(err.message, { stack: err.stack, path: `/api/design/${params.id}` })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
