/**
 * Print Assist — Phase 1: intelligent rule-based print quality analysis.
 *
 * Structured so a real AI model (Claude / GPT-4o Vision) can be plugged
 * in as a drop-in replacement in Phase 2 without changing callers.
 *
 * All functions are pure (no DB access). Callers are responsible for
 * fetching product data and storing the result.
 */

// ── Types ──────────────────────────────────────────────────────────────────

export type Severity = 'ok' | 'warning' | 'critical'

export interface PrintCheck {
  status: Severity
  label: string
  message: string
}

export interface PrintCheckResult {
  resolution: PrintCheck
  safeArea: PrintCheck
  bleed: PrintCheck
  sizeMatch: PrintCheck
  /** Worst severity across all checks */
  overall: Severity
  /** One-line human-readable summary */
  summary: string
  analyzedAt: string
}

// ── Internal helpers ───────────────────────────────────────────────────────

const DPI_CRITICAL = 72
const DPI_WARNING  = 150

function worstSeverity(...sev: Severity[]): Severity {
  if (sev.includes('critical')) return 'critical'
  if (sev.includes('warning'))  return 'warning'
  return 'ok'
}

function buildSummary(checks: Omit<PrintCheckResult, 'overall' | 'summary' | 'analyzedAt'>): string {
  const issues = [checks.resolution, checks.safeArea, checks.bleed, checks.sizeMatch]
    .filter((c) => c.status !== 'ok')
  if (issues.length === 0) return 'All checks passed. Ready for production.'
  const critical = issues.filter((c) => c.status === 'critical')
  if (critical.length > 0) {
    return `${critical.length} critical issue${critical.length > 1 ? 's' : ''} found — review before printing.`
  }
  return `${issues.length} warning${issues.length > 1 ? 's' : ''} found — review recommended.`
}

function checkDpi(
  dpi: number | null,
  minDpi: number | null,
  recommendedDpi: number | null,
): PrintCheck {
  const req = minDpi ?? DPI_WARNING
  const rec = recommendedDpi ?? Math.max(req, 200)

  if (dpi === null) {
    return { status: 'warning', label: 'Resolution', message: 'Resolution could not be determined.' }
  }
  if (dpi >= rec) {
    return { status: 'ok', label: 'Resolution', message: `${dpi} DPI — excellent quality.` }
  }
  if (dpi >= req) {
    return { status: 'ok', label: 'Resolution', message: `${dpi} DPI — acceptable quality.` }
  }
  if (dpi >= DPI_CRITICAL) {
    return {
      status: 'warning', label: 'Resolution',
      message: `${dpi} DPI — below recommended ${req} DPI. Print may appear blurry.`,
    }
  }
  return {
    status: 'critical', label: 'Resolution',
    message: `${dpi} DPI — too low. Minimum ${req} DPI required for quality printing.`,
  }
}

// ── Upload analysis ────────────────────────────────────────────────────────

export interface AnalyzeUploadParams {
  widthPx:        number | null
  heightPx:       number | null
  dpi:            number | null
  productWidthCm:  number
  productHeightCm: number
  bleedMm?:       number | null
  safeMarginMm?:  number | null
  minDpi?:        number | null
  recommendedDpi?: number | null
}

