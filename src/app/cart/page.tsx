import { cookies } from 'next/headers'
import Container from '@/components/Container'
import CartUI from '@/components/cart/CartUI'
import { db } from '@/lib/db'
import { getDictionary, type Locale, DEFAULT_LOCALE, LOCALES } from '@/lib/i18n'

export const dynamic = 'force-dynamic'

export default async function CartPage() {
  const userId = cookies().get('replica_uid')?.value ?? null
  const cookieLocale = cookies().get('replica_locale')?.value
  const locale: Locale = cookieLocale && LOCALES.includes(cookieLocale as Locale) ? cookieLocale as Locale : DEFAULT_LOCALE
  const tc = getDictionary(locale).common

  const cart = userId
    ? await db.cart.findUnique({
        where: { userId },
        include: {
          items: {
            include: {
              product: { select: { name: true, imageUrl: true } },
              variant: { select: { name: true } },
              design: { select: { id: true, preview: true, preflightScore: true } },
              pendingUpload: { select: { id: true, filename: true, validStatus: true, blobUrl: true, mime: true } },
            },
          },
        },
      })
    : null

  const items = (cart?.items ?? []).map((item) => ({
    id: item.id,
    productName: item.product.name,
    variantName: item.variant?.name ?? null,
    width: Number(item.width),
    height: Number(item.height),
    quantity: item.quantity,
    priceSnapshot: Number(item.priceSnapshot),
    imageUrl: item.product.imageUrl ?? null,
    design: item.design
      ? { id: item.design.id, preview: item.design.preview, preflightScore: item.design.preflightScore }
      : null,
    pendingUpload: item.pendingUpload
      ? {
          id: item.pendingUpload.id,
          filename: item.pendingUpload.filename,
          validStatus: item.pendingUpload.validStatus,
          blobUrl: item.pendingUpload.blobUrl,
          mime: item.pendingUpload.mime,
        }
      : null,
  }))

  const subtotal = items.reduce((sum, item) => sum + item.priceSnapshot * item.quantity, 0)

  return (
    <Container>
      <h1 className="mb-6">{tc.cart}</h1>
      <CartUI items={items} subtotal={subtotal} />
    </Container>
  )
}
