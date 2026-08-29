/** Birdies Select-A-Size (AU). Sizes from birdiesgardenproducts.com.au. ±50 mm mill tolerance. */

export const BIRDIES_WIDTHS_M = [0.61, 0.92, 1.22] as const
export const BIRDIES_HEIGHTS_M = [0.37, 0.74] as const
export const BIRDIES_LENGTHS_M = [
  0.61, 0.92, 1.22, 1.53, 1.83, 2.14, 2.44, 2.75, 3.05, 3.36, 3.66, 3.97, 4.27, 4.58, 4.88, 5.19, 5.49, 5.8, 6.1,
  6.41, 6.71, 7.02, 7.32, 7.62,
] as const

export type BirdiesColor = 'paleEucalypt' | 'paperbark' | 'woodlandGrey' | 'monument' | 'zincalume'

export const BIRDIES_COLORS: Record<BirdiesColor, { label: string; hex: string }> = {
  paleEucalypt: { label: 'Pale Eucalypt (Mist Green)', hex: '#8a9a5e' },
  paperbark: { label: 'Paperbark (Merino)', hex: '#d2c3a6' },
  woodlandGrey: { label: 'Woodland Grey (Slate Grey)', hex: '#6a6d68' },
  monument: { label: 'Monument (Monolith)', hex: '#3c3e3f' },
  zincalume: { label: 'Zincalume (Aluzinc)', hex: '#c4c7c2' },
}

export type PlacedBed = {
  id: string
  brand: 'birdies' | 'custom'
  width: number
  length: number
  height: number
  color: BirdiesColor
  /** 0 = length along cage (Z). 90 = length across cage (X). */
  rot: 0 | 90
  x: number
  z: number
  owned: boolean
}

export const OWNED_BIRDIE = {
  width: 1.22,
  length: 2.44,
  height: 0.37,
  color: 'paleEucalypt' as BirdiesColor,
}

let seq = 1
export function newBedId(): string {
  seq += 1
  return `bed-${seq}-${Math.floor(Math.random() * 1e6).toString(36)}`
}

export function cm(m: number): string {
  return `${Math.round(m * 100)} cm`
}

export function bedLabel(b: Pick<PlacedBed, 'width' | 'length' | 'height' | 'color' | 'brand'>): string {
  const size = `${cm(b.width)} × ${cm(b.length)} × ${cm(b.height)}`
  if (b.brand === 'birdies') return `Birdies Select-A-Size ${size} ${BIRDIES_COLORS[b.color].label}`
  return `Custom ${size}`
}

export function bedSku(b: Pick<PlacedBed, 'width' | 'length' | 'height' | 'color' | 'brand'>): string {
  return `${b.brand}-${b.width}-${b.length}-${b.height}-${b.color}`
}

export function snap(n: number, grid = 0.05): number {
  return Math.round(n / grid) * grid
}

export function bedFootprint(b: Pick<PlacedBed, 'width' | 'length' | 'rot'>): { w: number; d: number } {
  return b.rot === 90 ? { w: b.length, d: b.width } : { w: b.width, d: b.length }
}

export function bedBox(b: PlacedBed): { x0: number; x1: number; z0: number; z1: number; w: number; d: number } {
  const { w, d } = bedFootprint(b)
  return { w, d, x0: b.x - w / 2, x1: b.x + w / 2, z0: b.z - d / 2, z1: b.z + d / 2 }
}

export function boxesOverlap(a: PlacedBed, b: PlacedBed, gap = 0.04): boolean {
  if (a.id === b.id) return false
  const A = bedBox(a)
  const B = bedBox(b)
  return A.x0 < B.x1 + gap && A.x1 + gap > B.x0 && A.z0 < B.z1 + gap && A.z1 + gap > B.z0
}

export function bedInsideCage(b: PlacedBed, cageLength: number, cageWidth: number, margin = 0.05): boolean {
  const box = bedBox(b)
  return (
    box.x0 >= -cageWidth / 2 + margin &&
    box.x1 <= cageWidth / 2 - margin &&
    box.z0 >= -cageLength / 2 + margin &&
    box.z1 <= cageLength / 2 - margin
  )
}

export function makeBed(partial: Partial<PlacedBed> & Pick<PlacedBed, 'x' | 'z'>): PlacedBed {
  return {
    id: partial.id ?? newBedId(),
    brand: partial.brand ?? 'birdies',
    width: partial.width ?? OWNED_BIRDIE.width,
    length: partial.length ?? OWNED_BIRDIE.length,
    height: partial.height ?? OWNED_BIRDIE.height,
    color: partial.color ?? OWNED_BIRDIE.color,
    rot: partial.rot === 90 ? 90 : 0,
    x: partial.x,
    z: partial.z,
    owned: partial.owned ?? false,
  }
}

/** 2×2 of the four owned 122×244×37 beds, centre path, door clearance. */
export function packOwnedFour(cageLength: number, cageWidth: number): PlacedBed[] {
  const W = OWNED_BIRDIE.width
  const L = OWNED_BIRDIE.length
  const work = 0.8
  const walk = 0.6
  const door = 0.8
  const xL = snap(-(work / 2 + W / 2))
  const xR = snap(work / 2 + W / 2)
  const z0 = snap(-cageLength / 2 + door + L / 2)
  const z1 = snap(z0 + L + walk)
  const spec = { brand: 'birdies' as const, ...OWNED_BIRDIE, owned: true, rot: 0 as const }
  void cageWidth
  return [
    makeBed({ ...spec, id: 'owned-1', x: xL, z: z0 }),
    makeBed({ ...spec, id: 'owned-2', x: xR, z: z0 }),
    makeBed({ ...spec, id: 'owned-3', x: xL, z: z1 }),
    makeBed({ ...spec, id: 'owned-4', x: xR, z: z1 }),
  ]
}

export function nearestCatalog(m: number, list: readonly number[]): number {
  return list.reduce((best, n) => (Math.abs(n - m) < Math.abs(best - m) ? n : best), list[0]!)
}

export function sanitiseBed(raw: Partial<PlacedBed>, i: number): PlacedBed {
  const width = nearestCatalog(Number(raw.width) || OWNED_BIRDIE.width, BIRDIES_WIDTHS_M)
  const length = nearestCatalog(Number(raw.length) || OWNED_BIRDIE.length, BIRDIES_LENGTHS_M)
  const height = nearestCatalog(Number(raw.height) || OWNED_BIRDIE.height, BIRDIES_HEIGHTS_M)
  const color = raw.color && raw.color in BIRDIES_COLORS ? raw.color : OWNED_BIRDIE.color
  return makeBed({
    id: typeof raw.id === 'string' && raw.id ? raw.id : `bed-${i + 1}`,
    brand: raw.brand === 'custom' ? 'custom' : 'birdies',
    width: raw.brand === 'custom' ? Math.min(3, Math.max(0.4, Number(raw.width) || width)) : width,
    length: raw.brand === 'custom' ? Math.min(8, Math.max(0.4, Number(raw.length) || length)) : length,
    height: raw.brand === 'custom' ? Math.min(1, Math.max(0.2, Number(raw.height) || height)) : height,
    color,
    rot: raw.rot === 90 ? 90 : 0,
    x: Number.isFinite(raw.x) ? Number(raw.x) : 0,
    z: Number.isFinite(raw.z) ? Number(raw.z) : 0,
    owned: Boolean(raw.owned),
  })
}

export function soilM3(b: PlacedBed): number {
  return b.width * b.length * b.height
}

export function growingM2(b: PlacedBed): number {
  return b.width * b.length
}
