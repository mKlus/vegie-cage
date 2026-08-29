import { describe, expect, it } from 'vitest'
import { OWNED_BIRDIE, bedBox, boxesOverlap } from './birdies'
import { fillCage, measureGaps, snapBedCentre } from './layout'

const spec = { ...OWNED_BIRDIE, brand: 'birdies' as const, rot: 0 as const }
const aisles = { work: 0.8, walk: 0.6, door: 0.8, wallLong: 0.8, wallShort: 0.6 }

describe('fillCage', () => {
  it('packs more than four 122×244 beds in 12×6 with 800/600 aisles', () => {
    const beds = fillCage(12, 6, aisles, spec, 4)
    expect(beds.length).toBeGreaterThanOrEqual(6)
    expect(beds.filter((b) => b.owned)).toHaveLength(4)
    expect(beds.some((a, i) => beds.slice(i + 1).some((b) => boxesOverlap(a, b, 0.5)))).toBe(false)
  })

  it('fits only one column when 244 cm runs across a 6 m cage', () => {
    const beds = fillCage(12, 6, aisles, { ...spec, rot: 90 }, 4)
    const xs = new Set(beds.map((b) => b.x))
    expect(xs.size).toBe(1)
  })
})

describe('measureGaps', () => {
  it('labels the centre aisle between two columns', () => {
    const beds = fillCage(12, 6, aisles, spec, 4)
    const gaps = measureGaps(beds, { length: 12, width: 6, ...aisles })
    const bedGaps = gaps.filter((g) => g.kind === 'bed')
    expect(bedGaps.length).toBeGreaterThan(0)
    expect(bedGaps.every((g) => g.ok)).toBe(true)
  })
})

describe('snapBedCentre', () => {
  it('snaps a centre toward a work-aisle offset from a neighbour', () => {
    const a = fillCage(12, 6, aisles, spec, 4)[0]!
    const moving = { ...a, id: 'm' }
    const box = bedBox(a)
    const rawX = box.x1 + 0.8 + spec.width / 2 + 0.04
    const snapped = snapBedCentre(rawX, a.z, moving, [a], { length: 12, width: 6, ...aisles })
    expect(Math.abs(snapped.x - (box.x1 + 0.8 + spec.width / 2))).toBeLessThan(0.08)
  })
})
