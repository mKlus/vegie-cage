import {
  bedBox,
  bedFootprint,
  boxesOverlap,
  makeBed,
  snap,
  type PlacedBed,
} from './birdies'

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function fmtGap(m: number): string {
  return m >= 1 ? `${m.toFixed(2)} m` : `${Math.round(m * 1000)} mm`
}

export const DEFAULT_AISLE_WORK = 0.8
export const DEFAULT_AISLE_WALK = 0.6
/** @deprecated use DEFAULT_AISLE_WORK */
export const DEFAULT_AISLE = DEFAULT_AISLE_WORK
export const DEFAULT_INSERT = 0.15
export const SNAP_GRID = 0.05
export const SNAP_MAGNET = 0.12

export type Aisles = {
  work: number
  walk: number
  door: number
  wallLong: number
  wallShort: number
}

export const DEFAULT_AISLE_DOOR = 0.8
export const DEFAULT_AISLE_WALL_LONG = 0.8
export const DEFAULT_AISLE_WALL_SHORT = 0.6

/** Side walls (X): long face if rot 0, short face if rot 90. */
export function wallGapX(rot: 0 | 90, a: Aisles): number {
  return rot === 0 ? a.wallLong : a.wallShort
}

/** Far end (Z, opposite door): short face if rot 0, long face if rot 90. */
export function wallGapFar(rot: 0 | 90, a: Aisles): number {
  return rot === 0 ? a.wallShort : a.wallLong
}

export function axisGap(rot: 0 | 90, axis: 'x' | 'z', a: Aisles): number {
  const longFacesX = rot === 0
  if (axis === 'x') return longFacesX ? a.work : a.walk
  return longFacesX ? a.walk : a.work
}

export function pairGap(a: PlacedBed, b: PlacedBed, axis: 'x' | 'z', aisles: Aisles): number {
  return Math.max(axisGap(a.rot, axis, aisles), axisGap(b.rot, axis, aisles))
}

export type GapMeasure = {
  x1: number
  z1: number
  x2: number
  z2: number
  metres: number
  ok: boolean
  kind: 'bed' | 'wall' | 'door'
  label: string
}

export type FillSpec = Pick<PlacedBed, 'width' | 'length' | 'height' | 'color' | 'brand' | 'rot'>

function range(n: number): number[] {
  return Array.from({ length: n }, (_, i) => i)
}

function magnet(value: number, targets: number[], thresh = SNAP_MAGNET): number {
  let best = value
  let bestD = thresh
  for (const t of targets) {
    const d = Math.abs(value - t)
    if (d < bestD) {
      bestD = d
      best = t
    }
  }
  return best
}

/** Snap a bed centre so edges catch the grid, walls, other beds, and aisle offsets. */
export function snapBedCentre(
  x: number,
  z: number,
  moving: PlacedBed,
  others: PlacedBed[],
  cage: { length: number; width: number } & Aisles,
): { x: number; z: number } {
  const { w, d } = bedFootprint(moving)
  const wx = wallGapX(moving.rot, cage)
  const wFar = wallGapFar(moving.rot, cage)
  const wDoor = cage.door
  let cx = snap(x, SNAP_GRID)
  let cz = snap(z, SNAP_GRID)
  const xTargets: number[] = [0, -cage.width / 2 + wx + w / 2, cage.width / 2 - wx - w / 2]
  const zTargets: number[] = [
    0,
    -cage.length / 2 + wDoor + d / 2,
    cage.length / 2 - wFar - d / 2,
  ]
  for (const o of others) {
    if (o.id === moving.id) continue
    const b = bedBox(o)
    const px = pairGap(moving, o, 'x', cage)
    const pz = pairGap(moving, o, 'z', cage)
    xTargets.push(b.x0 - px - w / 2, b.x1 + px + w / 2, b.x0 + w / 2, b.x1 - w / 2, o.x)
    zTargets.push(b.z0 - pz - d / 2, b.z1 + pz + d / 2, b.z0 + d / 2, b.z1 - d / 2, o.z)
  }
  cx = magnet(cx, xTargets)
  cz = magnet(cz, zTargets)
  return { x: snap(cx, SNAP_GRID), z: snap(cz, SNAP_GRID) }
}

