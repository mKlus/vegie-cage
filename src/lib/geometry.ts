import { bedBox, bedFootprint, bedInsideCage, boxesOverlap, type PlacedBed } from './birdies'
import { type CageInputs, round2 } from './model'

export type Point = { x: number; y: number }

export type BedRect = {
  id: string
  x: number
  z: number
  w: number
  d: number
  h: number
  color: string
  owned: boolean
  source: PlacedBed
}

export type CageGeometry = {
  span: number
  rise: number
  radius: number
  halfAngle: number
  cy: number
  hoopStartY: number
  hoopArcM: number
  netArcM: number
  hoopCount: number
  hoopZs: number[]
  actualSpacing: number
  pipeEachM: number
  pipeInsertM: number
  hoopPoints: Point[]
  netPoints: Point[]
  beds: BedRect[]
  bedLength: number
  sideGap: number
  bedsFit: boolean
  bedsNeededW: number
  door: { wall: 'end' | 'side'; x0: number; x1: number; z: number; width: number; height: number }
  perimeterM: number
  meshRunM: number
}

const HOOP_SEGS = 32

export function hoopRadius(span: number, rise: number): number {
  if (span <= 0 || rise <= 0) return 0
  return (rise * rise + (span / 2) ** 2) / (2 * rise)
}

export function hoopHalfAngle(span: number, rise: number): number {
  const r = hoopRadius(span, rise)
  if (r <= 0) return 0
  return Math.acos(clamp1((r - rise) / r))
}

export function hoopArcLength(span: number, rise: number): number {
  return 2 * hoopRadius(span, rise) * hoopHalfAngle(span, rise)
}

function clamp1(n: number): number {
  return Math.min(1, Math.max(-1, n))
}

export function hoopPointAt(span: number, rise: number, startY: number, t: number): Point {
  const r = hoopRadius(span, rise)
  const cy = startY + rise - r
  const theta = t * hoopHalfAngle(span, rise)
  return { x: r * Math.sin(theta), y: cy + r * Math.cos(theta) }
}

export function hoopPolyline(span: number, rise: number, startY: number, segs = HOOP_SEGS): Point[] {
  const pts: Point[] = []
  for (let i = 0; i <= segs; i++) {
    const t = (i / segs) * 2 - 1
    pts.push(hoopPointAt(span, rise, startY, t))
  }
  return pts
}

/** U-hoop: vertical sleeves that slide onto posts, then the arch. */
export function hoopWithSleeves(
  span: number,
  rise: number,
  startY: number,
  insert: number,
  segs = HOOP_SEGS,
): Point[] {
  const sleeve = Math.max(0, insert)
  const bottom = Math.max(0, startY - sleeve)
  const arc = hoopPolyline(span, rise, startY, segs)
  const left: Point[] = []
  if (sleeve > 0.001 && startY - bottom > 0.001) {
    left.push({ x: -span / 2, y: bottom })
  }
  return [...left, ...arc, ...(sleeve > 0.001 ? [{ x: span / 2, y: bottom }] : [])]
}

/** Stations along the length, inclusive of both ends. */
export function hoopStations(length: number, spacing: number): number[] {
  const bays = Math.max(1, Math.round(length / spacing))
  const actual = length / bays
  const zs: number[] = []
  for (let i = 0; i <= bays; i++) zs.push(-length / 2 + i * actual)
  return zs
}

export function placedToRect(b: PlacedBed): BedRect {
  const { w, d } = bedFootprint(b)
  return {
    id: b.id,
    x: b.x,
    z: b.z,
    w,
    d,
    h: b.height,
    color: b.color,
    owned: b.owned,
    source: b,
  }
}

