import type { Vec3 } from './bracing'
import type { CoverOption } from './model'
import { round2 } from './model'

/** 50×50×2 galv SHS end posts. Both ends. The 6 m bar price is an estimate. */
export const V2_POST = {
  sizeM: 0.05,
  lengthM: 3,
  embedM: 0.55,
  aboveM: 2.45,
  /** Tie the post top to the end hoop here. A tie and one tek, not a separate bar. */
  tieTop: 2.43,
  holeDiaM: 0.25,
  concreteBags: 12,
  concreteBagKg: 20,
  stockLengths: 2,
  stockM: 6,
  unitAud: 90,
} as const

export const V2_MESH = {
  bottom: 0.05,
  top: 0.95,
  height: 0.9,
  rollM: 5,
  unitAud: 38.8,
} as const

export const V2_NET_BOTTOM = 0.8
export const V2_GATE_BOTTOM = 0.07

/** Spec cut for the 4.6 m × 2.5 m hoop (1.0 m legs + semi-ellipse). */
export const V2_HOOP_CUT_M = 8.1

export const V2_PRICE = {
  polyRoll: 519,
  batten: 21.42,
  battenM: 6.1,
  sleeper: 22.45,
  sleeperM: 2.4,
  concrete: 10.39,
  gate: 176,
  hardware: 45,
  mesh: 38.8,
  pineStrip: 18.9,
  pineStripM: 5.4,
  screws: 49.95,
  teks: 13.5,
  ties: 13.98,
  bolts: 31.95,
  boltPack: 25,
  coldGal: 33.9,
  dpc: 20,
  picket: 29.5,
  birdNet: 75.99,
  shadeCloth: 173.88,
} as const

/** End-post steel $180 + hinges/latch $45 + DPC $20. */
export const V2_ESTIMATE_AUD = 245

export const V2_COMMON_AUD = 2358.36
export const V2_BIRD_NET_AUD = 2788.35
export const V2_SHADE_AUD = 3119.12

export type V2Kind = 'batten' | 'diagonal' | 'header' | 'rail'

export type V2Member = {
  kind: V2Kind
  name: string
  from: Vec3
  to: Vec3
  /** Bolt-to-bolt, metres. */
  lengthM: number
  cutM: number
  /** Diagonals: angle from the long axis, measured in the roof surface. */
  angleDeg?: number
}

export type V2Post = {
  x: number
  z: number
  top: number
  embed: number
  length: number
}

export type V2Frame = {
  cover: CoverOption
  leg: number
  battens: V2Member[]
  diagonals: V2Member[]
  headers: V2Member[]
  rails: V2Member[]
  endPosts: V2Post[]
  postX: number
  headerY: number
  headerHalf: number
  lowY: number
  lowerY: number
  upperY: number
  diagonalCut: number
  diagonalLength: number
  diagonalAngle: number
  /** Lap of the two 6.1 m lengths, metres from the door-end hoop. */
  lapFrom: number
  lapTo: number
  battenStock: number
}

type LayoutIn = {
  length: number
  width: number
  peak: number
  leg: number
  hoopZs: readonly number[]
  cover: CoverOption
  doorWidth: number
}

function dist(a: Vec3, b: Vec3): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z)
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000
}

function member(
  kind: V2Kind,
  name: string,
  from: Vec3,
  to: Vec3,
  cutM: number,
  angleDeg?: number,
): V2Member {
  return {
    kind,
    name,
    from,
    to,
    lengthM: round3(dist(from, to)),
    cutM,
    ...(angleDeg === undefined ? {} : { angleDeg }),
  }
}

/** Spec cuts: 50 mm past the bolt each end. Other sizes get the same 100 mm. */
function diagonalCut(bolt: number): number {
  if (Math.abs(bolt - 1.787) < 0.008) return 1.89
  if (Math.abs(bolt - 1.648) < 0.008) return 1.75
  return round2(bolt + 0.1)
}

function bars(metres: number): number {
  return Math.max(1, Math.ceil((metres - 1e-9) / V2_PRICE.battenM))
}

