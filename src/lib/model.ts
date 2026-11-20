import { makeBed, packOwnedFour, sanitiseBed, type PlacedBed } from './birdies'
import {
  DEFAULT_AISLE_DOOR,
  DEFAULT_AISLE_WALK,
  DEFAULT_AISLE_WALL_LONG,
  DEFAULT_AISLE_WALL_SHORT,
  DEFAULT_AISLE_WORK,
  type Aisles,
} from './layout'

export type { PlacedBed }

export type HoopOrigin = 'ground' | 'rail'
export type HoopMaterial = 'poly25' | 'poly32' | 'poly50' | 'conduit20' | 'conduit25' | 'galv25' | 'galv32'
export type WallMesh = 'hex50' | 'hex40' | 'hex25' | 'weld25' | 'weld12'
export type PostType = 'star' | 'pine90' | 'galv50nb'
export type NetType = 'wildlife5' | 'bird5'
export type DoorWall = 'end' | 'side'
export type PurlinSet = 1 | 3
export type PurlinMaterial = 'pipe' | 'wire'
export type SkirtMode = 'buried-vertical' | 'l-outward' | 'none'

/** 200×50 H4 on edge. The 200 mm face is vertical: 150 mm in the trench, 50 mm above ground. */
export const SLEEPER = {
  faceM: 0.2,
  thickM: 0.05,
  buryM: 0.15,
  revealM: 0.05,
} as const
export type PicketLength = 1.65 | 1.8 | 2.1 | 2.4

export const PICKET_LENGTHS: readonly PicketLength[] = [1.65, 1.8, 2.1, 2.4]

/** Across-points size that has to pass through the hoop bore. Heavy-duty star, mm. */
export const STAR_ACROSS_MM = 40

export type CageInputs = {
  length: number
  width: number
  meshHeight: number
  peakHeight: number
  hoopSpacing: number
  hoopOrigin: HoopOrigin
  hoopMaterial: HoopMaterial
  wallMesh: WallMesh
  postType: PostType
  netType: NetType
  purlins: PurlinSet
  purlinMaterial: PurlinMaterial
  doorWall: DoorWall
  doorWidth: number
  doorHeight: number
  skirtMode: SkirtMode
  skirtDepth: number
  sleeperBase: boolean
  picketLength: PicketLength
  embedDepth: number
  aisleWork: number
  aisleWalk: number
  aisleDoor: number
  aisleWallLong: number
  aisleWallShort: number
  pipeInsert: number
  /** Design gust for the rough wind check, m/s. Not an engineering input. */
  windGust: number
  beds: PlacedBed[]
}

export const DEFAULTS: CageInputs = {
  length: 10,
  width: 5,
  meshHeight: 1,
  peakHeight: 3,
  hoopSpacing: 1.25,
  hoopOrigin: 'ground',
  hoopMaterial: 'poly50',
  wallMesh: 'hex50',
  postType: 'star',
  netType: 'wildlife5',
  purlins: 3,
  purlinMaterial: 'wire',
  doorWall: 'end',
  doorWidth: 1,
  doorHeight: 2,
  skirtMode: 'none',
  skirtDepth: 0.25,
  sleeperBase: true,
  picketLength: 1.8,
  embedDepth: 0.6,
  aisleWork: DEFAULT_AISLE_WORK,
  aisleWalk: DEFAULT_AISLE_WALK,
  aisleDoor: DEFAULT_AISLE_DOOR,
  aisleWallLong: DEFAULT_AISLE_WALL_LONG,
  aisleWallShort: DEFAULT_AISLE_WALL_SHORT,
  pipeInsert: 0.2,
  windGust: 40,
  beds: packOwnedFour(10, 5),
}

