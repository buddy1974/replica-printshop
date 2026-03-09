import 'dotenv/config'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const db = new PrismaClient({ adapter })

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

async function upsertVariant(productId: string, name: string, material: string, basePrice: number) {
  const existing = await db.productVariant.findFirst({ where: { productId, name } })
  if (!existing) {
    await db.productVariant.create({ data: { productId, name, material, basePrice } })
  }
}

async function upsertOption(
  productId: string,
  optName: string,
  values: { name: string; priceModifier: number }[],
) {
  let option = await db.productOption.findFirst({ where: { productId, name: optName } })
  if (!option) {
    option = await db.productOption.create({ data: { productId, name: optName } })
  }
  for (const v of values) {
    const existing = await db.productOptionValue.findFirst({ where: { optionId: option.id, name: v.name } })
    if (!existing) {
      await db.productOptionValue.create({
        data: { optionId: option.id, name: v.name, priceModifier: v.priceModifier },
      })
    }
  }
}

async function upsertPricingTable(
  productId: string,
  type: string,
  data: {
    price?: number
    pricePerM2?: number
    pricePerMeter?: number
    minWidth?: number | null
    maxWidth?: number | null
  },
) {
  const existing = await db.pricingTable.findFirst({ where: { productId, type } })
  const payload = {
    productId,
    type,
    price: data.price ?? 0,
    pricePerM2: data.pricePerM2 ?? null,
    pricePerMeter: data.pricePerMeter ?? null,
    minWidth: data.minWidth ?? null,
    maxWidth: data.maxWidth ?? null,
  }
  if (existing) {
    await db.pricingTable.update({ where: { id: existing.id }, data: payload })
  } else {
    await db.pricingTable.create({ data: payload })
  }
}

// ---------------------------------------------------------------------------
// Product categories (step 191)
// ---------------------------------------------------------------------------

async function seedCategories() {
  console.log('Seeding product categories...')

  const categories = [
    { name: 'Textile print', slug: 'textile-print', sortOrder: 1, defaultPriceMode: 'PIECE' },
    { name: 'Vinyl plot',    slug: 'vinyl-plot',    sortOrder: 2, defaultPriceMode: 'METER' },
    { name: 'Stickers',     slug: 'stickers',      sortOrder: 3, defaultPriceMode: 'AREA'  },
    { name: 'Banner',       slug: 'banner',        sortOrder: 4, defaultPriceMode: 'AREA'  },
    { name: 'Rigid',        slug: 'rigid',         sortOrder: 5, defaultPriceMode: 'FIXED' },
  ]

  for (const cat of categories) {
    await db.productCategory.upsert({
      where: { slug: cat.slug },
      create: cat,
      update: { name: cat.name, sortOrder: cat.sortOrder, defaultPriceMode: cat.defaultPriceMode },
    })
    console.log(`  ✓ ${cat.name}`)
  }
}

// ---------------------------------------------------------------------------
// Shipping methods
// ---------------------------------------------------------------------------

async function seedShippingMethods() {
  console.log('Seeding shipping methods...')

  const methods = [
    { type: 'PICKUP',   name: 'Pickup',           price: 0 },
    { type: 'DELIVERY', name: 'Standard shipping', price: 5.95 },
    { type: 'EXPRESS',  name: 'Express shipping',  price: 12.95 },
    { type: 'MANUAL',   name: 'Manual shipping',   price: 0 },
  ]

  for (const m of methods) {
    const existing = await db.shippingMethod.findFirst({ where: { type: m.type } })
    if (!existing) {
      await db.shippingMethod.create({ data: m })
      console.log(`  ✓ ${m.name}`)
    } else {
      console.log(`  - ${m.name} (already exists)`)
    }
  }
}

// ---------------------------------------------------------------------------
// Textile print (steps 192–194)
// ---------------------------------------------------------------------------