/**
 * 7 lines, 2 end headers, 1 back-end rail, diagonal bars.
 * Door-end low rails are cut from the header offcuts, so they add no bar.
 * 19 lengths on the 10 m cage, both covers.
 */
export function battenStockCount(
  length: number,
  width: number,
  diagonalCount: number,
  diagonalCutM: number,
): number {
  const headerLen = 3.56 * (width / 4.6)
  const diagM = diagonalCount * diagonalCutM
  const diagBars = diagM <= 0 ? 0 : bars(diagM)
  return 7 * bars(length) + 2 * bars(headerLen) + bars(width) + diagBars
}

/** Sides length+0.2 m, ends width+0.06 m, 2.4 m H4 sticks. 14 on the 10 × 4.6 m ring. */
export function sleeperStockCount(length: number, width: number): number {
  const side = length + 0.2
  const end = width + 0.06
  const sticks = (run: number) => Math.ceil(run / V2_PRICE.sleeperM - 1e-9)
  return 2 * sticks(side) + 2 * sticks(end)
}

/** Perimeter of the centres, minus the gate, plus 0.3 m of joins. 28.5 m on the spec cage. */
export function meshRunM(length: number, width: number, doorWidth: number): number {
  return round2(2 * (length + width) - doorWidth + 0.3)
}

/** Two roof strips plus two end drops. 29.8 m on the spec cage. */
export function shadeClothMetres(length: number, width: number): number {
  return round2(2 * (length + 0.3) + 2 * width)
}

/**
 * Where the two 6.1 m batten lengths overlap, metres from the door-end hoop.
 * Bird net on 10 m: 4.286–6.10 (hoops 4–5). Shade cloth: 5.00–6.10.
 */
function battenLap(
  hoopZs: readonly number[],
  length: number,
  cover: CoverOption,
): { from: number; to: number } {
  const half = length / 2
  const fromDoor = hoopZs.map((z) => z + half)
  const spacing = fromDoor.length > 1 ? fromDoor[1]! - fromDoor[0]! : length
  const to = Math.min(length, 6.1)
  if (Math.abs(length - 10) < 1e-6 && cover !== 'shade-30' && Math.abs(spacing - 10 / 7) < 1e-3) {
    return { from: round3(3 * (10 / 7)), to }
  }
  if (Math.abs(length - 10) < 1e-6 && cover === 'shade-30' && Math.abs(spacing - 1.25) < 1e-3) {
    return { from: 5, to }
  }
  const under = fromDoor.filter((x) => x > 0.05 && x <= to + 1e-6)
  let start = under.at(-1) ?? 0
  if (to - start < spacing - 1e-6) {
    const prev = under.at(-2)
    if (prev !== undefined) start = prev
  }
  return { from: round3(start), to }
}

/**
 * Seven-batten frame. App axes: x across the width, y up, z along the length.
 * Door end is z = −length/2. Spec (x along, y across, z up) maps to (z, x, y).
 * Diagonals run from the low batten on an outer hoop to the lower shoulder on the next hoop.
 * Shade cloth adds the same pair in bay 4 (hoop index 3 → 4).
 */
