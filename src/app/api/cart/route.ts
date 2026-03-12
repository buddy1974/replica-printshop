import { NextRequest, NextResponse } from 'next/server'
import { getCart, addToCart } from '@/lib/cart'
import { AppError } from '@/lib/errors'
import { db } from '@/lib/db'
import { checkRateLimit, getClientKey } from '@/lib/rateLimit'
import { logAction, logError } from '@/lib/log'
import { isValidId, isValidQuantity } from '@/lib/inputValidation'

export async function GET(req: NextRequest) {
  try {
    const userId = req.cookies.get('replica_uid')?.value ?? null
    if (!userId) return NextResponse.json(null)
    const cart = await getCart(userId)
    return NextResponse.json(cart)
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!checkRateLimit(getClientKey(req), 30, 60_000)) {
      return NextResponse.json({ error: 'Too many requests. Try again in a minute.' }, { status: 429 })
    }

    const body = await req.json()
    const { productId, variantId, designId, width, height, quantity, express, optionValueIds, placement } = body
    console.log('CART BODY', { productId, variantId, designId, quantity, width, height })

    if (!isValidId(productId)) {
      return NextResponse.json({ error: 'productId is invalid' }, { status: 400 })
    }
    if (!isValidQuantity(quantity)) {
      return NextResponse.json({ error: 'quantity must be an integer between 1 and 1000' }, { status: 400 })
    }
    if (variantId !== undefined && !isValidId(variantId)) {
      return NextResponse.json({ error: 'variantId is invalid' }, { status: 400 })
    }
    if (designId !== undefined && !isValidId(designId)) {
      return NextResponse.json({ error: 'designId is invalid' }, { status: 400 })
    }

    // Resolve userId from cookie; auto-create a guest session if no cookie is set.
    // Cart requires a valid User FK — guest User is created with a generated email.
    let userId = req.cookies.get('replica_uid')?.value ?? null
    let guestCreated = false
    if (!userId) {
      const guest = await db.user.create({
        data: { email: `guest_${crypto.randomUUID()}@noemail.local` },
      })
      userId = guest.id
      guestCreated = true
    }

    const cart = await addToCart({ userId, productId, variantId, designId, width, height, quantity, express, optionValueIds, placement })
    logAction('CART_ADD', 'cart', { userId, data: { productId, variantId, quantity, width, height } })

    const response = NextResponse.json(cart, { status: 201 })
    if (guestCreated) {
      // Set the cookie so all subsequent requests (cart, checkout, orders) use this session
      response.cookies.set('replica_uid', userId, {
        path: '/',
        maxAge: 60 * 60 * 24 * 365,
        sameSite: 'lax',
        httpOnly: false,   // must be readable by JS (EditorShell, etc.)
      })
    }
    return response
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.status })
    const err = e instanceof Error ? e : new Error(String(e))
    logError(err.message, { stack: err.stack, path: '/api/cart' })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