async function seedTextilePrint() {
  console.log('Seeding Textile print...')

  const cat = await db.productCategory.findUnique({ where: { slug: 'textile-print' } })

  const product = await db.product.upsert({
    where: { slug: 'textile-print' },
    update: { categoryId: cat?.id ?? null },
    create: {
      name: 'Textile print',
      slug: 'textile-print',
      category: 'Textile print',
      categoryId: cat?.id ?? null,
      active: true,
      guideText: 'PNG with transparent background. Minimum 150 DPI. Design will be printed as DTF transfer and heat-pressed.',
      minDpi: 150,
      recommendedDpi: 300,
      bleedMm: 0,
      safeMarginMm: 5,
      allowedFormats: 'PNG,PDF',
      notes: 'Transparent background required for DTF transfers.',
    },
  })

  await db.productConfig.upsert({
    where: { productId: product.id },
    update: {
      isTextile: true,
      needsPlacement: true,
      needsUpload: true,
      priceMode: 'PIECE',
      placementMode: 'front_back',
      printAreaWidthCm: 30,
      printAreaHeightCm: 40,
      dtfMaxWidthCm: 55,
      productionType: 'TEXTILE',
    },
    create: {
      productId: product.id,
      type: 'TEXTILE',
      hasCustomSize: false,
      hasFixedSizes: false,
      hasVariants: true,
      hasOptions: true,
      isTextile: true,
      needsPlacement: true,
      needsUpload: true,
      priceMode: 'PIECE',
      placementMode: 'front_back',
      printAreaWidthCm: 30,
      printAreaHeightCm: 40,
      dtfMaxWidthCm: 55,
      productionType: 'TEXTILE',
    },
  })

  // Pricing: PIECE mode reads a FIXED table row (print cost per piece)
  await upsertPricingTable(product.id, 'FIXED', { price: 7.50 })

  // Size variants (garment cost)
  const sizes = [
    { name: 'S',   material: 'Cotton', basePrice: 5.00 },
    { name: 'M',   material: 'Cotton', basePrice: 5.00 },
    { name: 'L',   material: 'Cotton', basePrice: 5.00 },
    { name: 'XL',  material: 'Cotton', basePrice: 6.00 },
    { name: 'XXL', material: 'Cotton', basePrice: 7.00 },
  ]
  for (const s of sizes) await upsertVariant(product.id, s.name, s.material, s.basePrice)

  // Color option
  await upsertOption(product.id, 'Color', [
    { name: 'Black', priceModifier: 0 },
    { name: 'White', priceModifier: 0 },
    { name: 'Red',   priceModifier: 1 },
    { name: 'Blue',  priceModifier: 1 },
  ])

  console.log(`  ✓ Textile print: ${product.id}`)
}

// ---------------------------------------------------------------------------
// Vinyl lettering (step 195)
// ---------------------------------------------------------------------------

async function seedVinylLettering() {
  console.log('Seeding Vinyl lettering...')

  const cat = await db.productCategory.findUnique({ where: { slug: 'vinyl-plot' } })

  const product = await db.product.upsert({
    where: { slug: 'vinyl-lettering' },
    update: { categoryId: cat?.id ?? null },
    create: {
      name: 'Vinyl lettering',
      slug: 'vinyl-lettering',
      category: 'Vinyl plot',
      categoryId: cat?.id ?? null,
      active: true,
      guideText: 'Vector file required. Single-color design. Width limited to 61 cm (roll width).',
      minDpi: null,
      recommendedDpi: null,
      bleedMm: 0,
      safeMarginMm: 2,
      allowedFormats: 'SVG,PDF,AI,EPS',
      notes: 'Single color. Vector only.',
    },
  })

  await db.productConfig.upsert({
    where: { productId: product.id },
    update: {
      isCut: true,
      isRoll: true,
      needsUpload: true,
      priceMode: 'METER',
      rollWidthCm: 61,
      maxWidthCm: 61,
      productionType: 'CUT',
    },
    create: {
      productId: product.id,
      type: 'VINYL',
      hasCustomSize: true,
      hasFixedSizes: false,
      hasVariants: false,
      hasOptions: true,
      isCut: true,
      isRoll: true,
      needsUpload: true,
      priceMode: 'METER',
      rollWidthCm: 61,
      maxWidthCm: 61,
      minWidth: 1,
      maxWidth: 61,
      minHeight: 5,
      maxHeight: 500,
      productionType: 'CUT',
    },
  })

  // Pricing: METER mode reads a METER table row → €9 per linear meter
  await upsertPricingTable(product.id, 'METER', { pricePerMeter: 9.00 })

  // Vinyl color options
  await upsertOption(product.id, 'Vinyl color', [
    { name: 'White',  priceModifier: 0 },
    { name: 'Black',  priceModifier: 0 },
    { name: 'Red',    priceModifier: 0 },
    { name: 'Blue',   priceModifier: 0 },
    { name: 'Yellow', priceModifier: 0 },
    { name: 'Green',  priceModifier: 0 },
  ])

  console.log(`  ✓ Vinyl lettering: ${product.id}`)
}

