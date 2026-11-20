import { describe, expect, it } from 'vitest'
import { packOwnedFour } from './birdies'
import { buildGeometry, hoopArcLength, hoopRadius, hoopStations, layoutBeds, warnings } from './geometry'
import { DEFAULTS, PRESETS, sanitise } from './model'

const CLASSIC_5x10 = sanitise({
  design: 'classic',
  length: 10,
  width: 5,
  meshHeight: 1,
  peakHeight: 3,
  hoopSpacing: 1.25,
  wallMesh: 'hex50',
  embedDepth: 0.6,
  pipeInsert: 0.2,
  doorHeight: 2,
  netType: 'wildlife5',
  beds: packOwnedFour(10, 5),
})

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
  it('Marek v2 is 8 hoops, a ground sleeve, and 4 batten diagonals', () => {
    const geo = buildGeometry(DEFAULTS)
    const frame = geo.v2!
    expect(geo.hoopCount).toBe(8)
    expect(geo.hoopZs[1]! - geo.hoopZs[0]!).toBeCloseTo(10 / 7, 5)
    expect(geo.actualSpacing).toBeCloseTo(1.43, 2)
    expect(geo.peakY).toBeCloseTo(2.5, 2)
    expect(geo.stickUp).toBeCloseTo(1, 2)
    expect(geo.sleeveBot).toBeCloseTo(0, 2)
    expect(geo.sleeveTop).toBeCloseTo(1, 2)
    expect(geo.pipeEachM).toBeCloseTo(8.1, 2)
    expect(geo.archKind).toBe('ellipse')
    expect(geo.hoopPoints[0]?.y).toBeCloseTo(0, 2)
    expect(geo.pickets).toEqual({ hoop: 16, end: 0, jambs: 0, stays: 0, total: 16, caps: 0 })
    expect(geo.doorPosts).toEqual([
      { x: -0.555, z: -5 },
      { x: 0.555, z: -5 },
    ])
    expect(frame.endPosts).toHaveLength(4)
    expect(frame.battens.map((m) => m.name)).toEqual([
      'ridge',
      'upper_sh_L',
      'upper_sh_R',
      'lower_sh_L',
      'lower_sh_R',
      'low_L',
      'low_R',
    ])
    expect(frame.battens.find((m) => m.name === 'ridge')?.from.y).toBeCloseTo(2.5, 2)
    expect(frame.battens.find((m) => m.name === 'upper_sh_R')?.from).toMatchObject({ x: 0.99, y: 2.36 })
    expect(frame.battens.find((m) => m.name === 'lower_sh_L')?.from).toMatchObject({ x: -1.86, y: 1.88 })
    expect(frame.battens.find((m) => m.name === 'low_R')?.from).toMatchObject({ x: 2.3, y: 0.9 })
    expect(frame.diagonals).toHaveLength(4)
    expect(frame.diagonalLength).toBeCloseTo(1.787, 3)
    expect(frame.diagonalCut).toBeCloseTo(1.89, 2)
    expect(frame.diagonalAngle).toBeCloseTo(36.9, 1)
    expect(frame.headers).toHaveLength(2)
    expect(frame.headers[0]?.from.y).toBeCloseTo(1.95, 2)
    expect(frame.headers[0]?.cutM).toBeCloseTo(3.56, 2)
    expect(frame.rails.map((m) => m.name)).toEqual(['door_L', 'door_R', 'back'])
    expect(frame.battenStock).toBe(19)
    expect(frame.lapFrom).toBeCloseTo(4.286, 3)
    expect(geo.meshRunM).toBeCloseTo(28.5, 2)
    expect(geo.meshBand).toEqual({ bottom: 0.05, top: 0.95 })
    expect(geo.bracing.guyCount).toBe(0)
    expect(geo.bracing.anchorCount).toBe(0)
    expect(geo.purlinPoints).toHaveLength(0)
    const door = frame.diagonals.find((m) => m.name === 'door_R')!
    expect(door.from.z).toBeCloseTo(-5, 3)
    expect(door.from.y).toBeCloseTo(0.9, 2)
    expect(door.to.y).toBeCloseTo(1.88, 2)
    expect(door.to.z).toBeCloseTo(-5 + 10 / 7, 3)
  })

  it('shade cloth adds a mid-bay pair and shortens the diagonal', () => {
    const geo = buildGeometry(sanitise({ cover: 'shade-30', hoopSpacing: 1.25 }))
    const frame = geo.v2!
    expect(geo.hoopCount).toBe(9)
    expect(geo.actualSpacing).toBeCloseTo(1.25, 2)
    expect(geo.pickets.total).toBe(18)
    expect(frame.diagonals).toHaveLength(6)
    expect(frame.diagonalLength).toBeCloseTo(1.648, 3)
    expect(frame.diagonalCut).toBeCloseTo(1.75, 2)
    expect(frame.diagonalAngle).toBeCloseTo(40.7, 1)
    expect(frame.battenStock).toBe(19)
    expect(frame.lapFrom).toBeCloseTo(5, 2)
    const mid = frame.diagonals.find((m) => m.name === 'mid_R')!
    expect(mid.from.z).toBeCloseTo(-1.25, 2)
    expect(mid.to.z).toBeCloseTo(0, 2)
  })

  it('classic 5×10 still sleeves the pipe on the picket top', () => {
    const geo = buildGeometry(CLASSIC_5x10)
    expect(geo.hoopCount).toBe(9)
    expect(geo.actualSpacing).toBeCloseTo(1.25, 2)
    expect(geo.peakY).toBeCloseTo(3, 2)
    expect(geo.stickUp).toBeCloseTo(1.2, 2)
    expect(geo.sleeveBot).toBeCloseTo(1, 2)
    expect(geo.sleeveTop).toBeCloseTo(1.2, 2)
    expect(geo.archKind).toBe('elastica')
    expect(geo.v2).toBeNull()
    expect(geo.pipeEachM).toBeCloseTo(geo.hoopArcM + 0.4, 2)
    expect(geo.hoopPoints[0]?.y).toBeCloseTo(1, 2)
    const shoulder = geo.hoopPoints[1]!
    const next = geo.hoopPoints[2]!
    expect(next.y).toBeGreaterThan(shoulder.y)
    expect(Math.abs(next.x - shoulder.x) / (next.y - shoulder.y)).toBeLessThan(0.25)
    expect(geo.pickets).toEqual({ hoop: 18, end: 5, jambs: 0, stays: 4, total: 27, caps: 9 })
    expect(geo.doorPosts).toEqual([
      { x: -0.5, z: -5 },
      { x: 0.5, z: -5 },
    ])
    expect(geo.net.buy).toBe('3 × 4 × 10 m')
    expect(geo.purlinPoints).toHaveLength(2)
    expect(geo.bracing.sideGuys).toHaveLength(5)
    expect(geo.bracing.braceCount).toBe(4)
  })

  it('still places 13 hoops on the 12 × 6 preset', () => {
    const preset = PRESETS.find((p) => p.id === '12x6')
    const geo = buildGeometry(sanitise(preset!.patch))
    expect(geo.hoopCount).toBe(13)
    expect(geo.archKind).toBe('elastica')
  })

  it('warns when the wire enters the sleeve or the embed is shallow', () => {
    const classicOverlap = sanitise({ ...CLASSIC_5x10, meshHeight: 1.15 })
    const overlap = warnings(classicOverlap, buildGeometry(classicOverlap))
    expect(overlap.some((w) => w.level === 'bad' && /sleeve/.test(w.text))).toBe(true)
    const shallow = sanitise({ embedDepth: 0.4, picketLength: 1.8 })
    expect(warnings(shallow, buildGeometry(shallow)).some((w) => /one-third/.test(w.text))).toBe(true)
    const marek = warnings(DEFAULTS, buildGeometry(DEFAULTS))
    expect(marek.some((w) => /one-third/.test(w.text))).toBe(false)
    expect(marek.some((w) => /sleeve/.test(w.text) && w.level === 'bad')).toBe(false)
    expect(marek.some((w) => w.level === 'info' && /rabbit or fox/.test(w.text) && /150 mm/.test(w.text))).toBe(true)
    expect(marek.some((w) => /50 mm mesh/.test(w.text))).toBe(false)
    expect(marek.some((w) => /not certified engineering/.test(w.text) && w.level === 'warn')).toBe(true)
    expect(marek.some((w) => /Hoop spacing over 1\.2 m/.test(w.text))).toBe(true)
    expect(marek.some((w) => /slides over a MaxY/.test(w.text))).toBe(true)
    expect(buildGeometry(DEFAULTS).wind.over).toBe(false)
  })

  it('warns when a star picket will not enter small PVC', () => {
    const input = sanitise({ hoopMaterial: 'conduit20' })
    const notes = warnings(input, buildGeometry(input))
    expect(notes.some((w) => /Small PVC/.test(w.text))).toBe(true)
  })
})
