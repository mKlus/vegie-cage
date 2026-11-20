import { describe, expect, it } from 'vitest'
import { buildArch } from './arch'

describe('buildArch', () => {
  it('draws a quarter circle when rise equals half the span', () => {
    const arch = buildArch(2, 1, 0)
    expect(arch.kind).toBe('elastica')
    expect(arch.minBendRadius).toBeCloseTo(1, 2)
    expect(arch.arcLength).toBeCloseTo(Math.PI, 2)
    expect(arch.points[0]?.x).toBeCloseTo(-1, 2)
    expect(arch.points.at(-1)?.x).toBeCloseTo(1, 2)
    expect(arch.points[Math.floor(arch.points.length / 2)]?.y).toBeCloseTo(1, 2)
  })

  it('keeps the Marek 5 m hoop above a 1 m bend', () => {
    const arch = buildArch(5, 1.55, 1.2)
    expect(arch.kind).toBe('elastica')
    expect(arch.belowElastica).toBe(false)
    expect(arch.minBendRadius).toBeGreaterThan(1)
    expect(arch.arcLength).toBeGreaterThan(5)
    expect(arch.arcLength).toBeLessThan(8)
    expect(arch.bendAt).toBe('shoulder')
  })

  it('falls back when the requested arch is flatter than the elastica', () => {
    const arch = buildArch(6, 1.2, 1.2)
    expect(arch.kind).toBe('ellipse')
    expect(arch.belowElastica).toBe(true)
    expect(arch.minBendRadius).toBeGreaterThan(0.2)
    expect(arch.points[0]?.y).toBeCloseTo(1.2, 5)
  })
})
