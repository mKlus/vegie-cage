import { describe, expect, it } from 'vitest'
import { packOwnedFour } from './birdies'
import { buildGeometry, hoopArcLength, hoopRadius, hoopStations, layoutBeds, warnings } from './geometry'
import { DEFAULTS, PRESETS, sanitise } from './model'

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
  it('four owned Birdies fit in the Marek 5×10 default', () => {
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
  it('Marek 5×10 sleeves the pipe on the picket top and keeps the tangent vertical', () => {
    const geo = buildGeometry(DEFAULTS)
    expect(geo.hoopCount).toBe(11)
    expect(geo.actualSpacing).toBeCloseTo(1, 2)
    expect(geo.stickUp).toBeCloseTo(1.2, 2)
    expect(geo.sleeveBot).toBeCloseTo(1, 2)
    expect(geo.sleeveTop).toBeCloseTo(1.2, 2)
    expect(geo.hoopStartY).toBeCloseTo(1.2, 2)
    expect(geo.archKind).toBe('elastica')
    expect(geo.minBendRadius).toBeGreaterThan(1)
    expect(geo.pipeEachM).toBeCloseTo(geo.hoopArcM + 0.4, 2)
    expect(geo.hoopPoints[0]?.y).toBeCloseTo(1, 2)
    const shoulder = geo.hoopPoints[1]!
    const next = geo.hoopPoints[2]!
    expect(next.y).toBeGreaterThan(shoulder.y)
    expect(Math.abs(next.x - shoulder.x) / (next.y - shoulder.y)).toBeLessThan(0.25)
    expect(geo.pickets).toEqual({ hoop: 22, end: 8, jambs: 2, stays: 4, total: 34, caps: 12 })
    expect(geo.net.endAreaM2).toBeLessThan(2 * DEFAULTS.width * DEFAULTS.peakHeight)
    expect(geo.net.endAreaM2).toBeGreaterThan(4)
    expect(geo.net.buy).toBe('3 × 4 × 10 m')
    expect(geo.purlinPoints).toHaveLength(2)
  })

  it('still places 13 hoops on the 12 × 6 preset', () => {
    const preset = PRESETS.find((p) => p.id === '12x6')
    const geo = buildGeometry(sanitise(preset!.patch))
    expect(geo.hoopCount).toBe(13)
    expect(geo.archKind).toBe('elastica')
  })

  it('warns when the wire enters the sleeve or the embed is shallow', () => {
    const overlap = warnings(sanitise({ meshHeight: 1.15 }), buildGeometry(sanitise({ meshHeight: 1.15 })))
    expect(overlap.some((w) => w.level === 'bad' && /sleeve/.test(w.text))).toBe(true)
    const shallow = sanitise({ embedDepth: 0.4, picketLength: 1.8 })
    expect(warnings(shallow, buildGeometry(shallow)).some((w) => /one-third/.test(w.text))).toBe(true)
    const marek = warnings(DEFAULTS, buildGeometry(DEFAULTS))
    expect(marek.some((w) => /one-third/.test(w.text))).toBe(false)
    expect(marek.some((w) => /sleeve/.test(w.text) && w.level === 'bad')).toBe(false)
    expect(marek.some((w) => w.level === 'info' && /rabbit or fox/.test(w.text) && /150 mm/.test(w.text))).toBe(true)
    expect(marek.some((w) => /50 mm mesh/.test(w.text))).toBe(true)
    expect(marek.some((w) => /not engineering/.test(w.text))).toBe(true)
  })

  it('warns when a star picket will not enter small PVC', () => {
    const input = sanitise({ hoopMaterial: 'conduit20' })
    const notes = warnings(input, buildGeometry(input))
    expect(notes.some((w) => /Small PVC/.test(w.text))).toBe(true)
  })
})
