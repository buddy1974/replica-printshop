import 'dotenv/config'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client'
import bcrypt from 'bcryptjs'

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

  // Step 291 — rename legacy 'rigid' slug to 'large-format' if it exists
  const rigid = await db.productCategory.findUnique({ where: { slug: 'rigid' } })
  if (rigid) {
    await db.productCategory.update({ where: { id: rigid.id }, data: { slug: 'large-format', name: 'Large format' } })
    console.log('  ↳ renamed rigid → large-format')
  }

  const categories = [
    {
      name: 'Display systems', slug: 'display-systems', sortOrder: 0, defaultPriceMode: 'PIECE',
      description: 'Roll-ups, kundestoppere, frames, and display stands — ready to print and delivered fast.',
      imageUrl: '/images/products/rollup.svg',
    },
    {
      name: 'Banners', slug: 'banner', sortOrder: 1, defaultPriceMode: 'AREA',
      description: 'Large format banners printed on durable PVC or mesh material. Finished with hemmed edges and eyelets for easy mounting.',
      imageUrl: '/images/products/banner.svg',
    },
    {
      name: 'Foils', slug: 'foil', sortOrder: 2, defaultPriceMode: 'AREA',
      description: 'Self-adhesive foils and window films. Custom size, precision cut.',
      imageUrl: '/images/products/foil.svg',
    },
    {
      name: 'Textile print', slug: 'textile-print', sortOrder: 3, defaultPriceMode: 'PIECE',
      description: 'DTF transfers, flex and flock vinyl. Suitable for t-shirts, hoodies, workwear, and more.',
      imageUrl: '/images/products/textile.svg',
    },
    {
      name: 'Vinyl plot', slug: 'vinyl-plot', sortOrder: 4, defaultPriceMode: 'METER',
      description: 'Precision-cut vinyl lettering and shapes from our plotter. Ideal for signs, windows, vehicles, and equipment marking.',
      imageUrl: '/images/products/vinyl.svg',
    },
    {
      name: 'Stickers', slug: 'stickers', sortOrder: 5, defaultPriceMode: 'AREA',
      description: 'Full-colour stickers printed and cut to shape. Available in gloss, matte, or laminated finish. Square cut or contour cut.',
      imageUrl: '/images/products/sticker.svg',
    },
    {
      name: 'Large format', slug: 'large-format', sortOrder: 6, defaultPriceMode: 'AREA',
      description: 'Printing on rigid substrates — forex, dibond, and acrylic. Suitable for outdoor signage, displays, and shop signs.',
      imageUrl: null,
    },
    {
      name: 'Magnets', slug: 'magnets', sortOrder: 7, defaultPriceMode: 'AREA',
      description: 'Magnetic foil and car magnet signs. Full-colour print, repositionable, and removable without residue.',
      imageUrl: '/images/products/car-magnet.svg',
    },
    {
      name: 'Embroidery', slug: 'embroidery', sortOrder: 8, defaultPriceMode: 'PIECE',
      description: 'Machine embroidery and custom patches. Flat, 3D, or patch embroidery on garments, bags, and accessories.',
      imageUrl: '/images/products/textile.svg',
    },
    {
      name: 'Construction / signage', slug: 'construction-signage', sortOrder: 9, defaultPriceMode: 'AREA',
      description: 'Rigid signs, construction banners, site hoardings, and outdoor signage. Forex, dibond, and acrylic.',
      imageUrl: null,
    },
    {
      name: 'Special', slug: 'special', sortOrder: 10, defaultPriceMode: 'PIECE',
      description: 'Internal and special orders. Not visible in the public shop.',
      imageUrl: null,
    },
    {
      name: 'Graphic Installation', slug: 'graphic-installation', sortOrder: 11, defaultPriceMode: 'PIECE',
      description: 'Car lettering, window foil, signs, lightbox, plexiglass, furniture montage, vinyl floor, boat lettering, truck banners, and event graphics.',
      imageUrl: '/products/graphic-installation-hero.png',
    },
  ]

  for (const cat of categories) {
    await db.productCategory.upsert({
      where: { slug: cat.slug },
      create: cat,
      update: { name: cat.name, sortOrder: cat.sortOrder, defaultPriceMode: cat.defaultPriceMode, description: cat.description, imageUrl: cat.imageUrl },
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

async function applyBannerOptions(productId: string) {
  // Remove all per-side finishing options
  for (const side of ['top', 'bottom', 'left', 'right']) {
    const opt = await db.productOption.findFirst({ where: { productId, name: `Finishing ${side}` } })
    if (opt) {
      await db.productOptionValue.deleteMany({ where: { optionId: opt.id } })
      await db.productOption.delete({ where: { id: opt.id } })
      console.log(`    - removed Finishing ${side}`)
    }
  }

  // Remove any previous "Finishing" option before recreating
  const legacy = await db.productOption.findFirst({ where: { productId, name: 'Finishing' } })
  if (legacy) {
    await db.productOptionValue.deleteMany({ where: { optionId: legacy.id } })
    await db.productOption.delete({ where: { id: legacy.id } })
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

  await upsertOption(productId, 'Finishing', [
    { name: 'Gesäumt, 20 Ösen ringsherum', priceModifier: 2 },
  ])
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
// Textile extension — DTF, Flex, Flock, Embroidery, Patches (steps 241–246)
// ---------------------------------------------------------------------------

async function seedTextileExtension() {
  console.log('Seeding Textile extension products...')

  const cat = await db.productCategory.findUnique({ where: { slug: 'textile-print' } })

  // --- DTF (Direct-to-Film) ---
  const dtf = await db.product.upsert({
    where: { slug: 'dtf' },
    update: { categoryId: cat?.id ?? null, imageUrl: '/images/products/textile.svg', shortDescription: 'DTF transfers printed and cut to size — heat-press at home or in production.' },
    create: {
      name: 'DTF', slug: 'dtf', category: 'Textile print', categoryId: cat?.id ?? null, active: true,
      imageUrl: '/images/products/textile.svg',
      shortDescription: 'DTF transfers printed and cut to size — heat-press at home or in production.',
      description: 'Full-colour direct-to-film (DTF) transfers. We print and cut — you heat-press onto any fabric. Works on cotton, polyester, nylon, and blends. Suitable for small runs.',
      guideText: 'PNG with transparent background. Minimum 150 DPI. Max width 60 cm.', minDpi: 150, recommendedDpi: 300, bleedMm: 0, safeMarginMm: 2, allowedFormats: 'PNG,PDF',
    },
  })
  await db.productConfig.upsert({
    where: { productId: dtf.id },
    update: { needsUpload: true, priceMode: 'AREA', hasCustomSize: true, productionType: 'PRINT_CUT' },
    create: {
      productId: dtf.id, type: 'DTF_SHEET', hasCustomSize: true, hasFixedSizes: false, hasVariants: false, hasOptions: false,
      isPrintCut: true, isRoll: true, needsUpload: true, priceMode: 'AREA', rollWidthCm: 60, maxWidthCm: 60,
      minWidth: 3, maxWidth: 60, minHeight: 3, maxHeight: 200, productionType: 'PRINT_CUT',
    },
  })
  await upsertPricingTable(dtf.id, 'AREA', { pricePerM2: 45.00 })
  console.log(`  ✓ DTF: ${dtf.id}`)

  // --- Flex ---
  const flex = await db.product.upsert({
    where: { slug: 'flex-print' },
    update: { categoryId: cat?.id ?? null, imageUrl: '/images/products/textile.svg', shortDescription: 'Heat-transfer flex vinyl — bright, durable single-colour prints.' },
    create: {
      name: 'Flex', slug: 'flex-print', category: 'Textile print', categoryId: cat?.id ?? null, active: true,
      imageUrl: '/images/products/textile.svg',
      shortDescription: 'Heat-transfer flex vinyl — bright, durable single-colour prints.',
      description: 'Flex vinyl heat transfers for textiles. High opacity, single-colour. Suitable for sports kits, workwear, and promotional wear. Wash-resistant at 60°C. Max width 50 cm.',
      guideText: 'Vector file required. Single-colour only. Max width 50 cm.', minDpi: null, recommendedDpi: null, bleedMm: 0, safeMarginMm: 2, allowedFormats: 'SVG,PDF,EPS',
    },
  })
  await db.productConfig.upsert({
    where: { productId: flex.id },
    update: { needsUpload: true, priceMode: 'AREA', hasCustomSize: true, productionType: 'CUT' },
    create: {
      productId: flex.id, type: 'FLEX', hasCustomSize: true, hasFixedSizes: false, hasVariants: false, hasOptions: true,
      isCut: true, isRoll: true, needsUpload: true, priceMode: 'AREA', rollWidthCm: 50, maxWidthCm: 50,
      minWidth: 3, maxWidth: 50, minHeight: 3, maxHeight: 200, productionType: 'CUT',
    },
  })
  await upsertPricingTable(flex.id, 'AREA', { pricePerM2: 35.00 })
  await upsertOption(flex.id, 'Colour', [
    { name: 'White', priceModifier: 0 }, { name: 'Black', priceModifier: 0 },
    { name: 'Red', priceModifier: 0 }, { name: 'Blue', priceModifier: 0 },
    { name: 'Yellow', priceModifier: 0 }, { name: 'Green', priceModifier: 0 },
    { name: 'Silver', priceModifier: 1 }, { name: 'Gold', priceModifier: 1 },
  ])
  console.log(`  ✓ Flex: ${flex.id}`)

  // --- Flock ---
  const flock = await db.product.upsert({
    where: { slug: 'flock-print' },
    update: { categoryId: cat?.id ?? null, imageUrl: '/images/products/textile.svg', shortDescription: 'Flock heat transfers — soft, velvety finish for premium textiles.' },
    create: {
      name: 'Flock', slug: 'flock-print', category: 'Textile print', categoryId: cat?.id ?? null, active: true,
      imageUrl: '/images/products/textile.svg',
      shortDescription: 'Flock heat transfers — soft, velvety finish for premium textiles.',
      description: 'Flock heat-transfer material for textiles. Creates a soft, raised velvety surface. Ideal for premium fashion and workwear. Single-colour. Max width 50 cm.',
      guideText: 'Vector file required. Single-colour only. Max width 50 cm.', minDpi: null, recommendedDpi: null, bleedMm: 0, safeMarginMm: 2, allowedFormats: 'SVG,PDF,EPS',
    },
  })
  await db.productConfig.upsert({
    where: { productId: flock.id },
    update: { needsUpload: true, priceMode: 'AREA', hasCustomSize: true, productionType: 'CUT' },
    create: {
      productId: flock.id, type: 'FLOCK', hasCustomSize: true, hasFixedSizes: false, hasVariants: false, hasOptions: true,
      isCut: true, isRoll: true, needsUpload: true, priceMode: 'AREA', rollWidthCm: 50, maxWidthCm: 50,
      minWidth: 3, maxWidth: 50, minHeight: 3, maxHeight: 200, productionType: 'CUT',
    },
  })
  await upsertPricingTable(flock.id, 'AREA', { pricePerM2: 40.00 })
  await upsertOption(flock.id, 'Colour', [
    { name: 'Black', priceModifier: 0 }, { name: 'White', priceModifier: 0 },
    { name: 'Red', priceModifier: 0 }, { name: 'Navy', priceModifier: 0 },
    { name: 'Royal Blue', priceModifier: 0 }, { name: 'Forest Green', priceModifier: 0 },
  ])
  console.log(`  ✓ Flock: ${flock.id}`)

  // --- Embroidery (step 241 + 243 + 244) — uses Embroidery category ---
  const embroideryCat = await db.productCategory.findUnique({ where: { slug: 'embroidery' } })
  const embroidery = await db.product.upsert({
    where: { slug: 'embroidery' },
    update: { categoryId: embroideryCat?.id ?? cat?.id ?? null, imageUrl: '/images/products/textile.svg', shortDescription: 'Machine embroidery on garments — flat, 3D, or patch.' },
    create: {
      name: 'Embroidery', slug: 'embroidery', category: 'Embroidery', categoryId: embroideryCat?.id ?? cat?.id ?? null, active: true,
      imageUrl: '/images/products/textile.svg',
      shortDescription: 'Machine embroidery on garments — flat, 3D, or patch.',
      description: 'High-quality machine embroidery on your garments. Choose between flat embroidery, 3D puff embroidery, or patch application. Pricing based on stitch count. Send your garment or order with ours.',
      guideText: 'Vector or high-res PNG. Design will be digitised for embroidery.', minDpi: 300, recommendedDpi: 600, bleedMm: 0, safeMarginMm: 5, allowedFormats: 'PDF,PNG,SVG,AI,EPS',
    },
  })
  await db.productConfig.upsert({
    where: { productId: embroidery.id },
    update: { needsUpload: true, priceMode: 'PIECE', hasVariants: true, productionType: 'TEXTILE' },
    create: {
      productId: embroidery.id, type: 'EMBROIDERY', hasCustomSize: false, hasFixedSizes: false, hasVariants: true, hasOptions: true,
      needsUpload: true, priceMode: 'PIECE', productionType: 'TEXTILE',
    },
  })
  await upsertPricingTable(embroidery.id, 'FIXED', { price: 12.00 })
  // Variants (garment size)
  for (const s of [
    { name: 'S', basePrice: 0 }, { name: 'M', basePrice: 0 },
    { name: 'L', basePrice: 0 }, { name: 'XL', basePrice: 2 }, { name: 'XXL', basePrice: 4 },
  ]) await upsertVariant(embroidery.id, s.name, 'Garment', s.basePrice)
  // Embroidery type option (step 243)
  await upsertOption(embroidery.id, 'Embroidery type', [
    { name: 'Flat embroidery',  priceModifier: 0 },
    { name: '3D embroidery',    priceModifier: 5 },
    { name: 'Patch embroidery', priceModifier: 3 },
  ])
  // Stitch count option (step 244)
  await upsertOption(embroidery.id, 'Stitch count', [
    { name: '5 000',  priceModifier: 0 },
    { name: '10 000', priceModifier: 4 },
    { name: '15 000', priceModifier: 8 },
    { name: '20 000', priceModifier: 12 },
  ])
  console.log(`  ✓ Embroidery: ${embroidery.id}`)

  // --- Patches (step 242 + 245) — uses Embroidery category ---
  const patches = await db.product.upsert({
    where: { slug: 'patches' },
    update: { categoryId: embroideryCat?.id ?? cat?.id ?? null, imageUrl: '/images/products/textile.svg', shortDescription: 'Custom embroidered patches — iron-on, velcro, or sew-on.' },
    create: {
      name: 'Patches', slug: 'patches', category: 'Embroidery', categoryId: embroideryCat?.id ?? cat?.id ?? null, active: true,
      imageUrl: '/images/products/textile.svg',
      shortDescription: 'Custom embroidered patches — iron-on, velcro, or sew-on.',
      description: 'Custom machine-embroidered patches. Choose your border type and backing. Suitable for jackets, bags, hats, and uniforms. Min order 10 pieces.',
      guideText: 'Vector or high-res PNG. Design will be digitised for embroidery.', minDpi: 300, recommendedDpi: 600, bleedMm: 0, safeMarginMm: 3, allowedFormats: 'PDF,PNG,SVG,AI,EPS',
    },
  })
  await db.productConfig.upsert({
    where: { productId: patches.id },
    update: { needsUpload: true, priceMode: 'PIECE', hasCustomSize: true, productionType: 'TEXTILE' },
    create: {
      productId: patches.id, type: 'PATCH', hasCustomSize: true, hasFixedSizes: false, hasVariants: false, hasOptions: true,
      needsUpload: true, priceMode: 'PIECE', minWidth: 3, maxWidth: 20, minHeight: 3, maxHeight: 20, productionType: 'TEXTILE',
    },
  })
  await upsertPricingTable(patches.id, 'FIXED', { price: 4.50 })
  // Patch border option (step 245)
  await upsertOption(patches.id, 'Patch border', [
    { name: 'No border',    priceModifier: 0 },
    { name: 'Merrow border', priceModifier: 1 },
    { name: 'Laser cut',    priceModifier: 2 },
  ])
  // Backing option (step 245)
  await upsertOption(patches.id, 'Backing', [
    { name: 'Iron on',  priceModifier: 0 },
    { name: 'Velcro',  priceModifier: 1 },
    { name: 'Sew on',  priceModifier: 0 },
  ])
  console.log(`  ✓ Patches: ${patches.id}`)
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
      printAreaWidthCm: 59.4,
      printAreaHeightCm: 84.1,
      helpText: 'A1 format only. Price includes aluminium frame and printed inserts (both sides). Upload your design — 2 pages or 2 files for front and back.',
      uploadInstructions: 'Upload PDF (2 pages) or two separate PNG files for front and back. A1: 594 × 841 mm. Include 5 mm bleed on all sides. Minimum 150 DPI.',
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
      printAreaWidthCm: 59.4,
      printAreaHeightCm: 84.1,
      helpText: 'A1 format only. Price includes aluminium frame and printed inserts (both sides). Upload your design — 2 pages or 2 files for front and back.',
      uploadInstructions: 'Upload PDF (2 pages) or two separate PNG files for front and back. A1: 594 × 841 mm. Include 5 mm bleed on all sides. Minimum 150 DPI.',
    },
  })

  // PIECE pricing — base price is in the variant
  await upsertPricingTable(product.id, 'FIXED', { price: 0 })

  // A1 only — remove A2 if it exists (customer stopper is A1 only)
  await db.productVariant.deleteMany({ where: { productId: product.id, name: 'A2 (420 × 594 mm)' } })
  await upsertVariant(product.id, 'A1 (594 × 841 mm)', 'Kundestopper', 149.00)

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
  const magnetCat = await db.productCategory.findUnique({ where: { slug: 'magnets' } })

  // Step 291 — Magnetfolie, Car Magnet, Car Magnet Schild → Magnets category
  const magnetDefs = [
    {
      name: 'Magnetfolie',
      slug: 'magnetfolie',
      imageUrl: '/images/products/car-magnet.svg',
      shortDescription: 'Printed magnetic foil — flexible, removable, repositionable.',
      description: 'Full-colour print on flexible magnetic foil. Easily repositionable and leaves no residue. Ideal for vehicles, refrigerators, whiteboards, and metal surfaces. Max width 100 cm.',
      pricePerM2: 18.00,
      maxWidth: 100,
      catId: magnetCat?.id ?? cat?.id ?? null,
      categoryLabel: 'Magnets',
    },
    {
      name: 'Car Magnet',
      slug: 'car-magnet',
      imageUrl: '/images/products/car-magnet.svg',
      shortDescription: 'Magnetic car signs — attach and remove in seconds.',
      description: 'Full-colour printed magnetic car signs. Strong enough to stay on at motorway speed. Ideal for business vehicles, temporary branding, and event promotion. Max width 100 cm.',
      pricePerM2: 25.00,
      maxWidth: 100,
      catId: magnetCat?.id ?? cat?.id ?? null,
      categoryLabel: 'Magnets',
    },
    {
      name: 'Car Magnet Schild',
      slug: 'car-magnet-schild',
      imageUrl: '/images/products/car-magnet.svg',
      shortDescription: 'Pre-cut magnetic door signs with rounded corners.',
      description: 'Full-colour magnetic door signs pre-cut to common car door formats. Rounded corners prevent lifting at speed. Supplied in pairs. Printed on 0.8 mm magnetic material.',
      pricePerM2: 25.00,
      maxWidth: 100,
      catId: magnetCat?.id ?? cat?.id ?? null,
      categoryLabel: 'Magnets',
    },
  ]

  for (const def of magnetDefs) {
    const product = await db.product.upsert({
      where: { slug: def.slug },
      update: { categoryId: def.catId, imageUrl: def.imageUrl, shortDescription: def.shortDescription, description: def.description },
      create: {
        name: def.name, slug: def.slug, category: def.categoryLabel, categoryId: def.catId, active: true,
        imageUrl: def.imageUrl, shortDescription: def.shortDescription, description: def.description,
        guideText: `PDF or high-res PNG. Minimum 100 DPI at full size. Include 3 mm bleed. Max width ${def.maxWidth} cm.`,
        minDpi: 100, recommendedDpi: 150, bleedMm: 3, safeMarginMm: 5, allowedFormats: 'PDF,PNG,SVG',
        notes: `Max width ${def.maxWidth} cm.`,
      },
    })
    await db.productConfig.upsert({
      where: { productId: product.id },
      update: { isRoll: true, isPrintCut: true, needsUpload: true, priceMode: 'AREA', rollWidthCm: def.maxWidth, maxWidthCm: def.maxWidth, productionType: 'PRINT_CUT', helpText: `Enter width and height in cm. Max width ${def.maxWidth} cm. Price is per m².`, uploadInstructions: 'Upload PDF or high-res PNG. Minimum 100 DPI at final size. Include 3 mm bleed on all sides.' },
      create: { productId: product.id, type: 'FOIL', hasCustomSize: true, hasFixedSizes: false, hasVariants: false, hasOptions: false, isRoll: true, isPrintCut: true, needsUpload: true, priceMode: 'AREA', rollWidthCm: def.maxWidth, maxWidthCm: def.maxWidth, minWidth: 5, maxWidth: def.maxWidth, minHeight: 5, maxHeight: 500, productionType: 'PRINT_CUT', helpText: `Enter width and height in cm. Max width ${def.maxWidth} cm. Price is per m².`, uploadInstructions: 'Upload PDF or high-res PNG. Minimum 100 DPI at final size. Include 3 mm bleed on all sides.' },
    })
    await upsertPricingTable(product.id, 'AREA', { pricePerM2: def.pricePerM2 })
    console.log(`  ✓ ${def.name} (Magnets): ${product.id}`)
  }

  const foilDefs = [
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
// Large format — forex, dibond, acrylic (step 291/292)
// ---------------------------------------------------------------------------

async function seedLargeFormat() {
  console.log('Seeding Large format products...')

  const cat = await db.productCategory.findUnique({ where: { slug: 'large-format' } })

  const defs = [
    {
      name: 'Forex board', slug: 'forex-board', pricePerM2: 28.00, maxWidth: 200,
      shortDescription: 'Lightweight PVC foam board for indoor signs and displays.',
      description: 'Printed directly onto white forex (PVC foam board). Lightweight, rigid, and easy to mount. Suitable for indoor signs, displays, posters, and point-of-sale. Available in 3 mm and 5 mm thickness.',
    },
    {
      name: 'Dibond sign', slug: 'dibond-sign', pricePerM2: 55.00, maxWidth: 200,
      shortDescription: 'Aluminium composite panel for outdoor and long-lasting signage.',
      description: 'Printed on dibond (aluminium composite panel). Weather-resistant, UV-stable, and rigid. Ideal for outdoor signs, building fascia, and long-term displays.',
    },
    {
      name: 'Acrylic sign', slug: 'acrylic-sign', pricePerM2: 75.00, maxWidth: 150,
      shortDescription: 'Premium glossy acrylic signs — vibrant colour, premium look.',
      description: 'Printed on clear or white acrylic. High-gloss surface gives vivid colour reproduction. Ideal for reception signs, office decor, and premium retail displays.',
    },
  ]

  for (const def of defs) {
    const product = await db.product.upsert({
      where: { slug: def.slug },
      update: { categoryId: cat?.id ?? null, shortDescription: def.shortDescription, description: def.description },
      create: {
        name: def.name, slug: def.slug, category: 'Large format', categoryId: cat?.id ?? null, active: true,
        shortDescription: def.shortDescription, description: def.description,
        guideText: `PDF or high-res PNG. Minimum 100 DPI at full size. Include 3 mm bleed. Max width ${def.maxWidth} cm.`,
        minDpi: 100, recommendedDpi: 150, bleedMm: 3, safeMarginMm: 5, allowedFormats: 'PDF,PNG',
      },
    })
    await db.productConfig.upsert({
      where: { productId: product.id },
      update: { needsUpload: true, priceMode: 'AREA', hasCustomSize: true, maxWidthCm: def.maxWidth, productionType: 'ROLL_PRINT', helpText: `Enter width and height in cm. Max width ${def.maxWidth} cm. Price is per m².`, uploadInstructions: 'Upload PDF or PNG. Minimum 100 DPI at final print size. Include 3 mm bleed on all sides.' },
      create: { productId: product.id, type: 'RIGID', hasCustomSize: true, hasFixedSizes: false, hasVariants: false, hasOptions: false, needsUpload: true, priceMode: 'AREA', maxWidthCm: def.maxWidth, minWidth: 10, maxWidth: def.maxWidth, minHeight: 10, maxHeight: 300, productionType: 'ROLL_PRINT', helpText: `Enter width and height in cm. Max width ${def.maxWidth} cm. Price is per m².`, uploadInstructions: 'Upload PDF or PNG. Minimum 100 DPI at final print size. Include 3 mm bleed on all sides.' },
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
// Catalog lock — complete product catalog (locked before steps 321-330)
// ---------------------------------------------------------------------------

async function seedCatalogLock() {
  console.log('Seeding catalog lock — missing products and reassignments...')

  // Fetch all category IDs
  const catRows = await db.productCategory.findMany({ select: { id: true, slug: true } })
  const cats: Record<string, string> = {}
  for (const c of catRows) cats[c.slug] = c.id

  // ---- Reassign existing products to correct categories ----
  if (cats['construction-signage']) {
    await db.product.updateMany({
      where: { slug: { in: ['construction-banner'] } },
      data: { categoryId: cats['construction-signage'], category: 'Construction / signage' },
    })
    await db.product.updateMany({
      where: { slug: { in: ['forex-board', 'dibond-sign', 'acrylic-sign'] } },
      data: { categoryId: cats['construction-signage'], category: 'Construction / signage' },
    })
    console.log('  ↳ reassigned construction + rigid products to Construction / signage')
  }

  // ---- Large format — roll-based (canvas, backlit, photo, display) ----
  const largeRollDefs = [
    {
      name: 'Canvas print', slug: 'canvas-print', pricePerM2: 35.00, maxWidth: 160,
      shortDescription: 'High-quality canvas prints for decoration, art reproduction, and display.',
      description: 'Printed on premium artist canvas material. Ideal for interior decoration, art reproduction, photo prints, and exhibition displays. Max width 160 cm.',
    },
    {
      name: 'Backlit film', slug: 'backlit-film', pricePerM2: 40.00, maxWidth: 160,
      shortDescription: 'Backlit film for lightbox displays and illuminated signs.',
      description: 'High-clarity backlit film for lightbox and LED display panels. Vibrant, evenly backlit colours. Suitable for retail lightboxes, exhibition displays, and illuminated signage. Max width 160 cm.',
    },
    {
      name: 'Photo print large', slug: 'photo-print-large', pricePerM2: 30.00, maxWidth: 160,
      shortDescription: 'Large format photographic prints — vibrant, sharp, and durable.',
      description: 'Large format photo-quality prints on premium coated media. Ideal for portraits, event photography displays, and interior decor. Available in gloss or matte. Max width 160 cm.',
    },
    {
      name: 'Display print', slug: 'display-print', pricePerM2: 22.00, maxWidth: 160,
      shortDescription: 'Economy large format display prints for short-term campaigns.',
      description: 'High-resolution large format prints on display media. Suitable for events, exhibitions, retail campaigns, and point-of-sale displays. Max width 160 cm.',
    },
  ]
  for (const def of largeRollDefs) {
    const catId = cats['large-format'] ?? null
    const p = await db.product.upsert({
      where: { slug: def.slug },
      update: { categoryId: catId, shortDescription: def.shortDescription, description: def.description },
      create: {
        name: def.name, slug: def.slug, category: 'Large format', categoryId: catId, active: true,
        shortDescription: def.shortDescription, description: def.description,
        guideText: `PDF or high-res PNG. Minimum 72 DPI at full size. Include 5 mm bleed. Max width ${def.maxWidth} cm.`,
        minDpi: 72, recommendedDpi: 100, bleedMm: 5, safeMarginMm: 5, allowedFormats: 'PDF,PNG,TIFF',
      },
    })
    await db.productConfig.upsert({
      where: { productId: p.id },
      update: { isRoll: true, needsUpload: true, priceMode: 'AREA', rollWidthCm: def.maxWidth, maxWidthCm: def.maxWidth, productionType: 'ROLL_PRINT', helpText: `Enter width and height in cm. Max width ${def.maxWidth} cm. Price is per m².` },
      create: {
        productId: p.id, type: 'LARGE_FORMAT', hasCustomSize: true, hasFixedSizes: false, hasVariants: false, hasOptions: false,
        isRoll: true, needsUpload: true, priceMode: 'AREA', rollWidthCm: def.maxWidth, maxWidthCm: def.maxWidth,
        minWidth: 10, maxWidth: def.maxWidth, minHeight: 10, maxHeight: 500, productionType: 'ROLL_PRINT',
        helpText: `Enter width and height in cm. Max width ${def.maxWidth} cm. Price is per m².`,
        uploadInstructions: 'Upload PDF or high-res PNG. Minimum 72 DPI at final size. Include 5 mm bleed on all sides.',
      },
    })
    await upsertPricingTable(p.id, 'AREA', { pricePerM2: def.pricePerM2 })
    console.log(`  ✓ ${def.name}: ${p.id}`)
  }

  // ---- Construction / signage — new rigid signs ----
  const signDefs = [
    {
      name: 'PVC sign', slug: 'pvc-sign', pricePerM2: 28.00, maxWidth: 200,
      shortDescription: 'Lightweight printed PVC foam signs for indoor and outdoor use.',
      description: 'Printed on white PVC foam board (Forex). Lightweight and easy to mount. Suitable for indoor and sheltered outdoor use. Available in 3 mm and 5 mm thickness.',
    },
    {
      name: 'Site sign', slug: 'site-sign', pricePerM2: 55.00, maxWidth: 200,
      shortDescription: 'Rigid aluminium composite site signs for construction and outdoor use.',
      description: 'Printed on dibond (aluminium composite panel). Weather-resistant and UV-stable. Suitable for construction site boards, project signs, and outdoor hoardings.',
    },
    {
      name: 'Warning sign', slug: 'warning-sign', pricePerM2: 55.00, maxWidth: 200,
      shortDescription: 'Custom warning and safety signs for workplaces and construction sites.',
      description: 'High-visibility warning and safety signs printed on rigid aluminium composite. UV-resistant and weatherproof. Custom sizes or standard safety sign formats.',
    },
  ]
  for (const def of signDefs) {
    const catId = cats['construction-signage'] ?? null
    const p = await db.product.upsert({
      where: { slug: def.slug },
      update: { categoryId: catId, shortDescription: def.shortDescription, description: def.description },
      create: {
        name: def.name, slug: def.slug, category: 'Construction / signage', categoryId: catId, active: true,
        shortDescription: def.shortDescription, description: def.description,
        guideText: `PDF or PNG. Minimum 100 DPI at full size. Include 3 mm bleed. Max width ${def.maxWidth} cm.`,
        minDpi: 100, recommendedDpi: 150, bleedMm: 3, safeMarginMm: 5, allowedFormats: 'PDF,PNG',
      },
    })
    await db.productConfig.upsert({
      where: { productId: p.id },
      update: { needsUpload: true, priceMode: 'AREA', hasCustomSize: true, maxWidthCm: def.maxWidth, productionType: 'ROLL_PRINT', helpText: `Enter width and height in cm. Max width ${def.maxWidth} cm. Price is per m².` },
      create: {
        productId: p.id, type: 'RIGID', hasCustomSize: true, hasFixedSizes: false, hasVariants: false, hasOptions: false,
        needsUpload: true, priceMode: 'AREA', maxWidthCm: def.maxWidth, minWidth: 10, maxWidth: def.maxWidth, minHeight: 10, maxHeight: 300, productionType: 'ROLL_PRINT',
        helpText: `Enter width and height in cm. Max width ${def.maxWidth} cm. Price is per m².`,
        uploadInstructions: 'Upload PDF or PNG. Minimum 100 DPI at final print size. Include 3 mm bleed on all sides.',
      },
    })
    await upsertPricingTable(p.id, 'AREA', { pricePerM2: def.pricePerM2 })
    console.log(`  ✓ ${def.name}: ${p.id}`)
  }

  // ---- Additional banners ----
  const bannerAddDefs = [
    {
      name: 'Rollup banner', slug: 'rollup-banner', pricePerM2: 14.00,
      shortDescription: 'Vertical rollup-format PVC banners — print only, no stand.',
      description: 'Printed PVC banners in tall rollup proportions. Print only — no stand. Suitable as replacement graphics for existing roll-up stands, or free-hanging banners. Max width 160 cm.',
    },
    {
      name: 'Event banner', slug: 'event-banner', pricePerM2: 14.00,
      shortDescription: 'Custom event banners for conferences, festivals, and trade shows.',
      description: 'Large format event banners for conferences, festivals, sports events, and trade shows. Printed on durable PVC with hemmed edges and eyelets. Max width 160 cm.',
    },
    {
      name: 'Double sided banner', slug: 'double-sided-banner', pricePerM2: 20.00,
      shortDescription: 'Double-sided banners printed on blockout material.',
      description: 'Banners printed on both sides with blockout material to prevent bleed-through. Each side can have a different design. Finished with hemmed edges and eyelets. Max width 160 cm.',
    },
    {
      name: 'Stage banner', slug: 'stage-banner', pricePerM2: 14.00,
      shortDescription: 'Wide-format stage and backdrop banners for events and productions.',
      description: 'Large backdrop and stage banners for events, theatre, and TV productions. Available in wide and ultra-wide formats. Max width 160 cm — multiple panels for wider stages.',
    },
    {
      name: 'Fence banner', slug: 'fence-banner', pricePerM2: 16.00,
      shortDescription: 'Heavy-duty mesh banners for construction fences and sports grounds.',
      description: 'Printed mesh banners designed for fence and barrier mounting. Wind-through mesh construction for exposed outdoor use. Reinforced eyelets every 50 cm. Max width 160 cm.',
    },
  ]
  for (const def of bannerAddDefs) {
    const catId = cats['banner'] ?? null
    const p = await db.product.upsert({
      where: { slug: def.slug },
      update: { categoryId: catId, shortDescription: def.shortDescription, description: def.description },
      create: {
        name: def.name, slug: def.slug, category: 'Banners', categoryId: catId, active: true,
        shortDescription: def.shortDescription, description: def.description,
        guideText: 'PDF or high-res PNG. Minimum 72 DPI at full size. Include 20 mm bleed on all sides.',
        minDpi: 72, recommendedDpi: 100, bleedMm: 20, safeMarginMm: 20, allowedFormats: 'PDF,PNG,TIFF',
      },
    })
    await db.productConfig.upsert({
      where: { productId: p.id },
      update: { isRoll: true, needsUpload: true, priceMode: 'AREA', rollWidthCm: 160, maxWidthCm: 160, productionType: 'ROLL_PRINT', helpText: 'Enter width and height in cm. Max width 160 cm. Price is per m² of printed area.' },
      create: {
        productId: p.id, type: 'BANNER', hasCustomSize: true, hasFixedSizes: false, hasVariants: false, hasOptions: true,
        isRoll: true, needsUpload: true, priceMode: 'AREA', rollWidthCm: 160, maxWidthCm: 160,
        minWidth: 30, maxWidth: 160, minHeight: 30, maxHeight: 1000, productionType: 'ROLL_PRINT',
        helpText: 'Enter width and height in cm. Max width 160 cm. Price is per m² of printed area.',
        uploadInstructions: 'Upload PDF or high-res PNG. Minimum 72 DPI at final size. Include 20 mm bleed on all sides.',
      },
    })
    await upsertPricingTable(p.id, 'AREA', { pricePerM2: def.pricePerM2 })
    await applyBannerOptions(p.id)
    console.log(`  ✓ ${def.name}: ${p.id}`)
  }

  // ---- Additional sticker products ----
  const stickerAddDefs: Array<{
    name: string; slug: string; pricePerM2: number; shortDescription: string; description: string
    options: { name: string; values: { name: string; priceModifier: number }[] }[]
  }> = [
    {
      name: 'Product labels', slug: 'product-labels', pricePerM2: 38.00,
      shortDescription: 'Custom product labels — self-adhesive, printed and cut to shape.',
      description: 'Full-colour self-adhesive product labels on premium white or transparent vinyl. Available in any shape. Waterproof, scratch-resistant. Suitable for bottles, boxes, and packaging.',
      options: [
        { name: 'Material', values: [{ name: 'White vinyl', priceModifier: 0 }, { name: 'Transparent vinyl', priceModifier: 2 }, { name: 'Silver metallic', priceModifier: 4 }] },
        { name: 'Lamination', values: [{ name: 'None', priceModifier: 0 }, { name: 'Matte', priceModifier: 3 }, { name: 'Gloss', priceModifier: 3 }] },
      ],
    },
    {
      name: 'Car decals', slug: 'car-decals', pricePerM2: 32.00,
      shortDescription: 'Full-colour car decals and vehicle graphics — outdoor durable.',
      description: 'Printed vinyl decals for vehicles and outdoor surfaces. UV and weather resistant. Available with or without lamination. Contour cut to any shape.',
      options: [
        { name: 'Lamination', values: [{ name: 'None', priceModifier: 0 }, { name: 'Matte', priceModifier: 3 }, { name: 'Gloss UV', priceModifier: 4 }] },
        { name: 'Cut type', values: [{ name: 'Square cut', priceModifier: 0 }, { name: 'Contour cut', priceModifier: 5 }] },
      ],
    },
    {
      name: 'Window stickers', slug: 'window-stickers', pricePerM2: 20.00,
      shortDescription: 'Perforated window stickers — see-through from inside.',
      description: 'Printed perforated vinyl for windows (50/50 perforation). Full-colour design visible from outside; clear view from inside. Removable and repositionable.',
      options: [],
    },
    {
      name: 'Advertising stickers', slug: 'advertising-stickers', pricePerM2: 32.00,
      shortDescription: 'Large quantity advertising stickers for campaigns and promotions.',
      description: 'Full-colour printed advertising stickers for outdoor campaigns, retail promotions, and brand marketing. Available in gloss or matte lamination.',
      options: [
        { name: 'Lamination', values: [{ name: 'None', priceModifier: 0 }, { name: 'Matte', priceModifier: 3 }, { name: 'Gloss', priceModifier: 3 }] },
        { name: 'Cut type', values: [{ name: 'Square cut', priceModifier: 0 }, { name: 'Contour cut', priceModifier: 5 }] },
      ],
    },
    {
      name: 'ISO stickers', slug: 'iso-stickers', pricePerM2: 38.00,
      shortDescription: 'ISO compliance stickers for machinery, equipment, and vehicles.',
      description: 'Durable ISO-compliant safety and compliance stickers printed on laminated vinyl. UV, chemical, and scratch resistant. Custom sizes. Suitable for machinery, forklifts, and industrial equipment.',
      options: [
        { name: 'Lamination', values: [{ name: 'Matte', priceModifier: 0 }, { name: 'Gloss', priceModifier: 0 }] },
      ],
    },
  ]
  for (const def of stickerAddDefs) {
    const catId = cats['stickers'] ?? null
    const p = await db.product.upsert({
      where: { slug: def.slug },
      update: { categoryId: catId, shortDescription: def.shortDescription, description: def.description },
      create: {
        name: def.name, slug: def.slug, category: 'Stickers', categoryId: catId, active: true,
        shortDescription: def.shortDescription, description: def.description,
        guideText: 'PDF or PNG. Minimum 150 DPI. Include 2 mm bleed. Contour cut supported.',
        minDpi: 150, recommendedDpi: 300, bleedMm: 2, safeMarginMm: 2, allowedFormats: 'PDF,PNG,SVG',
      },
    })
    await db.productConfig.upsert({
      where: { productId: p.id },
      update: { isPrintCut: true, isRoll: true, needsUpload: true, priceMode: 'AREA', rollWidthCm: 137, maxWidthCm: 137, productionType: 'PRINT_CUT', helpText: 'Enter the dimensions. Max width 137 cm. Price is per m².' },
      create: {
        productId: p.id, type: 'STICKER', hasCustomSize: true, hasFixedSizes: false, hasVariants: false, hasOptions: def.options.length > 0,
        isPrintCut: true, isRoll: true, needsUpload: true, priceMode: 'AREA', rollWidthCm: 137, maxWidthCm: 137,
        minWidth: 2, maxWidth: 137, minHeight: 2, maxHeight: 500, productionType: 'PRINT_CUT',
        helpText: 'Enter the dimensions. Max width 137 cm. Price is per m².',
        uploadInstructions: 'Upload PDF or PNG at minimum 150 DPI. Include 2 mm bleed.',
      },
    })
    await upsertPricingTable(p.id, 'AREA', { pricePerM2: def.pricePerM2 })
    for (const opt of def.options) await upsertOption(p.id, opt.name, opt.values)
    console.log(`  ✓ ${def.name}: ${p.id}`)
  }

  // ---- Additional vinyl plot products ----
  const vinylAddDefs = [
    {
      name: 'Car lettering', slug: 'car-lettering',
      shortDescription: 'Cut vinyl lettering and graphics for vehicles.',
      description: 'Precision-cut vinyl lettering and shapes for vehicles. Pre-masked and ready to apply. Suitable for car doors, vans, boats, and trailers.',
    },
    {
      name: 'Window lettering', slug: 'window-lettering',
      shortDescription: 'Cut vinyl lettering for shop windows and glass surfaces.',
      description: 'Precision-cut vinyl lettering for shop windows, glass doors, and partitions. Pre-masked for easy application.',
    },
    {
      name: 'Opening hours lettering', slug: 'opening-hours-lettering',
      shortDescription: 'Vinyl opening hours for shop windows — professional and durable.',
      description: 'Cut vinyl opening hours text and graphics for shop windows. Pre-masked and ready to apply. Choose your font, colour, and style.',
    },
    {
      name: 'Wall lettering', slug: 'wall-lettering',
      shortDescription: 'Decorative and signage vinyl lettering for walls and surfaces.',
      description: 'Cut vinyl lettering for interior and exterior walls. Company names, slogans, numbers, and decorative elements. Pre-masked for easy application.',
    },
    {
      name: 'Door lettering', slug: 'door-lettering',
      shortDescription: 'Cut vinyl for doors — names, numbers, and logos.',
      description: 'Precision-cut vinyl text and graphics for doors and entrances. Ideal for office names, room numbers, and building directories.',
    },
    {
      name: 'Logo cut vinyl', slug: 'logo-cut-vinyl',
      shortDescription: 'Single-colour cut vinyl logo — precise edges, long-lasting.',
      description: 'Your logo precision-cut from single-colour vinyl. Suitable for windows, vehicles, walls, and signage. Pre-masked for easy application.',
    },
  ]
  for (const def of vinylAddDefs) {
    const catId = cats['vinyl-plot'] ?? null
    const p = await db.product.upsert({
      where: { slug: def.slug },
      update: { categoryId: catId, shortDescription: def.shortDescription, description: def.description },
      create: {
        name: def.name, slug: def.slug, category: 'Vinyl plot', categoryId: catId, active: true,
        shortDescription: def.shortDescription, description: def.description,
        guideText: 'Vector file required. Single-colour design. Width limited to 61 cm.',
        minDpi: null, recommendedDpi: null, bleedMm: 0, safeMarginMm: 2, allowedFormats: 'SVG,PDF,AI,EPS',
        notes: 'Single colour. Vector only.',
      },
    })
    await db.productConfig.upsert({
      where: { productId: p.id },
      update: { isCut: true, isRoll: true, needsUpload: true, priceMode: 'METER', rollWidthCm: 61, maxWidthCm: 61, productionType: 'CUT', helpText: 'Enter width (max 61 cm) and the length of vinyl you need. Price is per linear metre.' },
      create: {
        productId: p.id, type: 'VINYL', hasCustomSize: true, hasFixedSizes: false, hasVariants: false, hasOptions: true,
        isCut: true, isRoll: true, needsUpload: true, priceMode: 'METER', rollWidthCm: 61, maxWidthCm: 61,
        minWidth: 1, maxWidth: 61, minHeight: 5, maxHeight: 500, productionType: 'CUT',
        helpText: 'Enter width (max 61 cm) and the length of vinyl you need. Price is per linear metre.',
        uploadInstructions: 'Upload a vector file (SVG, PDF, AI, or EPS). Single colour only.',
      },
    })
    await upsertPricingTable(p.id, 'METER', { pricePerMeter: 9.00 })
    await upsertOption(p.id, 'Vinyl color', [
      { name: 'White', priceModifier: 0 }, { name: 'Black', priceModifier: 0 },
      { name: 'Red', priceModifier: 0 }, { name: 'Blue', priceModifier: 0 },
      { name: 'Yellow', priceModifier: 0 }, { name: 'Green', priceModifier: 0 },
      { name: 'Gold', priceModifier: 2 }, { name: 'Silver', priceModifier: 2 },
    ])
    console.log(`  ✓ ${def.name}: ${p.id}`)
  }

  // Reflective vinyl — higher price, separate product
  {
    const catId = cats['vinyl-plot'] ?? null
    const p = await db.product.upsert({
      where: { slug: 'reflective-vinyl' },
      update: { categoryId: catId },
      create: {
        name: 'Reflective vinyl', slug: 'reflective-vinyl', category: 'Vinyl plot', categoryId: catId, active: true,
        shortDescription: 'Class 1 reflective vinyl lettering for safety signs and vehicles.',
        description: 'Class 1 retroreflective vinyl cut on our plotter. Highly visible at night when illuminated by headlights. Suitable for safety markings, vehicles, and emergency equipment. Max width 61 cm.',
        guideText: 'Vector file required. Single-colour only. Max width 61 cm.',
        bleedMm: 0, safeMarginMm: 2, allowedFormats: 'SVG,PDF,EPS',
      },
    })
    await db.productConfig.upsert({
      where: { productId: p.id },
      update: { isCut: true, isRoll: true, needsUpload: true, priceMode: 'METER', rollWidthCm: 61, maxWidthCm: 61, productionType: 'CUT' },
      create: {
        productId: p.id, type: 'VINYL', hasCustomSize: true, hasFixedSizes: false, hasVariants: false, hasOptions: true,
        isCut: true, isRoll: true, needsUpload: true, priceMode: 'METER', rollWidthCm: 61, maxWidthCm: 61,
        minWidth: 1, maxWidth: 61, minHeight: 5, maxHeight: 200, productionType: 'CUT',
        helpText: 'Enter width and length. Max width 61 cm. Price is per linear metre.',
      },
    })
    await upsertPricingTable(p.id, 'METER', { pricePerMeter: 18.00 })
    await upsertOption(p.id, 'Reflective class', [
      { name: 'Class 1 — White', priceModifier: 0 }, { name: 'Class 1 — Yellow', priceModifier: 0 }, { name: 'Class 1 — Red', priceModifier: 0 },
    ])
    console.log(`  ✓ Reflective vinyl: ${p.id}`)
  }

  // ---- Additional foil products ----
  const foilAddDefs = [
    {
      name: 'Window foil', slug: 'window-foil', pricePerM2: 15.00,
      shortDescription: 'Self-adhesive window film — custom print for windows and glass.',
      description: 'Printed self-adhesive window film for display, branding, and decoration. Easy to apply and remove. Max width 137 cm.',
    },
    {
      name: 'Privacy foil', slug: 'privacy-foil', pricePerM2: 18.00,
      shortDescription: 'Privacy film for office partitions and glass doors.',
      description: 'Frosted or patterned privacy film for office partitions, meeting rooms, and glass doors. Lets light through while blocking direct view. Max width 137 cm.',
    },
  ]
  for (const def of foilAddDefs) {
    const catId = cats['foil'] ?? null
    const p = await db.product.upsert({
      where: { slug: def.slug },
      update: { categoryId: catId, shortDescription: def.shortDescription, description: def.description },
      create: {
        name: def.name, slug: def.slug, category: 'Foils', categoryId: catId, active: true,
        shortDescription: def.shortDescription, description: def.description,
        guideText: 'PDF or PNG. Minimum 100 DPI at full size. Include 3 mm bleed. Max width 137 cm.',
        minDpi: 100, recommendedDpi: 150, bleedMm: 3, safeMarginMm: 5, allowedFormats: 'PDF,PNG,SVG',
      },
    })
    await db.productConfig.upsert({
      where: { productId: p.id },
      update: { isRoll: true, isPrintCut: true, needsUpload: true, priceMode: 'AREA', rollWidthCm: 137, maxWidthCm: 137, productionType: 'PRINT_CUT', helpText: 'Enter width and height in cm. Max width 137 cm. Price is per m².' },
      create: {
        productId: p.id, type: 'FOIL', hasCustomSize: true, hasFixedSizes: false, hasVariants: false, hasOptions: false,
        isRoll: true, isPrintCut: true, needsUpload: true, priceMode: 'AREA', rollWidthCm: 137, maxWidthCm: 137,
        minWidth: 5, maxWidth: 137, minHeight: 5, maxHeight: 500, productionType: 'PRINT_CUT',
        helpText: 'Enter width and height in cm. Max width 137 cm. Price is per m².',
        uploadInstructions: 'Upload PDF or PNG. Minimum 100 DPI at final size. Include 3 mm bleed.',
      },
    })
    await upsertPricingTable(p.id, 'AREA', { pricePerM2: def.pricePerM2 })
    console.log(`  ✓ ${def.name}: ${p.id}`)
  }

  // ---- Additional magnet products ----
  {
    const catId = cats['magnets'] ?? null
    const p = await db.product.upsert({
      where: { slug: 'magnetic-board-print' },
      update: { categoryId: catId },
      create: {
        name: 'Magnetic board print', slug: 'magnetic-board-print', category: 'Magnets', categoryId: catId, active: true,
        shortDescription: 'Printed magnetic whiteboard sheets — write-on, wipe-off surface.',
        description: 'Full-colour print on white magnetic material with a writable surface. Repositionable on any metal surface. Ideal for offices, kitchens, and planning boards. Max width 100 cm.',
        guideText: 'PDF or PNG. Minimum 100 DPI at full size. Include 3 mm bleed. Max width 100 cm.',
        minDpi: 100, recommendedDpi: 150, bleedMm: 3, safeMarginMm: 5, allowedFormats: 'PDF,PNG',
      },
    })
    await db.productConfig.upsert({
      where: { productId: p.id },
      update: { isRoll: true, isPrintCut: true, needsUpload: true, priceMode: 'AREA', rollWidthCm: 100, maxWidthCm: 100, productionType: 'PRINT_CUT' },
      create: {
        productId: p.id, type: 'FOIL', hasCustomSize: true, hasFixedSizes: false, hasVariants: false, hasOptions: false,
        isRoll: true, isPrintCut: true, needsUpload: true, priceMode: 'AREA', rollWidthCm: 100, maxWidthCm: 100,
        minWidth: 5, maxWidth: 100, minHeight: 5, maxHeight: 200, productionType: 'PRINT_CUT',
        helpText: 'Enter width and height in cm. Max width 100 cm. Price is per m².',
        uploadInstructions: 'Upload PDF or PNG. Minimum 100 DPI. Include 3 mm bleed.',
      },
    })
    await upsertPricingTable(p.id, 'AREA', { pricePerM2: 30.00 })
    console.log(`  ✓ Magnetic board print: ${p.id}`)
  }

  // ---- Additional textile products (we supply garment) ----
  const garmentDefs = [
    {
      name: 'T-shirt print', slug: 't-shirt-print', price: 18.00,
      shortDescription: 'T-shirt with custom DTF print — we supply the garment.',
      description: 'Full-colour DTF print on a quality cotton t-shirt (we supply). Choose your size and print placement. Printed and delivered as a finished product.',
      sizes: [
        { name: 'XS', bp: 0 }, { name: 'S', bp: 0 }, { name: 'M', bp: 0 },
        { name: 'L', bp: 0 }, { name: 'XL', bp: 2 }, { name: 'XXL', bp: 4 }, { name: '3XL', bp: 6 },
      ],
    },
    {
      name: 'Hoodie print', slug: 'hoodie-print', price: 32.00,
      shortDescription: 'Hoodie with custom DTF print — we supply the garment.',
      description: 'Full-colour DTF print on a quality cotton/poly hoodie (we supply). Choose size and placement. Soft-feel print, washable at 40°C.',
      sizes: [
        { name: 'S', bp: 0 }, { name: 'M', bp: 0 }, { name: 'L', bp: 0 },
        { name: 'XL', bp: 3 }, { name: 'XXL', bp: 6 }, { name: '3XL', bp: 8 },
      ],
    },
    {
      name: 'Polo print', slug: 'polo-print', price: 22.00,
      shortDescription: 'Polo shirt with custom print or embroidery.',
      description: 'Professional polo shirt with custom DTF print or embroidery. Suitable for uniforms, corporate wear, and events. We supply the polo shirt.',
      sizes: [
        { name: 'S', bp: 0 }, { name: 'M', bp: 0 }, { name: 'L', bp: 0 }, { name: 'XL', bp: 2 }, { name: 'XXL', bp: 4 },
      ],
    },
    {
      name: 'Workwear print', slug: 'workwear-print', price: 25.00,
      shortDescription: 'Workwear with custom logo print or embroidery.',
      description: 'Professional workwear (we supply) with custom DTF print or embroidery. Suitable for uniforms, PPE, and branded workwear.',
      sizes: [
        { name: 'S', bp: 0 }, { name: 'M', bp: 0 }, { name: 'L', bp: 0 },
        { name: 'XL', bp: 3 }, { name: 'XXL', bp: 5 }, { name: '3XL', bp: 8 },
      ],
    },
    {
      name: 'Sport jersey', slug: 'sport-jersey', price: 28.00,
      shortDescription: 'Custom sport jerseys and trikots — full sublimation or DTF print.',
      description: 'Custom sports jerseys and trikots (we supply) with full sublimation or DTF print. Lightweight, breathable polyester. Player names, numbers, and logos.',
      sizes: [
        { name: 'YS', bp: 0 }, { name: 'YM', bp: 0 }, { name: 'YL', bp: 0 },
        { name: 'S', bp: 0 }, { name: 'M', bp: 0 }, { name: 'L', bp: 0 }, { name: 'XL', bp: 2 }, { name: 'XXL', bp: 4 },
      ],
    },
  ]
  for (const def of garmentDefs) {
    const catId = cats['textile-print'] ?? null
    const p = await db.product.upsert({
      where: { slug: def.slug },
      update: { categoryId: catId, shortDescription: def.shortDescription, description: def.description },
      create: {
        name: def.name, slug: def.slug, category: 'Textile print', categoryId: catId, active: true,
        shortDescription: def.shortDescription, description: def.description,
        guideText: 'PNG with transparent background. Minimum 150 DPI. Design will be printed as DTF transfer.',
        minDpi: 150, recommendedDpi: 300, bleedMm: 0, safeMarginMm: 5, allowedFormats: 'PNG,PDF',
        notes: 'Transparent background required for DTF transfers.',
      },
    })
    await db.productConfig.upsert({
      where: { productId: p.id },
      update: { isTextile: true, needsPlacement: true, needsUpload: true, priceMode: 'PIECE', hasVariants: true, placementMode: 'front_back', printAreaWidthCm: 30, printAreaHeightCm: 40, dtfMaxWidthCm: 55, productionType: 'TEXTILE' },
      create: {
        productId: p.id, type: 'TEXTILE', hasCustomSize: false, hasFixedSizes: false, hasVariants: true, hasOptions: true,
        isTextile: true, needsPlacement: true, needsUpload: true, priceMode: 'PIECE',
        placementMode: 'front_back', printAreaWidthCm: 30, printAreaHeightCm: 40, dtfMaxWidthCm: 55, productionType: 'TEXTILE',
        helpText: 'Select size and colour. Print area is 30 × 40 cm max (front or back).',
        uploadInstructions: 'Upload PNG with transparent background at minimum 150 DPI.',
      },
    })
    await upsertPricingTable(p.id, 'FIXED', { price: def.price })
    for (const s of def.sizes) await upsertVariant(p.id, s.name, 'Garment', s.bp)
    await upsertOption(p.id, 'Garment color', [
      { name: 'Black', priceModifier: 0 }, { name: 'White', priceModifier: 0 },
      { name: 'Navy', priceModifier: 0 }, { name: 'Grey', priceModifier: 0 },
      { name: 'Red', priceModifier: 1 }, { name: 'Royal Blue', priceModifier: 1 },
    ])
    console.log(`  ✓ ${def.name}: ${p.id}`)
  }

  // ---- Additional embroidery products ----
  const embAddDefs = [
    {
      name: 'Logo embroidery', slug: 'logo-embroidery', price: 10.00,
      shortDescription: 'Embroidered logo on your garment — flat or 3D.',
      description: 'Machine embroidery of your company logo or design on any garment. Flat or 3D puff embroidery. We digitise your design. Send your garment or order together with a garment.',
    },
    {
      name: 'Cap embroidery', slug: 'cap-embroidery', price: 8.00,
      shortDescription: 'Embroidered logo on caps, hats, and headwear.',
      description: 'Machine embroidery on caps, baseball hats, and headwear. Flat or structured puff embroidery. We can embroider on your caps or supply the caps.',
    },
    {
      name: 'Woven patch', slug: 'woven-patch', price: 5.00,
      shortDescription: 'Woven patches — sharper detail than embroidery.',
      description: 'High-quality woven patches with fine detail not achievable with machine embroidery. Suitable for logos, flags, and intricate designs. Available with iron-on, velcro, or sew-on backing.',
    },
  ]
  for (const def of embAddDefs) {
    const catId = cats['embroidery'] ?? null
    const p = await db.product.upsert({
      where: { slug: def.slug },
      update: { categoryId: catId, shortDescription: def.shortDescription, description: def.description },
      create: {
        name: def.name, slug: def.slug, category: 'Embroidery', categoryId: catId, active: true,
        shortDescription: def.shortDescription, description: def.description,
        guideText: 'Vector or high-res PNG. Design will be digitised for embroidery.',
        minDpi: 300, recommendedDpi: 600, bleedMm: 0, safeMarginMm: 5, allowedFormats: 'PDF,PNG,SVG,AI,EPS',
      },
    })
    await db.productConfig.upsert({
      where: { productId: p.id },
      update: { needsUpload: true, priceMode: 'PIECE', productionType: 'TEXTILE' },
      create: {
        productId: p.id, type: 'EMBROIDERY', hasCustomSize: false, hasFixedSizes: false, hasVariants: false, hasOptions: true,
        needsUpload: true, priceMode: 'PIECE', productionType: 'TEXTILE',
        helpText: 'Upload your logo or design. Price is per piece.',
        uploadInstructions: 'Upload vector or high-res PNG. Design will be digitised.',
      },
    })
    await upsertPricingTable(p.id, 'FIXED', { price: def.price })
    await upsertOption(p.id, 'Embroidery type', [
      { name: 'Flat embroidery', priceModifier: 0 }, { name: '3D puff embroidery', priceModifier: 3 },
    ])
    await upsertOption(p.id, 'Stitch count', [
      { name: '5 000', priceModifier: 0 }, { name: '10 000', priceModifier: 3 },
      { name: '15 000', priceModifier: 6 }, { name: '20 000', priceModifier: 10 },
    ])
    console.log(`  ✓ ${def.name}: ${p.id}`)
  }

  // ---- Special / internal ----
  {
    const catId = cats['special'] ?? null
    const p = await db.product.upsert({
      where: { slug: 'manual-order' },
      update: { categoryId: catId },
      create: {
        name: 'Manual order', slug: 'manual-order', category: 'Special', categoryId: catId, active: false,
        shortDescription: 'Manual order — internal use only.',
        description: 'Used for manually entered orders. Not visible in the shop.',
        guideText: 'Admin use only.',
      },
    })
    await db.productConfig.upsert({
      where: { productId: p.id },
      update: { priceMode: 'PIECE' },
      create: {
        productId: p.id, type: 'MANUAL', hasCustomSize: false, hasFixedSizes: false, hasVariants: false, hasOptions: false,
        needsUpload: false, priceMode: 'PIECE', productionType: 'MANUAL',
      },
    })
    await upsertPricingTable(p.id, 'FIXED', { price: 0 })
    console.log(`  ✓ Manual order: ${p.id}`)
  }

  console.log('  Catalog lock complete.')
}

// ---------------------------------------------------------------------------
// Catalog rebuild — final 8-category structure (before steps 321-330)
// ---------------------------------------------------------------------------

async function seedCatalogRebuild() {
  console.log('Seeding catalog rebuild — final 8-category structure...')

  // ── Phase 1: Category structure ──────────────────────────────────────────

  // Rename / re-sort existing categories
  await db.productCategory.update({ where: { slug: 'display-systems' }, data: { sortOrder: 0 } })
  await db.productCategory.update({ where: { slug: 'banner' },         data: { name: 'Banner', sortOrder: 1 } })
  await db.productCategory.update({ where: { slug: 'foil' },           data: { name: 'Foil / Adhesive', sortOrder: 2 } })
  await db.productCategory.update({ where: { slug: 'vinyl-plot' },     data: { sortOrder: 3 } })
  await db.productCategory.update({ where: { slug: 'textile-print' },  data: { sortOrder: 4 } })
  await db.productCategory.update({ where: { slug: 'stickers' },       data: { sortOrder: 7 } })

  // Push obsolete categories to high sortOrder (not deleted — products reference them)
  await db.productCategory.update({ where: { slug: 'large-format' },         data: { sortOrder: 100 } })
  await db.productCategory.update({ where: { slug: 'magnets' },              data: { sortOrder: 101 } })
  await db.productCategory.update({ where: { slug: 'embroidery' },           data: { sortOrder: 102 } })
  await db.productCategory.update({ where: { slug: 'construction-signage' }, data: { sortOrder: 103 } })
  await db.productCategory.update({ where: { slug: 'special' },              data: { sortOrder: 104 } })

  // Add new categories
  await db.productCategory.upsert({
    where: { slug: 'dtf-gang-sheet' },
    create: {
      name: 'DTF gang sheet', slug: 'dtf-gang-sheet', sortOrder: 5, defaultPriceMode: 'AREA',
      description: 'Fill the 55 cm roll with your designs — gang up multiple artworks on one sheet to minimise waste and reduce cost.',
    },
    update: { name: 'DTF gang sheet', sortOrder: 5 },
  })

  await db.productCategory.upsert({
    where: { slug: 'sublimation' },
    create: {
      name: 'Sublimation print', slug: 'sublimation', sortOrder: 6, defaultPriceMode: 'PIECE',
      description: 'Sublimation-printed mugs, bottles, and accessories. Vibrant permanent prints on specially coated items.',
    },
    update: { name: 'Sublimation print', sortOrder: 6 },
  })

  // Re-fetch category map
  const catRows = await db.productCategory.findMany({ select: { id: true, slug: true } })
  const cats: Record<string, string> = {}
  for (const c of catRows) cats[c.slug] = c.id

  console.log('  ✓ Categories restructured (8 final + legacy pushed out)')

  // ── Phase 2: Deactivate obsolete products ────────────────────────────────

  await db.product.updateMany({
    where: { slug: { in: ['canvas-print', 'backlit-film', 'photo-print-large', 'display-print', 'forex-board', 'dibond-sign', 'acrylic-sign'] } },
    data: { active: false },
  })
  await db.product.updateMany({
    where: { slug: { in: ['construction-banner', 'pvc-sign', 'site-sign', 'warning-sign'] } },
    data: { active: false },
  })
  await db.product.updateMany({
    where: { slug: { in: ['car-magnet-schild', 'mug', 'dtf-transfer', 'dtf'] } },
    data: { active: false },
  })
  console.log('  ✓ Obsolete products deactivated')

  // ── Phase 3: Move products to correct categories ──────────────────────────

  // Magnets → Foil / Adhesive
  const foilCatId = cats['foil'] ?? null
  await db.product.updateMany({
    where: { slug: { in: ['magnetfolie', 'car-magnet', 'car-magnet-schild'] } },
    data: { categoryId: foilCatId, category: 'Foil / Adhesive' },
  })

  // Embroidery products → Textile print
  const textileCatId = cats['textile-print'] ?? null
  await db.product.updateMany({
    where: { slug: { in: ['embroidery', 'patches', 'logo-embroidery', 'cap-embroidery', 'woven-patch'] } },
    data: { categoryId: textileCatId, category: 'Textile print' },
  })
  console.log('  ✓ Products moved (Magnets→Foil, Embroidery→Textile print)')

  // ── Phase 4: Update textile garment products with print method + positions ─

  const garmentSlugs = ['t-shirt-print', 'hoodie-print', 'polo-print', 'workwear-print', 'sport-jersey']
  const garmentPositions: Record<string, string[]> = {
    't-shirt-print':  ['front', 'back', 'left-chest', 'right-chest'],
    'hoodie-print':   ['front', 'back', 'left-chest', 'right-chest', 'sleeve'],
    'polo-print':     ['front', 'back', 'left-chest', 'right-chest'],
    'workwear-print': ['front', 'back', 'left-chest', 'right-chest', 'sleeve'],
    'sport-jersey':   ['front', 'back', 'left-chest', 'right-chest', 'sleeve'],
  }

  for (const slug of garmentSlugs) {
    const p = await db.product.findUnique({ where: { slug } })
    if (!p) { console.log(`  - ${slug} not found, skipping`); continue }

    // Add "Print method" option
    await upsertOption(p.id, 'Print method', [
      { name: 'DTF',  priceModifier: 0 },
      { name: 'Flex', priceModifier: 2 },
      { name: 'Flock', priceModifier: 4 },
    ])

    // Add "Position" option
    const posList = garmentPositions[slug] ?? ['front', 'back']
    await upsertOption(p.id, 'Position', posList.map((pos) => ({
      name: pos.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      priceModifier: 0,
    })))

    // Update allowedPositions in ProductConfig
    await db.productConfig.update({
      where: { productId: p.id },
      data: { allowedPositions: JSON.stringify(posList) },
    })

    console.log(`  ✓ ${slug}: print method + position options added`)
  }

  // Also add allowed positions to cap-embroidery
  {
    const p = await db.product.findUnique({ where: { slug: 'cap-embroidery' } })
    if (p) {
      await db.productConfig.update({
        where: { productId: p.id },
        data: { allowedPositions: JSON.stringify(['cap-front', 'cap-side']) },
      })
    }
  }

  // ── Phase 5: New Display systems products ────────────────────────────────

  const displayCatId = cats['display-systems'] ?? null

  const displayDefs = [
    {
      slug: 'x-banner', name: 'X-Banner',
      shortDescription: 'Freestanding X-frame display — lightweight, fast to set up.',
      description: 'X-frame banner stands for indoor events, trade shows, and retail. Lightweight aluminium frame with printed banner included. Quick to assemble, easy to transport. Available in 60 × 160 cm and 80 × 180 cm.',
      guideText: 'PDF or high-res PNG. Include 30 mm bleed at bottom. Minimum 72 DPI at full size.',
      bleedMm: 30, safeMarginMm: 30, minDpi: 72, recommendedDpi: 100,
      variants: [
        { name: '60 × 160 cm', bp: 39.00 },
        { name: '80 × 180 cm', bp: 49.00 },
      ],
    },
    {
      slug: 'l-banner', name: 'L-Banner',
      shortDescription: 'Slim L-frame display stands — economical and eye-catching.',
      description: 'L-frame banner displays — a simple, economical alternative to roll-ups. Lightweight aluminium frame with printed banner. Available in 60 × 160 cm and 80 × 200 cm. No cassette mechanism — banner attaches with clips.',
      guideText: 'PDF or high-res PNG. Include 30 mm bleed at bottom. Minimum 72 DPI at full size.',
      bleedMm: 30, safeMarginMm: 30, minDpi: 72, recommendedDpi: 100,
      variants: [
        { name: '60 × 160 cm', bp: 29.00 },
        { name: '80 × 200 cm', bp: 39.00 },
      ],
    },
    {
      slug: 'kundenstopper-outdoor', name: 'Kundenstopper outdoor',
      shortDescription: 'Weather-resistant outdoor A-frame pavement signs.',
      description: 'Heavy-duty outdoor A-frame pavement signs with weather-resistant construction. Suitable for all-year outdoor use. Weighted base prevents tipping in wind. Double-sided, printed inserts included. Available in A1 and A0 format.',
      guideText: 'PDF or high-res PNG. A1: 594 × 841 mm, A0: 841 × 1189 mm. Include 5 mm bleed. Minimum 150 DPI.',
      bleedMm: 5, safeMarginMm: 10, minDpi: 150, recommendedDpi: 200,
      variants: [
        { name: 'A1 (594 × 841 mm)', bp: 189.00 },
        { name: 'A0 (841 × 1189 mm)', bp: 249.00 },
      ],
    },
  ]

  for (const def of displayDefs) {
    const p = await db.product.upsert({
      where: { slug: def.slug },
      update: { categoryId: displayCatId, shortDescription: def.shortDescription, description: def.description },
      create: {
        name: def.name, slug: def.slug, category: 'Display systems', categoryId: displayCatId, active: true,
        imageUrl: '/images/products/rollup.svg',
        shortDescription: def.shortDescription, description: def.description,
        guideText: def.guideText,
        minDpi: def.minDpi, recommendedDpi: def.recommendedDpi, bleedMm: def.bleedMm, safeMarginMm: def.safeMarginMm,
        allowedFormats: 'PDF,PNG,TIFF', notes: 'Print, frame, and carry bag included.',
      },
    })
    await db.productConfig.upsert({
      where: { productId: p.id },
      update: { needsUpload: true, priceMode: 'PIECE', hasVariants: true, productionType: 'ROLL_PRINT' },
      create: {
        productId: p.id, type: 'DISPLAY', hasCustomSize: false, hasFixedSizes: false, hasVariants: true, hasOptions: false,
        needsUpload: true, priceMode: 'PIECE', productionType: 'ROLL_PRINT',
        helpText: 'Select your display size. Print, frame, and carry bag are all included in the price.',
        uploadInstructions: 'Upload PDF or high-res PNG at minimum 72 DPI. Include 30 mm bleed at the bottom. Keep text and logos at least 30 mm from all edges.',
      },
    })
    await upsertPricingTable(p.id, 'FIXED', { price: 0 })
    for (const v of def.variants) await upsertVariant(p.id, v.name, 'Display', v.bp)
    console.log(`  ✓ ${def.name}: ${p.id}`)
  }

  // ── Phase 6: DTF gang sheet product ──────────────────────────────────────

  const dtfGangCatId = cats['dtf-gang-sheet'] ?? null
  const dtfGang = await db.product.upsert({
    where: { slug: 'dtf-gang-sheet' },
    update: { categoryId: dtfGangCatId, active: true },
    create: {
      name: 'DTF gang sheet', slug: 'dtf-gang-sheet', category: 'DTF gang sheet', categoryId: dtfGangCatId, active: true,
      imageUrl: '/images/products/textile.svg',
      shortDescription: 'DTF gang sheets — fill the 55 cm roll, cut to size, heat-press your prints.',
      description: 'Gang up multiple designs on a single 55 cm wide DTF roll to minimise waste. You specify the width and height of the film area. We print and cut — you heat-press onto any fabric. Vibrant colours, soft hand feel. Works on cotton, polyester, nylon, and blends.',
      guideText: 'PNG with transparent background. Minimum 150 DPI. Max width 55 cm. Arrange multiple designs in one file to fill the sheet.',
      minDpi: 150, recommendedDpi: 300, bleedMm: 0, safeMarginMm: 5, allowedFormats: 'PNG,PDF',
      notes: 'Max width 55 cm. Gang multiple designs on one file to reduce per-piece cost.',
    },
  })
  await db.productConfig.upsert({
    where: { productId: dtfGang.id },
    update: { needsUpload: true, priceMode: 'AREA', hasCustomSize: true, rollWidthCm: 55, maxWidthCm: 55, isDTF: true, productionType: 'DTF' },
    create: {
      productId: dtfGang.id, type: 'DTF_GANG', hasCustomSize: true, hasFixedSizes: false, hasVariants: false, hasOptions: false,
      isPrintCut: true, isRoll: true, isDTF: true, needsUpload: true, priceMode: 'AREA',
      rollWidthCm: 55, maxWidthCm: 55, dtfMaxWidthCm: 55,
      minWidth: 5, maxWidth: 55, minHeight: 5, maxHeight: 500, productionType: 'DTF',
      helpText: 'Enter the total width and height of your gang sheet. Max width 55 cm. Price is per dm² — fill the sheet to minimise cost per design.',
      uploadInstructions: 'Upload a single PNG (transparent background) containing all your designs arranged in the sheet area. Minimum 150 DPI. Avoid white space between designs to save cost.',
    },
  })
  await upsertPricingTable(dtfGang.id, 'AREA', { pricePerM2: 40.00 })
  console.log(`  ✓ DTF gang sheet: ${dtfGang.id}`)

  // ── Phase 7: Sublimation products ────────────────────────────────────────

  const sublimCatId = cats['sublimation'] ?? null

  // Standard + magic mug (replace legacy mug product)
  const sublimMug = await db.product.upsert({
    where: { slug: 'sublimation-mug' },
    update: { categoryId: sublimCatId, active: true },
    create: {
      name: 'Sublimation mug', slug: 'sublimation-mug', category: 'Sublimation print', categoryId: sublimCatId, active: true,
      imageUrl: '/images/products/mug.svg',
      shortDescription: 'Custom printed mugs — standard white and colour-changing magic mugs.',
      description: 'Sublimation-printed ceramic mugs. Vibrant, permanent prints that won\'t fade, peel, or crack. Available as standard white mug or colour-changing magic mug (reveals print when filled with hot liquid). Dishwasher safe. Capacity 330 ml.',
      guideText: 'PNG or PDF. Print area 238 × 117 mm. Minimum 200 DPI. Bleed 3 mm on all sides.',
      minDpi: 200, recommendedDpi: 300, bleedMm: 3, safeMarginMm: 5, allowedFormats: 'PNG,PDF',
      notes: 'Print area 238 × 117 mm. Ceramic, 330 ml.',
    },
  })
  await db.productConfig.upsert({
    where: { productId: sublimMug.id },
    update: { needsUpload: true, priceMode: 'PIECE', hasVariants: true, type: 'MUG', printAreaWidthCm: 23.8, printAreaHeightCm: 11.7, productionType: 'TEXTILE' },
    create: {
      productId: sublimMug.id, type: 'MUG', hasCustomSize: false, hasFixedSizes: false, hasVariants: true, hasOptions: false,
      needsUpload: true, priceMode: 'PIECE', printAreaWidthCm: 23.8, printAreaHeightCm: 11.7, productionType: 'TEXTILE',
      helpText: 'Upload your design for the mug. Print area is 238 × 117 mm. Select mug type below.',
      uploadInstructions: 'Upload PNG or PDF. Print area 238 × 117 mm. Include 3 mm bleed. Minimum 200 DPI.',
    },
  })
  await upsertPricingTable(sublimMug.id, 'FIXED', { price: 0 })
  await upsertVariant(sublimMug.id, 'White mug',  'Ceramic white',  8.50)
  await upsertVariant(sublimMug.id, 'Magic mug',  'Ceramic magic', 12.00)
  await upsertVariant(sublimMug.id, 'Colour mug', 'Ceramic colour',  9.50)
  console.log(`  ✓ Sublimation mug: ${sublimMug.id}`)

  // Bottles + accessories
  type SublimItem = {
    slug: string; name: string; shortDescription: string; description: string
    printAreaW: number; printAreaH: number; price: number
  }
  const sublimItems: SublimItem[] = [
    {
      slug: 'sublimation-bottle', name: 'Stainless steel bottle',
      shortDescription: 'Custom printed stainless steel water bottles — 500 ml.',
      description: 'Sublimation-printed stainless steel insulated bottle. Double-walled, keeps drinks hot or cold for hours. Custom full-wrap print. Capacity 500 ml.',
      printAreaW: 24.5, printAreaH: 19.5, price: 18.00,
    },
    {
      slug: 'sublimation-thermo', name: 'Thermo travel cup',
      shortDescription: 'Printed stainless thermo travel cups with lid — 350 ml.',
      description: 'Sublimation-printed thermo travel cup with leak-proof lid. Insulated stainless steel. Full-wrap custom print. Capacity 350 ml.',
      printAreaW: 19.0, printAreaH: 18.0, price: 14.00,
    },
    {
      slug: 'sublimation-aluminium', name: 'Aluminium bottle',
      shortDescription: 'Printed aluminium sports bottles — lightweight, 600 ml.',
      description: 'Sublimation-printed aluminium sports bottle with screw cap. Lightweight and recyclable. Full-wrap custom print. Capacity 600 ml.',
      printAreaW: 25.5, printAreaH: 20.0, price: 12.00,
    },
  ]

  for (const def of sublimItems) {
    const p = await db.product.upsert({
      where: { slug: def.slug },
      update: { categoryId: sublimCatId, active: true, shortDescription: def.shortDescription, description: def.description },
      create: {
        name: def.name, slug: def.slug, category: 'Sublimation print', categoryId: sublimCatId, active: true,
        imageUrl: '/images/products/mug.svg',
        shortDescription: def.shortDescription, description: def.description,
        guideText: `PNG or PDF. Print area ${Math.round(def.printAreaW * 10)} × ${Math.round(def.printAreaH * 10)} mm. Minimum 200 DPI.`,
        minDpi: 200, recommendedDpi: 300, bleedMm: 3, safeMarginMm: 5, allowedFormats: 'PNG,PDF',
      },
    })
    await db.productConfig.upsert({
      where: { productId: p.id },
      update: { needsUpload: true, priceMode: 'PIECE', type: 'MUG', printAreaWidthCm: def.printAreaW, printAreaHeightCm: def.printAreaH, productionType: 'TEXTILE' },
      create: {
        productId: p.id, type: 'MUG', hasCustomSize: false, hasFixedSizes: false, hasVariants: false, hasOptions: false,
        needsUpload: true, priceMode: 'PIECE', printAreaWidthCm: def.printAreaW, printAreaHeightCm: def.printAreaH, productionType: 'TEXTILE',
        helpText: 'Upload your wrap design. Price is per piece.',
        uploadInstructions: `Upload PNG or PDF. Include 3 mm bleed. Print area ${Math.round(def.printAreaW * 10)} × ${Math.round(def.printAreaH * 10)} mm.`,
      },
    })
    await upsertPricingTable(p.id, 'FIXED', { price: def.price })
    console.log(`  ✓ ${def.name}: ${p.id}`)
  }

  // ── Phase 8: Foil / Adhesive — printed graphics ───────────────────────────

  type FoilGraphicDef = {
    slug: string; name: string; shortDescription: string; description: string
    pricePerM2: number; maxWidth: number
  }
  const foilGraphicDefs: FoilGraphicDef[] = [
    {
      slug: 'car-graphics', name: 'Car graphics',
      shortDescription: 'Printed vinyl graphics for vehicles — full colour, contour cut.',
      description: 'Full-colour printed vinyl graphics for vehicles, vans, and car body wraps. High-opacity, weather-resistant cast vinyl. Contour cut available. Ideal for company branding, event vehicles, and fleet marking.',
      pricePerM2: 38.00, maxWidth: 137,
    },
    {
      slug: 'logo-foil', name: 'Logo foil',
      shortDescription: 'Printed logo foil — digitally printed, contour cut to shape.',
      description: 'Digitally printed logo foil cut to the exact shape of your design. Perfect for shop fronts, reception walls, product packaging, and brand collateral. Available in matt, gloss, or metallic finishes.',
      pricePerM2: 32.00, maxWidth: 137,
    },
    {
      slug: 'opening-hours-print', name: 'Opening hours print',
      shortDescription: 'Printed opening hours and info signs for shop windows.',
      description: 'Professionally printed vinyl panels for shop window information — opening hours, contact details, and messages. Easy to apply and remove without residue. Clear background or opaque white available.',
      pricePerM2: 28.00, maxWidth: 137,
    },
    {
      slug: 'window-graphics', name: 'Window graphics',
      shortDescription: 'Large format window graphics — frosted, clear, or printed.',
      description: 'Large format window graphic panels for retail, office, and hospitality environments. Full colour print on self-adhesive film. Contour cut or straight cut. Available in clear, opaque, frosted, or perforated film.',
      pricePerM2: 30.00, maxWidth: 137,
    },
  ]

  for (const def of foilGraphicDefs) {
    const p = await db.product.upsert({
      where: { slug: def.slug },
      update: { categoryId: foilCatId, active: true, shortDescription: def.shortDescription, description: def.description },
      create: {
        name: def.name, slug: def.slug, category: 'Foil / Adhesive', categoryId: foilCatId, active: true,
        imageUrl: '/images/products/foil.svg',
        shortDescription: def.shortDescription, description: def.description,
        guideText: `PDF or high-res PNG. Include 3 mm bleed. Minimum 100 DPI. Max width ${def.maxWidth} cm.`,
        minDpi: 100, recommendedDpi: 150, bleedMm: 3, safeMarginMm: 5, allowedFormats: 'PDF,PNG,SVG',
        notes: `Max width ${def.maxWidth} cm.`,
      },
    })
    await db.productConfig.upsert({
      where: { productId: p.id },
      update: { isPrintCut: true, isRoll: true, needsUpload: true, priceMode: 'AREA', rollWidthCm: def.maxWidth, maxWidthCm: def.maxWidth, productionType: 'PRINT_CUT' },
      create: {
        productId: p.id, type: 'FOIL', hasCustomSize: true, hasFixedSizes: false, hasVariants: false, hasOptions: true,
        isPrintCut: true, isRoll: true, needsUpload: true, priceMode: 'AREA',
        rollWidthCm: def.maxWidth, maxWidthCm: def.maxWidth, minWidth: 5, maxWidth: def.maxWidth, minHeight: 5, maxHeight: 500,
        productionType: 'PRINT_CUT',
        helpText: `Enter width and height in cm. Max width ${def.maxWidth} cm. Price is per m².`,
        uploadInstructions: 'Upload PDF or high-res PNG. Include 3 mm bleed on all sides. Minimum 100 DPI at final print size.',
      },
    })
    await upsertPricingTable(p.id, 'AREA', { pricePerM2: def.pricePerM2 })
    await upsertOption(p.id, 'Finish', [
      { name: 'Gloss', priceModifier: 0 },
      { name: 'Matte', priceModifier: 2 },
    ])
    console.log(`  ✓ ${def.name}: ${p.id}`)
  }

  console.log('  Catalog rebuild complete.')
}

// ---------------------------------------------------------------------------
// Display Systems fix — real product lineup (image-driven)
// ---------------------------------------------------------------------------

async function seedDisplayFix() {
  console.log('Seeding Display Systems fix — real product lineup...')

  const catRow = await db.productCategory.findUnique({ where: { slug: 'display-systems' }, select: { id: true } })
  const catId = catRow?.id ?? null

  // Update category imageUrl (file must exist at /public/images/display/category.jpg)
  if (catId) {
    await db.productCategory.update({
      where: { id: catId },
      data: { imageUrl: '/products/display-system-banner.png' },
    })
  }

  // Deactivate products that are not in the real lineup
  await db.product.updateMany({
    where: { slug: { in: ['x-banner', 'l-banner', 'kundenstopper-outdoor', 'roll-up'] } },
    data: { active: false },
  })
  console.log('  ✓ Deactivated: x-banner, l-banner, kundenstopper-outdoor, roll-up')

  // Rename kundestopper → Customer stopper standard
  await db.product.updateMany({
    where: { slug: 'kundestopper' },
    data: {
      name: 'Customer stopper standard',
      shortDescription: 'Double-sided A-frame pavement signs — printed and ready.',
      imageUrl: '/products/k-stopper-a1.png',
    },
  })
  console.log('  ✓ Renamed kundestopper → Customer stopper standard')

  // Customer stopper double sided A1 outdoor with water tank
  const csOutdoor = await db.product.upsert({
    where: { slug: 'customer-stopper-outdoor' },
    update: { categoryId: catId, active: true, imageUrl: '/products/k-stopper-double.png' },
    create: {
      name: 'Customer stopper double sided A1 outdoor',
      slug: 'customer-stopper-outdoor',
      category: 'Display systems',
      categoryId: catId,
      active: true,
      imageUrl: '/products/k-stopper-double.png',
      shortDescription: 'Heavy-duty outdoor A-frame with water tank base — double-sided A1, all-weather.',
      description: 'Double-sided outdoor A-frame pavement sign in A1 format (594 × 841 mm). Water tank base provides stability in wind. Weather-resistant frame with printed inserts. Ideal for restaurant terraces, shop entrances, and exposed outdoor locations.',
      guideText: 'PDF or high-res PNG. A1: 594 × 841 mm. Include 5 mm bleed. Minimum 150 DPI. Upload 2 pages or 2 files (front and back).',
      minDpi: 150, recommendedDpi: 200, bleedMm: 5, safeMarginMm: 10, allowedFormats: 'PDF,PNG',
      notes: 'Double-sided. Water tank base. A1 only.',
    },
  })
  await db.productConfig.upsert({
    where: { productId: csOutdoor.id },
    update: { needsUpload: true, priceMode: 'PIECE', hasVariants: false, productionType: 'ROLL_PRINT', printAreaWidthCm: 59.4, printAreaHeightCm: 84.1 },
    create: {
      productId: csOutdoor.id, type: 'FIXED', hasCustomSize: false, hasFixedSizes: false, hasVariants: false, hasOptions: false,
      needsUpload: true, priceMode: 'PIECE', productionType: 'ROLL_PRINT',
      printAreaWidthCm: 59.4, printAreaHeightCm: 84.1,
      helpText: 'A1 format, double-sided with water tank base. Price includes frame, water tank base, and printed inserts for both sides.',
      uploadInstructions: 'Upload PDF (2 pages) or two separate PNG files. A1: 594 × 841 mm. Include 5 mm bleed on all sides. Minimum 150 DPI.',
    },
  })
  await upsertPricingTable(csOutdoor.id, 'FIXED', { price: 229.00 })
  console.log(`  ✓ Customer stopper outdoor: ${csOutdoor.id}`)

  // Rollup banner 85×200 (separate product)
  const ru85 = await db.product.upsert({
    where: { slug: 'rollup-85' },
    update: { categoryId: catId, active: true, imageUrl: '/products/rollup-standard.png' },
    create: {
      name: 'Rollup banner 85×200',
      slug: 'rollup-85',
      category: 'Display systems',
      categoryId: catId,
      active: true,
      imageUrl: '/products/rollup-standard.png',
      shortDescription: 'Retractable 85×200 cm roll-up stand — print, pole and carry bag included.',
      description: 'Classic 85×200 cm retractable roll-up banner stand. High-quality aluminium cassette mechanism. Full-colour print included. Quick to set up in seconds. Carry bag for easy transport.',
      guideText: 'PDF or high-res PNG. 850 × 2000 mm. Include 30 mm bleed at bottom (hidden in cassette). Min 72 DPI at full size.',
      minDpi: 72, recommendedDpi: 100, bleedMm: 30, safeMarginMm: 50, allowedFormats: 'PDF,PNG,TIFF',
      notes: 'Bleed at bottom is hidden in cassette. Pole and carry bag included.',
    },
  })
  await db.productConfig.upsert({
    where: { productId: ru85.id },
    update: { needsUpload: true, priceMode: 'PIECE', hasVariants: false, productionType: 'ROLL_PRINT' },
    create: {
      productId: ru85.id, type: 'ROLLUP', hasCustomSize: false, hasFixedSizes: false, hasVariants: false, hasOptions: false,
      needsUpload: true, priceMode: 'PIECE', productionType: 'ROLL_PRINT',
      helpText: '85×200 cm roll-up. Print, stand, pole and carry bag all included.',
      uploadInstructions: 'Upload PDF or PNG at minimum 72 DPI. Size: 850 × 2000 mm. Include 30 mm bleed at the bottom — this area rolls into the cassette and is not visible.',
    },
  })
  await upsertPricingTable(ru85.id, 'FIXED', { price: 89.00 })
  console.log(`  ✓ Rollup 85×200: ${ru85.id}`)

  // Rollup banner 100×200 (separate product)
  const ru100 = await db.product.upsert({
    where: { slug: 'rollup-100' },
    update: { categoryId: catId, active: true, imageUrl: '/products/rollup-standard.png' },
    create: {
      name: 'Rollup banner 100×200',
      slug: 'rollup-100',
      category: 'Display systems',
      categoryId: catId,
      active: true,
      imageUrl: '/products/rollup-standard.png',
      shortDescription: 'Wide 100×200 cm roll-up stand — maximum visibility, print included.',
      description: 'Wide-format 100×200 cm retractable roll-up banner stand. Extra width for greater visual impact. High-quality aluminium cassette, full-colour print and carry bag included.',
      guideText: 'PDF or high-res PNG. 1000 × 2000 mm. Include 30 mm bleed at bottom. Min 72 DPI at full size.',
      minDpi: 72, recommendedDpi: 100, bleedMm: 30, safeMarginMm: 50, allowedFormats: 'PDF,PNG,TIFF',
      notes: 'Bleed at bottom is hidden in cassette. Pole and carry bag included.',
    },
  })
  await db.productConfig.upsert({
    where: { productId: ru100.id },
    update: { needsUpload: true, priceMode: 'PIECE', hasVariants: false, productionType: 'ROLL_PRINT' },
    create: {
      productId: ru100.id, type: 'ROLLUP', hasCustomSize: false, hasFixedSizes: false, hasVariants: false, hasOptions: false,
      needsUpload: true, priceMode: 'PIECE', productionType: 'ROLL_PRINT',
      helpText: '100×200 cm roll-up. Print, stand, pole and carry bag all included.',
      uploadInstructions: 'Upload PDF or PNG at minimum 72 DPI. Size: 1000 × 2000 mm. Include 30 mm bleed at the bottom.',
    },
  })
  await upsertPricingTable(ru100.id, 'FIXED', { price: 109.00 })
  console.log(`  ✓ Rollup 100×200: ${ru100.id}`)

  // Rollup banner double sided outdoor with water tank
  const ruOutdoor = await db.product.upsert({
    where: { slug: 'rollup-outdoor' },
    update: { categoryId: catId, active: true, imageUrl: '/products/double-sided-outdoor-banner.png' },
    create: {
      name: 'Rollup banner double sided outdoor',
      slug: 'rollup-outdoor',
      category: 'Display systems',
      categoryId: catId,
      active: true,
      imageUrl: '/products/double-sided-outdoor-banner.png',
      shortDescription: 'Double-sided outdoor roll-up with water tank base — wind-stable, both sides printed.',
      description: 'Heavy-duty outdoor double-sided roll-up banner stand with water tank base. Wind-resistant for exposed outdoor locations. Both sides fully printed. Carry bag included.',
      guideText: 'PDF or high-res PNG. 2 sides: 850 × 2000 mm each. Include 30 mm bleed at bottom. Min 72 DPI.',
      minDpi: 72, recommendedDpi: 100, bleedMm: 30, safeMarginMm: 50, allowedFormats: 'PDF,PNG,TIFF',
      notes: 'Double-sided. Water tank base. Upload 2 pages or 2 files for front and back.',
    },
  })
  await db.productConfig.upsert({
    where: { productId: ruOutdoor.id },
    update: { needsUpload: true, priceMode: 'PIECE', hasVariants: false, productionType: 'ROLL_PRINT' },
    create: {
      productId: ruOutdoor.id, type: 'ROLLUP', hasCustomSize: false, hasFixedSizes: false, hasVariants: false, hasOptions: false,
      needsUpload: true, priceMode: 'PIECE', productionType: 'ROLL_PRINT',
      helpText: 'Double-sided outdoor roll-up with water tank base. Both sides printed. Upload 2 files or a 2-page PDF.',
      uploadInstructions: 'Upload PDF (2 pages) or two separate PNG files. Each side: 850 × 2000 mm. Include 30 mm bleed at bottom. Minimum 72 DPI.',
    },
  })
  await upsertPricingTable(ruOutdoor.id, 'FIXED', { price: 189.00 })
  console.log(`  ✓ Rollup outdoor double sided: ${ruOutdoor.id}`)

  console.log('  Display Systems fix complete.')
}

// ---------------------------------------------------------------------------
// Banner fix — real product lineup (PVC / Construction / Mesh only)
// ---------------------------------------------------------------------------

async function seedBannerFix() {
  console.log('Seeding Banner fix — real product lineup...')

  // Update category hero
  await db.productCategory.update({
    where: { slug: 'banner' },
    data: { imageUrl: '/products/banner-hero-section.png' },
  })

  // Deactivate extra banner products not in real lineup
  await db.product.updateMany({
    where: { slug: { in: ['rollup-banner', 'event-banner', 'double-sided-banner', 'stage-banner', 'fence-banner'] } },
    data: { active: false },
  })
  console.log('  ✓ Deactivated extra banner products')

  // PVC banner (rename from "Banner" → "PVC banner", wire image)
  await db.product.updateMany({
    where: { slug: 'banner' },
    data: { name: 'PVC banner', imageUrl: '/products/banner.png' },
  })
  console.log('  ✓ PVC banner: /products/banner.png')

  // Construction banner — wire image
  await db.product.updateMany({
    where: { slug: 'construction-banner' },
    data: { active: true, imageUrl: '/products/construction-banner.png' },
  })
  console.log('  ✓ Construction banner: /products/construction-banner.png')

  // Mesh banner — wire image
  await db.product.updateMany({
    where: { slug: 'mesh-banner' },
    data: { imageUrl: '/products/mesh-banner.png' },
  })
  console.log('  ✓ Mesh banner: /products/mesh-banner.png')

  console.log('  Banner fix complete.')
}

// ---------------------------------------------------------------------------
// Foil / Adhesive fix — keep only image-matched products
// ---------------------------------------------------------------------------

async function seedFoilFix() {
  console.log('Seeding Foil / Adhesive fix...')

  // Update category hero
  await db.productCategory.update({
    where: { slug: 'foil' },
    data: { imageUrl: '/products/foil-adhessive-hero-banner.png' },
  })
  console.log('  ✓ Foil hero: /products/foil-adhessive-hero-banner.png')

  // Deactivate products without images (user-specified + no image match)
  await db.product.updateMany({
    where: {
      slug: {
        in: [
          'magnetfolie',        // explicitly: "magnet foil"
          'logo-foil',          // explicitly: "logo foil"
          'opening-hours-print',// explicitly: "opening hours"
          'pvc-folie',          // explicitly: "pvc foil"
          'privacy-foil',       // explicitly: "privacy foil"
          'window-foil',        // explicitly: "window foil"
          'magnetic-board-print', // no image
        ],
      },
    },
    data: { active: false },
  })
  console.log('  ✓ Deactivated foil products without images')

  // Wire images for products that have matching files
  const foilImageMap: Array<{ slug: string; imageUrl: string; label: string }> = [
    { slug: 'car-graphics',   imageUrl: '/products/car-graphics.png',   label: 'Car graphics' },
    { slug: 'car-magnet',     imageUrl: '/products/car-magnet.png',     label: 'Car magnet' },
    { slug: 'milchglasfolie', imageUrl: '/products/milchglasfolie.png', label: 'Milchglasfolie' },
    { slug: 'lochfolie',      imageUrl: '/products/lochfolie.png',      label: 'Lochfolie' },
    { slug: 'window-graphics',imageUrl: '/products/window-graphics.png',label: 'Window graphics' },
  ]

  for (const item of foilImageMap) {
    await db.product.updateMany({
      where: { slug: item.slug },
      data: { active: true, imageUrl: item.imageUrl },
    })
    console.log(`  ✓ ${item.label}: ${item.imageUrl}`)
  }

  console.log('  Foil fix complete.')
}

// ---------------------------------------------------------------------------
// Textile print fix — image mapping
// ---------------------------------------------------------------------------

async function seedTextileFix() {
  console.log('Seeding Textile print fix — image mapping...')

  // Category hero
  await db.productCategory.update({
    where: { slug: 'textile-print' },
    data: { imageUrl: '/products/textileprint-banner.png' },
  })
  console.log('  ✓ Textile hero: /products/textileprint-banner.png')

  const textileImageMap: Array<{ slug: string; imageUrl: string }> = [
    { slug: 't-shirt-print',  imageUrl: '/products/t-shirt-front-1.png' },
    { slug: 'hoodie-print',   imageUrl: '/products/hoodie-front.png' },
    { slug: 'polo-print',     imageUrl: '/products/polo-front.png' },
    { slug: 'cap-embroidery', imageUrl: '/products/cap.png' },
  ]

  for (const item of textileImageMap) {
    await db.product.updateMany({ where: { slug: item.slug }, data: { imageUrl: item.imageUrl } })
    console.log(`  ✓ ${item.slug}: ${item.imageUrl}`)
  }

  console.log('  Textile fix complete.')
}

// ---------------------------------------------------------------------------
// DTF gang sheet fix — image mapping
// ---------------------------------------------------------------------------

async function seedDTFFix() {
  console.log('Seeding DTF gang sheet fix — image mapping...')

  await db.productCategory.update({
    where: { slug: 'dtf-gang-sheet' },
    data: { imageUrl: '/products/textileprint-banner2.png' },
  })
  await db.product.updateMany({
    where: { slug: 'dtf-gang-sheet' },
    data: { imageUrl: '/products/textileprint-banner2.png' },
  })
  console.log('  ✓ DTF gang sheet: /products/textileprint-banner2.png')
  console.log('  DTF fix complete.')
}

// ---------------------------------------------------------------------------
// Sublimation print fix — image mapping
// ---------------------------------------------------------------------------

async function seedSublimationFix() {
  console.log('Seeding Sublimation fix — image mapping...')

  // Category hero (filename has typo but file exists)
  await db.productCategory.update({
    where: { slug: 'sublimation' },
    data: { imageUrl: '/products/sublimstion-print-banner.png' },
  })
  console.log('  ✓ Sublimation hero: /products/sublimstion-print-banner.png')

  const sublimImageMap: Array<{ slug: string; imageUrl: string }> = [
    { slug: 'sublimation-mug',       imageUrl: '/products/mug.png' },
    { slug: 'sublimation-thermo',    imageUrl: '/products/Edelstahl-Thermo-cup.png' },
    { slug: 'sublimation-aluminium', imageUrl: '/products/Aluminium-drink-bottle.png' },
  ]

  for (const item of sublimImageMap) {
    await db.product.updateMany({ where: { slug: item.slug }, data: { imageUrl: item.imageUrl } })
    console.log(`  ✓ ${item.slug}: ${item.imageUrl}`)
  }

  console.log('  Sublimation fix complete.')
}

// ---------------------------------------------------------------------------
// Textile print rebuild — garments only, print methods inside configurator
// ---------------------------------------------------------------------------

async function seedTextileRebuild() {
  console.log('Seeding Textile print rebuild...')

  const catRow = await db.productCategory.findUnique({ where: { slug: 'textile-print' }, select: { id: true } })
  const catId = catRow?.id ?? null

  // Deactivate print-method-as-product and other non-garment products
  await db.product.updateMany({
    where: {
      slug: {
        in: [
          'flex-print', 'flock-print',          // print methods, not products
          'embroidery', 'patches',               // old embroidery products
          'workwear-print', 'sport-jersey',      // removed from lineup
          'logo-embroidery', 'woven-patch',      // removed
          'textile-print',                       // old generic product
        ],
      },
    },
    data: { active: false },
  })
  console.log('  ✓ Deactivated non-garment products')

  // Rename / update existing garment products
  await db.product.updateMany({
    where: { slug: 't-shirt-print' },
    data: { name: 'T-shirt standard', imageUrl: '/products/t-shirt-front-1.png', shortDescription: 'Classic crew-neck t-shirt with custom print — choose size, colour and print method.' },
  })
  await db.product.updateMany({
    where: { slug: 'hoodie-print' },
    data: { name: 'Hoodie', imageUrl: '/products/hoodie-front.png', shortDescription: 'Premium hoodies with custom print — front, back, chest, or sleeve placement.' },
  })
  await db.product.updateMany({
    where: { slug: 'polo-print' },
    data: { name: 'Polo shirt', imageUrl: '/products/polo-front.png', shortDescription: 'Classic polo shirts with embroidery or DTF print — corporate and sportswear.' },
  })
  await db.product.updateMany({
    where: { slug: 'cap-embroidery' },
    data: { name: 'Cap', imageUrl: '/products/cap.png', shortDescription: 'Custom printed or embroidered caps — structured and unstructured styles.' },
  })
  console.log('  ✓ Renamed and updated existing garment products')

  // T-shirt V-neck (new)
  const tshirtV = await db.product.upsert({
    where: { slug: 'tshirt-v-neck' },
    update: { categoryId: catId, active: true, imageUrl: '/products/t-shirt-front-2.png' },
    create: {
      name: 'T-shirt V-neck', slug: 'tshirt-v-neck', category: 'Textile print', categoryId: catId, active: true,
      imageUrl: '/products/t-shirt-front-2.png',
      shortDescription: 'V-neck t-shirt with custom print — soft fit, available in multiple colours.',
      description: 'Classic V-neck t-shirt (we supply) with custom DTF, flex, or flock print. Soft 100% cotton. Available in multiple colours and sizes from XS to XXL.',
      guideText: 'PNG with transparent background. Minimum 150 DPI.', minDpi: 150, recommendedDpi: 300, bleedMm: 0, safeMarginMm: 5, allowedFormats: 'PNG,PDF',
    },
  })
  await db.productConfig.upsert({
    where: { productId: tshirtV.id },
    update: { isTextile: true, needsPlacement: true, needsUpload: true, priceMode: 'PIECE', hasVariants: true, hasOptions: true, allowedPositions: JSON.stringify(['front', 'back', 'left-chest', 'right-chest']), productionType: 'TEXTILE', placementMode: 'front_back', printAreaWidthCm: 30, printAreaHeightCm: 40, dtfMaxWidthCm: 55 },
    create: {
      productId: tshirtV.id, type: 'TEXTILE', hasCustomSize: false, hasFixedSizes: false, hasVariants: true, hasOptions: true,
      isTextile: true, needsPlacement: true, needsUpload: true, priceMode: 'PIECE',
      allowedPositions: JSON.stringify(['front', 'back', 'left-chest', 'right-chest']),
      productionType: 'TEXTILE', placementMode: 'front_back', printAreaWidthCm: 30, printAreaHeightCm: 40, dtfMaxWidthCm: 55,
      helpText: 'Select size and colour. Choose your print method and placement. Print area is 30 × 40 cm max.',
      uploadInstructions: 'Upload PNG with transparent background at minimum 150 DPI.',
    },
  })
  await upsertPricingTable(tshirtV.id, 'FIXED', { price: 7.50 })
  for (const s of [{ n: 'XS', bp: 4.50 }, { n: 'S', bp: 4.50 }, { n: 'M', bp: 4.50 }, { n: 'L', bp: 4.50 }, { n: 'XL', bp: 5.50 }, { n: 'XXL', bp: 6.50 }]) {
    await upsertVariant(tshirtV.id, s.n, 'Cotton', s.bp)
  }
  await upsertOption(tshirtV.id, 'Garment color', [
    { name: 'Black', priceModifier: 0 }, { name: 'White', priceModifier: 0 }, { name: 'Navy', priceModifier: 0 },
    { name: 'Grey', priceModifier: 0 }, { name: 'Red', priceModifier: 1 }, { name: 'Royal Blue', priceModifier: 1 },
  ])
  await upsertOption(tshirtV.id, 'Print method', [
    { name: 'DTF', priceModifier: 0 }, { name: 'Flex', priceModifier: 2 }, { name: 'Flock', priceModifier: 4 },
  ])
  await upsertOption(tshirtV.id, 'Position', [
    { name: 'Front', priceModifier: 0 }, { name: 'Back', priceModifier: 0 },
    { name: 'Left chest', priceModifier: 0 }, { name: 'Right chest', priceModifier: 0 },
  ])
  console.log(`  ✓ T-shirt V-neck: ${tshirtV.id}`)

  // Bag (new)
  const bag = await db.product.upsert({
    where: { slug: 'garment-bag' },
    update: { categoryId: catId, active: true, imageUrl: '/products/bag.png' },
    create: {
      name: 'Bag', slug: 'garment-bag', category: 'Textile print', categoryId: catId, active: true,
      imageUrl: '/products/bag.png',
      shortDescription: 'Custom printed bags — tote bags, cotton shopper bags, and more.',
      description: 'Cotton tote bags and shopper bags (we supply) with custom DTF or flex print. 100% cotton, sturdy handles. Available in natural, black, and white. Min order 1 piece.',
      guideText: 'PNG with transparent background. Minimum 150 DPI.', minDpi: 150, recommendedDpi: 300, bleedMm: 0, safeMarginMm: 5, allowedFormats: 'PNG,PDF',
    },
  })
  await db.productConfig.upsert({
    where: { productId: bag.id },
    update: { isTextile: true, needsPlacement: true, needsUpload: true, priceMode: 'PIECE', hasVariants: false, hasOptions: true, allowedPositions: JSON.stringify(['front', 'back']), productionType: 'TEXTILE' },
    create: {
      productId: bag.id, type: 'TEXTILE', hasCustomSize: false, hasFixedSizes: false, hasVariants: false, hasOptions: true,
      isTextile: true, needsPlacement: true, needsUpload: true, priceMode: 'PIECE',
      allowedPositions: JSON.stringify(['front', 'back']),
      productionType: 'TEXTILE', printAreaWidthCm: 28, printAreaHeightCm: 30,
      helpText: 'Choose your print placement. Price includes the bag and print.',
      uploadInstructions: 'Upload PNG with transparent background at minimum 150 DPI.',
    },
  })
  await upsertPricingTable(bag.id, 'FIXED', { price: 12.00 })
  await upsertOption(bag.id, 'Bag color', [
    { name: 'Natural', priceModifier: 0 }, { name: 'Black', priceModifier: 0 }, { name: 'White', priceModifier: 0 },
  ])
  await upsertOption(bag.id, 'Print method', [
    { name: 'DTF', priceModifier: 0 }, { name: 'Flex', priceModifier: 2 }, { name: 'Flock', priceModifier: 4 },
  ])
  await upsertOption(bag.id, 'Position', [
    { name: 'Front', priceModifier: 0 }, { name: 'Back', priceModifier: 0 }, { name: 'Front + Back', priceModifier: 5 },
  ])
  await db.productConfig.updateMany({
    where: { productId: bag.id },
    data: {
      allowedPositions: JSON.stringify(['front', 'back', 'front-back']),
      helpText: 'Embroidery available on request — please contact us or chat with our assistant. For special marking, custom positions, or special printing, contact us before ordering.',
    },
  })
  console.log(`  ✓ Bag: ${bag.id}`)

  // ── Textile options fix ──────────────────────────────────────────────────

  const textileHelpText = 'Embroidery available on request — please contact us or chat with our assistant. For special marking, custom positions, or special printing, please contact us before ordering.'
  const fullPositions = ['front', 'back', 'front-back', 'left-chest', 'right-chest', 'sleeve', 'custom']
  const fullPositionOptions = [
    { name: 'Front', priceModifier: 0 },
    { name: 'Back', priceModifier: 0 },
    { name: 'Front + Back', priceModifier: 5 },
    { name: 'Left chest', priceModifier: 0 },
    { name: 'Right chest', priceModifier: 0 },
    { name: 'Sleeve', priceModifier: 2 },
    { name: 'Custom', priceModifier: 4 },
  ]
  const printMethodOptions = [
    { name: 'DTF', priceModifier: 0 },
    { name: 'Flex', priceModifier: 2 },
    { name: 'Flock', priceModifier: 4 },
  ]

  // Update T-shirt V-neck — extend positions + add helpText
  await upsertOption(tshirtV.id, 'Position', fullPositionOptions)
  await db.productConfig.updateMany({
    where: { productId: tshirtV.id },
    data: { allowedPositions: JSON.stringify(fullPositions), helpText: textileHelpText },
  })
  console.log('  ✓ T-shirt V-neck: positions extended')

  // Update existing garment products — add Print method + Position + helpText
  for (const slug of ['t-shirt-print', 'hoodie-print', 'polo-print']) {
    const gp = await db.product.findUnique({ where: { slug }, select: { id: true } })
    if (!gp) continue
    await db.productConfig.updateMany({
      where: { productId: gp.id },
      data: {
        hasOptions: true,
        allowedPositions: JSON.stringify(fullPositions),
        helpText: textileHelpText,
      },
    })
    await upsertOption(gp.id, 'Print method', printMethodOptions)
    await upsertOption(gp.id, 'Position', fullPositionOptions)
    console.log(`  ✓ ${slug}: print method + positions added`)
  }

  // Cap embroidery — remove stitch count + 3D puff, simplify to €8 flat
  const cap = await db.product.findUnique({ where: { slug: 'cap-embroidery' }, select: { id: true } })
  if (cap) {
    const capOpts = await db.productOption.findMany({
      where: { productId: cap.id, name: { in: ['Stitch count', 'Embroidery type'] } },
      select: { id: true },
    })
    if (capOpts.length) {
      await db.productOptionValue.deleteMany({ where: { optionId: { in: capOpts.map((o) => o.id) } } })
      await db.productOption.deleteMany({ where: { id: { in: capOpts.map((o) => o.id) } } })
    }
    await db.productConfig.updateMany({
      where: { productId: cap.id },
      data: {
        hasOptions: false,
        helpText: 'Embroidery on cap — flat stitch, up to 10 000 stitches included. Logo digitisation included. For larger designs or multiple positions contact us.',
        uploadInstructions: 'Upload vector (SVG, AI, EPS) or high-res PNG. Design will be digitised for embroidery.',
      },
    })
    console.log('  ✓ Cap: simplified to flat embroidery €8')
  }

  console.log('  Textile rebuild complete.')
}

// ---------------------------------------------------------------------------
// Sublimation rebuild — separate standard mug + magic mug products
// ---------------------------------------------------------------------------

async function seedSublimationRebuild() {
  console.log('Seeding Sublimation rebuild...')

  const catRow = await db.productCategory.findUnique({ where: { slug: 'sublimation' }, select: { id: true } })
  const catId = catRow?.id ?? null

  // Rename existing sublimation-mug → Standard mug
  await db.product.updateMany({
    where: { slug: 'sublimation-mug' },
    data: { name: 'Standard mug', imageUrl: '/products/mug.png' },
  })
  console.log('  ✓ sublimation-mug → Standard mug')

  // Rename sublimation-thermo → Thermo cup
  await db.product.updateMany({
    where: { slug: 'sublimation-thermo' },
    data: { name: 'Thermo cup' },
  })
  // Rename sublimation-aluminium → Aluminium bottle
  await db.product.updateMany({
    where: { slug: 'sublimation-aluminium' },
    data: { name: 'Aluminium bottle' },
  })

  // Magic mug (separate product)
  const magicMug = await db.product.upsert({
    where: { slug: 'sublimation-magic-mug' },
    update: { categoryId: catId, active: true, imageUrl: '/products/magic-mug.png' },
    create: {
      name: 'Magic mug', slug: 'sublimation-magic-mug', category: 'Sublimation print', categoryId: catId, active: true,
      imageUrl: '/products/magic-mug.png',
      shortDescription: 'Colour-changing magic mug — reveals your print when filled with hot liquid.',
      description: 'Sublimation-printed colour-changing magic mug. Appears black when cold and reveals your full-colour design when filled with a hot drink. Ceramic, 330 ml. Dishwasher safe.',
      guideText: 'PNG or PDF. Print area 238 × 117 mm. Minimum 200 DPI. Bleed 3 mm.',
      minDpi: 200, recommendedDpi: 300, bleedMm: 3, safeMarginMm: 5, allowedFormats: 'PNG,PDF',
    },
  })
  await db.productConfig.upsert({
    where: { productId: magicMug.id },
    update: { needsUpload: true, priceMode: 'PIECE', type: 'MUG', printAreaWidthCm: 23.8, printAreaHeightCm: 11.7, productionType: 'TEXTILE' },
    create: {
      productId: magicMug.id, type: 'MUG', hasCustomSize: false, hasFixedSizes: false, hasVariants: false, hasOptions: false,
      needsUpload: true, priceMode: 'PIECE', printAreaWidthCm: 23.8, printAreaHeightCm: 11.7, productionType: 'TEXTILE',
      helpText: 'Upload your design. The mug appears black when cold and reveals your print with a hot drink.',
      uploadInstructions: 'Upload PNG or PDF. Print area 238 × 117 mm. Include 3 mm bleed. Minimum 200 DPI.',
    },
  })
  await upsertPricingTable(magicMug.id, 'FIXED', { price: 12.00 })
  console.log(`  ✓ Magic mug: ${magicMug.id}`)

  // Drink bottle (stainless, no image yet)
  const drinkBottle = await db.product.upsert({
    where: { slug: 'sublimation-bottle' },
    update: { categoryId: catId, active: true, name: 'Drink bottle' },
    create: {
      name: 'Drink bottle', slug: 'sublimation-bottle', category: 'Sublimation print', categoryId: catId, active: true,
      shortDescription: 'Custom printed stainless steel drink bottles — 500 ml, insulated.',
      description: 'Sublimation-printed stainless steel insulated bottle. Double-walled, keeps drinks hot or cold. Full-wrap custom print. Capacity 500 ml.',
      guideText: 'PNG or PDF. Print area 245 × 195 mm. Minimum 200 DPI.',
      minDpi: 200, recommendedDpi: 300, bleedMm: 3, safeMarginMm: 5, allowedFormats: 'PNG,PDF',
    },
  })
  await db.productConfig.upsert({
    where: { productId: drinkBottle.id },
    update: { needsUpload: true, priceMode: 'PIECE', type: 'MUG', printAreaWidthCm: 24.5, printAreaHeightCm: 19.5, productionType: 'TEXTILE' },
    create: {
      productId: drinkBottle.id, type: 'MUG', hasCustomSize: false, hasFixedSizes: false, hasVariants: false, hasOptions: false,
      needsUpload: true, priceMode: 'PIECE', printAreaWidthCm: 24.5, printAreaHeightCm: 19.5, productionType: 'TEXTILE',
      helpText: 'Upload your wrap design. Price is per bottle.',
      uploadInstructions: 'Upload PNG or PDF. Include 3 mm bleed. Print area 245 × 195 mm.',
    },
  })
  await upsertPricingTable(drinkBottle.id, 'FIXED', { price: 18.00 })
  console.log(`  ✓ Drink bottle: ${drinkBottle.id}`)

  console.log('  Sublimation rebuild complete.')
}

// ---------------------------------------------------------------------------
// Catalog corrections phase 2
// ---------------------------------------------------------------------------

async function seedCatalogCorrections() {
  console.log('Seeding catalog corrections phase 2...')

  // Re-fetch category map
  const catRows = await db.productCategory.findMany({ select: { id: true, slug: true } })
  const cats: Record<string, string> = {}
  for (const c of catRows) cats[c.slug] = c.id

  // ── 1. Bauzaun banner ────────────────────────────────────────────────────

  const bauzaun = await db.product.upsert({
    where: { slug: 'bauzaun-banner' },
    update: { categoryId: cats['banner'] ?? null, active: true, imageUrl: '/products/construction-banner.png' },
    create: {
      name: 'Bauzaunbanner PVC',
      slug: 'bauzaun-banner',
      category: 'Banner',
      categoryId: cats['banner'] ?? null,
      active: true,
      imageUrl: '/products/construction-banner.png',
      shortDescription: 'Robuste PVC Vollplane 510 g/m² — Standardformat 340 × 173 cm, B1 zertifiziert.',
      description: 'Bauzaunbanner aus robuster PVC Vollplane 510 g/m². Standardformat 340 × 173 cm passend für Euro-Bauzaunelemente. B1 feuerhemmend zertifiziert. UV-beständig, witterungsfest, mit Hohlsaum und Ösen.',
      guideText: 'PDF oder PNG. Mindestauflösung 72 DPI im Endformat. 340 × 173 cm. 20 mm Beschnitt auf allen Seiten.',
      minDpi: 72, recommendedDpi: 100, bleedMm: 20, safeMarginMm: 20, allowedFormats: 'PDF,PNG,TIFF',
      notes: 'Standardformat 340 × 173 cm. B1 zertifiziert.',
    },
  })
  await db.productConfig.upsert({
    where: { productId: bauzaun.id },
    update: { isRoll: true, needsUpload: true, priceMode: 'AREA', rollWidthCm: 160, maxWidthCm: 160, productionType: 'ROLL_PRINT' },
    create: {
      productId: bauzaun.id, type: 'BANNER', hasCustomSize: true, hasFixedSizes: false, hasVariants: false, hasOptions: true,
      isRoll: true, needsUpload: true, priceMode: 'AREA', rollWidthCm: 160, maxWidthCm: 160,
      minWidth: 50, maxWidth: 340, minHeight: 50, maxHeight: 500, productionType: 'ROLL_PRINT',
      helpText: 'Standardformat 340 × 173 cm für Euro-Bauzaun. Preis pro m² bedruckter Fläche.',
      uploadInstructions: 'PDF oder PNG. 72 DPI Mindestauflösung im Endformat. 20 mm Beschnitt auf allen Seiten.',
    },
  })
  await upsertPricingTable(bauzaun.id, 'AREA', { pricePerM2: 16.00 })
  await applyBannerOptions(bauzaun.id)
  console.log(`  ✓ Bauzaunbanner PVC: ${bauzaun.id}`)

  // ── 2. Plexiglas sign (foil category, image found) ───────────────────────

  const plex = await db.product.upsert({
    where: { slug: 'plexiglas-sign' },
    update: { categoryId: cats['foil'] ?? null, active: true, imageUrl: '/products/plexiglas%20folie.png' },
    create: {
      name: 'Plexiglas sign',
      slug: 'plexiglas-sign',
      category: 'Foil / Adhesive',
      categoryId: cats['foil'] ?? null,
      active: true,
      imageUrl: '/products/plexiglas%20folie.png',
      shortDescription: 'Transparent acrylic panel with adhesive print — mounted with metal spacers.',
      description: 'Premium plexiglass (acrylic) sign with printed graphic adhered to the back side. Glossy surface gives a clean, professional look. Mounted with brushed metal spacers for a floating effect. Ideal for reception areas, office signage, and retail environments.',
      guideText: 'PDF or high-res PNG. Minimum 150 DPI at final size. Include 3 mm bleed.',
      minDpi: 150, recommendedDpi: 200, bleedMm: 3, safeMarginMm: 5, allowedFormats: 'PDF,PNG',
      notes: 'Acrylic panel with metal spacers. Printed on back side.',
    },
  })
  await db.productConfig.upsert({
    where: { productId: plex.id },
    update: { needsUpload: true, priceMode: 'AREA', hasCustomSize: true, maxWidthCm: 150, productionType: 'ROLL_PRINT' },
    create: {
      productId: plex.id, type: 'RIGID', hasCustomSize: true, hasFixedSizes: false, hasVariants: false, hasOptions: false,
      needsUpload: true, priceMode: 'AREA', maxWidthCm: 150, minWidth: 10, maxWidth: 150, minHeight: 10, maxHeight: 200,
      productionType: 'ROLL_PRINT',
      helpText: 'Enter width and height in cm. Max 150 × 200 cm. Price is per m².',
      uploadInstructions: 'Upload PDF or PNG. Minimum 150 DPI. Include 3 mm bleed on all sides.',
    },
  })
  await upsertPricingTable(plex.id, 'AREA', { pricePerM2: 85.00 })
  console.log(`  ✓ Plexiglas sign: ${plex.id}`)

  // ── 3. DTF gang sheet — fixed sizes ──────────────────────────────────────

  const dtfGang = await db.product.findUnique({ where: { slug: 'dtf-gang-sheet' } })
  if (dtfGang) {
    // Switch from custom size to fixed variants
    await db.productConfig.update({
      where: { productId: dtfGang.id },
      data: { hasCustomSize: false, hasFixedSizes: false, hasVariants: true, hasOptions: false, priceMode: 'PIECE' },
    })
    await upsertVariant(dtfGang.id, '55 × 100 cm', 'DTF Film', 40.00)
    await upsertVariant(dtfGang.id, 'A3 (29.7 × 42 cm)', 'DTF Film', 12.00)
    await upsertVariant(dtfGang.id, 'A4 (21 × 29.7 cm)', 'DTF Film', 6.00)
    await upsertPricingTable(dtfGang.id, 'FIXED', { price: 0 })
    console.log(`  ✓ DTF gang sheet: fixed sizes (55×100, A3, A4)`)
  }

  // ── 4. Sublimation — deactivate drink bottle (no image) ──────────────────

  await db.product.updateMany({
    where: { slug: 'sublimation-bottle' },
    data: { active: false },
  })
  console.log('  ✓ Deactivated drink bottle (no image)')

  // ── 5. Stickers category — push to hidden, move products to foil ──────────

  await db.productCategory.update({
    where: { slug: 'stickers' },
    data: { sortOrder: 200 },
  })
  console.log('  ✓ Stickers category hidden (sortOrder 200)')

  // Deactivate separate sticker products that become options
  await db.product.updateMany({
    where: {
      slug: { in: ['car-decals', 'advertising-stickers', 'window-stickers', 'product-labels', 'iso-stickers', 'stickers'] },
    },
    data: { active: false },
  })
  console.log('  ✓ Deactivated separate sticker products')

  // Custom stickers — one product in Foil / Adhesive
  const customStickers = await db.product.upsert({
    where: { slug: 'custom-stickers' },
    update: { categoryId: cats['foil'] ?? null, active: true },
    create: {
      name: 'Custom stickers',
      slug: 'custom-stickers',
      category: 'Foil / Adhesive',
      categoryId: cats['foil'] ?? null,
      active: true,
      imageUrl: '/products/lochfolie.png',
      shortDescription: 'Full-colour stickers in any size — choose material, laminate, and shape.',
      description: 'Custom printed stickers on premium vinyl or paper stock. Available in gloss, matte, or transparent. Square cut or contour cut. Suitable for product labels, packaging, promotion, and decoration.',
      guideText: 'PDF or PNG. Include 2 mm bleed. Minimum 150 DPI at print size.',
      minDpi: 150, recommendedDpi: 300, bleedMm: 2, safeMarginMm: 2, allowedFormats: 'PDF,PNG,SVG',
    },
  })
  await db.productConfig.upsert({
    where: { productId: customStickers.id },
    update: { isPrintCut: true, isRoll: true, needsUpload: true, priceMode: 'AREA', rollWidthCm: 137, maxWidthCm: 137, productionType: 'PRINT_CUT' },
    create: {
      productId: customStickers.id, type: 'STICKER', hasCustomSize: true, hasFixedSizes: false, hasVariants: false, hasOptions: true,
      isPrintCut: true, isRoll: true, needsUpload: true, priceMode: 'AREA',
      rollWidthCm: 137, maxWidthCm: 137, minWidth: 2, maxWidth: 137, minHeight: 2, maxHeight: 500,
      productionType: 'PRINT_CUT',
      helpText: 'Enter the dimensions of your sticker. Choose material, laminate, and cut type.',
      uploadInstructions: 'Upload PDF or PNG. Include 2 mm bleed. Minimum 150 DPI at final print size. For contour cut, include a CutContour spot colour layer.',
    },
  })
  await upsertPricingTable(customStickers.id, 'AREA', { pricePerM2: 32.00 })
  await upsertOption(customStickers.id, 'Material', [
    { name: 'White vinyl gloss',  priceModifier: 0 },
    { name: 'White vinyl matte',  priceModifier: 1 },
    { name: 'Transparent vinyl',  priceModifier: 2 },
    { name: 'Kraft paper',        priceModifier: 0 },
  ])
  await upsertOption(customStickers.id, 'Laminate', [
    { name: 'None',          priceModifier: 0 },
    { name: 'Gloss laminate', priceModifier: 3 },
    { name: 'Matte laminate', priceModifier: 3 },
  ])
  await upsertOption(customStickers.id, 'Shape', [
    { name: 'Square cut',   priceModifier: 0 },
    { name: 'Contour cut',  priceModifier: 5 },
  ])
  console.log(`  ✓ Custom stickers (Foil / Adhesive): ${customStickers.id}`)

  // ── 6. Vinyl plot — remove non-real products ──────────────────────────────

  await db.product.updateMany({
    where: { slug: { in: ['door-lettering', 'opening-hours-lettering', 'wall-lettering'] } },
    data: { active: false },
  })
  console.log('  ✓ Vinyl plot: deactivated door-lettering, opening-hours-lettering, wall-lettering')

  console.log('  Catalog corrections phase 2 complete.')
}

// ---------------------------------------------------------------------------
// Vinyl plot fix — hero + image mapping + cleanup
// ---------------------------------------------------------------------------

async function seedVinylFix() {
  console.log('Seeding Vinyl plot fix...')

  // Category hero
  await db.productCategory.update({
    where: { slug: 'vinyl-plot' },
    data: { imageUrl: '/products/lettering-plotfolie-banner.png' },
  })

  // Deactivate original generic vinyl-lettering product
  await db.product.updateMany({
    where: { slug: 'vinyl-lettering' },
    data: { active: false },
  })
  console.log('  ✓ Deactivated vinyl-lettering')

  // Wire images + ensure active
  const vinylProducts = [
    { slug: 'car-lettering',   imageUrl: '/products/car-lettering.png' },
    { slug: 'logo-cut-vinyl',  imageUrl: '/products/logo-cut-vinyl.png' },
    { slug: 'window-lettering', imageUrl: '/products/window-lettering.png' },
    { slug: 'reflective-vinyl', imageUrl: '/products/reflective-vinyl.png' },
  ]
  for (const p of vinylProducts) {
    await db.product.updateMany({ where: { slug: p.slug }, data: { imageUrl: p.imageUrl, active: true } })
    console.log(`  ✓ ${p.slug}: ${p.imageUrl}`)
  }

  console.log('  Vinyl plot fix complete.')
}

// ---------------------------------------------------------------------------
// Banner + DTF product fix
// ---------------------------------------------------------------------------

async function seedBannerDTFFix() {
  console.log('Seeding Banner + DTF product fix...')

  const catRows = await db.productCategory.findMany({ select: { id: true, slug: true } })
  const cats: Record<string, string> = {}
  for (const c of catRows) cats[c.slug] = c.id

  // ── Banner: deactivate bauzaun-banner (duplicate), keep construction-banner ─

  await db.product.updateMany({
    where: { slug: 'bauzaun-banner' },
    data: { active: false },
  })
  console.log('  ✓ Deactivated bauzaun-banner (duplicate)')

  await db.product.updateMany({
    where: { slug: 'construction-banner' },
    data: { active: true, categoryId: cats['banner'] ?? null, imageUrl: '/products/construction-banner.png' },
  })
  console.log('  ✓ construction-banner active in Banner')

  // ── DTF: hero, deactivate old combined product, create 3 separate products ─

  await db.productCategory.update({
    where: { slug: 'dtf-gang-sheet' },
    data: { imageUrl: '/products/dtf-hero-banner.png' },
  })
  console.log('  ✓ DTF category hero: dtf-hero-banner.png')

  // Deactivate the old combined gang sheet product
  await db.product.updateMany({
    where: { slug: 'dtf-gang-sheet' },
    data: { active: false },
  })
  console.log('  ✓ Deactivated old dtf-gang-sheet product')

  const dtfCatId = cats['dtf-gang-sheet'] ?? null

  const dtfProducts = [
    {
      slug: 'dtf-55x100',
      name: 'DTF 55 × 100 cm',
      imageUrl: '/products/dtf-55x100-cm.png',
      shortDescription: 'Full-size DTF gang sheet 55 × 100 cm — transfer up to 12 standard designs in one go.',
      price: 40.00,
    },
    {
      slug: 'dtf-a3',
      name: 'DTF A3',
      imageUrl: '/products/dtf-a3.png',
      shortDescription: 'DTF gang sheet A3 (29.7 × 42 cm) — ideal for 4–6 medium prints.',
      price: 12.00,
    },
    {
      slug: 'dtf-a4',
      name: 'DTF A4',
      imageUrl: '/products/dtf-a4.png',
      shortDescription: 'DTF gang sheet A4 (21 × 29.7 cm) — perfect for small designs or single prints.',
      price: 6.00,
    },
  ]

  for (const def of dtfProducts) {
    const p = await db.product.upsert({
      where: { slug: def.slug },
      update: { active: true, imageUrl: def.imageUrl, categoryId: dtfCatId },
      create: {
        name: def.name, slug: def.slug, category: 'DTF gang sheet',
        categoryId: dtfCatId, active: true,
        imageUrl: def.imageUrl, shortDescription: def.shortDescription,
        guideText: 'Upload PDF or PNG. Minimum 150 DPI. Leave 3 mm margin. Do not include bleed.',
        minDpi: 150, recommendedDpi: 300, allowedFormats: 'PDF,PNG',
        notes: 'DTF heat transfer film. Print and press onto garment.',
      },
    })
    await db.productConfig.upsert({
      where: { productId: p.id },
      update: { priceMode: 'PIECE', hasCustomSize: false, hasFixedSizes: false, hasVariants: false, hasOptions: false },
      create: {
        productId: p.id, type: 'DTF',
        hasCustomSize: false, hasFixedSizes: false, hasVariants: false, hasOptions: false,
        isDTF: true, needsUpload: true, priceMode: 'PIECE',
        helpText: 'Fixed price per sheet. Upload your design file.',
        uploadInstructions: 'Upload PDF or PNG. Minimum 150 DPI at final size.',
      },
    })
    // Clear existing pricing tables and set a single FIXED price
    await db.pricingTable.deleteMany({ where: { productId: p.id } })
    await db.pricingTable.create({ data: { productId: p.id, type: 'FIXED', price: def.price } })
    console.log(`  ✓ ${def.name}: ${def.imageUrl} @ €${def.price}`)
  }

  console.log('  Banner + DTF product fix complete.')
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  await seedCategories()
  await seedShippingMethods()

  // Real shop products
  await seedTextileExtension()
  await seedRollUp()
  await seedKundestopper()
  await seedTextilePrint()
  await seedVinylLettering()
  await seedStickers()
  await seedBanner()
  await seedMeshBanner()
  await seedConstructionBanner()
  await seedFoilProducts()
  await seedLargeFormat()

  // Legacy products
  await seedDTF()
  await seedSticker()
  await seedMug()

  // Catalog lock — complete product catalog
  await seedCatalogLock()

  // Catalog rebuild — final 8-category structure
  await seedCatalogRebuild()

  // Display Systems — real product lineup + image paths
  await seedDisplayFix()

  // Banner — real product lineup (PVC / Construction / Mesh)
  await seedBannerFix()

  // Foil / Adhesive — image-matched products only
  await seedFoilFix()

  // Textile print — image mapping
  await seedTextileFix()

  // DTF gang sheet — image mapping
  await seedDTFFix()

  // Sublimation print — image mapping
  await seedSublimationFix()

  // Textile rebuild — garments only
  await seedTextileRebuild()

  // Sublimation rebuild — separate standard/magic mug products
  await seedSublimationRebuild()

  // Catalog corrections phase 2
  await seedCatalogCorrections()

  // Vinyl plot fix — hero + image mapping + cleanup
  await seedVinylFix()

  // Banner + DTF product fix
  await seedBannerDTFFix()

  // Magnetic products — car sign + printable sheet
  await seedMagneticProducts()

  // Self-Adhesive Film (Klebefolie) + Foils category cleanup
  await seedAdhesiveFoil()

  // Foils / Adhesive — full product lineup fix
  await seedFoilCategoryFix()

  // DTF product dimensions — printAreaWidthCm/printAreaHeightCm for fixed-size sheets
  await seedDTFDimensions()

  // Banner — new specialty banner products
  await seedBannerProducts()

  // Demo superadmin account
  await seedDemoAdmin()

  console.log('\nAll seeds complete.')
}

// ---------------------------------------------------------------------------
// Demo superadmin — for presentations / client demos
// ---------------------------------------------------------------------------

async function seedDemoAdmin() {
  const email = 'demo@printshop.local'
  const password = 'PrintshopDemo123'
  const existing = await db.user.findUnique({ where: { email } })
  if (!existing) {
    const passwordHash = await bcrypt.hash(password, 12)
    await db.user.create({
      data: { email, name: 'Demo Admin', role: 'SUPERADMIN', passwordHash },
    })
    console.log('  ✓ Demo superadmin created: demo@printshop.local')
  } else {
    // Ensure role is correct; never downgrade
    const updates: { role?: 'SUPERADMIN'; passwordHash?: string } = {}
    if (existing.role !== 'SUPERADMIN') updates.role = 'SUPERADMIN'
    if (!existing.passwordHash) updates.passwordHash = await bcrypt.hash(password, 12)
    if (Object.keys(updates).length > 0) {
      await db.user.update({ where: { id: existing.id }, data: updates })
    }
    console.log('  ✓ Demo superadmin verified: demo@printshop.local')
  }
}

// ---------------------------------------------------------------------------
// Magnetic products — Magnetic Car Sign + Magnetic Sheet (Printable)
// ---------------------------------------------------------------------------

async function seedMagneticProducts() {
  console.log('Seeding Magnetic products...')

  const foilCat = await db.productCategory.findUnique({ where: { slug: 'foil' }, select: { id: true } })
  const catId = foilCat?.id ?? null

  // ── Magnetic Car Sign ────────────────────────────────────────────────────
  const carSign = await db.product.upsert({
    where: { slug: 'magnetic-car-sign' },
    update: {
      categoryId: catId,
      active: true,
      shortDescription: 'Magnetic car signs — protective laminate included, strong hold at speed.',
      description: 'Magnetic film with UV-protective laminate. Custom size up to 5 × 0.92 m. Very strong magnetic adhesion — stays secure at motorway speed. Suitable for car doors, vans, and temporary vehicle branding. Laminate always included.',
    },
    create: {
      name: 'Magnetic Car Sign',
      slug: 'magnetic-car-sign',
      category: 'Foils',
      categoryId: catId,
      active: true,
      imageUrl: '/products/car-magnet.png',
      shortDescription: 'Magnetic car signs — protective laminate included, strong hold at speed.',
      description: 'Magnetic film with UV-protective laminate. Custom size up to 5 × 0.92 m. Very strong magnetic adhesion — stays secure at motorway speed. Suitable for car doors, vans, and temporary vehicle branding. Laminate always included.',
      guideText: 'PDF or high-res PNG. Minimum 100 DPI at full size. Include 3 mm bleed. Max width 92 cm.',
      minDpi: 100,
      recommendedDpi: 150,
      bleedMm: 3,
      safeMarginMm: 5,
      allowedFormats: 'PDF,PNG,SVG',
      notes: 'Laminate always included. Max width 92 cm. Supplied flat. Best for: Cars, Vehicle doors, Temporary advertising, Taxi signs.',
    },
  })
  await db.productConfig.upsert({
    where: { productId: carSign.id },
    update: {
      needsUpload: true,
      priceMode: 'AREA',
      hasOptions: true,
      isRoll: true,
      isPrintCut: true,
      rollWidthCm: 92,
      maxWidthCm: 92,
      productionType: 'PRINT_CUT',
      helpText: 'Laminate included — no extra option needed. Best for: Cars, Vehicle doors, Temporary advertising, Taxi signs.',
      uploadInstructions: 'Upload PDF or high-res PNG. Minimum 100 DPI at full size. Include 3 mm bleed on all sides.',
    },
    create: {
      productId: carSign.id,
      type: 'FOIL',
      hasCustomSize: true,
      hasFixedSizes: false,
      hasVariants: false,
      hasOptions: true,
      needsUpload: true,
      priceMode: 'AREA',
      isRoll: true,
      isPrintCut: true,
      rollWidthCm: 92,
      maxWidthCm: 92,
      minWidth: 10,
      maxWidth: 92,
      minHeight: 10,
      maxHeight: 500,
      productionType: 'PRINT_CUT',
      helpText: 'Laminate included — no extra option needed. Best for: Cars, Vehicle doors, Temporary advertising, Taxi signs.',
      uploadInstructions: 'Upload PDF or high-res PNG. Minimum 100 DPI at full size. Include 3 mm bleed on all sides.',
    },
  })
  await upsertPricingTable(carSign.id, 'AREA', { pricePerM2: 24.00 })
  await upsertOption(carSign.id, 'Magnetic strength', [
    { name: 'Standard', priceModifier: 0 },
    { name: 'Strong', priceModifier: 3 },
    { name: 'Extra strong', priceModifier: 6 },
  ])
  console.log(`  ✓ Magnetic Car Sign: ${carSign.id}`)

  // ── Magnetic Sheet (Printable) ───────────────────────────────────────────
  const magSheet = await db.product.upsert({
    where: { slug: 'magnetic-sheet' },
    update: {
      categoryId: catId,
      active: true,
      shortDescription: 'Printable magnetic sheet — custom size, selectable strength.',
      description: 'White printable magnetic sheet with magnetic layer on backside. Custom size up to 5 × 1.20 m. Available in different magnetic strengths. Ideal for whiteboards, metal displays, indoor signs, and repositionable panels. No laminate.',
    },
    create: {
      name: 'Magnetic Sheet (Printable)',
      slug: 'magnetic-sheet',
      category: 'Foils',
      categoryId: catId,
      active: true,
      imageUrl: '/products/car-magnet.png',
      shortDescription: 'Printable magnetic sheet — custom size, selectable strength.',
      description: 'White printable magnetic sheet with magnetic layer on backside. Custom size up to 5 × 1.20 m. Available in different magnetic strengths. Ideal for whiteboards, metal displays, indoor signs, and repositionable panels. No laminate.',
      guideText: 'PDF or high-res PNG. Minimum 100 DPI at full size. Include 3 mm bleed. Max width 120 cm.',
      minDpi: 100,
      recommendedDpi: 150,
      bleedMm: 3,
      safeMarginMm: 5,
      allowedFormats: 'PDF,PNG,SVG',
      notes: 'No laminate. Max width 120 cm. Best for: Whiteboards, Displays, Metal surfaces, Indoor signs.',
    },
  })
  await db.productConfig.upsert({
    where: { productId: magSheet.id },
    update: {
      needsUpload: true,
      priceMode: 'AREA',
      hasOptions: true,
      isRoll: true,
      isPrintCut: true,
      rollWidthCm: 120,
      maxWidthCm: 120,
      productionType: 'PRINT_CUT',
      helpText: 'No laminate — indoor use. Best for: Whiteboards, Displays, Metal surfaces, Indoor advertising.',
      uploadInstructions: 'Upload PDF or high-res PNG. Minimum 100 DPI at full size. Include 3 mm bleed on all sides.',
    },
    create: {
      productId: magSheet.id,
      type: 'FOIL',
      hasCustomSize: true,
      hasFixedSizes: false,
      hasVariants: false,
      hasOptions: true,
      needsUpload: true,
      priceMode: 'AREA',
      isRoll: true,
      isPrintCut: true,
      rollWidthCm: 120,
      maxWidthCm: 120,
      minWidth: 10,
      maxWidth: 120,
      minHeight: 10,
      maxHeight: 500,
      productionType: 'PRINT_CUT',
      helpText: 'No laminate — indoor use. Best for: Whiteboards, Displays, Metal surfaces, Indoor advertising.',
      uploadInstructions: 'Upload PDF or high-res PNG. Minimum 100 DPI at full size. Include 3 mm bleed on all sides.',
    },
  })
  await upsertPricingTable(magSheet.id, 'AREA', { pricePerM2: 16.00 })
  await upsertOption(magSheet.id, 'Magnetic strength', [
    { name: 'Light', priceModifier: 0 },
    { name: 'Medium', priceModifier: 2 },
    { name: 'Strong', priceModifier: 4 },
  ])
  console.log(`  ✓ Magnetic Sheet (Printable): ${magSheet.id}`)

  console.log('  Magnetic products complete.')
}

// ---------------------------------------------------------------------------
// Self-Adhesive Film (Klebefolie) + Foils category cleanup
// ---------------------------------------------------------------------------

async function seedAdhesiveFoil() {
  console.log('Seeding Self-Adhesive Film (Klebefolie)...')

  const foilCat = await db.productCategory.findUnique({ where: { slug: 'foil' }, select: { id: true } })
  const catId = foilCat?.id ?? null

  // ── Self-Adhesive Film ───────────────────────────────────────────────────
  const film = await db.product.upsert({
    where: { slug: 'self-adhesive-film' },
    update: {
      categoryId: catId,
      active: true,
      name: 'Self-Adhesive Film',
      shortDescription: 'Printable self-adhesive film — monomer or polymer, choice of adhesive and laminate.',
      description: 'White printable self-adhesive film, one-sided print. Available in monomer (B1 fire-rated) or polymer. Custom size up to 5 × 1.32 m. Choose transparent or grey adhesive and optional gloss or matt laminate for outdoor durability.',
    },
    create: {
      name: 'Self-Adhesive Film',
      slug: 'self-adhesive-film',
      category: 'Foils',
      categoryId: catId,
      active: true,
      imageUrl: '/products/foil-adhessive-hero-banner.png',
      shortDescription: 'Printable self-adhesive film — monomer or polymer, choice of adhesive and laminate.',
      description: 'White printable self-adhesive film, one-sided print. Available in monomer (B1 fire-rated) or polymer. Custom size up to 5 × 1.32 m. Choose transparent or grey adhesive and optional gloss or matt laminate for outdoor durability.',
      guideText: 'PDF or high-res PNG. Minimum 100 DPI at full size. Include 3 mm bleed. Max width 132 cm. One-sided print only.',
      minDpi: 100,
      recommendedDpi: 150,
      bleedMm: 3,
      safeMarginMm: 5,
      allowedFormats: 'PDF,PNG,SVG',
      notes: 'One-sided print. Max width 132 cm. Monomer film is B1 fire-rated.',
    },
  })
  await db.productConfig.upsert({
    where: { productId: film.id },
    update: {
      needsUpload: true,
      priceMode: 'AREA',
      hasOptions: true,
      isRoll: true,
      isPrintCut: true,
      rollWidthCm: 132,
      maxWidthCm: 132,
      productionType: 'PRINT_CUT',
      helpText: 'One-sided print. Select material, adhesive type, and laminate finish. Monomer film is B1 fire-rated.',
      uploadInstructions: 'Upload PDF or high-res PNG. Minimum 100 DPI at final size. Include 3 mm bleed on all sides. One-sided print only.',
    },
    create: {
      productId: film.id,
      type: 'FOIL',
      hasCustomSize: true,
      hasFixedSizes: false,
      hasVariants: false,
      hasOptions: true,
      needsUpload: true,
      priceMode: 'AREA',
      isRoll: true,
      isPrintCut: true,
      rollWidthCm: 132,
      maxWidthCm: 132,
      minWidth: 10,
      maxWidth: 132,
      minHeight: 10,
      maxHeight: 500,
      productionType: 'PRINT_CUT',
      helpText: 'One-sided print. Select material, adhesive type, and laminate finish. Monomer film is B1 fire-rated.',
      uploadInstructions: 'Upload PDF or high-res PNG. Minimum 100 DPI at final size. Include 3 mm bleed on all sides. One-sided print only.',
    },
  })
  await upsertPricingTable(film.id, 'AREA', { pricePerM2: 12.00 })
  await upsertOption(film.id, 'Material', [
    { name: 'Monomer (B1 fire-rated)', priceModifier: 0 },
    { name: 'Polymer', priceModifier: 5 },
  ])
  await upsertOption(film.id, 'Adhesive', [
    { name: 'Transparent adhesive', priceModifier: 0 },
    { name: 'Grey adhesive', priceModifier: 2 },
  ])
  await upsertOption(film.id, 'Laminate', [
    { name: 'No laminate', priceModifier: 0 },
    { name: 'Gloss laminate', priceModifier: 4 },
    { name: 'Matt laminate', priceModifier: 4 },
  ])
  console.log(`  ✓ Self-Adhesive Film: ${film.id}`)

  // ── Deactivate products no longer in Foils lineup ────────────────────────
  await db.product.updateMany({
    where: {
      slug: {
        in: [
          'milchglasfolie',     // Frosted glass film — removed from lineup
          'lochfolie',          // Perforated window film — removed from lineup
          'car-graphics',       // Moved out of adhesive foils
          'window-graphics',    // Moved out of adhesive foils
          'car-magnet',         // Replaced by magnetic-car-sign
          'car-magnet-schild',  // Replaced by magnetic-car-sign
        ],
      },
    },
    data: { active: false },
  })
  console.log('  ✓ Deactivated superseded foil products')

  console.log('  Self-Adhesive Film complete.')
}

// ---------------------------------------------------------------------------
// Foils / Adhesive — correct full product lineup
// ---------------------------------------------------------------------------

async function seedFoilCategoryFix() {
  console.log('Seeding Foil / Adhesive category fix...')

  const foilCat = await db.productCategory.findUnique({ where: { slug: 'foil' }, select: { id: true } })
  const catId = foilCat?.id ?? null

  // ── Remove products that do not belong in Foils ──────────────────────────
  await db.product.updateMany({
    where: { slug: { in: ['custom-stickers', 'plexiglas-sign', 'milchglasfolie', 'lochfolie'] } },
    data: { active: false },
  })
  console.log('  ✓ Removed non-foil products from Foils category')

  // ── Helper: upsert a standard roll-print foil product ────────────────────
  type FoilDef = {
    slug: string; name: string; shortDesc: string; desc: string
    pricePerM2: number; maxWidth: number; notes: string; helpText: string
    options?: { optName: string; values: { name: string; priceModifier: number }[] }[]
  }

  const upsertFoil = async (def: FoilDef) => {
    const p = await db.product.upsert({
      where: { slug: def.slug },
      update: { categoryId: catId, active: true, name: def.name, shortDescription: def.shortDesc, description: def.desc },
      create: {
        name: def.name, slug: def.slug, category: 'Foils', categoryId: catId, active: true,
        imageUrl: '/products/window-graphics.png',
        shortDescription: def.shortDesc, description: def.desc,
        guideText: `PDF or high-res PNG. Minimum 100 DPI at full size. Include 3 mm bleed. Max width ${def.maxWidth} cm.`,
        minDpi: 100, recommendedDpi: 150, bleedMm: 3, safeMarginMm: 5, allowedFormats: 'PDF,PNG,SVG',
        notes: def.notes,
      },
    })
    await db.productConfig.upsert({
      where: { productId: p.id },
      update: { needsUpload: true, priceMode: 'AREA', hasOptions: !!(def.options?.length), isRoll: true, isPrintCut: true, rollWidthCm: def.maxWidth, maxWidthCm: def.maxWidth, productionType: 'PRINT_CUT', helpText: def.helpText, uploadInstructions: `Upload PDF or high-res PNG. Minimum 100 DPI at final size. Include 3 mm bleed. Max width ${def.maxWidth} cm.` },
      create: {
        productId: p.id, type: 'FOIL', hasCustomSize: true, hasFixedSizes: false, hasVariants: false, hasOptions: !!(def.options?.length),
        needsUpload: true, priceMode: 'AREA', isRoll: true, isPrintCut: true,
        rollWidthCm: def.maxWidth, maxWidthCm: def.maxWidth, minWidth: 10, maxWidth: def.maxWidth, minHeight: 10, maxHeight: 500,
        productionType: 'PRINT_CUT', helpText: def.helpText,
        uploadInstructions: `Upload PDF or high-res PNG. Minimum 100 DPI at final size. Include 3 mm bleed. Max width ${def.maxWidth} cm.`,
      },
    })
    await upsertPricingTable(p.id, 'AREA', { pricePerM2: def.pricePerM2 })
    if (def.options) {
      for (const opt of def.options) await upsertOption(p.id, opt.optName, opt.values)
    }
    console.log(`  ✓ ${def.name}`)
    return p
  }

  // ── 1. Frosted Glass Film ─────────────────────────────────────────────────
  await upsertFoil({
    slug: 'frosted-glass-film', name: 'Frosted Glass Film',
    shortDesc: 'Frosted glass film — privacy and style for windows and glass doors.',
    desc: 'Self-adhesive frosted glass film with printed design. Provides privacy while letting light through. Ideal for office partitions, shop windows, and glass doors. Max width 137 cm.',
    pricePerM2: 22.00, maxWidth: 137,
    notes: 'Max width 137 cm. Provides privacy, allows light through.',
    helpText: 'One-sided print. Applies to glass and smooth surfaces. Provides privacy while letting light through.',
  })

  // ── 2. Transparent Adhesive Film ─────────────────────────────────────────
  await upsertFoil({
    slug: 'transparent-adhesive-film', name: 'Transparent Adhesive Film',
    shortDesc: 'Clear self-adhesive film — printed, gloss or matt finish.',
    desc: 'Transparent self-adhesive film for windows, glass, and smooth surfaces. One-sided print on clear substrate. Available in gloss or matt finish. UV-resistant. Max width 137 cm.',
    pricePerM2: 14.00, maxWidth: 137,
    notes: 'Clear substrate. One-sided print. Max width 137 cm.',
    helpText: 'Clear film — design printed on one side. Available in gloss or matt finish.',
    options: [{ optName: 'Finish', values: [{ name: 'Gloss', priceModifier: 0 }, { name: 'Matt', priceModifier: 2 }] }],
  })

  // ── 3. Backlit Film ───────────────────────────────────────────────────────
  await upsertFoil({
    slug: 'backlit-film', name: 'Backlit Film',
    shortDesc: 'Backlit film for lightboxes and illuminated displays.',
    desc: 'High-quality backlit film for use in lightboxes and illuminated signage. Vibrant colours with backlight transmission. Scratch-resistant surface. Ideal for retail, hospitality, and exhibition displays. Max width 137 cm.',
    pricePerM2: 26.00, maxWidth: 137,
    notes: 'For lightboxes and illuminated displays. Max width 137 cm.',
    helpText: 'Designed for backlit use in lightboxes. Colours are optimised for illumination.',
  })

  // ── 4. Perforated Film ───────────────────────────────────────────────────
  await upsertFoil({
    slug: 'perforated-film', name: 'Perforated Film',
    shortDesc: 'Perforated window film — one-way vision, full-colour print.',
    desc: 'Printed perforated vinyl film (50/50). Full-colour print visible from outside; see-through from inside. Ideal for shop windows, vehicle rear windows, and glass partitions. Max width 137 cm.',
    pricePerM2: 20.00, maxWidth: 137,
    notes: '50/50 perforation. One-way vision. Max width 137 cm.',
    helpText: 'Opaque print from outside, see-through from inside. 50/50 perforation.',
  })

  // ── 5. Static Cling Film ─────────────────────────────────────────────────
  await upsertFoil({
    slug: 'static-cling-film', name: 'Static Cling Film',
    shortDesc: 'Static cling film — no adhesive, removable and repositionable.',
    desc: 'Static cling film adheres to glass and smooth surfaces without adhesive. Fully removable and repositionable without residue. Ideal for temporary promotions, seasonal decoration, and rental spaces. Max width 137 cm.',
    pricePerM2: 18.00, maxWidth: 137,
    notes: 'No adhesive — static cling only. For glass and smooth surfaces. Max width 137 cm.',
    helpText: 'No adhesive — adheres by static electricity. Fully removable and reusable.',
  })

  // ── 6. Floor Sticker Indoor ───────────────────────────────────────────────
  await upsertFoil({
    slug: 'floor-sticker-indoor', name: 'Floor Sticker Indoor',
    shortDesc: 'Indoor floor graphics — anti-slip laminate, custom size.',
    desc: 'Full-colour printed floor sticker for indoor use. Anti-slip laminate included. Strong adhesive for smooth and slightly textured floors. Ideal for retail promotions, wayfinding, and events. Max width 137 cm.',
    pricePerM2: 22.00, maxWidth: 137,
    notes: 'Anti-slip laminate included. For smooth indoor floors. Max width 137 cm.',
    helpText: 'Anti-slip laminate included. Suitable for smooth indoor floors — tiles, wood, vinyl.',
  })

  // ── 7. Floor Sticker Outdoor ──────────────────────────────────────────────
  await upsertFoil({
    slug: 'floor-sticker-outdoor', name: 'Floor Sticker Outdoor',
    shortDesc: 'Outdoor floor graphics — heavy-duty, UV and slip resistant.',
    desc: 'Heavy-duty outdoor floor sticker with UV-resistant inks and heavy anti-slip laminate. Withstands foot traffic and weather exposure. Suitable for pavements, entrance areas, and outdoor events. Max width 137 cm.',
    pricePerM2: 30.00, maxWidth: 137,
    notes: 'Heavy-duty anti-slip laminate. UV-resistant. For outdoor use. Max width 137 cm.',
    helpText: 'UV-resistant with heavy-duty anti-slip laminate. Suitable for outdoor pavements and entrance areas.',
  })

  console.log('  Foil / Adhesive category fix complete.')
}

// ---------------------------------------------------------------------------
// DTF product dimensions — set printAreaWidthCm/printAreaHeightCm so the
// editor canvas and upload flow use the correct fixed sheet size (step 700)
// ---------------------------------------------------------------------------

async function seedDTFDimensions() {
  console.log('Seeding DTF product dimensions...')

  const updates = [
    { slug: 'dtf-55x100', w: 55,   h: 100  },
    { slug: 'dtf-a3',     w: 29.7, h: 42   },
    { slug: 'dtf-a4',     w: 21,   h: 29.7 },
  ]

  for (const { slug, w, h } of updates) {
    const p = await db.product.findUnique({ where: { slug }, select: { id: true } })
    if (p) {
      await db.productConfig.update({
        where: { productId: p.id },
        data: { printAreaWidthCm: w, printAreaHeightCm: h },
      })
      console.log(`  ✓ ${slug}: printAreaWidthCm=${w}, printAreaHeightCm=${h}`)
    }
  }

  console.log('  DTF dimensions complete.')
}

// ---------------------------------------------------------------------------
// Banner — new specialty banner products (step 699)
// ---------------------------------------------------------------------------

async function seedBannerProducts() {
  console.log('Seeding new banner products...')

  const cat = await db.productCategory.findUnique({ where: { slug: 'banner' }, select: { id: true } })
  const catId = cat?.id ?? null

  const bannerConfig = {
    type: 'BANNER' as const,
    hasCustomSize: true,
    hasFixedSizes: false,
    hasVariants: false,
    hasOptions: true,
    isRoll: true,
    needsUpload: true,
    priceMode: 'AREA' as const,
    rollWidthCm: 160,
    maxWidthCm: 160,
    minWidth: 30,
    maxWidth: 160,
    minHeight: 30,
    maxHeight: 1000,
    productionType: 'ROLL_PRINT' as const,
    uploadInstructions: 'Upload PDF or high-res PNG. Minimum 72 DPI at final size. Include 20 mm bleed on all sides.',
  }

  // ── Backlit Banner ────────────────────────────────────────────────────────
  const backlit = await db.product.upsert({
    where: { slug: 'backlit-banner' },
    update: {
      categoryId: catId,
      active: true,
      name: 'Backlit Banner',
      shortDescription: 'Backlit banner film for illuminated lightboxes and frames.',
      description: 'High-opacity backlit banner film with vibrant colour reproduction when illuminated from behind. Ideal for lightboxes, illuminated frames, shop displays and indoor/outdoor advertising. Max width 160 cm.',
    },
    create: {
      name: 'Backlit Banner',
      slug: 'backlit-banner',
      category: 'Banner',
      categoryId: catId,
      active: true,
      imageUrl: '/products/banner-hero-section.png',
      shortDescription: 'Backlit banner film for illuminated lightboxes and frames.',
      description: 'High-opacity backlit banner film with vibrant colour reproduction when illuminated from behind. Ideal for lightboxes, illuminated frames, shop displays and indoor/outdoor advertising. Max width 160 cm.',
      guideText: 'PDF or high-res PNG. Minimum 72 DPI at full size. Include 20 mm bleed. Designed for backlit viewing — use saturated colours.',
      minDpi: 72,
      recommendedDpi: 100,
      bleedMm: 20,
      safeMarginMm: 20,
      allowedFormats: 'PDF,PNG,TIFF',
      notes: 'Lightboxes / Illuminated signs / Shop displays / Indoor advertising / Outdoor advertising. Max width 160 cm.',
    },
  })
  await db.productConfig.upsert({
    where: { productId: backlit.id },
    update: {
      ...bannerConfig,
      helpText: 'For lightboxes, illuminated frames and shop displays. Enter width and height in cm. Max width 160 cm.',
    },
    create: {
      productId: backlit.id,
      ...bannerConfig,
      helpText: 'For lightboxes, illuminated frames and shop displays. Enter width and height in cm. Max width 160 cm.',
    },
  })
  await upsertPricingTable(backlit.id, 'AREA', { pricePerM2: 22.00 })
  await applyBannerOptions(backlit.id)
  console.log(`  ✓ Backlit Banner: ${backlit.id}`)

  // ── Blockout Banner ───────────────────────────────────────────────────────
  const blockout = await db.product.upsert({
    where: { slug: 'blockout-banner' },
    update: {
      categoryId: catId,
      active: true,
      name: 'Blockout Banner',
      shortDescription: 'Opaque blockout PVC banner — double-sided, no light bleed.',
      description: 'PVC blockout banner with a solid black core that prevents light bleed, making it suitable for double-sided printing and street advertising. Max width 160 cm. Hemmed and eyeleted.',
    },
    create: {
      name: 'Blockout Banner',
      slug: 'blockout-banner',
      category: 'Banner',
      categoryId: catId,
      active: true,
      imageUrl: '/products/banner-hero-section.png',
      shortDescription: 'Opaque blockout PVC banner — double-sided, no light bleed.',
      description: 'PVC blockout banner with a solid black core that prevents light bleed, making it suitable for double-sided printing and street advertising. Max width 160 cm. Hemmed and eyeleted.',
      guideText: 'PDF or high-res PNG. Minimum 72 DPI at full size. Include 20 mm bleed. For double-sided, supply front and back as separate files.',
      minDpi: 72,
      recommendedDpi: 100,
      bleedMm: 20,
      safeMarginMm: 20,
      allowedFormats: 'PDF,PNG,TIFF',
      notes: 'Double-sided banners / Street advertising / Event banners / Fence banners / Outdoor use. Max width 160 cm.',
    },
  })
  await db.productConfig.upsert({
    where: { productId: blockout.id },
    update: {
      ...bannerConfig,
      helpText: 'Opaque black core — ideal for double-sided or street-facing banners. Max width 160 cm.',
    },
    create: {
      productId: blockout.id,
      ...bannerConfig,
      helpText: 'Opaque black core — ideal for double-sided or street-facing banners. Max width 160 cm.',
    },
  })
  await upsertPricingTable(blockout.id, 'AREA', { pricePerM2: 18.00 })
  await applyBannerOptions(blockout.id)
  console.log(`  ✓ Blockout Banner: ${blockout.id}`)

  // ── Barrier Fence Banner ──────────────────────────────────────────────────
  const fence = await db.product.upsert({
    where: { slug: 'barrier-fence-banner' },
    update: {
      categoryId: catId,
      active: true,
      name: 'Barrier Fence Banner',
      shortDescription: 'Printed banner for crowd control barriers, events and construction sites.',
      description: 'Durable printed PVC banner designed to attach to crowd control barriers, construction site fencing and event barriers. Reinforced hem and eyelets every 50 cm. Max width 160 cm.',
    },
    create: {
      name: 'Barrier Fence Banner',
      slug: 'barrier-fence-banner',
      category: 'Banner',
      categoryId: catId,
      active: true,
      imageUrl: '/products/banner-hero-section.png',
      shortDescription: 'Printed banner for crowd control barriers, events and construction sites.',
      description: 'Durable printed PVC banner designed to attach to crowd control barriers, construction site fencing and event barriers. Reinforced hem and eyelets every 50 cm. Max width 160 cm.',
      guideText: 'PDF or high-res PNG. Minimum 72 DPI at full size. Include 20 mm bleed on all sides.',
      minDpi: 72,
      recommendedDpi: 100,
      bleedMm: 20,
      safeMarginMm: 20,
      allowedFormats: 'PDF,PNG,TIFF',
      notes: 'Event barriers / Construction sites / Crowd control fences / Outdoor advertising. Max width 160 cm.',
    },
  })
  await db.productConfig.upsert({
    where: { productId: fence.id },
    update: {
      ...bannerConfig,
      helpText: 'For crowd control barriers, event fencing and construction sites. Enter width and height in cm.',
    },
    create: {
      productId: fence.id,
      ...bannerConfig,
      helpText: 'For crowd control barriers, event fencing and construction sites. Enter width and height in cm.',
    },
  })
  await upsertPricingTable(fence.id, 'AREA', { pricePerM2: 14.00 })
  await applyBannerOptions(fence.id)
  console.log(`  ✓ Barrier Fence Banner: ${fence.id}`)

  console.log('  Banner products seeded.')
}

// ---------------------------------------------------------------------------

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
