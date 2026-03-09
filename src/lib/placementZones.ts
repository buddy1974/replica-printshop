// Step 344 — Placement zone definitions per product type
// All coordinates are relative to the canvas (0–1 scale)

export interface PlacementZone {
  id: string
  label: string
  x: number // left edge (0–1)
  y: number // top edge (0–1)
  w: number // width (0–1)
  h: number // height (0–1)
}

const textile: PlacementZone[] = [
  { id: 'front-center', label: 'Front Center', x: 0.3, y: 0.18, w: 0.4, h: 0.32 },
  { id: 'front-chest', label: 'Front Chest Left', x: 0.52, y: 0.17, w: 0.18, h: 0.14 },
  { id: 'back-full', label: 'Back Full', x: 0.1, y: 0.12, w: 0.8, h: 0.48 },
  { id: 'sleeve', label: 'Sleeve', x: 0.02, y: 0.18, w: 0.18, h: 0.18 },
]

const banner: PlacementZone[] = [
  { id: 'full', label: 'Full Print', x: 0.02, y: 0.02, w: 0.96, h: 0.96 },
  { id: 'center', label: 'Center', x: 0.2, y: 0.15, w: 0.6, h: 0.7 },
  { id: 'left', label: 'Left Panel', x: 0.05, y: 0.1, w: 0.4, h: 0.8 },
  { id: 'right', label: 'Right Panel', x: 0.55, y: 0.1, w: 0.4, h: 0.8 },
]

const sublimation: PlacementZone[] = [
  { id: 'full', label: 'Full Print', x: 0.02, y: 0.02, w: 0.96, h: 0.96 },
  { id: 'front', label: 'Front Panel', x: 0.1, y: 0.08, w: 0.8, h: 0.5 },
  { id: 'center', label: 'Center Logo', x: 0.3, y: 0.2, w: 0.4, h: 0.3 },
]

const dtf: PlacementZone[] = [
  { id: 'full', label: 'Full Sheet', x: 0.02, y: 0.02, w: 0.96, h: 0.96 },
  { id: 'half-top', label: 'Top Half', x: 0.02, y: 0.02, w: 0.96, h: 0.47 },
  { id: 'half-bottom', label: 'Bottom Half', x: 0.02, y: 0.51, w: 0.96, h: 0.47 },
  { id: 'quarter', label: 'Quarter', x: 0.25, y: 0.25, w: 0.5, h: 0.5 },
]

const vinyl: PlacementZone[] = [
  { id: 'full', label: 'Full Area', x: 0.02, y: 0.02, w: 0.96, h: 0.96 },
  { id: 'center', label: 'Center', x: 0.15, y: 0.15, w: 0.7, h: 0.7 },
]

export const placementZonesByType: Record<string, PlacementZone[]> = {
  TEXTILE: textile,
  BANNER: banner,
  SUBLIMATION: sublimation,
  DTF: dtf,
  VINYL: vinyl,
  ROLL: banner,
  CUT: vinyl,
}

export function getZones(productType: string): PlacementZone[] {
  return placementZonesByType[productType.toUpperCase()] ?? banner
}
