import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { db } from '@/lib/db'
import { calculateShipping } from '@/lib/shipping'
import { getVatRateAsync } from '@/lib/tax'

/**
 * GET /api/shipping/estimate?country=AT
 * Returns estimated shipping prices for all delivery methods based on the
 * current cart contents and billing country.
 */
export async function GET(req: NextRequest) {
  const userId = (await cookies()).get('replica_uid')?.value
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const country = req.nextUrl.searchParams.get('country') ?? undefined

  const cart = await db.cart.findUnique({
    where: { userId },
    include: { items: true },
  })

  const vatRate = await getVatRateAsync(country)

  if (!cart || cart.items.length === 0) {
    // No cart — return sensible defaults
    return NextResponse.json({ STANDARD: 5, EXPRESS: 7.5, PICKUP: 0, vatRate })
  }

  const subtotal = cart.items.reduce((s, i) => s + Number(i.priceSnapshot) * i.quantity, 0)
  const maxSide = Math.max(...cart.items.map((i) => Math.max(Number(i.width), Number(i.height))))
  const quantity = cart.items.reduce((s, i) => s + i.quantity, 0)
  const context = { maxSide, country, quantity }

  const [standard, express] = await Promise.all([
    calculateShipping(subtotal, 'STANDARD', context),
    calculateShipping(subtotal, 'EXPRESS', context),
  ])

  return NextResponse.json({ STANDARD: standard, EXPRESS: express, PICKUP: 0, vatRate })
}
