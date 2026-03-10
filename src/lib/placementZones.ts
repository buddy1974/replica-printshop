// Steps 344, 361–365 — Placement zone definitions per product type
// All coordinates are relative to the canvas (0–1 scale)

export interface PlacementZone {
  id: string
  label: string
  x: number // left edge (0–1)
  y: number // top edge (0–1)
  w: number // width (0–1)
  h: number // height (0–1)
}

// ---------------------------------------------------------------------------
// Step 362 — Textile (t-shirt, hoodie, polo)
// Based on standard front-view garment mockup proportions
// ---------------------------------------------------------------------------

const textile: PlacementZone[] = [
  { id: 'front_center', label: 'Front Center',  x: 0.26, y: 0.22, w: 0.48, h: 0.40 },
  { id: 'left_chest',   label: 'Left Chest',    x: 0.53, y: 0.18, w: 0.17, h: 0.15 },
  { id: 'right_chest',  label: 'Right Chest',   x: 0.30, y: 0.18, w: 0.17, h: 0.15 },
  { id: 'back_full',    label: 'Back Full',      x: 0.22, y: 0.16, w: 0.56, h: 0.50 },
  { id: 'sleeve_left',  label: 'Sleeve Left',   x: 0.03, y: 0.22, w: 0.16, h: 0.26 },
  { id: 'sleeve_right', label: 'Sleeve Right',  x: 0.81, y: 0.22, w: 0.16, h: 0.26 },
]

// ---------------------------------------------------------------------------
// Step 363 — Banner / large-format / roll print
// ---------------------------------------------------------------------------

const banner: PlacementZone[] = [
  { id: 'full',        label: 'Full Print',   x: 0.02, y: 0.02, w: 0.96, h: 0.96 },
  { id: 'center',      label: 'Center',       x: 0.20, y: 0.15, w: 0.60, h: 0.70 },
  { id: 'left_panel',  label: 'Left Panel',   x: 0.04, y: 0.08, w: 0.42, h: 0.84 },
  { id: 'right_panel', label: 'Right Panel',  x: 0.54, y: 0.08, w: 0.42, h: 0.84 },
]

// ---------------------------------------------------------------------------
// Step 365 — DTF heat-transfer sheets
// Zone names reflect sheet regions; actual sheet size (A4/A3/55x100) is
// controlled by product config — the canvas always shows at 1:1 scale
// ---------------------------------------------------------------------------

const dtf: PlacementZone[] = [
  { id: 'full_sheet',  label: 'Full Sheet',   x: 0.02, y: 0.02, w: 0.96, h: 0.96 },
  { id: 'top_half',    label: 'Top Half',     x: 0.02, y: 0.02, w: 0.96, h: 0.47 },
  { id: 'bottom_half', label: 'Bottom Half',  x: 0.02, y: 0.51, w: 0.96, h: 0.47 },
  { id: 'top_left',    label: 'Top Left',     x: 0.02, y: 0.02, w: 0.47, h: 0.47 },
  { id: 'top_right',   label: 'Top Right',    x: 0.51, y: 0.02, w: 0.47, h: 0.47 },
]

// ---------------------------------------------------------------------------
// Step 364 — Sublimation — generic (bag, cap, polo)
// ---------------------------------------------------------------------------

const sublimation: PlacementZone[] = [
  { id: 'full',        label: 'Full Print',   x: 0.02, y: 0.02, w: 0.96, h: 0.96 },
  { id: 'front_panel', label: 'Front Panel',  x: 0.10, y: 0.08, w: 0.80, h: 0.60 },
  { id: 'center_logo', label: 'Center Logo',  x: 0.30, y: 0.20, w: 0.40, h: 0.35 },
]

// Step 364 — Sublimation mug — cylindrical wrap area
const sublimationMug: PlacementZone[] = [
  { id: 'wrap_full',   label: 'Full Wrap',    x: 0.08, y: 0.18, w: 0.84, h: 0.58 },
  { id: 'front_panel', label: 'Front Panel',  x: 0.22, y: 0.24, w: 0.56, h: 0.48 },
]

// Step 364 — Sublimation bottle — vertical center label area
const sublimationBottle: PlacementZone[] = [
  { id: 'center_wrap', label: 'Center Wrap',  x: 0.22, y: 0.12, w: 0.56, h: 0.76 },
  { id: 'label_area',  label: 'Label Area',   x: 0.28, y: 0.26, w: 0.44, h: 0.44 },
]

// ---------------------------------------------------------------------------
// Vinyl / foil / cut film
// ---------------------------------------------------------------------------

const vinyl: PlacementZone[] = [
  { id: 'full',   label: 'Full Area', x: 0.02, y: 0.02, w: 0.96, h: 0.96 },
  { id: 'center', label: 'Center',    x: 0.15, y: 0.15, w: 0.70, h: 0.70 },
]

// ---------------------------------------------------------------------------
// Public lookup maps
// ---------------------------------------------------------------------------

export const placementZonesByType: Record<string, PlacementZone[]> = {
  TEXTILE:     textile,
  BANNER:      banner,
  SUBLIMATION: sublimation,
  DTF:         dtf,
  VINYL:       vinyl,
  FOIL:        vinyl,
  ROLL:        banner,
  CUT:         vinyl,
}

/** Step 344 — Get zones by ProductConfig.type */
export function getZones(productType: string): PlacementZone[] {
  return placementZonesByType[productType.toUpperCase()] ?? banner
}

/**
 * Step 366 — Get zones by ProductCategory.slug or product.category string.
 * Matches slug substrings (case-insensitive).
 * Falls back to getZones(configType) when no slug pattern matches.
 */
export function getZonesByCategorySlug(
  slug: string,
  configType?: string,
): PlacementZone[] {
  const s = slug.toLowerCase()

  // Sublimation sub-types
  if (s.includes('mug') || s.includes('tasse') || s.includes('becher'))
    return sublimationMug
  if (s.includes('bottle') || s.includes('flasche') || s.includes('thermo'))
    return sublimationBottle
  if (s.includes('sublim'))
    return sublimation

  // DTF heat transfer
  if (s.includes('dtf') || s.includes('heat-transfer'))
    return dtf

  // Textile / garments
  if (
    s.includes('textil') ||
    s.includes('shirt') ||
    s.includes('hoodie') ||
    s.includes('polo') ||
    s.includes('garment') ||
    s.includes('bekleidung')
  )
    return textile

  // Vinyl / foil / cut
  if (
    s.includes('vinyl') ||
    s.includes('folie') ||
    s.includes('foil') ||
    s.includes('plott') ||
    s.includes('cut')
  )
    return vinyl

  // Banner / large format
  if (
    s.includes('banner') ||
    s.includes('roll') ||
    s.includes('plane') ||
    s.includes('mesh')
  )
    return banner

  // Fallback: use config type or banner
  return configType ? getZones(configType) : banner
}