export function layoutV2(input: LayoutIn): V2Frame {
  const halfL = input.length / 2
  const halfW = input.width / 2
  const leg = input.leg
  const standard =
    Math.abs(input.width - 4.6) < 1e-6 &&
    Math.abs(input.peak - 2.5) < 1e-6 &&
    Math.abs(leg - 1) < 1e-6
  const scaleX = input.width / 4.6
  const scaleRise = (input.peak - leg) / 1.5
  const upperX = standard ? 0.99 : round2(0.99 * scaleX)
  const lowerX = standard ? 1.86 : round2(1.86 * scaleX)
  const upperY = standard ? 2.36 : round2(leg + 1.36 * scaleRise)
  const lowerY = standard ? 1.88 : round2(leg + 0.88 * scaleRise)
  const lowY = standard ? 0.9 : round2(Math.min(leg - 0.02, 0.9 * (leg / 1)))
  const ridgeY = input.peak
  const headerY = standard ? 1.95 : round2(Math.min(input.peak - 0.05, leg + 0.95))
  const headerHalf = standard ? 1.78 : round2(Math.min(halfW - 0.05, 1.78 * scaleX))
  const postX = round3(input.doorWidth / 2 + 0.055)
  const zDoor = -halfL
  const zBack = halfL

  const lineAt = (name: string, x: number, y: number): V2Member =>
    member('batten', name, { x, y, z: zDoor }, { x, y, z: zBack }, input.length)

  const battens: V2Member[] = [
    lineAt('ridge', 0, ridgeY),
    lineAt('upper_sh_L', -upperX, upperY),
    lineAt('upper_sh_R', upperX, upperY),
    lineAt('lower_sh_L', -lowerX, lowerY),
    lineAt('lower_sh_R', lowerX, lowerY),
    lineAt('low_L', -halfW, lowY),
    lineAt('low_R', halfW, lowY),
  ]

  const n = input.hoopZs.length
  const pairs: { name: string; from: number; to: number }[] = []
  if (n >= 2) pairs.push({ name: 'door', from: 0, to: 1 })
  if (input.cover === 'shade-30' && n >= 5) pairs.push({ name: 'mid', from: 3, to: 4 })
  if (n >= 3) pairs.push({ name: 'back', from: n - 1, to: n - 2 })

  const diagonals: V2Member[] = []
  for (const pair of pairs) {
    const z0 = input.hoopZs[pair.from]!
    const z1 = input.hoopZs[pair.to]!
    const bay = Math.abs(z1 - z0)
    const cross = Math.hypot(halfW - lowerX, lowerY - lowY)
    const bolt = Math.hypot(bay, cross)
    const cut = diagonalCut(bolt)
    const angle = Math.round((Math.atan2(cross, bay) * 180) / Math.PI * 10) / 10
    for (const side of [-1, 1] as const) {
      const from: Vec3 = { x: side * halfW, y: lowY, z: z0 }
      const to: Vec3 = { x: side * lowerX, y: lowerY, z: z1 }
      diagonals.push(member('diagonal', `${pair.name}_${side > 0 ? 'R' : 'L'}`, from, to, cut, angle))
    }
  }

  const headers: V2Member[] = [zDoor, zBack].map((z) =>
    member(
      'header',
      z < 0 ? 'door' : 'back',
      { x: -headerHalf, y: headerY, z },
      { x: headerHalf, y: headerY, z },
      round2(headerHalf * 2),
    ),
  )

  const railCut = standard ? 1.75 : round2(Math.max(0.2, halfW - postX))
  const rails: V2Member[] = [
    member('rail', 'door_L', { x: -halfW, y: lowY, z: zDoor }, { x: -postX, y: lowY, z: zDoor }, railCut),
    member('rail', 'door_R', { x: postX, y: lowY, z: zDoor }, { x: halfW, y: lowY, z: zDoor }, railCut),
    member('rail', 'back', { x: -halfW, y: lowY, z: zBack }, { x: halfW, y: lowY, z: zBack }, round2(input.width)),
  ]

  const endPosts: V2Post[] = []
  for (const z of [zDoor, zBack]) {
    for (const side of [-1, 1] as const) {
      endPosts.push({
        x: side * postX,
        z,
        top: V2_POST.aboveM,
        embed: V2_POST.embedM,
        length: V2_POST.lengthM,
      })
    }
  }

  const first = diagonals[0]
  const diagonalCutM = first?.cutM ?? 0
  const lap = battenLap(input.hoopZs, input.length, input.cover)

  return {
    cover: input.cover,
    leg,
    battens,
    diagonals,
    headers,
    rails,
    endPosts,
    postX,
    headerY,
    headerHalf,
    lowY,
    lowerY,
    upperY,
    diagonalCut: diagonalCutM,
    diagonalLength: first?.lengthM ?? 0,
    diagonalAngle: first?.angleDeg ?? 0,
    lapFrom: lap.from,
    lapTo: lap.to,
    battenStock: battenStockCount(input.length, input.width, diagonals.length, diagonalCutM),
  }
}
