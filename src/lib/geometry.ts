import { archShoulderPoint, buildArch } from './arch'
import { bedBox, bedFootprint, bedInsideCage, boxesOverlap, type PlacedBed } from './birdies'
import { frameHeights, HOOP_MATERIAL, SLEEPER, STAR_ACROSS_MM, WALL_MESH, type CageInputs, round2 } from './model'
import { windCheck, type WindCheck } from './wind'

export type ExtraPost = { x: number; z: number; capped: boolean; role: 'end' | 'jamb' | 'stay' }

export type PicketTakeoff = {
  hoop: number
  end: number
  jambs: number
  stays: number
  total: number
  caps: number
}

export type NetTakeoff = {
  roofWidthM: number
  roofLengthM: number
  roofAreaM2: number
  endAreaM2: number
  usedM2: number
  stockW: number
  stockL: number
  pieces: number
  buy: string
}

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
  stickUp: number
  embedDepth: number
  sleeveTop: number
  sleeveBot: number
  peakY: number
  archKind: 'elastica' | 'ellipse'
  belowElastica: boolean
  elasticaMinRise: number
  minBendRadius: number
  bendAt: 'shoulder' | 'crown'
  purlinPoints: Point[]
  pickets: PicketTakeoff
  extraPosts: ExtraPost[]
  net: NetTakeoff
  wind: WindCheck
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

const NET_OVERLAP_M = 0.15
const NET_PAST_END_M = 0.3
const NET_STOCK = [
  { w: 4, l: 10 },
  { w: 5, l: 10 },
  { w: 10, l: 10 },
  { w: 10, l: 20 },
]

function areaAbove(points: Point[], y0: number): number {
  let area = 0
  for (let i = 0; i < points.length - 1; i++) {
    const p = points[i]!
    const q = points[i + 1]!
    area += ((Math.max(0, p.y - y0) + Math.max(0, q.y - y0)) / 2) * (q.x - p.x)
  }
  return area
}

function fitNet(roofW: number, roofL: number, endArea: number): NetTakeoff {
  const roofArea = roofW * roofL
  let best: { pieces: number; bought: number; w: number; l: number; stockW: number; stockL: number } | null = null
  for (const stock of NET_STOCK) {
    const orientations = [
      [stock.w, stock.l],
      [stock.l, stock.w],
    ]
    for (const [sw, sl] of orientations) {
      const across = Math.ceil(roofW / sw - 1e-9)
      const along = Math.ceil(roofL / sl - 1e-9)
      const pieces = across * along
      const bought = pieces * stock.w * stock.l
      if (
        !best ||
        bought < best.bought - 1e-6 ||
        (Math.abs(bought - best.bought) < 1e-6 && pieces < best.pieces)
      ) {
        best = { pieces, bought, w: sw, l: sl, stockW: stock.w, stockL: stock.l }
      }
    }
  }
  const chosen = best ?? { pieces: 1, bought: 100, w: 10, l: 10, stockW: 10, stockL: 10 }
  let pieces = chosen.pieces
  let have = chosen.bought
  const pieceArea = chosen.stockW * chosen.stockL
  while (have - roofArea < endArea - 1e-6 && pieces < 12) {
    pieces += 1
    have += pieceArea
  }
  const buy = `${pieces} × ${chosen.stockW} × ${chosen.stockL} m`
  return {
    roofWidthM: round2(roofW),
    roofLengthM: round2(roofL),
    roofAreaM2: round2(roofArea),
    endAreaM2: round2(endArea),
    usedM2: round2(roofArea + endArea),
    stockW: chosen.stockW,
    stockL: chosen.stockL,
    pieces,
    buy,
  }
}

function layoutPickets(input: CageInputs, hoopCount: number): { pickets: PicketTakeoff; extraPosts: ExtraPost[] } {
  const spacing = input.hoopSpacing
  const stations = hoopStations(input.width, spacing)
  const intermediates = stations.slice(1, -1)
  const extraPosts: ExtraPost[] = []
  const jambEdges = [-input.doorWidth / 2, input.doorWidth / 2]
  let jambs = 0

  const pushEnd = (z: number, withDoor: boolean) => {
    const xs = [...intermediates]
    if (withDoor) {
      for (const edge of jambEdges) {
        const hit = xs.some((x) => Math.abs(x - edge) <= 0.2)
        if (hit) jambs += 1
        else {
          xs.push(edge)
          jambs += 1
        }
      }
    }
    for (const x of xs) {
      const isJamb = withDoor && jambEdges.some((edge) => Math.abs(x - edge) <= 0.2)
      extraPosts.push({ x, z, capped: input.postType === 'star', role: isJamb ? 'jamb' : 'end' })
    }
  }

  if (input.doorWall === 'end') {
    pushEnd(-input.length / 2, true)
    pushEnd(input.length / 2, false)
  } else {
    pushEnd(-input.length / 2, false)
    pushEnd(input.length / 2, false)
    const zEdges = [-input.doorWidth / 2, input.doorWidth / 2]
    for (const z of zEdges) {
      jambs += 1
      extraPosts.push({
        x: input.width / 2,
        z,
        capped: input.postType === 'star',
        role: 'jamb',
      })
    }
  }

  const corners: { x: number; z: number }[] = [
    { x: -input.width / 2, z: -input.length / 2 },
    { x: input.width / 2, z: -input.length / 2 },
    { x: -input.width / 2, z: input.length / 2 },
    { x: input.width / 2, z: input.length / 2 },
  ]
  for (const c of corners) {
    extraPosts.push({ ...c, capped: input.postType === 'star', role: 'stay' })
  }

  const hoop = hoopCount * 2
  const end = extraPosts.filter((p) => p.role === 'end' || p.role === 'jamb').length
  const stays = extraPosts.filter((p) => p.role === 'stay').length
  const caps = input.postType === 'star' ? extraPosts.length : 0
  return {
    pickets: { hoop, end, jambs, stays, total: hoop + end + stays, caps },
    extraPosts,
  }
}

