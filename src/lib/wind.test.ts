import { describe, expect, it } from 'vitest'
import { windCheck } from './wind'

const base = {
  spacing: 1,
  wireHeight: 1,
  peakY: 2.75,
  shoulderY: 1.2,
  stickUp: 1.2,
  embedDepth: 0.6,
  postType: 'star' as const,
}

describe('windCheck', () => {
  it('scales the moment with the square of the gust and labels itself rough', () => {
    const low = windCheck({ ...base, gustMs: 20 })
    const high = windCheck({ ...base, gustMs: 40 })
    expect(high.momentNm).toBeCloseTo(low.momentNm * 4, 0)
    expect(high.note).toMatch(/not engineering/)
    expect(high.note).toMatch(/35% solid/)
    expect(high.capacityNm).toBeGreaterThan(100)
  })

  it('warns at the 40 m/s default and eases off when the gust drops', () => {
    expect(windCheck({ ...base, gustMs: 40 }).over).toBe(true)
    expect(windCheck({ ...base, gustMs: 20 }).over).toBe(false)
  })
})