export function layoutBeds(input: CageInputs): {
  beds: BedRect[]
  sideGap: number
  bedLength: number
  neededW: number
  fit: boolean
  overlap: boolean
} {
  const beds = input.beds.map(placedToRect)
  let minX = Infinity
  let maxX = -Infinity
  let maxD = 0
  let fit = beds.length > 0
  for (const b of input.beds) {
    const box = bedBox(b)
    minX = Math.min(minX, box.x0)
    maxX = Math.max(maxX, box.x1)
    maxD = Math.max(maxD, box.z1 - box.z0)
    if (!bedInsideCage(b, input.length, input.width)) fit = false
  }
  const neededW = beds.length ? maxX - minX : 0
  const leftGap = beds.length ? minX + input.width / 2 : input.width / 2
  const rightGap = beds.length ? input.width / 2 - maxX : input.width / 2
  const sideGap = Math.min(leftGap, rightGap)
  const overlap = input.beds.some((a, i) => input.beds.slice(i + 1).some((b) => boxesOverlap(a, b)))
  return { beds, sideGap, bedLength: maxD, neededW, fit: fit && !overlap, overlap }
}

function thetaAtHeight(span: number, rise: number, startY: number, y: number): number {
  const r = hoopRadius(span, rise)
  const cy = startY + rise - r
  return Math.acos(clamp1((y - cy) / r))
}

export function buildGeometry(input: CageInputs): CageGeometry {
  const insert = input.pipeInsert
  const hoopStartY = input.hoopOrigin === 'rail' ? input.meshHeight : insert
  const rise = Math.max(0.2, input.peakHeight - hoopStartY)
  const span = input.width
  const radius = hoopRadius(span, rise)
  const halfAngle = hoopHalfAngle(span, rise)
  const cy = hoopStartY + rise - radius
  const hoopArcM = hoopArcLength(span, rise)
  const hoopPoints = hoopWithSleeves(span, rise, hoopStartY, insert)

  let netArcM = hoopArcM
  let netPoints = hoopPoints
  if (input.hoopOrigin === 'ground' && input.meshHeight > 0.05 && input.meshHeight < input.peakHeight) {
    const th = thetaAtHeight(span, rise, hoopStartY, input.meshHeight)
    netArcM = 2 * radius * th
    const segs = 24
    netPoints = []
    for (let i = 0; i <= segs; i++) {
      const theta = -th + (2 * th * i) / segs
      netPoints.push({ x: radius * Math.sin(theta), y: cy + radius * Math.cos(theta) })
    }
  }

  const hoopZs = hoopStations(input.length, input.hoopSpacing)
  const hoopCount = hoopZs.length
  const actualSpacing = hoopCount > 1 ? input.length / (hoopCount - 1) : input.length
  const pipeInsertM = insert
  const pipeEachM = hoopArcM + 2 * pipeInsertM

  const beds = layoutBeds(input)
  const perimeterM = 2 * (input.length + input.width)
  const doorWidth = input.doorWidth
  const meshRunM = perimeterM - doorWidth

  const door =
    input.doorWall === 'side'
      ? {
          wall: 'side' as const,
          x0: input.width / 2,
          x1: input.width / 2,
          z: 0,
          width: doorWidth,
          height: input.doorHeight,
        }
      : {
          wall: 'end' as const,
          x0: -doorWidth / 2,
          x1: doorWidth / 2,
          z: -input.length / 2,
          width: doorWidth,
          height: input.doorHeight,
        }

  return {
    span,
    rise,
    radius,
    halfAngle,
    cy,
    hoopStartY,
    hoopArcM: round2(hoopArcM),
    netArcM: round2(netArcM),
    hoopCount,
    hoopZs,
    actualSpacing: round2(actualSpacing),
    pipeEachM: round2(pipeEachM),
    pipeInsertM,
    hoopPoints,
    netPoints,
    beds: beds.beds,
    bedLength: round2(beds.bedLength),
    sideGap: round2(beds.sideGap),
    bedsFit: beds.fit,
    bedsNeededW: round2(beds.neededW),
    door,
    perimeterM: round2(perimeterM),
    meshRunM: round2(meshRunM),
  }
}

export type Warning = { level: 'warn' | 'info' | 'bad'; text: string }

