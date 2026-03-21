// Prepress rule engine — evaluates file + matched product and returns production-grade
// warnings, recommendations, and operator notes that the AI injects into its response.

import type { ValidationResult } from '@/lib/fileValidation'
import type { MatchResult } from '@/lib/productMatcher'
import { getSetting } from '@/lib/settings/settingsService'

export interface PrepressResult {
  warnings: string[]
  recommendations: string[]
  productionNotes: string[]
}

// ---------------------------------------------------------------------------
// FileRule — admin-configurable DPI + bleed per product group
// ---------------------------------------------------------------------------

export interface FileRule {
  slug: string      // group key: "banner", "sticker", "textile", etc.
  label: string     // human label shown in admin UI
  minDpi: number    // minimum acceptable DPI
  bleedMm: number   // required bleed in mm (0 = none)
}

export const FILE_RULE_DEFAULTS: FileRule[] = [
  { slug: 'banner',        label: 'Banner',               minDpi: 100, bleedMm: 30 },
  { slug: 'display',       label: 'Roll-up / Display',    minDpi: 100, bleedMm: 30 },
  { slug: 'sticker',       label: 'Sticker / Label',      minDpi: 200, bleedMm: 2  },
  { slug: 'floor-sticker', label: 'Floor Sticker',        minDpi: 200, bleedMm: 2  },
  { slug: 'textile',       label: 'Textile / DTF',        minDpi: 100, bleedMm: 0  },
  { slug: 'vinyl',         label: 'Vinyl / Vehicle',      minDpi: 100, bleedMm: 0  },
  { slug: 'sublimation',   label: 'Sublimation',          minDpi: 150, bleedMm: 0  },
  { slug: 'sign',          label: 'Rigid Sign',           minDpi: 150, bleedMm: 3  },
  { slug: 'large-format',  label: 'Large Format Print',   minDpi: 100, bleedMm: 3  },
  { slug: 'embroidery',    label: 'Embroidery / Patches', minDpi: 300, bleedMm: 0  },
]

export async function getFileRules(): Promise<FileRule[]> {
  try {
    const raw = await getSetting('ai.fileRules')
    if (!raw) return FILE_RULE_DEFAULTS
    const parsed = JSON.parse(raw) as FileRule[]
    if (!Array.isArray(parsed) || parsed.length === 0) return FILE_RULE_DEFAULTS
    return parsed
  } catch {
    return FILE_RULE_DEFAULTS
  }
}

// ---------------------------------------------------------------------------
// Product group helpers — explicit slug sets for precision
// ---------------------------------------------------------------------------

const BANNER_SLUGS = new Set([
  'banner', 'mesh-banner', 'event-banner', 'stage-banner', 'construction-banner',
  'bauzaun-banner', 'blockout-banner', 'double-sided-banner', 'fence-banner',
  'barrier-fence-banner', 'backlit-banner', 'construction-signage',
])

const MESH_SLUGS = new Set([
  'mesh-banner', 'fence-banner', 'barrier-fence-banner', 'bauzaun-banner',
])

const DOUBLE_SIDED_SLUGS = new Set([
  'blockout-banner', 'double-sided-banner',
])

const TEXTILE_SLUGS = new Set([
  'dtf', 'dtf-a4', 'dtf-a3', 'dtf-transfer', 'dtf-55x100', 'dtf-gang-sheet',
  'flex-print', 'flock-print', 't-shirt-print', 'tshirt-v-neck',
  'hoodie-print', 'polo-print', 'workwear-print', 'sport-jersey', 'garment-bag',
  'textile-print',
])

const STICKER_SLUGS = new Set([
  'stickers', 'sticker', 'custom-stickers', 'advertising-stickers',
  'window-stickers', 'product-labels', 'iso-stickers',
])

const FLOOR_STICKER_SLUGS = new Set([
  'floor-sticker-indoor', 'floor-sticker-outdoor',
])

const VINYL_VEHICLE_SLUGS = new Set([
  'vinyl-lettering', 'logo-cut-vinyl', 'vinyl-plot',
  'car-lettering', 'car-decals', 'car-graphics',
  'door-lettering', 'wall-lettering', 'window-lettering',
  'opening-hours-lettering', 'logo-foil', 'reflective-vinyl',
])

const VEHICLE_SLUGS = new Set([
  'car-graphics', 'car-decals', 'car-lettering',
  'car-magnet', 'car-magnet-schild', 'magnetic-car-sign',
])