function overlap1d(a0: number, a1: number, b0: number, b1: number): number {
  return Math.max(0, Math.min(a1, b1) - Math.max(a0, b0))
}

export function measureGaps(
  beds: PlacedBed[],
  cage: { length: number; width: number } & Aisles,
): GapMeasure[] {
  const out: GapMeasure[] = []
  const halfW = cage.width / 2
  const halfL = cage.length / 2

  for (const b of beds) {
    const box = bedBox(b)
    const wx = wallGapX(b.rot, cage)
    const wFar = wallGapFar(b.rot, cage)
    const wDoor = cage.door
    const left = box.x0 + halfW
    const right = halfW - box.x1
    const far = halfL - box.z1
    const door = box.z0 + halfL
    if (left <= wx + 0.25) {
      out.push({
        x1: -halfW,
        z1: b.z,
        x2: box.x0,
        z2: b.z,
        metres: round2(left),
        ok: left + 1e-6 >= wx,
        kind: 'wall',
        label: `${fmtGap(left)} wall`,
      })
    }
    if (right <= wx + 0.25) {
      out.push({
        x1: box.x1,
        z1: b.z,
        x2: halfW,
        z2: b.z,
        metres: round2(right),
        ok: right + 1e-6 >= wx,
        kind: 'wall',
        label: `${fmtGap(right)} wall`,
      })
    }
    if (door <= wDoor + 0.25) {
      out.push({
        x1: b.x,
        z1: -halfL,
        x2: b.x,
        z2: box.z0,
        metres: round2(door),
        ok: door + 1e-6 >= wDoor,
        kind: 'door',
        label: `${fmtGap(door)} door`,
      })
    }
    if (far <= wFar + 0.25) {
      out.push({
        x1: b.x,
        z1: box.z1,
        x2: b.x,
        z2: halfL,
        metres: round2(far),
        ok: far + 1e-6 >= wFar,
        kind: 'wall',
        label: `${fmtGap(far)} wall`,
      })
    }
  }

  for (let i = 0; i < beds.length; i++) {
    for (let j = i + 1; j < beds.length; j++) {
      const ba = beds[i]!
      const bb = beds[j]!
      const A = bedBox(ba)
      const B = bedBox(bb)
      const xOver = overlap1d(A.x0, A.x1, B.x0, B.x1)
      const zOver = overlap1d(A.z0, A.z1, B.z0, B.z1)
      const needZ = pairGap(ba, bb, 'z', cage)
      const needX = pairGap(ba, bb, 'x', cage)
      if (xOver > 0.15 && A.z1 <= B.z0 + 1e-6) {
        const gap = B.z0 - A.z1
        const x = (Math.max(A.x0, B.x0) + Math.min(A.x1, B.x1)) / 2
        out.push({
          x1: x,
          z1: A.z1,
          x2: x,
          z2: B.z0,
          metres: round2(gap),
          ok: gap + 1e-6 >= needZ,
          kind: 'bed',
          label: fmtGap(gap),
        })
      } else if (xOver > 0.15 && B.z1 <= A.z0 + 1e-6) {
        const gap = A.z0 - B.z1
        const x = (Math.max(A.x0, B.x0) + Math.min(A.x1, B.x1)) / 2
        out.push({
          x1: x,
          z1: B.z1,
          x2: x,
          z2: A.z0,
          metres: round2(gap),
          ok: gap + 1e-6 >= needZ,
          kind: 'bed',
          label: fmtGap(gap),
        })
      }
      if (zOver > 0.15 && A.x1 <= B.x0 + 1e-6) {
        const gap = B.x0 - A.x1
        const z = (Math.max(A.z0, B.z0) + Math.min(A.z1, B.z1)) / 2
        out.push({
          x1: A.x1,
          z1: z,
          x2: B.x0,
          z2: z,
          metres: round2(gap),
          ok: gap + 1e-6 >= needX,
          kind: 'bed',
          label: fmtGap(gap),
        })
      } else if (zOver > 0.15 && B.x1 <= A.x0 + 1e-6) {
        const gap = A.x0 - B.x1
        const z = (Math.max(A.z0, B.z0) + Math.min(A.z1, B.z1)) / 2
        out.push({
          x1: B.x1,
          z1: z,
          x2: A.x0,
          z2: z,
          metres: round2(gap),
          ok: gap + 1e-6 >= needX,
          kind: 'bed',
          label: fmtGap(gap),
        })
      }
    }
  }
  return out
}