export function warnings(input: CageInputs, geo: CageGeometry): Warning[] {
  const out: Warning[] = []
  const riseRatio = geo.rise / geo.span
  if (riseRatio < 0.22) {
    out.push({
      level: 'bad',
      text: `Arch is pancake (rise ${geo.rise.toFixed(2)} m on ${geo.span.toFixed(1)} m span). Posts take huge outward thrust. Raise the peak, drop hoop origin to ground, or raise the shoulder.`,
    })
  } else if (riseRatio < 0.3) {
    out.push({
      level: 'warn',
      text: 'Shallow arch. Use ridge + two purlins, and do not skip the corner braces.',
    })
  }

  if (input.width >= 5 && (input.hoopMaterial === 'conduit20' || input.hoopMaterial === 'poly25')) {
    out.push({
      level: 'bad',
      text: '6 m-class span: 20–25 mm pipe will sag and fold in wind. Use 50 mm rural poly over star pickets, or mill-bent 32 NB galv from a steel supplier.',
    })
  } else if (input.width >= 4 && input.hoopMaterial === 'conduit20') {
    out.push({
      level: 'warn',
      text: '20 mm conduit is for reach-in beds. Step up to 25 mm poly or 25 NB galv.',
    })
  }

  if (input.postType === 'star' && input.hoopMaterial !== 'poly50' && input.hoopOrigin === 'ground') {
    out.push({
      level: 'warn',
      text: 'Star pickets only slide cleanly inside 50 mm poly. 32 mm and conduit need saddle clips on a rail, or 12 mm rebar stubs.',
    })
  }

  if (input.hoopSpacing > 1.2) {
    out.push({
      level: 'warn',
      text: 'Hoop spacing over 1.2 m: net sags, possums walk it. 1.0 m is the default for this size; 0.8 m if the site is windy.',
    })
  }

  if (input.wallMesh === 'hex50') {
    out.push({
      level: 'warn',
      text: '50 mm hex chicken wire keeps adult chooks out, not rabbits or determined dogs. 25 mm welded cage mesh is the better wall for your pest list.',
    })
  }

  if (input.peakHeight < 2 && input.width >= 2.4) {
    out.push({
      level: 'info',
      text: 'Peak under 2 m: you will duck on the path. Fine for a reach-in, tight for walk-in.',
    })
  }

  if (input.meshHeight < 1.1 && input.width >= 2.4) {
    out.push({
      level: 'info',
      text: 'Wall under 1.1 m: dogs can jump, you duck at the sides. 1.2 m matches a standard cage-mesh roll.',
    })
  }

  if (input.doorWidth < 0.9) {
    out.push({
      level: 'info',
      text: 'Door under 0.9 m: wheelbarrow and sleeper lengths will not pass. 1.0 m is the floor for a working garden.',
    })
  }

  if (input.apron < 0.25) {
    out.push({
      level: 'warn',
      text: 'No real dig apron. Rabbits and dogs go under. Fold 0.3 m of mesh out on the soil and peg it, or bury 0.15 m.',
    })
  }

  const outside = input.beds.filter((b) => !bedInsideCage(b, input.length, input.width))
  if (outside.length) {
    out.push({
      level: 'bad',
      text: `${outside.length} bed${outside.length === 1 ? '' : 's'} sit outside the cage. Drag them in, or grow length/width.`,
    })
  }
  const overlap = input.beds.some((a, i) => input.beds.slice(i + 1).some((b) => boxesOverlap(a, b)))
  if (overlap) {
    out.push({
      level: 'warn',
      text: 'Beds overlap. Rotate or drag so paths stay ~0.5–0.6 m for a barrow.',
    })
  }
  if (geo.sideGap < 0.4 && input.beds.length > 1 && outside.length === 0) {
    out.push({
      level: 'info',
      text: `Only ${geo.sideGap.toFixed(2)} m between outer beds and the fence. Work sides want ~0.80 m to squat.`,
    })
  }

  if (input.purlins === 1 && input.width >= 4) {
    out.push({
      level: 'warn',
      text: 'A 6 m net is a sail. Ridge-only is not enough — add two side purlins (the 3-purlin option).',
    })
  }

  return out
}