export function buildGeometry(input: CageInputs): CageGeometry {
  const frame = frameHeights(input)
  const insert = input.pipeInsert
  const hoopStartY = frame.stickUp
  const riseWanted = input.peakHeight - hoopStartY
  const rise = Math.max(0.15, riseWanted)
  const span = input.width
  const arch = buildArch(span, rise, hoopStartY)
  const peakY = hoopStartY + arch.rise
  const hoopArcM = arch.arcLength
  const sleeveBot = Math.max(0, frame.sleeveBot)
  const hoopPoints: Point[] = [
    { x: -span / 2, y: sleeveBot },
    ...arch.points,
    { x: span / 2, y: sleeveBot },
  ]

  const netBottom = Math.max(0, input.meshHeight - NET_OVERLAP_M)
  const drop = Math.max(0, hoopStartY - netBottom)
  const netPoints: Point[] =
    drop > 0.001
      ? [{ x: -span / 2, y: netBottom }, ...arch.points, { x: span / 2, y: netBottom }]
      : arch.points.filter((p) => p.y >= netBottom - 1e-6)
  const netArcM = hoopArcM + 2 * drop

  const endAboveShoulder = areaAbove(arch.points, hoopStartY)
  const endBand = span * drop
  const endGross = endAboveShoulder + endBand
  const doorCut =
    input.doorWall === 'end'
      ? Math.max(0, Math.min(input.doorHeight, peakY) - netBottom) * input.doorWidth
      : 0
  const endArea = Math.max(0, endGross) + Math.max(0, endGross - doorCut)

  const hoopZs = hoopStations(input.length, input.hoopSpacing)
  const hoopCount = hoopZs.length
  const actualSpacing = hoopCount > 1 ? input.length / (hoopCount - 1) : input.length
  const pipeInsertM = insert
  const pipeEachM = hoopArcM + 2 * pipeInsertM

  const beds = layoutBeds(input)
  const perimeterM = 2 * (input.length + input.width)
  const doorWidth = input.doorWidth
  const meshRunM = perimeterM - doorWidth + 0.3 * 4

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

  const purlin =
    input.purlins === 3 ? archShoulderPoint(arch.points, 0.5) : null
  const posts = layoutPickets(input, hoopCount)
  const net = fitNet(netArcM, input.length + 2 * NET_PAST_END_M, endArea)
  const wind = windCheck({
    gustMs: input.windGust,
    spacing: actualSpacing,
    wireHeight: input.meshHeight,
    peakY,
    shoulderY: hoopStartY,
    stickUp: frame.stickUp,
    embedDepth: input.embedDepth,
    postType: input.postType,
  })

  return {
    span,
    rise: round2(arch.rise),
    radius: round2(arch.minBendRadius),
    halfAngle: Math.PI / 2,
    cy: 0,
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
    stickUp: frame.stickUp,
    embedDepth: input.embedDepth,
    sleeveTop: frame.sleeveTop,
    sleeveBot,
    peakY: round2(peakY),
    archKind: arch.kind,
    belowElastica: arch.belowElastica,
    elasticaMinRise: round2(arch.elasticaMinRise),
    minBendRadius: round2(arch.minBendRadius),
    bendAt: arch.bendAt,
    purlinPoints: purlin ? [purlin.left, purlin.right] : [],
    pickets: posts.pickets,
    extraPosts: posts.extraPosts,
    net,
    wind,
  }
}

export type Warning = { level: 'warn' | 'info' | 'bad'; text: string }

