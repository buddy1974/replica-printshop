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
    {
      name: 'Display systems', slug: 'display-systems', sortOrder: 0, defaultPriceMode: 'PIECE',
      description: 'Roll-ups, kundestoppere, frames, and display stands — ready to print and delivered fast.',
    },
    {
      name: 'Textile print', slug: 'textile-print', sortOrder: 1, defaultPriceMode: 'PIECE',
      description: 'High-quality DTF (Direct-to-Film) transfers heat-pressed onto your garments. Suitable for t-shirts, hoodies, tote bags, and more.',
    },
    {
      name: 'Vinyl plot', slug: 'vinyl-plot', sortOrder: 2, defaultPriceMode: 'METER',
      description: 'Precision-cut vinyl lettering and shapes from our plotter. Ideal for signs, windows, vehicles, and equipment marking.',
    },
    {
      name: 'Stickers', slug: 'stickers', sortOrder: 3, defaultPriceMode: 'AREA',
      description: 'Full-colour stickers printed and cut to shape. Available in gloss, matte, or laminated finish. Square cut or contour cut.',
    },
    {
      name: 'Banner', slug: 'banner', sortOrder: 4, defaultPriceMode: 'AREA',
      description: 'Large format banners printed on durable PVC or mesh material. Finished with hemmed edges and eyelets for easy mounting.',
    },
    {
      name: 'Rigid', slug: 'rigid', sortOrder: 5, defaultPriceMode: 'FIXED',
      description: 'Printing on rigid substrates such as forex, dibond, and acrylic. Suitable for outdoor signage and display.',
    },
    {
      name: 'Foil', slug: 'foil', sortOrder: 6, defaultPriceMode: 'AREA',
      description: 'Self-adhesive foils, window films, magnetic foils, and car magnets. Custom size, precision cut.',
    },
  ]

  for (const cat of categories) {
    await db.productCategory.upsert({
      where: { slug: cat.slug },
      create: cat,
      update: { name: cat.name, sortOrder: cat.sortOrder, defaultPriceMode: cat.defaultPriceMode, description: cat.description },
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
    update: { categoryId: cat?.id ?? null, imageUrl: '/images/products/textile.svg', shortDescription: 'DTF print on your own garments — choose size and colour.', description: 'Send us your garment and we\'ll apply a high-quality DTF transfer. Works on cotton, polyester, and blends. Vibrant colours, soft hand feel, washable at 40°C.' },
    create: {
      name: 'Textile print',
      slug: 'textile-print',
      category: 'Textile print',
      categoryId: cat?.id ?? null,
      active: true,
      shortDescription: 'DTF print on your own garments — choose size and colour.',
      description: 'Send us your garment and we\'ll apply a high-quality DTF transfer. Works on cotton, polyester, and blends. Vibrant colours, soft hand feel, washable at 40°C.',
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
      helpText: 'Select your garment size and colour. The print area is 30 × 40 cm max (front or back). Your design will be scaled to fit.',
      uploadInstructions: 'Upload a PNG with transparent background. The design should be at least 150 DPI at print size. For best results use 300 DPI.',
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
    update: { categoryId: cat?.id ?? null, imageUrl: '/images/products/vinyl.svg', shortDescription: 'Precision-cut vinyl letters and shapes. Choose your colour.', description: 'Single-colour vinyl lettering cut on our precision plotter. Supplied pre-masked and ready to apply. Ideal for shop windows, vehicles, walls, and equipment.' },
    create: {
      name: 'Vinyl lettering',
      slug: 'vinyl-lettering',
      category: 'Vinyl plot',
      categoryId: cat?.id ?? null,
      active: true,
      shortDescription: 'Precision-cut vinyl letters and shapes. Choose your colour.',
      description: 'Single-colour vinyl lettering cut on our precision plotter. Supplied pre-masked and ready to apply. Ideal for shop windows, vehicles, walls, and equipment.',
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
      helpText: 'Enter width (max 61 cm) and the length of vinyl you need. Price is per linear metre.',
      uploadInstructions: 'Upload a vector file (SVG, PDF, AI, or EPS). Single colour only — the cut will follow the outlines of your design. Minimum line thickness 2 mm.',
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
    update: { categoryId: cat?.id ?? null, imageUrl: '/images/products/sticker.svg', shortDescription: 'Full-colour print & cut stickers. Any shape, any size.', description: 'Full-colour stickers printed on premium vinyl and cut to your shape. Available in matte or gloss lamination. Waterproof, UV-resistant, and suitable for both indoor and outdoor use.' },
    create: {
      name: 'Stickers',
      slug: 'stickers',
      category: 'Stickers',
      categoryId: cat?.id ?? null,
      active: true,
      shortDescription: 'Full-colour print & cut stickers. Any shape, any size.',
      description: 'Full-colour stickers printed on premium vinyl and cut to your shape. Available in matte or gloss lamination. Waterproof, UV-resistant, and suitable for both indoor and outdoor use.',
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
      helpText: 'Enter the dimensions of your sticker. Max width 137 cm. Price is per m² based on the bounding box of your design.',
      uploadInstructions: 'Upload PDF or PNG at minimum 150 DPI. Include 2 mm bleed on all sides. If contour cut is selected, include a spot colour named "CutContour" in your PDF.',
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
// Banner finishing / material / print options (steps 231–234)
// ---------------------------------------------------------------------------

const BANNER_FINISHING_VALUES = [
  { name: 'Nur Schnitt',              priceModifier: 0.00 },
  { name: 'Nur Flachsaum',            priceModifier: 0.50 },
  { name: 'Flachsaum + Ösen (Ecken)', priceModifier: 1.50 },
  { name: 'Flachsaum + Ösen 100cm',   priceModifier: 2.00 },
  { name: 'Flachsaum + Ösen 50cm',    priceModifier: 2.50 },
  { name: 'Flachsaum + Ösen 30cm',    priceModifier: 3.00 },
  { name: 'Hohlsaum 3cm',             priceModifier: 1.50 },
  { name: 'Hohlsaum 6cm',             priceModifier: 2.00 },
  { name: 'Hohlsaum 8cm',             priceModifier: 2.00 },
  { name: 'Hohlsaum 10cm',            priceModifier: 2.50 },
  { name: 'Rundkeder 6mm',            priceModifier: 2.50 },
  { name: 'Rundkeder 8mm',            priceModifier: 3.00 },
]

async function applyBannerOptions(productId: string) {
  // Remove legacy "Finishing" option (3-value version) if present
  const legacy = await db.productOption.findFirst({ where: { productId, name: 'Finishing' } })
  if (legacy) {
    await db.productOptionValue.deleteMany({ where: { optionId: legacy.id } })
    await db.productOption.delete({ where: { id: legacy.id } })
    console.log('    - removed legacy Finishing option')
  }

  await upsertOption(productId, 'Material', [
    { name: 'PVC Frontlit 510g', priceModifier: 0 },
    { name: 'Mesh Banner',       priceModifier: 2 },
    { name: 'Blockout',          priceModifier: 3 },
    { name: 'Textile Banner',    priceModifier: 5 },
  ])

  await upsertOption(productId, 'Print', [
    { name: '4/0', priceModifier: 0 },
    { name: '4/4', priceModifier: 4 },
  ])

  for (const side of ['top', 'bottom', 'left', 'right'] as const) {
    await upsertOption(productId, `Finishing ${side}`, BANNER_FINISHING_VALUES)
  }
}

// ---------------------------------------------------------------------------
// Banner (step 197)
// ---------------------------------------------------------------------------

async function seedBanner() {
  console.log('Seeding Banner...')

  const cat = await db.productCategory.findUnique({ where: { slug: 'banner' } })

  const product = await db.product.upsert({
    where: { slug: 'banner' },
    update: { categoryId: cat?.id ?? null, imageUrl: '/images/products/banner.svg', shortDescription: 'PVC banners printed to size, hemmed and eyeleted.', description: 'Durable PVC banners for indoor and outdoor use. Printed at high resolution and finished with hemmed edges and brass eyelets every 50 cm. Max width 160 cm.' },
    create: {
      name: 'Banner',
      slug: 'banner',
      category: 'Banner',
      categoryId: cat?.id ?? null,
      active: true,
      shortDescription: 'PVC banners printed to size, hemmed and eyeleted.',
      description: 'Durable PVC banners for indoor and outdoor use. Printed at high resolution and finished with hemmed edges and brass eyelets every 50 cm. Max width 160 cm.',
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
      helpText: 'Enter width and height in cm. Max width 160 cm. Price is per m² of printed area.',
      uploadInstructions: 'Upload PDF or high-res PNG. Minimum 72 DPI at final size. Include 20 mm bleed on all sides. Set background colour to full bleed — do not leave white borders.',
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
      helpText: 'Enter width and height in cm. Max width 160 cm. Price is per m² of printed area.',
      uploadInstructions: 'Upload PDF or high-res PNG. Minimum 72 DPI at final size. Include 20 mm bleed on all sides. Set background colour to full bleed — do not leave white borders.',
    },
  })

  // Pricing: AREA → €14 per m²
  await upsertPricingTable(product.id, 'AREA', { pricePerM2: 14.00 })

  // Material, Print, per-side Finishing options (steps 231–234)
  await applyBannerOptions(product.id)

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
    update: { categoryId: cat?.id ?? null, imageUrl: '/images/products/banner.svg', shortDescription: 'Wind-through mesh banners for outdoor and scaffolding use.', description: 'Printed mesh banners allow wind to pass through — ideal for scaffolding, fences, and exposed outdoor locations. Finished with hemmed edges and brass eyelets. Max width 160 cm.' },
    create: {
      name: 'Mesh banner',
      slug: 'mesh-banner',
      category: 'Banner',
      categoryId: cat?.id ?? null,
      active: true,
      shortDescription: 'Wind-through mesh banners for outdoor and scaffolding use.',
      description: 'Printed mesh banners allow wind to pass through — ideal for scaffolding, fences, and exposed outdoor locations. Finished with hemmed edges and brass eyelets. Max width 160 cm.',
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
      helpText: 'Enter width and height in cm. Max width 160 cm. Mesh material allows wind through — suitable for exposed outdoor locations.',
      uploadInstructions: 'Upload PDF or high-res PNG. Minimum 72 DPI at final size. Include 20 mm bleed. Note: colours may appear slightly less saturated on mesh material.',
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
      helpText: 'Enter width and height in cm. Max width 160 cm. Mesh material allows wind through — suitable for exposed outdoor locations.',
      uploadInstructions: 'Upload PDF or high-res PNG. Minimum 72 DPI at final size. Include 20 mm bleed. Note: colours may appear slightly less saturated on mesh material.',
    },
  })

  // Pricing: AREA → €18 per m² (mesh material costs more)
  await upsertPricingTable(product.id, 'AREA', { pricePerM2: 18.00 })

  // Material, Print, per-side Finishing options (steps 231–234)
  await applyBannerOptions(product.id)

  console.log(`  ✓ Mesh banner: ${product.id}`)
}

// ---------------------------------------------------------------------------
// Roll-Up (Display systems)
// ---------------------------------------------------------------------------

async function seedRollUp() {
  console.log('Seeding Roll-Up...')

  const cat = await db.productCategory.findUnique({ where: { slug: 'display-systems' } })

  const product = await db.product.upsert({
    where: { slug: 'roll-up' },
    update: {
      categoryId: cat?.id ?? null,
      imageUrl: '/images/products/rollup.svg',
      shortDescription: 'Retractable roll-up banner stands — print, assemble, display.',
      description: 'High-quality retractable roll-up banner stands for trade shows, events, retail, and offices. Print is included — just upload your artwork. Available in two widths. Assembled and ready to use.',
    },
    create: {
      name: 'Roll-Up',
      slug: 'roll-up',
      category: 'Display systems',
      categoryId: cat?.id ?? null,
      active: true,
      imageUrl: '/images/products/rollup.svg',
      shortDescription: 'Retractable roll-up banner stands — print, assemble, display.',
      description: 'High-quality retractable roll-up banner stands for trade shows, events, retail, and offices. Print is included — just upload your artwork. Available in two widths. Assembled and ready to use.',
      guideText: 'PDF or high-res PNG. Minimum 72 DPI at full size. Include 30 mm bleed at bottom (hidden in cassette). Keep important content 50 mm from all edges.',
      minDpi: 72,
      recommendedDpi: 100,
      bleedMm: 30,
      safeMarginMm: 50,
      allowedFormats: 'PDF,PNG,TIFF',
      notes: 'Bleed at bottom is hidden in cassette. Pole and carry bag included.',
    },
  })

  await db.productConfig.upsert({
    where: { productId: product.id },
    update: {
      needsUpload: true,
      priceMode: 'PIECE',
      hasVariants: true,
      hasFixedSizes: false,
      hasCustomSize: false,
      productionType: 'ROLL_PRINT',
      helpText: 'Select your roll-up size. Print, stand, pole and carry bag are all included in the price.',
      uploadInstructions: 'Upload PDF or high-res PNG. Minimum 72 DPI at final size. Include 30 mm bleed at the bottom (this part rolls into the cassette). Keep text and logos at least 50 mm from all edges.',
    },
    create: {
      productId: product.id,
      type: 'ROLLUP',
      hasCustomSize: false,
      hasFixedSizes: false,
      hasVariants: true,
      hasOptions: false,
      needsUpload: true,
      priceMode: 'PIECE',
      productionType: 'ROLL_PRINT',
      helpText: 'Select your roll-up size. Print, stand, pole and carry bag are all included in the price.',
      uploadInstructions: 'Upload PDF or high-res PNG. Minimum 72 DPI at final size. Include 30 mm bleed at the bottom (this part rolls into the cassette). Keep text and logos at least 50 mm from all edges.',
    },
  })

  // PIECE pricing — base price is in the variant; config FIXED table is 0 (no extra print cost)
  await upsertPricingTable(product.id, 'FIXED', { price: 0 })

  // Size variants (stand price + print included)
  await upsertVariant(product.id, '85 × 200 cm',  'Roll-Up', 89.00)
  await upsertVariant(product.id, '100 × 200 cm', 'Roll-Up', 109.00)

  console.log(`  ✓ Roll-Up: ${product.id}`)
}

// ---------------------------------------------------------------------------
// Kundestopper (Display systems)
// ---------------------------------------------------------------------------

async function seedKundestopper() {
  console.log('Seeding Kundestopper...')

  const cat = await db.productCategory.findUnique({ where: { slug: 'display-systems' } })

  const product = await db.product.upsert({
    where: { slug: 'kundestopper' },
    update: {
      categoryId: cat?.id ?? null,
      imageUrl: '/images/products/kundestopper.svg',
      shortDescription: 'A-frame pavement signs — double-sided, printed and ready.',
      description: 'Double-sided A-frame pavement signs (kundestoppere) in A1 or A2 format. Durable aluminium frame with printed inserts included. Ideal for entrances, pavements, and retail environments. Folds flat for storage.',
    },
    create: {
      name: 'Kundestopper',
      slug: 'kundestopper',
      category: 'Display systems',
      categoryId: cat?.id ?? null,
      active: true,
      imageUrl: '/images/products/kundestopper.svg',
      shortDescription: 'A-frame pavement signs — double-sided, printed and ready.',
      description: 'Double-sided A-frame pavement signs (kundestoppere) in A1 or A2 format. Durable aluminium frame with printed inserts included. Ideal for entrances, pavements, and retail environments. Folds flat for storage.',
      guideText: 'PDF or high-res PNG. A1: 594 × 841 mm. A2: 420 × 594 mm. Minimum 150 DPI. Include 5 mm bleed on all sides.',
      minDpi: 150,
      recommendedDpi: 200,
      bleedMm: 5,
      safeMarginMm: 10,
      allowedFormats: 'PDF,PNG',
      notes: 'Double-sided — upload two pages or two files (front and back). Frame and printed inserts included.',
    },
  })

  await db.productConfig.upsert({
    where: { productId: product.id },
    update: {
      needsUpload: true,
      priceMode: 'PIECE',
      hasVariants: true,
      hasFixedSizes: false,
      hasCustomSize: false,
      productionType: 'ROLL_PRINT',
      helpText: 'Select your frame size. Price includes aluminium frame and printed inserts (both sides). Upload your design — 2 pages or 2 files for front and back.',
      uploadInstructions: 'Upload PDF (2 pages) or two separate PNG files for front and back. A1: 594 × 841 mm, A2: 420 × 594 mm. Include 5 mm bleed on all sides. Minimum 150 DPI.',
    },
    create: {
      productId: product.id,
      type: 'FIXED',
      hasCustomSize: false,
      hasFixedSizes: false,
      hasVariants: true,
      hasOptions: false,
      needsUpload: true,
      priceMode: 'PIECE',
      productionType: 'ROLL_PRINT',
      helpText: 'Select your frame size. Price includes aluminium frame and printed inserts (both sides). Upload your design — 2 pages or 2 files for front and back.',
      uploadInstructions: 'Upload PDF (2 pages) or two separate PNG files for front and back. A1: 594 × 841 mm, A2: 420 × 594 mm. Include 5 mm bleed on all sides. Minimum 150 DPI.',
    },
  })

  // PIECE pricing — base price is in the variant
  await upsertPricingTable(product.id, 'FIXED', { price: 0 })

  // Size variants
  await upsertVariant(product.id, 'A1 (594 × 841 mm)', 'Kundestopper', 149.00)
  await upsertVariant(product.id, 'A2 (420 × 594 mm)', 'Kundestopper', 119.00)

  console.log(`  ✓ Kundestopper: ${product.id}`)
}

// ---------------------------------------------------------------------------
// Construction banner (step 237)
// ---------------------------------------------------------------------------

async function seedConstructionBanner() {
  console.log('Seeding Construction banner...')

  const cat = await db.productCategory.findUnique({ where: { slug: 'banner' } })

  const product = await db.product.upsert({
    where: { slug: 'construction-banner' },
    update: {
      categoryId: cat?.id ?? null,
      imageUrl: '/images/products/banner.svg',
      shortDescription: 'Heavy-duty banners for construction sites, scaffolding, and fencing.',
      description: 'Construction banners printed on reinforced PVC or mesh material. UV and weather resistant. Finished with hemmed edges and reinforced eyelets for secure mounting on scaffolding, fences, and hoardings.',
    },
    create: {
      name: 'Construction banner',
      slug: 'construction-banner',
      category: 'Banner',
      categoryId: cat?.id ?? null,
      active: true,
      imageUrl: '/images/products/banner.svg',
      shortDescription: 'Heavy-duty banners for construction sites, scaffolding, and fencing.',
      description: 'Construction banners printed on reinforced PVC or mesh material. UV and weather resistant. Finished with hemmed edges and reinforced eyelets for secure mounting on scaffolding, fences, and hoardings.',
      guideText: 'PDF or high-res PNG. Minimum 72 DPI at full size. Include 30 mm bleed on all sides.',
      minDpi: 72,
      recommendedDpi: 100,
      bleedMm: 30,
      safeMarginMm: 30,
      allowedFormats: 'PDF,PNG,TIFF',
      notes: 'Max width 160 cm. Reinforced eyelets every 50 cm for secure outdoor fixing.',
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
      helpText: 'Enter width and height in cm. Max width 160 cm. Price is per m² of printed area.',
      uploadInstructions: 'Upload PDF or high-res PNG. Minimum 72 DPI at final size. Include 30 mm bleed on all sides.',
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
      maxHeight: 2000,
      productionType: 'ROLL_PRINT',
      helpText: 'Enter width and height in cm. Max width 160 cm. Price is per m² of printed area.',
      uploadInstructions: 'Upload PDF or high-res PNG. Minimum 72 DPI at final size. Include 30 mm bleed on all sides.',
    },
  })

  await upsertPricingTable(product.id, 'AREA', { pricePerM2: 16.00 })
  await applyBannerOptions(product.id)

  console.log(`  ✓ Construction banner: ${product.id}`)
}

// ---------------------------------------------------------------------------
// Foil products (steps 238–239)
// ---------------------------------------------------------------------------

async function seedFoilProducts() {
  console.log('Seeding Foil products...')

  const cat = await db.productCategory.findUnique({ where: { slug: 'foil' } })

  const foilDefs = [
    {
      name: 'Magnetfolie',
      slug: 'magnetfolie',
      imageUrl: '/images/products/foil.svg',
      shortDescription: 'Printed magnetic foil — flexible, removable, repositionable.',
      description: 'Full-colour print on flexible magnetic foil. Easily repositionable and leaves no residue. Ideal for vehicles, refrigerators, whiteboards, and metal surfaces. Max width 100 cm.',
      pricePerM2: 18.00,
      maxWidth: 100,
    },
    {
      name: 'Milchglasfolie',
      slug: 'milchglasfolie',
      imageUrl: '/images/products/foil.svg',
      shortDescription: 'Frosted glass film — privacy and style for windows and glass doors.',
      description: 'Self-adhesive frosted glass film printed with your design. Provides privacy while letting light through. Ideal for office partitions, shop windows, and glass doors. Max width 137 cm.',
      pricePerM2: 22.00,
      maxWidth: 137,
    },
    {
      name: 'Lochfolie',
      slug: 'lochfolie',
      imageUrl: '/images/products/foil.svg',
      shortDescription: 'Perforated window film — see-through from inside, opaque outside.',
      description: 'Printed perforated vinyl film (50/50). Full-colour print visible from outside; transparent from inside. Ideal for shop windows and vehicle rear windows. Max width 137 cm.',
      pricePerM2: 20.00,
      maxWidth: 137,
    },
    {
      name: 'PVC Folie',
      slug: 'pvc-folie',
      imageUrl: '/images/products/foil.svg',
      shortDescription: 'Self-adhesive PVC film — for windows, walls, and smooth surfaces.',
      description: 'Premium self-adhesive PVC film for indoor and outdoor use. Waterproof, UV-resistant, and easy to apply. Available in gloss or matte. Max width 137 cm.',
      pricePerM2: 15.00,
      maxWidth: 137,
    },
    {
      name: 'Car Magnet',
      slug: 'car-magnet',
      imageUrl: '/images/products/car-magnet.svg',
      shortDescription: 'Magnetic car signs — attach and remove in seconds.',
      description: 'Full-colour printed magnetic car signs. Strong enough to stay on at motorway speed. Ideal for business vehicles, temporary branding, and event promotion. Max width 100 cm.',
      pricePerM2: 25.00,
      maxWidth: 100,
    },
    {
      name: 'Car Magnet Schild',
      slug: 'car-magnet-schild',
      imageUrl: '/images/products/car-magnet.svg',
      shortDescription: 'Pre-cut magnetic door signs with rounded corners.',
      description: 'Full-colour magnetic door signs pre-cut to common car door formats. Rounded corners prevent lifting at speed. Supplied in pairs. Printed on 0.8 mm magnetic material.',
      pricePerM2: 25.00,
      maxWidth: 100,
    },
  ]

  for (const def of foilDefs) {
    const product = await db.product.upsert({
      where: { slug: def.slug },
      update: {
        categoryId: cat?.id ?? null,
        imageUrl: def.imageUrl,
        shortDescription: def.shortDescription,
        description: def.description,
      },
      create: {
        name: def.name,
        slug: def.slug,
        category: 'Foil',
        categoryId: cat?.id ?? null,
        active: true,
        imageUrl: def.imageUrl,
        shortDescription: def.shortDescription,
        description: def.description,
        guideText: `PDF or high-res PNG. Minimum 100 DPI at full size. Include 3 mm bleed on all sides. Max width ${def.maxWidth} cm.`,
        minDpi: 100,
        recommendedDpi: 150,
        bleedMm: 3,
        safeMarginMm: 5,
        allowedFormats: 'PDF,PNG,SVG',
        notes: `Max width ${def.maxWidth} cm.`,
      },
    })

    await db.productConfig.upsert({
      where: { productId: product.id },
      update: {
        isRoll: true,
        isPrintCut: true,
        needsUpload: true,
        priceMode: 'AREA',
        rollWidthCm: def.maxWidth,
        maxWidthCm: def.maxWidth,
        productionType: 'PRINT_CUT',
        helpText: `Enter width and height in cm. Max width ${def.maxWidth} cm. Price is per m².`,
        uploadInstructions: 'Upload PDF or high-res PNG. Minimum 100 DPI at final size. Include 3 mm bleed on all sides.',
      },
      create: {
        productId: product.id,
        type: 'FOIL',
        hasCustomSize: true,
        hasFixedSizes: false,
        hasVariants: false,
        hasOptions: false,
        isRoll: true,
        isPrintCut: true,
        needsUpload: true,
        priceMode: 'AREA',
        rollWidthCm: def.maxWidth,
        maxWidthCm: def.maxWidth,
        minWidth: 5,
        maxWidth: def.maxWidth,
        minHeight: 5,
        maxHeight: 500,
        productionType: 'PRINT_CUT',
        helpText: `Enter width and height in cm. Max width ${def.maxWidth} cm. Price is per m².`,
        uploadInstructions: 'Upload PDF or high-res PNG. Minimum 100 DPI at final size. Include 3 mm bleed on all sides.',
      },
    })

    await upsertPricingTable(product.id, 'AREA', { pricePerM2: def.pricePerM2 })

    console.log(`  ✓ ${def.name}: ${product.id}`)
  }
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

  // Real shop products
  await seedRollUp()
  await seedKundestopper()
  await seedTextilePrint()
  await seedVinylLettering()
  await seedStickers()
  await seedBanner()
  await seedMeshBanner()
  await seedConstructionBanner()
  await seedFoilProducts()

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