function packGrid(
  cageLength: number,
  cageWidth: number,
  aisles: Aisles,
  rot: 0 | 90,
  spec: FillSpec,
): { x: number; z: number }[] {
  const dummy: PlacedBed = {
    id: 'tmp',
    brand: spec.brand,
    width: spec.width,
    length: spec.length,
    height: spec.height,
    color: spec.color,
    rot,
    x: 0,
    z: 0,
    owned: false,
  }
  const { w, d } = bedFootprint(dummy)
  const gx = axisGap(rot, 'x', aisles)
  const gz = axisGap(rot, 'z', aisles)
  const wSide = wallGapX(rot, aisles)
  const wFar = wallGapFar(rot, aisles)
  const wDoor = aisles.door
  const availW = cageWidth - 2 * wSide
  const availL = cageLength - wDoor - wFar
  if (w > availW + 1e-6 || d > availL + 1e-6) return []
  const cols = Math.max(1, Math.floor((availW + gx + 1e-9) / (w + gx)))
  const rows = Math.max(1, Math.floor((availL + gz + 1e-9) / (d + gz)))
  const usedW = cols * w + (cols - 1) * gx
  const usedL = rows * d + (rows - 1) * gz
  const x0 = -usedW / 2 + w / 2
  const z0 = -cageLength / 2 + wDoor + d / 2
  const extraZ = Math.max(0, availL - usedL)
  const spots: { x: number; z: number }[] = []
  for (const r of range(rows)) {
    for (const c of range(cols)) {
      spots.push({
        x: round2(x0 + c * (w + gx)),
        z: round2(z0 + r * (d + gz) + extraZ * 0.15),
      })
    }
  }
  return spots
}

function facesClear(a: PlacedBed, b: PlacedBed, aisles: Aisles): boolean {
  if (boxesOverlap(a, b, 0.02)) return false
  const A = bedBox(a)
  const B = bedBox(b)
  const xOver = overlap1d(A.x0, A.x1, B.x0, B.x1)
  const zOver = overlap1d(A.z0, A.z1, B.z0, B.z1)
  if (zOver > 0.05) {
    const gap = A.x1 <= B.x0 ? B.x0 - A.x1 : B.x1 <= A.x0 ? A.x0 - B.x1 : 0
    if (gap + 1e-6 < pairGap(a, b, 'x', aisles)) return false
  }
  if (xOver > 0.05) {
    const gap = A.z1 <= B.z0 ? B.z0 - A.z1 : B.z1 <= A.z0 ? A.z0 - B.z1 : 0
    if (gap + 1e-6 < pairGap(a, b, 'z', aisles)) return false
  }
  return true
}

export function fillCage(
  cageLength: number,
  cageWidth: number,
  aisles: Aisles,
  spec: FillSpec,
  ownedLimit: number,
): PlacedBed[] {
  const spots = packGrid(cageLength, cageWidth, aisles, spec.rot, spec)
  return spots.map((p, i) =>
    makeBed({
      ...spec,
      x: p.x,
      z: p.z,
      owned: i < ownedLimit,
      id: i < ownedLimit ? `owned-${i + 1}` : undefined,
    }),
  )
}

export function fillLeftover(
  existing: PlacedBed[],
  cageLength: number,
  cageWidth: number,
  aisles: Aisles,
  spec: FillSpec,
): PlacedBed[] {
  const spots = packGrid(cageLength, cageWidth, aisles, spec.rot, spec)
  const added: PlacedBed[] = []
  for (const p of spots) {
    const candidate = makeBed({ ...spec, x: p.x, z: p.z, owned: false })
    const hit = [...existing, ...added].some((o) => !facesClear(candidate, o, aisles))
    if (!hit) added.push(candidate)
  }
  return [...existing, ...added]
}

export function ownedMatching(beds: PlacedBed[], spec: FillSpec): number {
  return beds.filter(
    (b) =>
      b.owned &&
      Math.abs(b.width - spec.width) < 0.02 &&
      Math.abs(b.length - spec.length) < 0.02 &&
      Math.abs(b.height - spec.height) < 0.02,
  ).length
}