// ---------------------------------------------------------------------------
// Stickers (step 196)
// ---------------------------------------------------------------------------

async function seedStickers() {
  console.log('Seeding Stickers...')

  const cat = await db.productCategory.findUnique({ where: { slug: 'stickers' } })

  const product = await db.product.upsert({
    where: { slug: 'stickers' },
    update: { categoryId: cat?.id ?? null },
    create: {
      name: 'Stickers',
      slug: 'stickers',
      category: 'Stickers',
      categoryId: cat?.id ?? null,
      active: true,
      guideText: 'PDF or PNG. Minimum 150 DPI. Include 2 mm bleed. Contour cut supported.',
      minDpi: 150,
      recommendedDpi: 300,
      bleedMm: 2,
      safeMarginMm: 2,
      allowedFormats: 'PDF,PNG,SVG',
      notes: 'Max width 137 cm (roll width). Contour cut available.',
    },
  })

  await db.productConfig.upsert({
    where: { productId: product.id },
    update: {
      isPrintCut: true,
      isRoll: true,
      needsUpload: true,
      priceMode: 'AREA',
      rollWidthCm: 137,
      maxWidthCm: 137,
      productionType: 'PRINT_CUT',
    },
    create: {
      productId: product.id,
      type: 'STICKER',
      hasCustomSize: true,
      hasFixedSizes: false,
      hasVariants: false,
      hasOptions: true,
      isPrintCut: true,
      isRoll: true,
      needsUpload: true,
      priceMode: 'AREA',
      rollWidthCm: 137,
      maxWidthCm: 137,
      minWidth: 2,
      maxWidth: 137,
      minHeight: 2,
      maxHeight: 500,
      productionType: 'PRINT_CUT',
    },
  })

  // Pricing: AREA → €32 per m²
  await upsertPricingTable(product.id, 'AREA', { pricePerM2: 32.00 })

  // Lamination option
  await upsertOption(product.id, 'Lamination', [
    { name: 'None',  priceModifier: 0 },
    { name: 'Matte', priceModifier: 3 },
    { name: 'Gloss', priceModifier: 3 },
  ])

  // Cut option
  await upsertOption(product.id, 'Cut type', [
    { name: 'Square cut',  priceModifier: 0 },
    { name: 'Contour cut', priceModifier: 5 },
  ])

  console.log(`  ✓ Stickers: ${product.id}`)
}

// ---------------------------------------------------------------------------
// Banner (step 197)
// ---------------------------------------------------------------------------

async function seedBanner() {
  console.log('Seeding Banner...')

  const cat = await db.productCategory.findUnique({ where: { slug: 'banner' } })

  const product = await db.product.upsert({
    where: { slug: 'banner' },
    update: { categoryId: cat?.id ?? null },
    create: {
      name: 'Banner',
      slug: 'banner',
      category: 'Banner',
      categoryId: cat?.id ?? null,
      active: true,
      guideText: 'PDF or high-res PNG. Minimum 72 DPI at full size. Include 20 mm bleed on all sides.',
      minDpi: 72,
      recommendedDpi: 100,
      bleedMm: 20,
      safeMarginMm: 20,
      allowedFormats: 'PDF,PNG,TIFF',
      notes: 'Max width 160 cm (roll width). Hemmed and eyeleted by default.',
    },
  })

  await db.productConfig.upsert({
    where: { productId: product.id },
    update: {
      isRoll: true,
      needsUpload: true,
      priceMode: 'AREA',
      rollWidthCm: 160,
      maxWidthCm: 160,
      productionType: 'ROLL_PRINT',
    },
    create: {
      productId: product.id,
      type: 'BANNER',
      hasCustomSize: true,
      hasFixedSizes: false,
      hasVariants: false,
      hasOptions: true,
      isRoll: true,
      needsUpload: true,
      priceMode: 'AREA',
      rollWidthCm: 160,
      maxWidthCm: 160,
      minWidth: 30,
      maxWidth: 160,
      minHeight: 30,
      maxHeight: 1000,
      productionType: 'ROLL_PRINT',
    },
  })

  // Pricing: AREA → €14 per m²
  await upsertPricingTable(product.id, 'AREA', { pricePerM2: 14.00 })

  // Finishing option
  await upsertOption(product.id, 'Finishing', [
    { name: 'Hemmed + eyelets',   priceModifier: 0  },
    { name: 'Hemmed only',        priceModifier: -2 },
    { name: 'No finishing (flat)', priceModifier: -4 },
  ])

  console.log(`  ✓ Banner: ${product.id}`)
}