export function analyzeUpload(params: AnalyzeUploadParams): PrintCheckResult {
  const { widthPx, heightPx, dpi, productWidthCm, productHeightCm,
          bleedMm, minDpi, recommendedDpi } = params

  // Resolution
  const resolution = checkDpi(dpi, minDpi ?? null, recommendedDpi ?? null)

  // Bleed — only for raster files where we know DPI and dimensions
  let bleed: PrintCheck
  if (!bleedMm || bleedMm <= 0 || !widthPx || !heightPx || !dpi) {
    bleed = { status: 'ok', label: 'Bleed', message: 'No bleed required for this product.' }
  } else {
    const expectedW = (productWidthCm  + 2 * bleedMm / 10) * dpi / 2.54
    const expectedH = (productHeightCm + 2 * bleedMm / 10) * dpi / 2.54
    const hasW = widthPx  >= expectedW * 0.95
    const hasH = heightPx >= expectedH * 0.95
    if (hasW && hasH) {
      bleed = { status: 'ok', label: 'Bleed', message: `Bleed area detected (${bleedMm}mm).` }
    } else {
      bleed = {
        status: 'warning', label: 'Bleed',
        message: `File may be missing bleed. Expected ~${Math.round(expectedW)}×${Math.round(expectedH)}px including ${bleedMm}mm bleed.`,
      }
    }
  }

  // Size match — aspect ratio comparison
  let sizeMatch: PrintCheck
  if (!widthPx || !heightPx || productWidthCm <= 0) {
    sizeMatch = { status: 'ok', label: 'Size', message: 'Dimensions not available.' }
  } else {
    const fileRatio  = widthPx  / heightPx
    const printRatio = productWidthCm / productHeightCm
    const diff       = Math.abs(fileRatio - printRatio) / printRatio
    if (diff <= 0.05) {
      sizeMatch = { status: 'ok', label: 'Size', message: 'Dimensions match print size.' }
    } else {
      const portrait = (w: number, h: number) => w < h
      const msg = portrait(widthPx, heightPx) !== portrait(productWidthCm, productHeightCm)
        ? `Orientation mismatch: file is ${portrait(widthPx, heightPx) ? 'portrait' : 'landscape'}, print size is ${portrait(productWidthCm, productHeightCm) ? 'portrait' : 'landscape'}.`
        : `Proportions differ (${widthPx}×${heightPx}px vs ${productWidthCm}×${productHeightCm}cm) — image may be stretched.`
      sizeMatch = { status: 'warning', label: 'Size', message: msg }
    }
  }

  // Safe area — cannot check image content of an uploaded file
  const safeArea: PrintCheck = {
    status: 'ok', label: 'Safe area',
    message: 'Safe area is checked at the design stage, not from file dimensions.',
  }

  const partial = { resolution, safeArea, bleed, sizeMatch }
  const overall = worstSeverity(resolution.status, bleed.status, sizeMatch.status)
  return { ...partial, overall, summary: buildSummary(partial), analyzedAt: new Date().toISOString() }
}

// ── Design analysis (Fabric.js canvas JSON) ────────────────────────────────

interface FabricObject {
  type?:    string
  left?:    number
  top?:     number
  width?:   number
  height?:  number
  scaleX?:  number
  scaleY?:  number
  src?:     string
  [key: string]: unknown
}

interface FabricCanvas {
  objects?:         FabricObject[]
  background?:      string
  backgroundColor?: string
}

export interface AnalyzeDesignParams {
  canvasData:       FabricCanvas
  canvasWidthPx:    number
  canvasHeightPx:   number
  productWidthCm:   number
  productHeightCm:  number
  bleedMm?:         number | null
  safeMarginMm?:    number | null
  minDpi?:          number | null
  recommendedDpi?:  number | null
}

