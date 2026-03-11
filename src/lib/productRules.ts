export interface ProductConfigRules {
  maxWidthCm?: number | null
  maxHeightCm?: number | null
  dtfMaxWidthCm?: number | null
  rollWidthCm?: number | null
  printAreaWidthCm?: number | null
  printAreaHeightCm?: number | null
}

export type ValidationOk = { ok: true }
export type ValidationFail = { ok: false; message: string }
export type RuleResult = ValidationOk | ValidationFail

export function validateProductSize(
  config: ProductConfigRules,
  width: number,
  height: number,
): RuleResult {
  if (config.maxWidthCm && width > Number(config.maxWidthCm)) {
    return { ok: false, message: `Width ${width} cm exceeds maximum of ${config.maxWidthCm} cm` }
  }
  if (config.maxHeightCm && height > Number(config.maxHeightCm)) {
    return { ok: false, message: `Height ${height} cm exceeds maximum of ${config.maxHeightCm} cm` }
  }
  if (config.dtfMaxWidthCm && width > Number(config.dtfMaxWidthCm)) {
    return { ok: false, message: `Width ${width} cm exceeds DTF maximum of ${config.dtfMaxWidthCm} cm` }
  }
  if (config.rollWidthCm && Math.min(width, height) > Number(config.rollWidthCm)) {
    return { ok: false, message: `Smallest side ${Math.min(width, height)} cm exceeds roll width of ${config.rollWidthCm} cm` }
  }
  if (config.printAreaWidthCm && width > Number(config.printAreaWidthCm)) {
    return { ok: false, message: `Width ${width} cm exceeds print area width of ${config.printAreaWidthCm} cm` }
  }
  if (config.printAreaHeightCm && height > Number(config.printAreaHeightCm)) {
    return { ok: false, message: `Height ${height} cm exceeds print area height of ${config.printAreaHeightCm} cm` }
  }
  return { ok: true }
}
