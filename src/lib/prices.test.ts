import { describe, expect, it } from 'vitest'
import { birdiesBedAud, formatAud, meshRollAud, roundMoney } from './prices'

describe('prices', () => {
  it('interpolates 122 × 244 × 37 from the 61 cm Pale Eucalypt base', () => {
    expect(birdiesBedAud(1.22, 0.61, 0.37)).toBeCloseTo(168.4, 1)
    expect(birdiesBedAud(1.22, 2.44, 0.37)).toBeGreaterThan(250)
    expect(birdiesBedAud(1.22, 2.44, 0.74)).toBeGreaterThan(birdiesBedAud(1.22, 2.44, 0.37) * 1.6)
  })

  it('prices mesh by area and aperture', () => {
    expect(meshRollAud(25, 1.2, 30)).toBeCloseTo(1.2 * 30 * 8.5, 2)
    expect(meshRollAud(12, 0.9, 10)).toBeGreaterThan(meshRollAud(25, 0.9, 10))
  })

  it('formats AUD', () => {
    expect(roundMoney(12.345)).toBe(12.35)
    expect(formatAud(25.5)).toMatch(/25\.50/)
  })
})
