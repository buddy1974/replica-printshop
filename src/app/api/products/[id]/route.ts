import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { AppError } from '@/lib/errors'
import { assertExists } from '@/lib/assert'
import { requireAdmin } from '@/lib/adminAuth'
import { logAction, logError } from '@/lib/log'

const productInclude = {
  variants: true,
  options: { include: { values: true } },
  pricingRules: true,
  config: true,
} as const

interface Params {
  params: { id: string }
}

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const product = await db.product.findUnique({
      where: { id: params.id },
      include: productInclude,
    })
    assertExists(product, 'Product not found')
    return NextResponse.json(product)
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    await requireAdmin(req)
    const adminId = req.cookies.get('replica_uid')?.value
    const body = await req.json()
    const {
      name, slug, category, categoryId, active,
      description, shortDescription, imageUrl, metaTitle, metaDescription,
      guideText, minDpi, recommendedDpi, bleedMm, safeMarginMm, allowedFormats, notes,
    } = body

    const product = await db.product.update({
      where: { id: params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(slug !== undefined && { slug }),
        ...(category !== undefined && { category }),
        ...(categoryId !== undefined && { categoryId: categoryId || null }),
        ...(active !== undefined && { active }),
        ...(description !== undefined && { description: description || null }),
        ...(shortDescription !== undefined && { shortDescription: shortDescription || null }),
        ...(imageUrl !== undefined && { imageUrl: imageUrl || null }),
        ...(metaTitle !== undefined && { metaTitle: metaTitle || null }),
        ...(metaDescription !== undefined && { metaDescription: metaDescription || null }),
        ...(guideText !== undefined && { guideText: guideText || null }),
        ...(minDpi !== undefined && { minDpi: minDpi || null }),
        ...(recommendedDpi !== undefined && { recommendedDpi: recommendedDpi || null }),
        ...(bleedMm !== undefined && { bleedMm: bleedMm || null }),
        ...(safeMarginMm !== undefined && { safeMarginMm: safeMarginMm || null }),
        ...(allowedFormats !== undefined && { allowedFormats: allowedFormats || null }),
        ...(notes !== undefined && { notes: notes || null }),
      },
      include: productInclude,
    })
    // Step 335
    logAction('ADMIN_PRODUCT_EDIT', 'product', { userId: adminId, entityId: params.id, data: { name, active } })
    return NextResponse.json(product)
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.status })
    const err = e instanceof Error ? e : new Error(String(e))
    logError(err.message, { stack: err.stack, path: `/api/products/${params.id}` })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    await requireAdmin(req)
    const adminId = req.cookies.get('replica_uid')?.value
    const product = await db.product.update({
      where: { id: params.id },
      data: { active: false },
    })
    // Step 335
    logAction('ADMIN_PRODUCT_DELETE', 'product', { userId: adminId, entityId: params.id })
    return NextResponse.json(product)
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.status })
    const err = e instanceof Error ? e : new Error(String(e))
    logError(err.message, { stack: err.stack, path: `/api/products/${params.id}` })
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