// ---------------------------------------------------------------------------
// Mesh banner (step 198)
// ---------------------------------------------------------------------------

async function seedMeshBanner() {
  console.log('Seeding Mesh banner...')

  const cat = await db.productCategory.findUnique({ where: { slug: 'banner' } })

  const product = await db.product.upsert({
    where: { slug: 'mesh-banner' },
    update: { categoryId: cat?.id ?? null },
    create: {
      name: 'Mesh banner',
      slug: 'mesh-banner',
      category: 'Banner',
      categoryId: cat?.id ?? null,
      active: true,
      guideText: 'PDF or high-res PNG. Minimum 72 DPI at full size. Mesh material allows wind to pass through.',
      minDpi: 72,
      recommendedDpi: 100,
      bleedMm: 20,
      safeMarginMm: 20,
      allowedFormats: 'PDF,PNG,TIFF',
      notes: 'Max width 160 cm. Suitable for outdoor / wind-exposed locations.',
    },
  })

  await db.productConfig.upsert({
    where: { productId: product.id },
    update: {
      isRoll: true,
      needsUpload: true,
      priceMode: 'AREA',
      rollWidthCm: 160,
      maxWidthCm: 160,
      productionType: 'ROLL_PRINT',
    },
    create: {
      productId: product.id,
      type: 'BANNER',
      hasCustomSize: true,
      hasFixedSizes: false,
      hasVariants: false,
      hasOptions: true,
      isRoll: true,
      needsUpload: true,
      priceMode: 'AREA',
      rollWidthCm: 160,
      maxWidthCm: 160,
      minWidth: 30,
      maxWidth: 160,
      minHeight: 30,
      maxHeight: 1000,
      productionType: 'ROLL_PRINT',
    },
  })

  // Pricing: AREA → €18 per m² (mesh material costs more)
  await upsertPricingTable(product.id, 'AREA', { pricePerM2: 18.00 })

  // Finishing option
  await upsertOption(product.id, 'Finishing', [
    { name: 'Hemmed + eyelets',   priceModifier: 0  },
    { name: 'Hemmed only',        priceModifier: -2 },
    { name: 'No finishing (flat)', priceModifier: -4 },
  ])

  console.log(`  ✓ Mesh banner: ${product.id}`)
}

// ---------------------------------------------------------------------------
// Legacy products (kept for backwards compat)
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

  console.log(`  ✓ DTF Transfer: ${product.id}`)
}

async function seedSticker() {
  console.log('Seeding Sticker (legacy)...')

  const product = await db.product.upsert({
    where: { slug: 'sticker' },
    update: {},
    create: {
      name: 'Sticker',
      slug: 'sticker',
      category: 'Sticker',
      active: false, // hidden — replaced by "Stickers" in proper category
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

  const variantDefs = [
    { name: 'Vinyl Gloss', material: 'Vinyl Gloss' },
    { name: 'Vinyl Matte', material: 'Vinyl Matte' },
    { name: 'Transparent', material: 'Transparent' },
  ]
  for (const v of variantDefs) await upsertVariant(product.id, v.name, v.material, 0)

  console.log(`  ✓ Sticker (legacy): ${product.id}`)
}

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
    { name: 'White mug',  material: 'White', basePrice: 5 },
    { name: 'Magic mug',  material: 'Magic', basePrice: 7 },
    { name: 'Color mug',  material: 'Color', basePrice: 6 },
  ]
  for (const v of variantDefs) await upsertVariant(product.id, v.name, v.material, v.basePrice)

  const existingTemplate = await db.mockupTemplate.findFirst({ where: { productId: product.id } })
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

  console.log(`  ✓ Mug: ${product.id}`)
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  await seedCategories()
  await seedShippingMethods()

  // Real shop products (steps 192–199)
  await seedTextilePrint()
  await seedVinylLettering()
  await seedStickers()
  await seedBanner()
  await seedMeshBanner()

  // Legacy products
  await seedDTF()
  await seedSticker()
  await seedMug()

  console.log('\nAll seeds complete.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
