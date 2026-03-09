import { NextRequest, NextResponse } from 'next/server'
import { removeFromCart } from '@/lib/cart'
import { db } from '@/lib/db'
import { AppError } from '@/lib/errors'

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
    return NextResponse.json({ success: true })
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