export const PRESETS: { id: string; label: string; note: string; patch: Partial<CageInputs> }[] = [
  {
    id: 'marek-5x10',
    label: 'Marek 5×10',
    note: '10 × 5 m, peak 3.0 m. 9 hoops at 1.25 m. 1.8 m pickets driven 600 mm, 1.0 m wire from ground level, sleeve 1.0–1.2 m, one 50 mm poly ridge, two 2.5 mm purlin wires, no skirt, 200×50 sleeper 150 mm in / 50 mm up.',
    patch: {
      length: 10,
      width: 5,
      meshHeight: 1,
      peakHeight: 3,
      hoopSpacing: 1.25,
      hoopOrigin: 'ground',
      hoopMaterial: 'poly50',
      wallMesh: 'hex50',
      postType: 'star',
      netType: 'wildlife5',
      purlins: 3,
      purlinMaterial: 'wire',
      doorWall: 'end',
      doorWidth: 1,
      doorHeight: 2,
      skirtMode: 'none',
      skirtDepth: 0.25,
      sleeperBase: true,
      picketLength: 1.8,
      embedDepth: 0.6,
      pipeInsert: 0.2,
      windGust: 40,
      beds: packOwnedFour(10, 5),
    },
  },
  {
    id: '12x6',
    label: '12 × 6 m walk-in',
    note: 'Wider span. Taller peak so the pipe can leave the sleeve vertical. Four owned Birdies.',
    patch: {
      length: 12,
      width: 6,
      meshHeight: 1.2,
      peakHeight: 3.3,
      hoopSpacing: 1,
      hoopMaterial: 'poly50',
      wallMesh: 'weld25',
      postType: 'star',
      purlins: 3,
      purlinMaterial: 'wire',
      picketLength: 2.1,
      embedDepth: 0.7,
      pipeInsert: 0.2,
      sleeperBase: true,
      skirtMode: 'buried-vertical',
      skirtDepth: 0.25,
      beds: packOwnedFour(12, 6),
    },
  },
  {
    id: '10x6',
    label: '10 × 6 m compact',
    note: 'Same 6 m cross-section, shorter run.',
    patch: {
      length: 10,
      width: 6,
      meshHeight: 1.2,
      peakHeight: 3.3,
      hoopSpacing: 1,
      picketLength: 2.1,
      embedDepth: 0.7,
      pipeInsert: 0.2,
      wallMesh: 'weld25',
      beds: packOwnedFour(10, 6),
    },
  },
  {
    id: '14x6',
    label: '14 × 6 m long',
    note: 'Same 6 m cross-section, more bays.',
    patch: {
      length: 14,
      width: 6,
      meshHeight: 1.2,
      peakHeight: 3.3,
      hoopSpacing: 1,
      picketLength: 2.1,
      embedDepth: 0.7,
      pipeInsert: 0.2,
      wallMesh: 'weld25',
      beds: packOwnedFour(14, 6),
    },
  },
  {
    id: 'reach',
    label: '4.8 × 1.2 m reach-in',
    note: 'Single bed, no walk-in. 25 mm poly is enough. Wire stops below the sleeve.',
    patch: {
      length: 4.8,
      width: 1.2,
      meshHeight: 0.75,
      peakHeight: 1.55,
      hoopSpacing: 0.8,
      hoopOrigin: 'rail',
      hoopMaterial: 'poly25',
      postType: 'pine90',
      wallMesh: 'hex25',
      doorWidth: 0.9,
      doorHeight: 1.2,
      purlins: 1,
      purlinMaterial: 'pipe',
      picketLength: 1.65,
      embedDepth: 0.7,
      pipeInsert: 0.15,
      sleeperBase: false,
      skirtMode: 'l-outward',
      skirtDepth: 0.2,
      windGust: 30,
      beds: [
        makeBed({
          id: 'owned-1',
          brand: 'birdies',
          width: 1.22,
          length: 2.44,
          height: 0.37,
          color: 'paleEucalypt',
          rot: 90,
          x: 0,
          z: 0,
          owned: true,
        }),
      ],
    },
  },
]

