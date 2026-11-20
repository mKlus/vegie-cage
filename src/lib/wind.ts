import type { PostType } from './model'

/**
 * Rough gust check. Not an engineering design.
 *
 * Drag on one bay is dynamic pressure × Cd × net solidity × spacing × an
 * effective height (the wire wall plus half the roof rise). That load is
 * taken to land at the picket head. Embed capacity is Rankine passive soil
 * on a short rigid picket, resultant at two-thirds of the embedment, moment
 * about the ground surface. Guys, the sleeper, and arch thrust-sharing are
 * not in the capacity.
 */

export const WIND_RHO = 1.2
export const WIND_CD = 1
export const WIND_SOLIDITY = 0.35
export const WIND_KP = 3
export const WIND_GAMMA = 18000

const EFFECTIVE_WIDTH: Record<PostType, number> = {
  star: 0.1,
  pine90: 0.09,
  galv50nb: 0.08,
}

export type WindCheck = {
  gustMs: number
  qPa: number
  solidity: number
  forceN: number
  leverM: number
  momentNm: number
  capacityNm: number
  /** moment / capacity. Above 1 means over the rough embed capacity. */
  utilisation: number
  over: boolean
  note: string
}

export function windCheck(opts: {
  gustMs: number
  spacing: number
  wireHeight: number
  peakY: number
  shoulderY: number
  stickUp: number
  embedDepth: number
  postType: PostType
}): WindCheck {
  const qPa = 0.5 * WIND_RHO * opts.gustMs * opts.gustMs
  const roofRise = Math.max(0, opts.peakY - opts.shoulderY)
  const hEff = opts.wireHeight + 0.5 * roofRise
  const forceN = qPa * WIND_CD * WIND_SOLIDITY * opts.spacing * hEff
  const leverM = Math.max(0.2, opts.stickUp)
  const momentNm = forceN * leverM
  const width = EFFECTIVE_WIDTH[opts.postType]
  const d = Math.max(0.05, opts.embedDepth)
  const capacityNm = (1 / 3) * WIND_KP * WIND_GAMMA * width * d * d * d
  const utilisation = capacityNm > 0 ? momentNm / capacityNm : Infinity
  const over = momentNm > capacityNm
  const note = [
    `Rough wind check, not engineering.`,
    `Gust ${opts.gustMs.toFixed(0)} m/s, net taken as ${Math.round(WIND_SOLIDITY * 100)}% solid.`,
    `One side picket: overturning ${momentNm.toFixed(0)} N·m against a rough embed capacity of ${capacityNm.toFixed(0)} N·m`,
    `(passive soil on ${d.toFixed(2)} m embed; guys, sleeper, and arch sharing not counted).`,
    over
      ? `Over the rough capacity. Drive deeper, keep the end guys, or treat ${opts.gustMs.toFixed(0)} m/s as a storm this embed may not hold.`
      : `Under the rough capacity at this gust.`,
  ].join(' ')
  return {
    gustMs: opts.gustMs,
    qPa: round1(qPa),
    solidity: WIND_SOLIDITY,
    forceN: round1(forceN),
    leverM: round2(leverM),
    momentNm: round1(momentNm),
    capacityNm: round1(capacityNm),
    utilisation: Math.round(utilisation * 100) / 100,
    over,
    note,
  }
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
