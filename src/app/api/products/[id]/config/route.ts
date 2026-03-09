import { NextRequest, NextResponse } from 'next/server'
import { getProductConfig, upsertProductConfig } from '@/lib/productConfig'
import { AppError } from '@/lib/errors'
import { requireAdmin } from '@/lib/adminAuth'
import { logAction, logError } from '@/lib/log'

interface Params {
  params: { id: string }
}

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const config = await getProductConfig(params.id)
    return NextResponse.json(config)
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    await requireAdmin(req)
    const adminId = req.cookies.get('replica_uid')?.value
    const body = await req.json()

    if (!body.type) {
      return NextResponse.json({ error: 'type is required' }, { status: 400 })
    }

    const config = await upsertProductConfig(params.id, body)
    // Step 335
    logAction('ADMIN_CONFIG_EDIT', 'product', { userId: adminId, entityId: params.id, data: { type: body.type } })
    return NextResponse.json(config)
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.status })
    const err = e instanceof Error ? e : new Error(String(e))
    logError(err.message, { stack: err.stack, path: `/api/products/${params.id}/config` })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