export const LIMITS = {
  length: { min: 2, max: 20, step: 0.1 },
  width: { min: 1, max: 8, step: 0.1 },
  meshHeight: { min: 0.6, max: 1.8, step: 0.05 },
  peakHeight: { min: 1.2, max: 3.6, step: 0.05 },
  hoopSpacing: { min: 0.6, max: 2, step: 0.05 },
  doorWidth: { min: 0.7, max: 1.5, step: 0.05 },
  doorHeight: { min: 1.2, max: 2.4, step: 0.05 },
  skirtDepth: { min: 0.1, max: 0.45, step: 0.05 },
  embedDepth: { min: 0.3, max: 1.2, step: 0.05 },
  windGust: { min: 15, max: 60, step: 1 },
  aisleWork: { min: 0.4, max: 1.5, step: 0.05 },
  aisleWalk: { min: 0.4, max: 1.2, step: 0.05 },
  aisleDoor: { min: 0.4, max: 1.5, step: 0.05 },
  aisleWallLong: { min: 0.4, max: 1.5, step: 0.05 },
  aisleWallShort: { min: 0.4, max: 1.2, step: 0.05 },
  pipeInsert: { min: 0.08, max: 0.35, step: 0.01 },
} as const

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100
}

export function formatM(n: number, digits = 2): string {
  const v = Number.isInteger(n) ? String(n) : n.toFixed(digits).replace(/0+$/, '').replace(/\.$/, '')
  return `${v} m`
}

export function formatM2(n: number): string {
  return `${n.toFixed(1)} m²`
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value) ? (value as T) : fallback
}

export function nearestPicketLength(n: number): PicketLength {
  return PICKET_LENGTHS.reduce((best, x) => (Math.abs(x - n) < Math.abs(best - n) ? x : best))
}

export type FrameHeights = {
  stickUp: number
  sleeveTop: number
  sleeveBot: number
  wireTop: number
  overlaps: boolean
}

/** Shoulder is the picket top. The sleeve is the top `pipeInsert` of that stick-up. */
export function frameHeights(
  input: Pick<CageInputs, 'picketLength' | 'embedDepth' | 'pipeInsert' | 'meshHeight'>,
): FrameHeights {
  const stickUp = round2(input.picketLength - input.embedDepth)
  const sleeveTop = stickUp
  const sleeveBot = round2(stickUp - input.pipeInsert)
  const wireTop = input.meshHeight
  const overlaps = wireTop > sleeveBot + 0.001
  return { stickUp, sleeveTop, sleeveBot, wireTop, overlaps }
}

type LegacyInputs = Partial<CageInputs> & { apron?: number; bury?: number; aisle?: number; aisleWall?: number }

/** Structural equality for persisted settings. Key order follows sanitise(). */
export function sameInputs(a: CageInputs, b: CageInputs): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