export function warnings(input: CageInputs, geo: CageGeometry): Warning[] {
  const out: Warning[] = []
  const hoop = HOOP_MATERIAL[input.hoopMaterial]
  const third = input.picketLength / 3

  if (input.embedDepth < third - 0.001) {
    out.push({
      level: 'warn',
      text: `Embed ${(input.embedDepth * 1000).toFixed(0)} mm is under one-third of the ${input.picketLength.toFixed(2)} m picket (${(third * 1000).toFixed(0)} mm). Shallow pickets pull out.`,
    })
  }

  if (input.meshHeight > geo.sleeveBot + 0.001) {
    out.push({
      level: 'bad',
      text: `Wire top ${input.meshHeight.toFixed(2)} m enters the sleeve (${geo.sleeveBot.toFixed(2)}–${geo.sleeveTop.toFixed(2)} m). Stop the wire at the bottom of the sleeve so the pipe does not cover the mesh.`,
    })
  }

  if (geo.belowElastica) {
    out.push({
      level: 'warn',
      text: `Peak is flatter than a pipe held vertical at the picket can spring. The elastic arch wants at least ${geo.elasticaMinRise.toFixed(2)} m of rise (peak about ${(geo.stickUp + geo.elasticaMinRise).toFixed(2)} m). This drawing is a vertical-tangent ellipse instead.`,
    })
  }

  if (input.peakHeight < geo.stickUp + 0.2) {
    out.push({
      level: 'bad',
      text: `Peak ${input.peakHeight.toFixed(2)} m is at or under the ${geo.stickUp.toFixed(2)} m stick-up. Raise the peak so the pipe has room to bend.`,
    })
  }

  if (geo.minBendRadius < hoop.minBendM) {
    out.push({
      level: geo.minBendRadius < hoop.minBendM * 0.85 ? 'bad' : 'warn',
      text: `Tightest bend is ${geo.minBendRadius.toFixed(2)} m at the ${geo.bendAt}, under the ~${hoop.minBendM.toFixed(2)} m cold-bend guide for this pipe. Raise the peak or narrow the span so it does not kink.`,
    })
  }

  const riseRatio = geo.rise / geo.span
  if (riseRatio < 0.22) {
    out.push({
      level: 'bad',
      text: `Arch is pancake (rise ${geo.rise.toFixed(2)} m on ${geo.span.toFixed(1)} m span). Posts take huge outward thrust. Raise the peak.`,
    })
  } else if (riseRatio < 0.3) {
    out.push({
      level: 'warn',
      text: 'Shallow arch. Keep the ridge and two purlins, and do not skip the end guys.',
    })
  }

  if (input.width >= 5 && (input.hoopMaterial === 'conduit20' || input.hoopMaterial === 'poly25')) {
    out.push({
      level: 'bad',
      text: `${input.width.toFixed(1)} m span: 20–25 mm pipe will sag and fold in wind. Use 50 mm rural poly over star pickets, or mill-bent 32 NB galv from a steel supplier.`,
    })
  } else if (input.width >= 4 && input.hoopMaterial === 'conduit20') {
    out.push({
      level: 'warn',
      text: '20 mm conduit is for reach-in beds. Step up to 25 mm poly or 25 NB galv.',
    })
  }

  if (input.postType === 'star' && hoop.idMm < STAR_ACROSS_MM + 2) {
    const smallPvc = input.hoopMaterial === 'conduit20' || input.hoopMaterial === 'conduit25'
    out.push({
      level: smallPvc ? 'bad' : 'warn',
      text: smallPvc
        ? `Small PVC (${hoop.label}) will not slide over a star picket (~${STAR_ACROSS_MM} mm across, bore ~${hoop.idMm} mm). Use 50 mm rural poly.`
        : `Star picket (~${STAR_ACROSS_MM} mm across) does not fit the ${hoop.idMm} mm bore of ${hoop.label}. 50 mm rural poly is the sleeve that fits.`,
    })
  }

  if (input.hoopSpacing > 1.2) {
    out.push({
      level: 'warn',
      text: 'Hoop spacing over 1.2 m: net sags, possums walk it. 1.0 m is the default for this size; 0.8 m if the site is windy.',
    })
  }

  if (WALL_MESH[input.wallMesh].apertureMm >= 50) {
    out.push({
      level: 'warn',
      text: '50 mm mesh keeps adult chooks out, not rabbits. 25 or 40 mm hex, or 25 mm welded mesh, is the tighter wall.',
    })
  }

  if (input.peakHeight < 2 && input.width >= 2.4) {
    out.push({
      level: 'info',
      text: 'Peak under 2 m: you will duck on the path. Fine for a reach-in, tight for walk-in.',
    })
  }

  if (input.meshHeight < 0.9 && input.width >= 2.4) {
    out.push({
      level: 'info',
      text: 'Wire under 0.9 m. Dogs reach over it and you duck at the sides.',
    })
  }

  if (input.doorWidth < 0.9) {
    out.push({
      level: 'info',
      text: 'Door under 0.9 m: wheelbarrow and sleeper lengths will not pass. 1.0 m is the floor for a working garden.',
    })
  }

  if (input.skirtMode === 'none' && input.sleeperBase) {
    out.push({
      level: 'info',
      text: `No skirt. A determined rabbit or fox can dig under a ${(SLEEPER.buryM * 1000).toFixed(0)} mm-deep sleeper.`,
    })
  } else if (input.skirtMode === 'none' || input.skirtDepth < 0.2) {
    out.push({
      level: 'warn',
      text: 'Skirt under 200 mm. Rabbits and dogs go under. Bury a vertical skirt, or fold an L outward, 200–300 mm.',
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
      text: `A ${input.width.toFixed(1)} m span is a sail. Ridge-only is not enough — add two side purlins.`,
    })
  }

  out.push({
    level: geo.wind.over ? 'warn' : 'info',
    text: geo.wind.note,
  })

  return out
}