const WINDOW_FILM_SLUGS = new Set([
  'window-foil', 'milchglasfolie', 'lochfolie', 'frosted-glass-film',
  'privacy-foil', 'window-graphics', 'perforated-film', 'pvc-folie',
  'backlit-film', 'static-cling-film', 'transparent-adhesive-film',
  'self-adhesive-film',
])

const PERFORATED_FILM_SLUGS = new Set([
  'lochfolie', 'perforated-film',
])

const FROSTED_FILM_SLUGS = new Set([
  'milchglasfolie', 'frosted-glass-film', 'privacy-foil',
])

const DISPLAY_SLUGS = new Set([
  'roll-up', 'rollup-100', 'rollup-85', 'rollup-banner', 'rollup-outdoor',
  'x-banner', 'l-banner', 'kundestopper', 'kundenstopper-outdoor', 'customer-stopper-outdoor',
])

const EMBROIDERY_SLUGS = new Set([
  'embroidery', 'patches', 'woven-patch', 'cap-embroidery', 'logo-embroidery',
])

const SUBLIMATION_SLUGS = new Set([
  'mug', 'sublimation', 'sublimation-mug', 'sublimation-magic-mug',
  'sublimation-bottle', 'sublimation-thermo', 'sublimation-aluminium',
])

const SIGN_SLUGS = new Set([
  'dibond-sign', 'forex-board', 'acrylic-sign', 'pvc-sign',
  'plexiglas-sign', 'warning-sign', 'site-sign',
])

const MAGNET_SLUGS = new Set([
  'car-magnet', 'magnetfolie', 'magnetic-sheet', 'magnetic-car-sign', 'car-magnet-schild',
])

const LARGE_FORMAT_SLUGS = new Set([
  'photo-print-large', 'canvas-print', 'large-format', 'display-print', 'magnetic-board-print',
])

// ---------------------------------------------------------------------------
// Map product slug to FileRule group key
// ---------------------------------------------------------------------------

function getProductGroup(slug: string): string | null {
  if (FLOOR_STICKER_SLUGS.has(slug)) return 'floor-sticker'
  if (STICKER_SLUGS.has(slug)) return 'sticker'
  if (SIGN_SLUGS.has(slug)) return 'sign'
  if (SUBLIMATION_SLUGS.has(slug)) return 'sublimation'
  if (DISPLAY_SLUGS.has(slug)) return 'display'
  if (BANNER_SLUGS.has(slug)) return 'banner'
  if (TEXTILE_SLUGS.has(slug)) return 'textile'
  if (VINYL_VEHICLE_SLUGS.has(slug) || VEHICLE_SLUGS.has(slug) || WINDOW_FILM_SLUGS.has(slug)) return 'vinyl'
  if (LARGE_FORMAT_SLUGS.has(slug)) return 'large-format'
  if (EMBROIDERY_SLUGS.has(slug)) return 'embroidery'
  return null
}

// ---------------------------------------------------------------------------
// DPI thresholds per product group
// ---------------------------------------------------------------------------

interface DpiThreshold {
  critical: number   // below this → print failure / visible pixelation
  minimum: number    // below this → warn strongly
  recommended: number
  label: string
}

function getDpiThreshold(slug: string, rules?: FileRule[]): DpiThreshold | null {
  // Hardcoded defaults
  let thresh: DpiThreshold | null = null

  if (FLOOR_STICKER_SLUGS.has(slug)) {
    thresh = { critical: 150, minimum: 200, recommended: 300, label: 'floor sticker' }
  } else if (STICKER_SLUGS.has(slug)) {
    thresh = { critical: 150, minimum: 200, recommended: 300, label: 'sticker' }
  } else if (SIGN_SLUGS.has(slug)) {
    thresh = { critical: 72, minimum: 150, recommended: 300, label: 'rigid sign' }
  } else if (SUBLIMATION_SLUGS.has(slug)) {
    thresh = { critical: 72, minimum: 150, recommended: 200, label: 'sublimation' }
  } else if (DISPLAY_SLUGS.has(slug)) {
    thresh = { critical: 72, minimum: 100, recommended: 150, label: 'roll-up / display' }
  } else if (BANNER_SLUGS.has(slug)) {
    thresh = { critical: 50, minimum: 100, recommended: 150, label: 'banner' }
  } else if (TEXTILE_SLUGS.has(slug)) {
    thresh = { critical: 72, minimum: 100, recommended: 150, label: 'DTF transfer' }
  } else if (VINYL_VEHICLE_SLUGS.has(slug) || VEHICLE_SLUGS.has(slug) || WINDOW_FILM_SLUGS.has(slug)) {
    thresh = { critical: 72, minimum: 100, recommended: 150, label: 'vinyl / vehicle graphics' }
  } else if (LARGE_FORMAT_SLUGS.has(slug)) {
    thresh = { critical: 72, minimum: 100, recommended: 150, label: 'large format print' }
  }

  // Apply admin rule override if provided
  if (thresh && rules?.length) {
    const group = getProductGroup(slug)
    const rule = group ? rules.find((r) => r.slug === group) : undefined
    if (rule) {
      const min = rule.minDpi
      thresh = {
        ...thresh,
        critical: Math.round(min * 0.6),
        minimum: min,
        recommended: Math.round(min * 1.5),
      }
    }
  }

  return thresh
}