export function sanitise(raw: LegacyInputs): CageInputs {
  const src: LegacyInputs = { ...DEFAULTS, ...raw }
  const length = clamp(num(src.length, DEFAULTS.length), LIMITS.length.min, LIMITS.length.max)
  const width = clamp(num(src.width, DEFAULTS.width), LIMITS.width.min, LIMITS.width.max)
  const meshHeight = clamp(num(src.meshHeight, DEFAULTS.meshHeight), LIMITS.meshHeight.min, LIMITS.meshHeight.max)
  const minPeak = meshHeight + 0.3
  const peakHeight = clamp(
    num(src.peakHeight, DEFAULTS.peakHeight),
    Math.max(LIMITS.peakHeight.min, minPeak),
    LIMITS.peakHeight.max,
  )
  const doorWidth = clamp(
    num(src.doorWidth, DEFAULTS.doorWidth),
    LIMITS.doorWidth.min,
    Math.min(LIMITS.doorWidth.max, width - 0.3),
  )
  const doorHeight = clamp(
    num(src.doorHeight, DEFAULTS.doorHeight),
    LIMITS.doorHeight.min,
    Math.min(LIMITS.doorHeight.max, peakHeight - 0.05),
  )
  const picketLength = nearestPicketLength(num(src.picketLength, DEFAULTS.picketLength))
  const embedDepth = clamp(
    num(src.embedDepth, DEFAULTS.embedDepth),
    LIMITS.embedDepth.min,
    Math.min(LIMITS.embedDepth.max, picketLength - 0.4),
  )
  const skirt = skirtFromLegacy(raw, src)
  const beds =
    Array.isArray(src.beds) && src.beds.length > 0 ? src.beds.map(sanitiseBed) : packOwnedFour(length, width)
  return {
    length,
    width,
    meshHeight,
    peakHeight,
    hoopSpacing: clamp(num(src.hoopSpacing, DEFAULTS.hoopSpacing), LIMITS.hoopSpacing.min, LIMITS.hoopSpacing.max),
    hoopOrigin: src.hoopOrigin === 'rail' ? 'rail' : 'ground',
    hoopMaterial: oneOf(src.hoopMaterial, HOOP_MATERIALS, DEFAULTS.hoopMaterial),
    wallMesh: oneOf(src.wallMesh, WALL_MESHES, DEFAULTS.wallMesh),
    postType: oneOf(src.postType, POST_TYPES, DEFAULTS.postType),
    netType: src.netType === 'bird5' ? 'bird5' : 'wildlife5',
    purlins: src.purlins === 1 ? 1 : 3,
    purlinMaterial: src.purlinMaterial === 'pipe' ? 'pipe' : 'wire',
    doorWall: src.doorWall === 'side' ? 'side' : 'end',
    doorWidth,
    doorHeight,
    skirtMode: skirt.mode,
    skirtDepth: clamp(skirt.depth, LIMITS.skirtDepth.min, LIMITS.skirtDepth.max),
    sleeperBase: src.sleeperBase !== false,
    picketLength,
    embedDepth,
    aisleWork: clamp(
      num(src.aisleWork ?? src.aisle, DEFAULT_AISLE_WORK),
      LIMITS.aisleWork.min,
      LIMITS.aisleWork.max,
    ),
    aisleWalk: clamp(num(src.aisleWalk, DEFAULT_AISLE_WALK), LIMITS.aisleWalk.min, LIMITS.aisleWalk.max),
    aisleDoor: clamp(
      num(src.aisleDoor ?? src.aisleWall, DEFAULT_AISLE_DOOR),
      LIMITS.aisleDoor.min,
      LIMITS.aisleDoor.max,
    ),
    aisleWallLong: clamp(
      num(src.aisleWallLong ?? src.aisleWall, DEFAULT_AISLE_WALL_LONG),
      LIMITS.aisleWallLong.min,
      LIMITS.aisleWallLong.max,
    ),
    aisleWallShort: clamp(
      num(src.aisleWallShort ?? src.aisleWalk, DEFAULT_AISLE_WALL_SHORT),
      LIMITS.aisleWallShort.min,
      LIMITS.aisleWallShort.max,
    ),
    pipeInsert: clamp(num(src.pipeInsert, DEFAULTS.pipeInsert), LIMITS.pipeInsert.min, LIMITS.pipeInsert.max),
    windGust: clamp(num(src.windGust, DEFAULTS.windGust), LIMITS.windGust.min, LIMITS.windGust.max),
    beds,
  }
}

function num(value: unknown, fallback: number): number {
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : fallback
}

function skirtFromLegacy(raw: LegacyInputs, src: LegacyInputs): { mode: SkirtMode; depth: number } {
  if (raw.skirtMode === 'buried-vertical' || raw.skirtMode === 'l-outward' || raw.skirtMode === 'none') {
    return { mode: raw.skirtMode, depth: num(raw.skirtDepth, DEFAULTS.skirtDepth) }
  }
  if (typeof raw.apron === 'number' && raw.apron > 0) {
    return { mode: 'l-outward', depth: raw.apron }
  }
  if (typeof raw.bury === 'number' && raw.bury > 0) {
    return { mode: 'buried-vertical', depth: raw.bury }
  }
  if (src.skirtMode === 'l-outward' || src.skirtMode === 'none' || src.skirtMode === 'buried-vertical') {
    return { mode: src.skirtMode, depth: num(src.skirtDepth, DEFAULTS.skirtDepth) }
  }
  return { mode: DEFAULTS.skirtMode, depth: DEFAULTS.skirtDepth }
}

