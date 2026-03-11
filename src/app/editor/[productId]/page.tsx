// Steps 342, 366 — Editor route: server component that loads product + config + category

import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import EditorShell from './EditorShell'

interface Props {
  params: { productId: string }
  searchParams?: { w?: string; h?: string }
}

export default async function EditorPage({ params, searchParams }: Props) {
  const product = await db.product.findUnique({
    where: { id: params.productId, active: true },
    select: {
      id: true,
      name: true,
      category: true,
      imageUrl: true,
      config: {
        select: {
          type: true,
          needsPlacement: true,
          hasCustomSize: true,
          printAreaWidthCm: true,
          printAreaHeightCm: true,
        },
      },
      productCategory: {
        select: { slug: true },
      },
    },
  })

  if (!product) notFound()

  // Convert Decimal fields to number for client component serialization
  const productForShell = {
    ...product,
    // Step 366 — prefer canonical category slug; fall back to product.category string
    categorySlug: product.productCategory?.slug ?? product.category,
    config: product.config
      ? {
          ...product.config,
          printAreaWidthCm:
            product.config.printAreaWidthCm != null
              ? Number(product.config.printAreaWidthCm)
              : null,
          printAreaHeightCm:
            product.config.printAreaHeightCm != null
              ? Number(product.config.printAreaHeightCm)
              : null,
        }
      : null,
  }

  const initialWidth = searchParams?.w ? Number(searchParams.w) : null
  const initialHeight = searchParams?.h ? Number(searchParams.h) : null

  console.log('EDITOR PARAMS', initialWidth, initialHeight)

  return <EditorShell product={productForShell} initialWidth={initialWidth} initialHeight={initialHeight} />
}
