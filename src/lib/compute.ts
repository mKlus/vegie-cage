import { buildBom, type BomResult } from './bom'
import { buildGuide, type Step } from './guide'
import { warnings, type CageGeometry, type Warning } from './geometry'
import { sanitise, type CageInputs } from './model'

export type { Step }

export type CageResult = {
  geometry: CageGeometry
  warnings: Warning[]
  bom: BomResult
  guide: Step[]
}

/** Pure cut-list and build guide. Accepts a partial input and fills the Marek 5×10 defaults. */
export function computeCage(raw: Partial<CageInputs> = {}): CageResult {
  const inputs = sanitise(raw)
  const bom = buildBom(inputs)
  return {
    geometry: bom.geo,
    warnings: warnings(inputs, bom.geo),
    bom,
    guide: buildGuide(inputs, bom.geo),
  }
}