export function presetInputs(id: string): CageInputs | null {
  const preset = PRESETS.find((p) => p.id === id)
  if (!preset) return null
  return sanitise(preset.patch)
}

export function inputAisles(input: Pick<CageInputs, 'aisleWork' | 'aisleWalk' | 'aisleDoor' | 'aisleWallLong' | 'aisleWallShort'>): Aisles {
  return {
    work: input.aisleWork,
    walk: input.aisleWalk,
    door: input.aisleDoor,
    wallLong: input.aisleWallLong,
    wallShort: input.aisleWallShort,
  }
}

export const HOOP_MATERIALS = ['poly25', 'poly32', 'poly50', 'conduit20', 'conduit25', 'galv25', 'galv32'] as const
export const WALL_MESHES = ['hex50', 'hex40', 'hex25', 'weld25', 'weld12'] as const
export const POST_TYPES = ['star', 'pine90', 'galv50nb'] as const

export const HOOP_MATERIAL: Record<
  HoopMaterial,
  {
    label: string
    odMm: number
    /** Approximate bore. Star pickets need this above STAR_ACROSS_MM. */
    idMm: number
    /** Cold-bend guide. Warn when the tightest radius drops under this. */
    minBendM: number
    stockM: number
    stockKind: 'coil' | 'stick'
    colour: string
  }
> = {
  poly25: { label: '25 mm rural poly (coil)', odMm: 25, idMm: 21, minBendM: 0.55, stockM: 50, stockKind: 'coil', colour: '#1f3d2a' },
  poly32: { label: '32 mm rural poly (coil)', odMm: 32, idMm: 27, minBendM: 0.7, stockM: 50, stockKind: 'coil', colour: '#1f3d2a' },
  poly50: { label: '50 mm rural poly (coil)', odMm: 50, idMm: 44, minBendM: 1, stockM: 50, stockKind: 'coil', colour: '#163224' },
  conduit20: { label: '20 mm grey conduit × 4 m', odMm: 20, idMm: 16, minBendM: 0.45, stockM: 4, stockKind: 'stick', colour: '#6b7280' },
  conduit25: { label: '25 mm grey conduit × 4 m', odMm: 25, idMm: 20, minBendM: 0.55, stockM: 4, stockKind: 'stick', colour: '#6b7280' },
  galv25: { label: '25 NB galv pipe × 6.5 m', odMm: 33.7, idMm: 28, minBendM: 0.8, stockM: 6.5, stockKind: 'stick', colour: '#8a9399' },
  galv32: { label: '32 NB galv pipe × 6.5 m', odMm: 42.4, idMm: 36, minBendM: 1, stockM: 6.5, stockKind: 'stick', colour: '#8a9399' },
}

const MESH_HEIGHTS = [0.9, 1, 1.2, 1.5, 1.8]

export const WALL_MESH: Record<WallMesh, { label: string; apertureMm: number; stockHeights: number[]; stockLengths: number[] }> =
  {
    hex50: { label: 'Chicken wire 50 mm hex', apertureMm: 50, stockHeights: MESH_HEIGHTS, stockLengths: [10, 30] },
    hex40: { label: 'Chicken wire 40 mm hex', apertureMm: 40, stockHeights: MESH_HEIGHTS, stockLengths: [10, 30] },
    hex25: { label: 'Hex netting 25 mm', apertureMm: 25, stockHeights: MESH_HEIGHTS, stockLengths: [10, 30] },
    weld25: { label: 'Welded cage mesh 25 × 25 mm', apertureMm: 25, stockHeights: MESH_HEIGHTS, stockLengths: [10, 30] },
    weld12: { label: 'Welded mesh 12.5 × 12.5 mm', apertureMm: 12.5, stockHeights: MESH_HEIGHTS, stockLengths: [5, 10, 30] },
  }

export const POST_TYPE: Record<PostType, { label: string }> = {
  star: { label: 'Star pickets' },
  pine90: { label: '90 × 90 H4 pine' },
  galv50nb: { label: '50 NB galv posts' },
}

export const STORAGE_KEY = 'vegie-cage-inputs'
export const THEME_KEY = 'vegie-cage-theme'
