// Product match engine — scores user message + file signals against real product slugs.
// Returns the best matching product and a human-readable reason for the AI to cite.

import type { ValidationResult } from '@/lib/fileValidation'

export interface ProductInfo {
  name: string
  slug: string
}

export interface MatchResult {
  productSlug: string
  productName: string
  reason: string
  link: string
}

// ---------------------------------------------------------------------------
// Signal rules — keyword → preferred product slugs (in priority order)
// ---------------------------------------------------------------------------

interface KeywordRule {
  keywords: string[]
  ratioMin?: number   // width/height >= this also triggers (e.g. 2.0 for wide)
  preferSlugs: string[]
  reason: string
  score: number
}

const KEYWORD_RULES: KeywordRule[] = [
  // Mesh / perforated / wind-through banner
  {
    keywords: ['mesh', 'fence', 'scaffolding', 'zaun', 'wind through', 'perforated banner', 'bauzaun'],
    preferSlugs: ['mesh-banner', 'fence-banner', 'barrier-fence-banner', 'bauzaun-banner', 'banner'],
    reason: 'Mesh banner recommended — wind-through fabric for outdoor and scaffolding use',
    score: 10,
  },
  // Blockout / double-sided banner
  {
    keywords: ['double side', 'double-side', 'double sided', 'blockout', 'both sides', 'zwei seiten'],
    preferSlugs: ['blockout-banner', 'double-sided-banner', 'banner'],
    reason: 'Blockout banner recommended — opaque core for double-sided visibility',
    score: 10,
  },
  // Construction / site banner
  {
    keywords: ['construction', 'building site', 'baustelle', 'site sign', 'scaffolding sign'],
    preferSlugs: ['construction-banner', 'bauzaun-banner', 'site-sign', 'banner'],
    reason: 'Construction site banner recommended',
    score: 9,
  },
  // Stage / event backdrop
  {
    keywords: ['stage', 'backdrop', 'step and repeat', 'concert', 'event backdrop', 'photo backdrop'],
    preferSlugs: ['stage-banner', 'event-banner', 'banner'],
    reason: 'Stage / event banner recommended for backdrops and photo walls',
    score: 9,
  },
  // General banner
  {
    keywords: ['banner', 'pvc banner', 'outdoor banner', 'fahne', 'werbeplane'],
    ratioMin: 2.5,
    preferSlugs: ['banner', 'event-banner', 'mesh-banner'],
    reason: 'PVC banner recommended for wide-format outdoor advertising',
    score: 8,
  },
  // Roll-up / display systems
  {
    keywords: [
      'roll-up', 'rollup', 'roll up', 'display', 'exhibition', 'trade fair', 'messe',
      'x-banner', 'x banner', 'l-banner', 'l banner', 'kundenstopper', 'pavement sign',
    ],
    preferSlugs: ['roll-up', 'rollup-100', 'rollup-85', 'rollup-banner', 'x-banner', 'l-banner', 'kundestopper'],
    reason: 'Roll-up / display system recommended for exhibitions and point-of-sale',
    score: 10,
  },
  // DTF / garment print
  {
    keywords: [
      't-shirt', 'tshirt', 't shirt', 'shirt', 'hoodie', 'garment', 'textile', 'clothing',
      'apparel', 'jersey', 'polo', 'workwear', 'dtf', 'heat transfer', 'transfer print',
      'direct to film',
    ],
    preferSlugs: ['dtf', 'dtf-a4', 'dtf-a3', 'dtf-transfer', 't-shirt-print', 'hoodie-print', 'flex-print'],
    reason: 'DTF transfer recommended — full-colour heat-transfer for garments',
    score: 10,
  },
  // Flex / flock vinyl transfer
  {
    keywords: ['flex', 'flock', 'single colour', 'single color', 'heat press', 'vinyl transfer', 'textilfolie'],
    preferSlugs: ['flex-print', 'flock-print', 'dtf'],
    reason: 'Flex or flock heat-transfer recommended for single-colour textile prints',
    score: 9,
  },
  // Embroidery / patches
  {
    keywords: [
      'embroidery', 'embroidered', 'stickerei', 'patch', 'woven patch',
      'cap embroidery', 'logo embroidery', 'iron-on patch',
    ],
    preferSlugs: ['embroidery', 'patches', 'woven-patch', 'cap-embroidery', 'logo-embroidery'],
    reason: 'Embroidery recommended for premium branded apparel and accessories',
    score: 10,
  },
  // Vehicle graphics
  {
    keywords: [
      'car', 'vehicle', 'van', 'truck', 'fleet', 'vehicle graphics', 'auto',
      'bus', 'boat lettering', 'car lettering', 'truck banner', 'fahrzeugbeschriftung',
    ],
    preferSlugs: ['car-graphics', 'car-decals', 'car-lettering', 'vinyl-lettering'],
    reason: 'Vehicle graphics recommended — cast vinyl for outdoor UV and weather resistance',
    score: 10,
  },
  // Window film / glass
  {
    keywords: [
      'window', 'glass', 'shopfront', 'shop window', 'milchglas', 'frosted glass',
      'lochfolie', 'perforated film', 'privacy film', 'sichtschutz',
    ],
    preferSlugs: ['window-foil', 'milchglasfolie', 'lochfolie', 'frosted-glass-film', 'privacy-foil', 'window-graphics'],
    reason: 'Window foil / frosted film recommended for glass surfaces',
    score: 9,
  },
  // Door / opening hours
  {
    keywords: ['door', 'opening hours', 'öffnungszeiten', 'business hours', 'entrance lettering'],
    preferSlugs: ['door-lettering', 'opening-hours-lettering', 'opening-hours-print', 'window-lettering'],
    reason: 'Door lettering or opening hours vinyl recommended',
    score: 9,
  },
  // Wall graphics
  {
    keywords: ['wall', 'wall art', 'wall graphic', 'mural', 'wandbeschriftung', 'wall sticker'],
    preferSlugs: ['wall-lettering', 'self-adhesive-film', 'vinyl-lettering'],
    reason: 'Wall lettering / self-adhesive film recommended',
    score: 8,
  },
  // Cut vinyl / plotter
  {
    keywords: ['vinyl', 'cut vinyl', 'plotter', 'contour cut', 'logo cut', 'plotterfolie'],
    preferSlugs: ['vinyl-lettering', 'logo-cut-vinyl', 'vinyl-plot'],
    reason: 'Cut vinyl / plotter lettering recommended for bold single-colour graphics',
    score: 8,
  },
  // Floor sticker
  {
    keywords: ['floor', 'ground', 'floor sticker', 'floor graphic', 'boden', 'floor decal'],
    preferSlugs: ['floor-sticker-indoor', 'floor-sticker-outdoor'],
    reason: 'Floor sticker recommended — anti-slip lamination for safety compliance',
    score: 10,
  },
  // Stickers / labels
  {
    keywords: [
      'sticker', 'label', 'decal', 'logo sticker', 'product label', 'round sticker',
      'die-cut', 'kiss-cut', 'self adhesive', 'aufkleber',
    ],
    preferSlugs: ['stickers', 'custom-stickers', 'advertising-stickers', 'product-labels', 'window-stickers'],
    reason: 'Custom stickers recommended for branding and product labelling',
    score: 8,
  },
  // Magnets
  {
    keywords: ['magnet', 'magnetic', 'fridge magnet', 'car magnet', 'magnetfolie'],
    preferSlugs: ['car-magnet', 'magnetfolie', 'magnetic-sheet', 'magnetic-car-sign'],
    reason: 'Magnetic print recommended — repositionable without permanent adhesive',
    score: 10,
  },
  // Rigid signs / boards
  {
    keywords: [
      'sign', 'dibond', 'forex', 'plexiglas', 'acrylic sign', 'rigid board', 'panel',
      'schild', 'warning sign', 'site board', 'outdoor sign',
    ],
    preferSlugs: ['dibond-sign', 'forex-board', 'acrylic-sign', 'pvc-sign', 'plexiglas-sign', 'warning-sign'],
    reason: 'Rigid sign board recommended for permanent indoor/outdoor signage',
    score: 9,
  },
  // Canvas print
  {
    keywords: ['canvas', 'leinwand', 'stretched canvas', 'art print', 'gallery print'],
    preferSlugs: ['canvas-print'],
    reason: 'Canvas print recommended for artistic or decorative interior use',
    score: 10,
  },
  // Photo / large format poster
  {
    keywords: ['photo', 'poster', 'large print', 'fotodruck', 'photo print'],
    preferSlugs: ['photo-print-large', 'canvas-print', 'large-format'],
    reason: 'Large format photo print recommended for high-quality photographic output',
    score: 8,
  },
  // Sublimation / mugs / hard goods
  {
    keywords: ['mug', 'cup', 'bottle', 'sublimation', 'magic mug', 'thermos', 'thermal'],
    preferSlugs: ['sublimation-mug', 'sublimation-magic-mug', 'mug', 'sublimation-bottle', 'sublimation-thermo'],
    reason: 'Sublimation mug / hard goods recommended',
    score: 10,
  },
]

