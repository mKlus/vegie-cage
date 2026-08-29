import { makeBed, packOwnedFour, sanitiseBed, type PlacedBed } from './birdies'
import {
  DEFAULT_AISLE_DOOR,
  DEFAULT_AISLE_WALK,
  DEFAULT_AISLE_WALL_LONG,
  DEFAULT_AISLE_WALL_SHORT,
  DEFAULT_AISLE_WORK,
  DEFAULT_INSERT,
  type Aisles,
} from './layout'

export type { PlacedBed }

export type HoopOrigin = 'ground' | 'rail'
export type HoopMaterial = 'poly25' | 'poly32' | 'poly50' | 'conduit20' | 'conduit25' | 'galv25' | 'galv32'
export type WallMesh = 'hex50' | 'hex25' | 'weld25' | 'weld12'
export type PostType = 'star' | 'pine90' | 'galv50nb'
export type NetType = 'wildlife5' | 'bird5'
export type DoorWall = 'end' | 'side'
export type PurlinSet = 1 | 3

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
  doorWall: DoorWall
  doorWidth: number
  doorHeight: number
  apron: number
  bury: number
  aisleWork: number
  aisleWalk: number
  aisleDoor: number
  aisleWallLong: number
  aisleWallShort: number
  pipeInsert: number
  beds: PlacedBed[]
}

export const DEFAULTS: CageInputs = {
  length: 12,
  width: 6,
  meshHeight: 1.2,
  peakHeight: 2.7,
  hoopSpacing: 1,
  hoopOrigin: 'ground',
  hoopMaterial: 'poly50',
  wallMesh: 'weld25',
  postType: 'star',
  netType: 'wildlife5',
  purlins: 3,
  doorWall: 'end',
  doorWidth: 1,
  doorHeight: 2,
  apron: 0.3,
  bury: 0.15,
  aisleWork: DEFAULT_AISLE_WORK,
  aisleWalk: DEFAULT_AISLE_WALK,
  aisleDoor: DEFAULT_AISLE_DOOR,
  aisleWallLong: DEFAULT_AISLE_WALL_LONG,
  aisleWallShort: DEFAULT_AISLE_WALL_SHORT,
  pipeInsert: DEFAULT_INSERT,
  beds: packOwnedFour(12, 6),
}

