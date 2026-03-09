import { NextRequest, NextResponse } from 'next/server'
import { removeFromCart } from '@/lib/cart'
import { db } from '@/lib/db'
import { AppError } from '@/lib/errors'
import { logAction, logError } from '@/lib/log'

interface Params {
  params: { id: string }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    // Step 302 — verify cart item belongs to the session user
    const cookieUserId = req.cookies.get('replica_uid')?.value
    if (cookieUserId) {
      const item = await db.cartItem.findUnique({
        where: { id: params.id },
        select: { cart: { select: { userId: true } } },
      })
      if (item && item.cart.userId !== cookieUserId) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }
    }

    await removeFromCart(params.id)
    // Step 334
    logAction('CART_REMOVE', 'cart', { userId: cookieUserId ?? null, entityId: params.id })
    return NextResponse.json({ success: true })
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.status })
    const err = e instanceof Error ? e : new Error(String(e))
    logError(err.message, { stack: err.stack, path: `/api/cart/item/${params.id}` })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
