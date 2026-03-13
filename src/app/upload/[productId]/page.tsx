import { notFound } from 'next/navigation'
import Container from '@/components/Container'
import { db } from '@/lib/db'
import UploadClient from './UploadClient'

export const dynamic = 'force-dynamic'

export default async function UploadPage({
  params,
  searchParams,
}: {
  params: { productId: string }
  searchParams: {
    w?: string
    h?: string
    qty?: string
    variant?: string
    opts?: string
    placement?: string
    express?: string
  }
}) {
  const product = await db.product.findUnique({
    where: { id: params.productId, active: true },
    select: {
      id: true,
      name: true,
      minDpi: true,
      recommendedDpi: true,
      bleedMm: true,
      safeMarginMm: true,
      allowedFormats: true,
      notes: true,
      config: { select: { uploadInstructions: true } },
    },
  })
  if (!product) notFound()

  const widthCm  = searchParams.w   ? Number(searchParams.w)   : 0
  const heightCm = searchParams.h   ? Number(searchParams.h)   : 0
  const quantity = searchParams.qty ? Number(searchParams.qty) : 1
  const variantId = searchParams.variant ?? null
  const optionValueIds = searchParams.opts
    ? searchParams.opts.split(',').filter(Boolean)
    : []
  const placement = searchParams.placement ?? null
  const express = searchParams.express === '1'

  return (
    <Container>
      <UploadClient
        product={{
          id: product.id,
          name: product.name,
          minDpi: product.minDpi,
          recommendedDpi: product.recommendedDpi,
          bleedMm: product.bleedMm,
          safeMarginMm: product.safeMarginMm,
          allowedFormats: product.allowedFormats,
          notes: product.notes,
          uploadInstructions: product.config?.uploadInstructions ?? null,
        }}
        config={{
          widthCm,
          heightCm,
          quantity,
          variantId,
          optionValueIds,
          placement,
          express,
        }}
      />
    </Container>
  )
}
