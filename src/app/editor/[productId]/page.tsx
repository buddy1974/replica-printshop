// Step 342 — Editor route: server component that loads product + config

import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import EditorShell from './EditorShell'

interface Props {
  params: { productId: string }
}

export default async function EditorPage({ params }: Props) {
  const product = await db.product.findUnique({
    where: { id: params.productId, active: true },
    select: {
      id: true,
      name: true,
      imageUrl: true,
      config: {
        select: {
          type: true,
          needsPlacement: true,
        },
      },
    },
  })

  if (!product) notFound()

  return <EditorShell product={product} />
}
