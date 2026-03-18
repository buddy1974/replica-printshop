// Step 354/355 — Serve design preview PNG from disk

import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import { db } from '@/lib/db'
import { getDesignPreviewPath } from '@/lib/designStorage'
import { AppError, NotFoundError, UnauthorizedError } from '@/lib/errors'

interface Params {
  params: { id: string }
}

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const design = await db.design.findUnique({
      where: { id: params.id },
      select: { userId: true, preview: true },
    })

    if (!design) throw new NotFoundError('Design not found')

    // Ownership check
    const cookieUserId = req.cookies.get('replica_uid')?.value ?? null
    const role = cookieUserId
      ? (await db.user.findUnique({ where: { id: cookieUserId }, select: { role: true } }))?.role
      : undefined
    const isAdmin = role === 'ADMIN' || role === 'SUPERADMIN'

    if (design.userId && !isAdmin && design.userId !== cookieUserId) {
      throw new UnauthorizedError('Access denied')
    }

    const diskPath = getDesignPreviewPath(params.id)
    if (!diskPath) throw new NotFoundError('Preview not found')

    const buffer = fs.readFileSync(diskPath)
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'private, max-age=86400',
      },
    })
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
