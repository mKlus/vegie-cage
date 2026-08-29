import { describe, expect, it } from 'vitest'
import { packOwnedFour } from './birdies'
import { buildGeometry, hoopArcLength, hoopRadius, hoopStations, layoutBeds } from './geometry'
import { DEFAULTS, sanitise } from './model'

describe('hoop math', () => {
  it('semicircle of span 2 rise 1 has radius 1 and arc π', () => {
    expect(hoopRadius(2, 1)).toBeCloseTo(1, 8)
    expect(hoopArcLength(2, 1)).toBeCloseTo(Math.PI, 8)
  })

  it('6 m span 3 m rise is a semicircle of radius 3', () => {
    expect(hoopRadius(6, 3)).toBeCloseTo(3, 8)
    expect(hoopArcLength(6, 3)).toBeCloseTo(3 * Math.PI, 6)
  })

  it('shallow cap has radius bigger than half-span', () => {
    const r = hoopRadius(6, 1.4)
    expect(r).toBeGreaterThan(3)
    expect(hoopArcLength(6, 1.4)).toBeGreaterThan(6)
    expect(hoopArcLength(6, 1.4)).toBeLessThan(6 * 1.5)
  })
})

describe('hoop stations', () => {
  it('12 m at 1 m spacing is 13 hoops including ends', () => {
    const zs = hoopStations(12, 1)
    expect(zs).toHaveLength(13)
    expect(zs[0]).toBeCloseTo(-6)
    expect(zs[12]).toBeCloseTo(6)
  })
})

describe('beds', () => {
  it('four owned Birdies fit in the 12 × 6 default', () => {
    const { fit, beds } = layoutBeds(DEFAULTS)
    expect(beds).toHaveLength(4)
    expect(fit).toBe(true)
  })

  it('flags overflow when a bed sits outside', () => {
    const beds = packOwnedFour(12, 6).map((b, i) => (i === 0 ? { ...b, x: 10 } : b))
    const { fit } = layoutBeds({ ...DEFAULTS, beds })
    expect(fit).toBe(false)
  })
})

describe('buildGeometry', () => {
  it('ground origin net arc is shorter than full hoop', () => {
    const geo = buildGeometry(DEFAULTS)
    expect(geo.hoopCount).toBe(13)
    expect(geo.hoopStartY).toBeCloseTo(DEFAULTS.pipeInsert)
    expect(geo.netArcM).toBeLessThan(geo.hoopArcM)
    expect(geo.pipeEachM).toBeGreaterThan(geo.hoopArcM)
    expect(geo.hoopPoints[0]?.y).toBeCloseTo(0)
  })

  it('rail origin net arc equals hoop arc', () => {
    const geo = buildGeometry(sanitise({ hoopOrigin: 'rail', peakHeight: 2.7, meshHeight: 1.2 }))
    expect(geo.netArcM).toBeCloseTo(geo.hoopArcM, 2)
    expect(geo.hoopStartY).toBeCloseTo(1.2)
  })
})
