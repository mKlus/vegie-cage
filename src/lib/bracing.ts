import type { DoorWall } from './model'
import { round2 } from './model'

/** 2.5 mm wire, drawn much thicker in the 3D view so it reads against the net. */
export const GUY_WIRE_MM = 2.5

/** End-guy anchor, along the long axis, past the end wall. 45° when the stick-up is in this band. */
export const END_ANCHOR_OUT_MIN_M = 1.2
export const END_ANCHOR_OUT_MAX_M = 1.5

/** Side-guy anchor, square off the windward wall. */
export const SIDE_ANCHOR_OUT_M = 1.2

/** Diagonal brace foot, along the side wall from the corner toward mid-cage. */
export const BRACE_FOOT_M = 1

export const END_GUY_COUNT = 4
export const BRACE_COUNT = 4

/**
 * Colours shared by the 3D view and the Stays & bracing diagram.
 * Guys and braces are flat bright colours so they stand off the dark hoops.
 */
export const STAY_COLOUR = {
  guy: '#ff5c1a',
  brace: '#ff2d3a',
  anchor: '#ffd84a',
  purlin: '#f3e7a1',
  ridge: '#b7e38a',
} as const

export type Vec3 = { x: number; y: number; z: number }

export type Guy = {
  kind: 'end' | 'side'
  from: Vec3
  to: Vec3
  lengthM: number
  angleDeg: number
}

export type Brace = {
  from: Vec3
  to: Vec3
  footAlongSideM: number
}

export type Bracing = {
  /** Long wall the side guys leave. +x unless the door is on that wall. */
  windward: '+x' | '-x'
  endAnchorOutM: number
  sideAnchorOutM: number
  braceFootM: number
  endGuys: Guy[]
  sideGuys: Guy[]
  braces: Brace[]
  /** 4 end anchors plus one anchor per side guy. */
  anchorCount: number
  guyCount: number
  braceCount: number
  /** One Gripple / strainer on each guy. */
  strainerCount: number
  braceClipCount: number
  guyWireM: number
}

export type BracingInput = {
  length: number
  width: number
  stickUp: number
  hoopZs: readonly number[]
  doorWall: DoorWall
}

/**
 * Cage frame is y-up, right-handed: +x across the width, +z along the length.
 * Ends sit at z = ±length/2. Side walls sit at x = ±width/2.
 * End guys run outward along ±z. Side guys run outward along the windward x.
 * Brace feet step 1 m from each end toward mid-cage, on that corner's side wall.
 */
export function layoutBracing(input: BracingInput): Bracing {
  const endOut = endAnchorOutM(input.stickUp)
  const halfL = input.length / 2
  const halfW = input.width / 2
  const y = input.stickUp
  const windSign: 1 | -1 = input.doorWall === 'side' ? -1 : 1
  const windX = windSign * halfW

  const corners: { x: number; z: number }[] = [
    { x: -halfW, z: -halfL },
    { x: halfW, z: -halfL },
    { x: -halfW, z: halfL },
    { x: halfW, z: halfL },
  ]

  const endGuys = corners.map((c) => {
    const zSign = Math.sign(c.z) || 1
    return makeGuy('end', { x: c.x, y, z: c.z }, { x: c.x, y: 0, z: c.z + zSign * endOut })
  })

  const sideGuys = input.hoopZs
    .filter((_, i) => i % 2 === 0)
    .map((z) =>
      makeGuy(
        'side',
        { x: windX, y, z },
        { x: windX + windSign * SIDE_ANCHOR_OUT_M, y: 0, z },
      ),
    )

  const braces = corners.map((c) => {
    const zSign = Math.sign(c.z) || 1
    return {
      from: { x: c.x, y, z: c.z },
      to: { x: c.x, y: 0, z: c.z - zSign * BRACE_FOOT_M },
      footAlongSideM: BRACE_FOOT_M,
    }
  })

  const guyWireM = round2([...endGuys, ...sideGuys].reduce((sum, g) => sum + g.lengthM, 0))
  const guyCount = endGuys.length + sideGuys.length

  return {
    windward: windSign === 1 ? '+x' : '-x',
    endAnchorOutM: endOut,
    sideAnchorOutM: SIDE_ANCHOR_OUT_M,
    braceFootM: BRACE_FOOT_M,
    endGuys,
    sideGuys,
    braces,
    anchorCount: END_GUY_COUNT + sideGuys.length,
    guyCount,
    braceCount: braces.length,
    strainerCount: guyCount,
    braceClipCount: BRACE_COUNT,
    guyWireM,
  }
}

/** 45° puts the anchor one stick-up out. Keep that run inside 1.2–1.5 m. */
export function endAnchorOutM(stickUp: number): number {
  return round2(Math.min(END_ANCHOR_OUT_MAX_M, Math.max(END_ANCHOR_OUT_MIN_M, stickUp)))
}

function makeGuy(kind: Guy['kind'], from: Vec3, to: Vec3): Guy {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const dz = to.z - from.z
  const horizontal = Math.hypot(dx, dz)
  return {
    kind,
    from,
    to,
    lengthM: round2(Math.hypot(horizontal, dy)),
    angleDeg: (Math.atan2(Math.abs(dy), horizontal) * 180) / Math.PI,
  }
}

export function guyExact(b: Bracing): string {
  const endL = b.endGuys[0]?.lengthM ?? 0
  const sideL = b.sideGuys[0]?.lengthM ?? 0
  return `${b.endGuys.length} end × ${endL.toFixed(2)} m + ${b.sideGuys.length} windward × ${sideL.toFixed(2)} m = ${b.guyWireM.toFixed(2)} m`
}
