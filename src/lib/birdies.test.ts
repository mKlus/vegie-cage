import { describe, expect, it } from 'vitest'
import { bedBox, bedInsideCage, boxesOverlap, packOwnedFour, snap } from './birdies'

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