// ---------------------------------------------------------------------------
// Ratio-only signals (applied when no keyword rule scored)
// ---------------------------------------------------------------------------

interface RatioRule {
  ratioMin?: number
  ratioMax?: number
  preferSlugs: string[]
  reason: string
  score: number
}

const RATIO_RULES: RatioRule[] = [
  {
    ratioMin: 3.0,
    preferSlugs: ['banner', 'event-banner'],
    reason: 'Very wide aspect ratio (3:1+) suggests a banner or wide-format print',
    score: 5,
  },
  {
    ratioMin: 2.0,
    ratioMax: 3.0,
    preferSlugs: ['banner', 'photo-print-large'],
    reason: 'Wide landscape ratio suggests a banner or large-format print',
    score: 3,
  },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalise(text: string): string {
  return text.toLowerCase().replace(/[^\w\s-]/g, ' ')
}

// ---------------------------------------------------------------------------
// matchProduct — main export
// ---------------------------------------------------------------------------

export function matchProduct(
  fileInfo: ValidationResult | null,
  message: string,
  products: ProductInfo[]
): MatchResult | null {
  if (!products.length) return null

  const slugSet = new Set(products.map((p) => p.slug))
  const normMsg = normalise(message)

  // slug → { accumulated score, best reason }
  const scoreMap = new Map<string, { score: number; reason: string }>()

  function credit(slug: string, delta: number, reason: string) {
    if (!slugSet.has(slug)) return
    const prev = scoreMap.get(slug)
    scoreMap.set(slug, {
      score: (prev?.score ?? 0) + delta,
      reason: prev ? prev.reason : reason,   // keep first (highest-scoring) reason
    })
  }

  // Parse ratio from fileInfo
  const ratio =
    fileInfo && fileInfo.width > 0 && fileInfo.height > 0
      ? fileInfo.width / fileInfo.height
      : null

  // ---- Apply keyword rules ----
  for (const rule of KEYWORD_RULES) {
    let hits = 0
    for (const kw of rule.keywords) {
      if (normMsg.includes(kw.toLowerCase())) hits++
    }

    // Ratio boost within keyword rule (e.g. wide ratio → banner)
    let ratioBoost = 0
    if (rule.ratioMin !== undefined && ratio !== null && ratio >= rule.ratioMin) {
      ratioBoost = 2
    }

    const total = hits * rule.score + ratioBoost
    if (total === 0) continue

    // Credit first matching slug that exists in products
    for (const slug of rule.preferSlugs) {
      if (slugSet.has(slug)) {
        credit(slug, total, rule.reason)
        break
      }
    }
  }

  // ---- Apply ratio-only rules (always run, low weight) ----
  if (ratio !== null) {
    for (const rr of RATIO_RULES) {
      const minOk = rr.ratioMin === undefined || ratio >= rr.ratioMin
      const maxOk = rr.ratioMax === undefined || ratio < rr.ratioMax
      if (!minOk || !maxOk) continue
      for (const slug of rr.preferSlugs) {
        if (slugSet.has(slug)) {
          credit(slug, rr.score, rr.reason)
          break
        }
      }
    }
  }

  if (!scoreMap.size) return null

  // Find best scoring slug
  let bestSlug = ''
  let bestScore = -1
  let bestReason = ''
  scoreMap.forEach(({ score, reason }, slug) => {
    if (score > bestScore) {
      bestScore = score
      bestSlug = slug
      bestReason = reason
    }
  })

  const product = products.find((p) => p.slug === bestSlug)
  if (!product) return null

  return {
    productSlug: bestSlug,
    productName: product.name,
    reason: bestReason,
    link: `/shop/${bestSlug}`,
  }
}