// ---------------------------------------------------------------------------
// Bleed / safe margin by product
// ---------------------------------------------------------------------------

function getBleedSpec(slug: string, rules?: FileRule[]): string | null {
  // Apply admin rule override if provided
  if (rules?.length) {
    const group = getProductGroup(slug)
    const rule = group ? rules.find((r) => r.slug === group) : undefined
    if (rule !== undefined) {
      if (rule.bleedMm <= 0) return null
      const mm = rule.bleedMm
      const display = mm >= 10 ? `${mm / 10}cm` : `${mm}mm`
      return `${display} bleed on all sides`
    }
  }

  // Hardcoded defaults
  if (BANNER_SLUGS.has(slug)) return '3cm bleed on all sides'
  if (DISPLAY_SLUGS.has(slug)) return '3–5cm bleed on all sides (protect all text/logos within safe margin)'
  if (STICKER_SLUGS.has(slug) || FLOOR_STICKER_SLUGS.has(slug)) return '2–3mm bleed + 2mm safe margin inside the cut line'
  if (SIGN_SLUGS.has(slug) || MAGNET_SLUGS.has(slug)) return '3mm bleed on all sides'
  if (LARGE_FORMAT_SLUGS.has(slug)) return '3mm bleed on all sides'
  return null
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export function evaluatePrepress(
  fileInfo: ValidationResult | null,
  match: MatchResult | null,
  message: string,
  rules?: FileRule[]
): PrepressResult {
  const warnings: string[] = []
  const recommendations: string[] = []
  const productionNotes: string[] = []

  const slug = match?.productSlug ?? ''
  const norm = message.toLowerCase()

  // ---- 1. DPI check — product-aware ----
  if (fileInfo && fileInfo.dpi !== null && slug) {
    const dpi = fileInfo.dpi
    const thresh = getDpiThreshold(slug, rules)

    if (thresh) {
      if (dpi < thresh.critical) {
        warnings.push(
          `Critical resolution: ${dpi} DPI is too low for ${thresh.label} — printed result will be visibly blurry. Minimum acceptable is ${thresh.minimum} DPI; ${thresh.recommended} DPI recommended.`
        )
      } else if (dpi < thresh.minimum) {
        warnings.push(
          `Low resolution: ${dpi} DPI for a ${thresh.label}. Minimum is ${thresh.minimum} DPI. Re-export at ${thresh.recommended} DPI at the final print size.`
        )
      } else if (dpi < thresh.recommended) {
        recommendations.push(
          `${dpi} DPI is borderline for ${thresh.label}. ${thresh.recommended} DPI preferred for sharp results at this product type.`
        )
      }
    }
  }

  // ---- 2. Banner scale calculation ----
  if (slug && BANNER_SLUGS.has(slug) && fileInfo && fileInfo.width > 0 && fileInfo.height > 0) {
    const dpi = fileInfo.dpi
    if (dpi && dpi > 0) {
      const widthCm = Math.round((fileInfo.width / dpi) * 2.54)
      const heightCm = Math.round((fileInfo.height / dpi) * 2.54)
      productionNotes.push(
        `At ${dpi} DPI, your ${fileInfo.width}×${fileInfo.height}px file prints at approximately ${widthCm}×${heightCm}cm. Confirm this matches your intended banner size.`
      )
    } else {
      productionNotes.push(
        `Banner file has no DPI metadata. Please verify the intended print dimensions in your design software and ensure resolution is at least 100 DPI at final size.`
      )
    }
  }

  // ---- 3. Bleed / safe margin ----
  if (slug) {
    const bleed = getBleedSpec(slug, rules)
    if (bleed) {
      recommendations.push(
        `Bleed: ${bleed}. Extend background and edge elements to the bleed line; keep text and logos within the safe margin.`
      )
    }
  }

  // ---- 4. Double-sided artwork ----
  if (slug && DOUBLE_SIDED_SLUGS.has(slug)) {
    productionNotes.push(
      'Double-sided product: supply two separate artwork files — front and back. The back artwork must be mirrored horizontally (flip on vertical axis) to read correctly from both sides.'
    )
  }

  // ---- 5. Transparent background — textile ----
  if (slug && TEXTILE_SLUGS.has(slug)) {
    if (fileInfo?.format === 'jpeg') {
      warnings.push(
        'JPEG files do not support transparency. For DTF and flex/flock transfers, supply PNG with a transparent background — a white JPEG background will print as a white block on the garment.'
      )
    } else {
      productionNotes.push(
        'Transparent background required: for DTF and flex/flock transfers, remove the background in your artwork so only the print area transfers. White areas in the design will print as white. Supply PNG (transparent) or PDF with clipping path.'
      )
    }
  }

  // ---- 6. Sticker contour cut ----
  if (slug && (STICKER_SLUGS.has(slug) || FLOOR_STICKER_SLUGS.has(slug))) {
    productionNotes.push(
      'Contour cut: include a separate cut/die-cut path layer (named "CutContour" or "Dieline", spot colour) in your file. Without this, stickers default to rectangular cut.'
    )
    if (fileInfo?.format === 'jpeg') {
      warnings.push(
        'JPEG format: no transparency support. Stickers with complex shapes or white backgrounds require PNG or vector PDF for clean cut edges.'
      )
    }
  }

  // ---- 7. Color mode advisory ----
  if (slug) {
    if (SUBLIMATION_SLUGS.has(slug)) {
      recommendations.push(
        'Color mode: keep artwork in RGB for sublimation. Do NOT convert to CMYK — sublimation inks require RGB data; CMYK conversion will shift colours.'
      )
    } else if (!TEXTILE_SLUGS.has(slug)) {
      // All other print products prefer CMYK
      if (fileInfo?.format && ['jpeg', 'png', 'webp', 'gif'].includes(fileInfo.format)) {
        recommendations.push(
          'Color mode: raster files (PNG/JPEG) are typically RGB. For accurate print colour, convert to CMYK in Photoshop/Illustrator before final export, or supply a PDF with embedded ICC profile (ISO Coated v2 300%).'
        )
      }
    }
  }

  // ---- 8. Floor sticker lamination ----
  if (slug && FLOOR_STICKER_SLUGS.has(slug)) {
    productionNotes.push(
      'Anti-slip lamination is mandatory for floor stickers (safety compliance). Specify indoor (smooth surface) or outdoor (anti-slip rough surface) when ordering.'
    )
  }

  // ---- 9. Sticker lamination (indoor vs outdoor) ----
  if (slug && STICKER_SLUGS.has(slug)) {
    const outdoorKeywords = ['outdoor', 'outside', 'weather', 'uv', 'sun', 'rain', 'car', 'vehicle', 'window', 'bumper', 'exterior', 'waterproof']
    if (outdoorKeywords.some((kw) => norm.includes(kw))) {
      recommendations.push(
        'Outdoor stickers: UV-resistant gloss or matte laminate recommended. For vehicle/window applications, specify the substrate when ordering for correct adhesive selection.'
      )
    } else {
      recommendations.push(
        'Lamination: gloss for vivid colours, matte for a premium tactile finish. Choose when ordering.'
      )
    }
  }

  // ---- 10. Vehicle graphics material ----
  if (slug && (VEHICLE_SLUGS.has(slug) || VINYL_VEHICLE_SLUGS.has(slug))) {
    recommendations.push(
      'Material: cast vinyl (not calendered) required for curved surfaces, door handles, and long-term use (5–7 year outdoor life). Gloss or matte overlaminate adds UV and scratch resistance.'
    )
  }

  // ---- 11. Long-term outdoor banner ----
  if (slug && BANNER_SLUGS.has(slug) && !MESH_SLUGS.has(slug)) {
    const longTermKeywords = ['long term', 'permanent', 'years', 'outdoor', 'outside', 'weather', 'scaffolding']
    if (longTermKeywords.some((kw) => norm.includes(kw))) {
      recommendations.push(
        'Long-term outdoor: 510g/m² PVC with UV inks and rope hem recommended. For short-term or indoor use, 380g/m² PVC is sufficient.'
      )
    }
  }

  // ---- 12. Mesh banner details ----
  if (slug && MESH_SLUGS.has(slug)) {
    productionNotes.push(
      'Mesh banner: avoid fine detail and thin lines — the mesh weave (50% open) reduces sharpness. Minimum font size at final print size should be 8–10cm for legibility. Ideal for fences, scaffolding, and wind-exposed locations.'
    )
  }

  // ---- 13. Window film specifics ----
  if (slug && PERFORATED_FILM_SLUGS.has(slug)) {
    productionNotes.push(
      'Perforated / lochfolie: approximately 50% open area — vivid from outside, see-through from inside. Ensure text is large enough to read at intended viewing distance; fine detail is lost through perforations.'
    )
  }
  if (slug && FROSTED_FILM_SLUGS.has(slug)) {
    productionNotes.push(
      'Frosted / milchglas film: light-diffusing privacy film. Solid opaque artwork will appear opaque; transparent areas will show the frosted texture. Supply artwork with clean solid fills for best result.'
    )
  }

  // ---- 14. Embroidery constraints ----
  if (slug && EMBROIDERY_SLUGS.has(slug)) {
    productionNotes.push(
      'Embroidery: maximum practical stitch area ~30×30cm. Fine details, thin lines, and gradients cannot be reproduced in embroidery — simplify the artwork. Supply vector (AI/EPS/PDF) or 300 DPI PNG.'
    )
    if (fileInfo?.dpi !== null && fileInfo?.dpi !== undefined && fileInfo.dpi < 300) {
      warnings.push(
        `${fileInfo.dpi} DPI may be insufficient for accurate embroidery digitising. Supply 300 DPI or vector artwork for best stitch accuracy.`
      )
    }
  }

  // ---- 15. Small file size warning ----
  if (fileInfo && fileInfo.sizeMB < 0.1 && fileInfo.format !== 'pdf') {
    warnings.push(
      `File is very small (${fileInfo.sizeMB} MB) — this appears to be a web-compressed or thumbnail version. Request the full-resolution original file from your designer.`
    )
  }

  // ---- 16. Vector artwork advice (message-driven) ----
  if (
    !slug ||
    STICKER_SLUGS.has(slug) ||
    VINYL_VEHICLE_SLUGS.has(slug) ||
    VEHICLE_SLUGS.has(slug) ||
    SIGN_SLUGS.has(slug)
  ) {
    const vectorKeywords = ['logo', 'icon', 'vector', 'eps', 'ai file', 'illustrator', 'svg', 'simple shape', 'single colour']
    if (vectorKeywords.some((kw) => norm.includes(kw))) {
      recommendations.push(
        'Vector artwork (AI, EPS, PDF with outlines) is strongly preferred for logos and cut shapes — it scales to any size without quality loss and ensures clean cut paths for stickers and vinyl.'
      )
    }
  }

  return { warnings, recommendations, productionNotes }
}

// ---------------------------------------------------------------------------
// Format for injection into AI system prompt
// ---------------------------------------------------------------------------

export function buildPrepressSection(prepress: PrepressResult): string {
  const hasContent =
    prepress.warnings.length > 0 ||
    prepress.recommendations.length > 0 ||
    prepress.productionNotes.length > 0

  if (!hasContent) return ''

  const lines: string[] = ['\n\n## Prepress analysis for this request']

  if (prepress.warnings.length > 0) {
    lines.push('**Warnings (must address):**')
    prepress.warnings.forEach((w) => lines.push(`- ⚠ ${w}`))
  }

  if (prepress.recommendations.length > 0) {
    lines.push('**Recommendations:**')
    prepress.recommendations.forEach((r) => lines.push(`- ${r}`))
  }

  if (prepress.productionNotes.length > 0) {
    lines.push('**Production notes:**')
    prepress.productionNotes.forEach((n) => lines.push(`- ${n}`))
  }

  lines.push(
    '\nInclude the relevant warnings and recommendations in your response — explain them clearly to the customer in plain language.'
  )

  return lines.join('\n')
}
