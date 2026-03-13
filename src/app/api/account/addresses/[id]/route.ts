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

    const address = await db.address.findUnique({
      where: { id: params.id },
      select: { id: true, userId: true, _count: { select: { billingOrders: true, shippingOrders: true } } },
    })
    if (!address) throw new NotFoundError('Address not found')
    if (address.userId !== userId) throw new UnauthorizedError('Access denied')

    const linked = address._count.billingOrders + address._count.shippingOrders
    if (linked > 0) {
      return NextResponse.json({ error: 'Address is linked to existing orders and cannot be deleted' }, { status: 409 })
    }

    await db.address.delete({ where: { id: params.id } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