export function analyzeDesign(params: AnalyzeDesignParams): PrintCheckResult {
  const { canvasData, canvasWidthPx, canvasHeightPx,
          productWidthCm, productHeightCm,
          bleedMm, safeMarginMm, minDpi, recommendedDpi } = params

  const objects = canvasData.objects ?? []

  // ── Resolution ──────────────────────────────────────────────────────────
  let resolution: PrintCheck
  if (canvasWidthPx > 0 && productWidthCm > 0) {
    // Base canvas DPI
    const canvasDpi = Math.round(canvasWidthPx * 2.54 / productWidthCm)

    // Check the lowest DPI among embedded raster Image objects
    let minAssetDpi = Infinity
    for (const obj of objects) {
      const type = obj.type?.toLowerCase() ?? ''
      if (type !== 'image') continue
      const naturalW    = obj.width  ?? 0
      const scaleX      = obj.scaleX ?? 1
      const renderedPx  = naturalW * scaleX
      if (renderedPx <= 0) continue
      const renderedCm  = renderedPx * productWidthCm / canvasWidthPx
      if (renderedCm <= 0) continue
      const assetDpi = Math.round(naturalW * 2.54 / renderedCm)
      minAssetDpi = Math.min(minAssetDpi, assetDpi)
    }

    const effectiveDpi = minAssetDpi < Infinity
      ? Math.min(canvasDpi, minAssetDpi)
      : canvasDpi

    resolution = checkDpi(effectiveDpi, minDpi ?? null, recommendedDpi ?? null)
  } else {
    resolution = { status: 'ok', label: 'Resolution', message: 'Canvas dimensions not set — skipping DPI check.' }
  }

  // ── Safe area ────────────────────────────────────────────────────────────
  let safeArea: PrintCheck
  if (safeMarginMm && safeMarginMm > 0 && canvasWidthPx > 0 && productWidthCm > 0) {
    // Margin in canvas pixels
    const mxPx = (safeMarginMm / 10) * (canvasWidthPx  / productWidthCm)
    const myPx = (safeMarginMm / 10) * (canvasHeightPx / productHeightCm)

    let violationCount = 0
    for (const obj of objects) {
      if (!obj.type) continue
      const w = (obj.width  ?? 0) * (obj.scaleX ?? 1)
      const h = (obj.height ?? 0) * (obj.scaleY ?? 1)
      // Skip elements that cover ≥90% of canvas — these are backgrounds
      if (w >= canvasWidthPx * 0.9 && h >= canvasHeightPx * 0.9) continue
      const left = obj.left ?? 0
      const top  = obj.top  ?? 0
      if (left < mxPx || top < myPx ||
          left + w > canvasWidthPx - mxPx ||
          top  + h > canvasHeightPx - myPx) {
        violationCount++
      }
    }

    safeArea = violationCount === 0
      ? { status: 'ok',      label: 'Safe area', message: `All content within ${safeMarginMm}mm safe margin.` }
      : { status: 'warning', label: 'Safe area',
          message: `${violationCount} element${violationCount > 1 ? 's' : ''} too close to the edge. Move content at least ${safeMarginMm}mm inward.` }
  } else {
    safeArea = { status: 'ok', label: 'Safe area', message: 'Safe area check not applicable for this product.' }
  }

  // ── Bleed ────────────────────────────────────────────────────────────────
  let bleed: PrintCheck
  if (!bleedMm || bleedMm <= 0) {
    bleed = { status: 'ok', label: 'Bleed', message: 'No bleed required for this product.' }
  } else {
    // A background element covers full canvas if its dimensions are ≥90% of canvas
    const hasBackground =
      !!(canvasData.background || canvasData.backgroundColor) ||
      objects.some((obj) => {
        const w = (obj.width  ?? 0) * (obj.scaleX ?? 1)
        const h = (obj.height ?? 0) * (obj.scaleY ?? 1)
        return w >= canvasWidthPx * 0.9 && h >= canvasHeightPx * 0.9
      })

    bleed = hasBackground
      ? { status: 'ok',      label: 'Bleed', message: `Background extends to canvas edges — bleed looks good.` }
      : { status: 'warning', label: 'Bleed',
          message: `No background detected. White edges may appear after trimming. Add a background colour or image.` }
  }

  // ── Size match ───────────────────────────────────────────────────────────
  let sizeMatch: PrintCheck
  if (canvasWidthPx > 0 && productWidthCm > 0) {
    const canvasRatio  = canvasWidthPx  / canvasHeightPx
    const productRatio = productWidthCm / productHeightCm
    const diff         = Math.abs(canvasRatio - productRatio) / productRatio
    sizeMatch = diff <= 0.02
      ? { status: 'ok',      label: 'Size', message: 'Canvas proportions match print dimensions.' }
      : { status: 'warning', label: 'Size',
          message: `Canvas proportions differ from product (${productWidthCm}×${productHeightCm}cm). Design may appear stretched.` }
  } else {
    sizeMatch = { status: 'ok', label: 'Size', message: 'Size check skipped — product dimensions not set.' }
  }

  const partial = { resolution, safeArea, bleed, sizeMatch }
  const overall = worstSeverity(resolution.status, safeArea.status, bleed.status, sizeMatch.status)
  return { ...partial, overall, summary: buildSummary(partial), analyzedAt: new Date().toISOString() }
}

// ── Utility ────────────────────────────────────────────────────────────────

/** Returns only failing checks (warning or critical). */
export function getPrintWarnings(result: PrintCheckResult): PrintCheck[] {
  return [result.resolution, result.safeArea, result.bleed, result.sizeMatch]
    .filter((c) => c.status !== 'ok')
}

// ── Preflight score ─────────────────────────────────────────────────────────

export interface PreflightScore {
  score: number   // 0–100
  label: 'Good' | 'Warning' | 'Risky'
}

/**
 * Converts a PrintCheckResult to a 0–100 score.
 * Weights: Resolution 35%, Safe area 25%, Bleed 25%, Size 15%.
 * ≥80 = Good, 50–79 = Warning, <50 = Risky.
 */
export function calculateScore(result: PrintCheckResult): PreflightScore {
  const score =
    (result.resolution.status === 'ok' ? 35 : result.resolution.status === 'warning' ? 17 : 0) +
    (result.safeArea.status   === 'ok' ? 25 : result.safeArea.status   === 'warning' ? 12 : 0) +
    (result.bleed.status      === 'ok' ? 25 : result.bleed.status      === 'warning' ? 12 : 0) +
    (result.sizeMatch.status  === 'ok' ? 15 : result.sizeMatch.status  === 'warning' ?  7 : 0)
  const label = score >= 80 ? 'Good' : score >= 50 ? 'Warning' : 'Risky'
  return { score, label }
}