export const PRESETS: { id: string; label: string; note: string; patch: Partial<CageInputs> }[] = [
  {
    id: '12x6',
    label: '12 × 6 m walk-in',
    note: 'Four owned Birdies 122 × 244 × 37 cm Pale Eucalypt, packed at the door.',
    patch: { length: 12, width: 6, beds: packOwnedFour(12, 6) },
  },
  {
    id: '10x6',
    label: '10 × 6 m compact',
    note: 'Same width, shorter run. Fewer hoops.',
    patch: { length: 10, width: 6, beds: packOwnedFour(10, 6) },
  },
  {
    id: '14x6',
    label: '14 × 6 m long',
    note: 'Your larger guess. Same cross-section, more bays.',
    patch: { length: 14, width: 6, beds: packOwnedFour(14, 6) },
  },
  {
    id: 'reach',
    label: '4.8 × 1.2 m reach-in',
    note: 'Single bed, no walk-in. 25 mm poly or 20 mm conduit is enough.',
    patch: {
      length: 4.8,
      width: 1.2,
      meshHeight: 0.9,
      peakHeight: 1.4,
      hoopSpacing: 0.8,
      hoopOrigin: 'rail',
      hoopMaterial: 'poly25',
      postType: 'pine90',
      doorWidth: 0.9,
      doorHeight: 1.2,
      purlins: 1,
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
  hoopSpacing: { min: 0.6, max: 2, step: 0.1 },
  doorWidth: { min: 0.7, max: 1.5, step: 0.05 },
  doorHeight: { min: 1.2, max: 2.4, step: 0.05 },
  apron: { min: 0, max: 0.6, step: 0.05 },
  bury: { min: 0, max: 0.4, step: 0.05 },
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

export function sanitise(raw: Partial<CageInputs>): CageInputs {
  const src = { ...DEFAULTS, ...raw }
  const length = clamp(src.length, LIMITS.length.min, LIMITS.length.max)
  const width = clamp(src.width, LIMITS.width.min, LIMITS.width.max)
  const meshHeight = clamp(src.meshHeight, LIMITS.meshHeight.min, LIMITS.meshHeight.max)
  const minPeak = meshHeight + 0.4
  const peakHeight = clamp(src.peakHeight, Math.max(LIMITS.peakHeight.min, minPeak), LIMITS.peakHeight.max)
  const doorWidth = clamp(src.doorWidth, LIMITS.doorWidth.min, Math.min(LIMITS.doorWidth.max, width - 0.4))
  const doorHeight = clamp(src.doorHeight, LIMITS.doorHeight.min, Math.min(LIMITS.doorHeight.max, peakHeight - 0.05))
  const beds = Array.isArray(src.beds) && src.beds.length > 0 ? src.beds.map(sanitiseBed) : packOwnedFour(length, width)
  return {
    length,
    width,
    meshHeight,
    peakHeight,
    hoopSpacing: clamp(src.hoopSpacing, LIMITS.hoopSpacing.min, LIMITS.hoopSpacing.max),
    hoopOrigin: src.hoopOrigin === 'rail' ? 'rail' : 'ground',
    hoopMaterial: src.hoopMaterial,
    wallMesh: src.wallMesh,
    postType: src.postType,
    netType: src.netType,
    purlins: src.purlins === 1 ? 1 : 3,
    doorWall: src.doorWall === 'side' ? 'side' : 'end',
    doorWidth,
    doorHeight,
    apron: clamp(src.apron, LIMITS.apron.min, LIMITS.apron.max),
    bury: clamp(src.bury, LIMITS.bury.min, LIMITS.bury.max),
    aisleWork: clamp(
      src.aisleWork ?? (src as { aisle?: number }).aisle ?? DEFAULT_AISLE_WORK,
      LIMITS.aisleWork.min,
      LIMITS.aisleWork.max,
    ),
    aisleWalk: clamp(src.aisleWalk ?? DEFAULT_AISLE_WALK, LIMITS.aisleWalk.min, LIMITS.aisleWalk.max),
    aisleDoor: clamp(
      src.aisleDoor ?? (src as { aisleWall?: number }).aisleWall ?? DEFAULT_AISLE_DOOR,
      LIMITS.aisleDoor.min,
      LIMITS.aisleDoor.max,
    ),
    aisleWallLong: clamp(
      src.aisleWallLong ?? (src as { aisleWall?: number }).aisleWall ?? DEFAULT_AISLE_WALL_LONG,
      LIMITS.aisleWallLong.min,
      LIMITS.aisleWallLong.max,
    ),
    aisleWallShort: clamp(
      src.aisleWallShort ?? src.aisleWalk ?? DEFAULT_AISLE_WALL_SHORT,
      LIMITS.aisleWallShort.min,
      LIMITS.aisleWallShort.max,
    ),
    pipeInsert: clamp(src.pipeInsert ?? DEFAULT_INSERT, LIMITS.pipeInsert.min, LIMITS.pipeInsert.max),
    beds,
  }
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

export const HOOP_MATERIAL: Record<
  HoopMaterial,
  { label: string; odMm: number; stockM: number; stockKind: 'coil' | 'stick'; colour: string }
> = {
  poly25: { label: '25 mm rural poly (coil)', odMm: 25, stockM: 50, stockKind: 'coil', colour: '#1f3d2a' },
  poly32: { label: '32 mm rural poly (coil)', odMm: 32, stockM: 50, stockKind: 'coil', colour: '#1f3d2a' },
  poly50: { label: '50 mm rural poly (coil)', odMm: 50, stockM: 50, stockKind: 'coil', colour: '#163224' },
  conduit20: { label: '20 mm grey conduit × 4 m', odMm: 20, stockM: 4, stockKind: 'stick', colour: '#6b7280' },
  conduit25: { label: '25 mm grey conduit × 4 m', odMm: 25, stockM: 4, stockKind: 'stick', colour: '#6b7280' },
  galv25: { label: '25 NB galv pipe × 6.5 m', odMm: 33.7, stockM: 6.5, stockKind: 'stick', colour: '#8a9399' },
  galv32: { label: '32 NB galv pipe × 6.5 m', odMm: 42.4, stockM: 6.5, stockKind: 'stick', colour: '#8a9399' },
}

export const WALL_MESH: Record<WallMesh, { label: string; apertureMm: number; stockHeights: number[]; stockLengths: number[] }> =
  {
    hex50: { label: 'Chicken wire 50 mm hex', apertureMm: 50, stockHeights: [0.9, 1.2, 1.8], stockLengths: [10, 30] },
    hex25: { label: 'Hex netting 25 mm', apertureMm: 25, stockHeights: [0.9, 1.2, 1.8], stockLengths: [10, 30] },
    weld25: { label: 'Welded cage mesh 25 × 25 mm', apertureMm: 25, stockHeights: [0.9, 1.2, 1.8], stockLengths: [10, 30] },
    weld12: { label: 'Welded mesh 12.5 × 12.5 mm', apertureMm: 12.5, stockHeights: [0.9, 1.2], stockLengths: [5, 10, 30] },
  }

export const POST_TYPE: Record<PostType, { label: string; stockM: number }> = {
  star: { label: 'Star pickets 1650 mm', stockM: 1.65 },
  pine90: { label: '90 × 90 H4 pine', stockM: 2.4 },
  galv50nb: { label: '50 NB galv posts', stockM: 2.4 },
}

export const STORAGE_KEY = 'vegie-cage-inputs'
export const THEME_KEY = 'vegie-cage-theme'
