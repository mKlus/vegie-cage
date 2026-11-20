import type { CageInputs, PurlinMaterial, PurlinSet } from './model'

/** Ridge pipe past each end hoop. One continuous length, cut from the hoop coil. */
export const RIDGE_PAST_END_M = 0.15

/** Soft 2.5 mm tie wire for one figure-eight, including the twist. */
export const TIE_PER_CROSSING_M = 0.5

/** Purlin wire beyond the end hoop, each end, to the brace or ground anchor. */
export const PURLIN_TAIL_M = 2

export const GUY_COUNT = 4
export const GUY_EACH_M = 4

export const TIE_WIRE_STOCK_M = 30
export const HOG_SPACING_M = 0.2
export const STAPLE_SPACING_M = 0.15

export function ridgeLengthM(length: number): number {
  return length + 2 * RIDGE_PAST_END_M
}

/** One purlin wire: the run, plus a tail at each end. */
export function purlinRunM(length: number): number {
  return length + 2 * PURLIN_TAIL_M
}

export function lineWireCount(sleeperBase: boolean): number {
  return sleeperBase ? 2 : 3
}

/** Ridge, plus both side purlins when they are on. */
export function tieCrossingCount(hoopCount: number, purlins: PurlinSet): number {
  return hoopCount * (purlins === 3 ? 3 : 1)
}

/**
 * Saddle clips only replace a tie where two pipes cross.
 * Wire purlins stay on tie wire.
 */
export function saddleClipCount(hoopCount: number, purlins: PurlinSet, material: PurlinMaterial): number {
  if (purlins === 3 && material === 'pipe') return hoopCount * 3
  return hoopCount
}

export function pipeTakeoff(
  input: Pick<CageInputs, 'length' | 'purlins' | 'purlinMaterial'>,
  hoopCount: number,
  pipeEachM: number,
): { hoopM: number; ridgeM: number; purlinPipeM: number; totalM: number } {
  const hoopM = hoopCount * pipeEachM
  const ridgeM = ridgeLengthM(input.length)
  const purlinPipeM = input.purlins === 3 && input.purlinMaterial === 'pipe' ? 2 * input.length : 0
  return { hoopM, ridgeM, purlinPipeM, totalM: hoopM + ridgeM + purlinPipeM }
}

export function wireTakeoff(
  input: Pick<CageInputs, 'length' | 'purlins' | 'purlinMaterial' | 'sleeperBase'>,
  hoopCount: number,
  meshRunM: number,
): {
  lineCount: number
  lineM: number
  purlinEach: number
  purlinWireM: number
  guyM: number
  fencingM: number
  tieCount: number
  tieM: number
} {
  const lineCount = lineWireCount(input.sleeperBase)
  const lineM = lineCount * meshRunM * 1.05
  const purlinEach = purlinRunM(input.length)
  const purlinWireM = input.purlins === 3 && input.purlinMaterial === 'wire' ? 2 * purlinEach : 0
  const guyM = GUY_COUNT * GUY_EACH_M
  const tieCount = tieCrossingCount(hoopCount, input.purlins)
  const tieM = tieCount * TIE_PER_CROSSING_M
  return {
    lineCount,
    lineM,
    purlinEach,
    purlinWireM,
    guyM,
    fencingM: lineM + purlinWireM + guyM,
    tieCount,
    tieM,
  }
}
