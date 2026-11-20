import { describe, expect, it } from 'vitest'
import { bedBox, bedInsideCage, boxesOverlap, marekBeds, packOwnedFour, SLEEPER_INNER_INSET_M, snap } from './birdies'

describe('packOwnedFour', () => {
  it('drops four 122 × 244 beds inside a 12 × 6 cage', () => {
    const beds = packOwnedFour(12, 6)
    expect(beds).toHaveLength(4)
    expect(beds.every((b) => b.owned)).toBe(true)
    expect(beds.every((b) => b.width === 1.22 && b.length === 2.44 && b.height === 0.37)).toBe(true)
    expect(beds.every((b) => bedInsideCage(b, 12, 6))).toBe(true)
    expect(beds.some((a, i) => beds.slice(i + 1).some((b) => boxesOverlap(a, b)))).toBe(false)
  })

  it('leaves a centre path of about 0.6 m', () => {
    const beds = packOwnedFour(12, 6)
    const xs = [...new Set(beds.map((b) => b.x))].sort((a, b) => a - b)
    expect(xs).toHaveLength(2)
    expect(xs[1]! - xs[0]!).toBeCloseTo(1.22 + 0.8, 1)
  })
})

describe('marekBeds', () => {
  it('places eight Birdies in the 10 × 4.6 cage, four of them owned', () => {
    const beds = marekBeds()
    expect(beds).toHaveLength(8)
    expect(beds.filter((b) => b.owned)).toHaveLength(4)
    expect(beds.every((b) => b.brand === 'birdies' && b.height === 0.37 && b.rot === 0)).toBe(true)
    expect(beds.every((b) => bedInsideCage(b, 10, 4.6))).toBe(true)
    expect(beds.some((a, i) => beds.slice(i + 1).some((b) => boxesOverlap(a, b)))).toBe(false)

    const byId = Object.fromEntries(beds.map((b) => [b.id, b]))
    for (const [id, z] of [
      ['wall-L1', -3.25],
      ['wall-L2', 0],
      ['wall-L3', 3.25],
    ] as const) {
      expect(byId[id]?.x).toBeCloseTo(-1.96, 2)
      expect(byId[id]?.z).toBeCloseTo(z, 2)
      expect(byId[id]?.width).toBeCloseTo(0.61)
      expect(byId[id]?.length).toBeCloseTo(3.05)
    }
    for (const [id, z] of [
      ['wall-R1', -3.25],
      ['wall-R2', 0],
      ['wall-R3', 3.25],
    ] as const) {
      expect(byId[id]?.x).toBeCloseTo(1.96, 2)
      expect(byId[id]?.z).toBeCloseTo(z, 2)
    }
    expect(byId['mid-1']).toMatchObject({ x: 0, owned: true, width: 1.22, length: 2.44 })
    expect(byId['mid-1']?.z).toBeCloseTo(-0.1, 2)
    expect(byId['mid-2']?.x).toBeCloseTo(0, 2)
    expect(byId['mid-2']?.z).toBeCloseTo(3.55, 2)
    expect(byId['mid-2']?.owned).toBe(true)
    expect(byId['wall-L1']?.owned).toBe(true)
    expect(byId['wall-R1']?.owned).toBe(true)
    expect(['wall-L2', 'wall-L3', 'wall-R2', 'wall-R3'].every((id) => byId[id]?.owned === false)).toBe(true)

    const wall = byId['wall-R1']!
    const outer = wall.x + wall.width / 2
    const innerFace = 4.6 / 2 - SLEEPER_INNER_INSET_M
    expect(innerFace - outer).toBeCloseTo(0.005, 3)
    const mid = byId['mid-1']!
    expect(wall.x - wall.width / 2 - (mid.x + mid.width / 2)).toBeCloseTo(1.045, 3)
  })

  it('rejects a bed past the sleeper inner face', () => {
    const bed = { ...marekBeds()[0]!, x: 2.2 }
    expect(bedInsideCage(bed, 10, 4.6)).toBe(false)
  })
})

describe('snap / box', () => {
  it('snaps to 5 cm', () => {
    expect(snap(1.23)).toBeCloseTo(1.25)
  })

  it('rot 90 swaps footprint', () => {
    const box = bedBox({
      id: 't',
      brand: 'birdies',
      width: 1.22,
      length: 2.44,
      height: 0.37,
      color: 'paleEucalypt',
      rot: 90,
      x: 0,
      z: 0,
      owned: true,
    })
    expect(box.w).toBeCloseTo(2.44)
    expect(box.d).toBeCloseTo(1.22)
  })
})
