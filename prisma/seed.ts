import 'dotenv/config'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const db = new PrismaClient({ adapter })

// ---------------------------------------------------------------------------
// DTF Transfer
// ---------------------------------------------------------------------------

async function seedDTF() {
  console.log('Seeding DTF Transfer...')

  const product = await db.product.upsert({
    where: { slug: 'dtf-transfer' },
    update: {},
    create: {
      name: 'DTF Transfer',
      slug: 'dtf-transfer',
      category: 'DTF',
      active: true,
      guideText: 'Use PNG with transparent background. Minimum 300 DPI recommended.',
      minDpi: 150,
      recommendedDpi: 300,
      bleedMm: 0,
      safeMarginMm: 2,
      allowedFormats: 'PNG,PDF',
      notes: 'Transparent background required. PNG preferred.',
    },
  })

  await db.productConfig.upsert({
    where: { productId: product.id },
    update: {},
    create: {
      productId: product.id,
      type: 'DTF',
      hasCustomSize: true,
      hasFixedSizes: false,
      hasVariants: false,
      hasOptions: false,
      minWidth: 5,
      maxWidth: 58,
      minHeight: 5,
      maxHeight: 100,
      printWidth: null,
      printHeight: null,
      notes: 'Transparent background required. PNG preferred.',
    },
  })

  await db.pricingRule.upsert({
    where: { id: `dtf-pricing-${product.id}` },
    update: {},
    create: {
      id: `dtf-pricing-${product.id}`,
      productId: product.id,
      pricePerM2: 25,
      minPrice: 5,
      expressMultiplier: 1.5,
    },
  })

  console.log(`DTF Transfer done: ${product.id}`)
}

// ---------------------------------------------------------------------------
// Sticker
// ---------------------------------------------------------------------------

async function seedSticker() {
  console.log('Seeding Sticker...')

  const product = await db.product.upsert({
    where: { slug: 'sticker' },
    update: {},
    create: {
      name: 'Sticker',
      slug: 'sticker',
      category: 'Sticker',
      active: true,
      guideText: '300 DPI recommended. Vector preferred for contour cut.',
      minDpi: 150,
      recommendedDpi: 300,
      bleedMm: 2,
      safeMarginMm: 2,
      allowedFormats: 'PDF,PNG,SVG',
      notes: 'Contour cut supported',
    },
  })

  await db.productConfig.upsert({
    where: { productId: product.id },
    update: {},
    create: {
      productId: product.id,
      type: 'STICKER',
      hasCustomSize: true,
      hasFixedSizes: true,
      hasVariants: true,
      hasOptions: true,
      fixedSizes: '5x5,10x10,5x10,10x5',
      minWidth: 2,
      maxWidth: 50,
      minHeight: 2,
      maxHeight: 50,
      printWidth: null,
      printHeight: null,
      notes: 'Contour cut supported',
    },
  })

  await db.pricingRule.upsert({
    where: { id: `sticker-pricing-${product.id}` },
    update: {},
    create: {
      id: `sticker-pricing-${product.id}`,
      productId: product.id,
      pricePerM2: 35,
      minPrice: 3,
      expressMultiplier: 1.5,
    },
  })

  // Variants — upsert by name within this product
  const variantDefs = [
    { name: 'Vinyl Gloss', material: 'Vinyl Gloss' },
    { name: 'Vinyl Matte', material: 'Vinyl Matte' },
    { name: 'Transparent', material: 'Transparent' },
  ]

  for (const v of variantDefs) {
    const existing = await db.productVariant.findFirst({
      where: { productId: product.id, name: v.name },
    })
    if (!existing) {
      await db.productVariant.create({
        data: { productId: product.id, name: v.name, material: v.material, basePrice: 0 },
      })
    }
  }

  // Options and values
  const optionDefs = [
    {
      name: 'Cut type',
      values: [
        { name: 'Square', priceModifier: 0 },
        { name: 'Contour', priceModifier: 2 },
        { name: 'Kiss cut', priceModifier: 1 },
      ],
    },
    {
      name: 'Lamination',
      values: [
        { name: 'None', priceModifier: 0 },
        { name: 'Matte', priceModifier: 2 },
        { name: 'Gloss', priceModifier: 2 },
      ],
    },
  ]

  for (const optDef of optionDefs) {
    let option = await db.productOption.findFirst({
      where: { productId: product.id, name: optDef.name },
    })
    if (!option) {
      option = await db.productOption.create({
        data: { productId: product.id, name: optDef.name },
      })
    }

    for (const valDef of optDef.values) {
      const existing = await db.productOptionValue.findFirst({
        where: { optionId: option.id, name: valDef.name },
      })
      if (!existing) {
        await db.productOptionValue.create({
          data: { optionId: option.id, name: valDef.name, priceModifier: valDef.priceModifier },
        })
      }
    }
  }

  console.log(`Sticker done: ${product.id}`)
}

// ---------------------------------------------------------------------------
// Mug
// ---------------------------------------------------------------------------

async function seedMug() {
  console.log('Seeding Mug...')

  const product = await db.product.upsert({
    where: { slug: 'mug' },
    update: {},
    create: {
      name: 'Mug',
      slug: 'mug',
      category: 'Sublimation',
      active: true,
      guideText: 'Use template. 300 DPI recommended.',
      minDpi: 200,
      recommendedDpi: 300,
      bleedMm: 0,
      safeMarginMm: 2,
      allowedFormats: 'PNG,PDF',
      notes: 'Design must fit inside print area',
    },
  })

  await db.productConfig.upsert({
    where: { productId: product.id },
    update: {},
    create: {
      productId: product.id,
      type: 'MUG',
      hasCustomSize: false,
      hasFixedSizes: false,
      hasVariants: true,
      hasOptions: false,
      fixedSizes: null,
      minWidth: null,
      maxWidth: null,
      minHeight: null,
      maxHeight: null,
      printWidth: 23.8,
      printHeight: 11.7,
      notes: 'Design must fit inside print area',
    },
  })

  await db.pricingRule.upsert({
    where: { id: `mug-pricing-${product.id}` },
    update: {},
    create: {
      id: `mug-pricing-${product.id}`,
      productId: product.id,
      pricePerM2: 0,
      minPrice: 5,
      expressMultiplier: 1.5,
    },
  })

  const variantDefs = [
    { name: 'White mug', material: 'White', basePrice: 5 },
    { name: 'Magic mug', material: 'Magic', basePrice: 7 },
    { name: 'Color mug', material: 'Color', basePrice: 6 },
  ]

  for (const v of variantDefs) {
    const existing = await db.productVariant.findFirst({
      where: { productId: product.id, name: v.name },
    })
    if (!existing) {
      await db.productVariant.create({
        data: { productId: product.id, name: v.name, material: v.material, basePrice: v.basePrice },
      })
    }
  }

  // Mockup template
  const existingTemplate = await db.mockupTemplate.findFirst({
    where: { productId: product.id },
  })
  if (!existingTemplate) {
    await db.mockupTemplate.create({
      data: {
        productId: product.id,
        name: 'Mug mockup',
        imageUrl: '/mockups/mug.png',
        printAreaX: 100,
        printAreaY: 50,
        printAreaWidth: 600,
        printAreaHeight: 300,
      },
    })
  }

  console.log(`Mug done: ${product.id}`)
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  await seedDTF()
  await seedSticker()
  await seedMug()
  console.log('All seeds complete.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
