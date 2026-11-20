import { buildBom, type BomResult } from './bom'
import { warnings, type CageGeometry, type Warning } from './geometry'
import { sanitise, type CageInputs } from './model'

export type CageResult = {
  geometry: CageGeometry
  warnings: Warning[]
  bom: BomResult
}

/** Pure cut-list. Accepts a partial input and fills the Marek 5×10 defaults. */
export function computeCage(raw: Partial<CageInputs> = {}): CageResult {
  const inputs = sanitise(raw)
  const bom = buildBom(inputs)
  return {
    geometry: bom.geo,
    warnings: warnings(inputs, bom.geo),
    bom,
  }
}
