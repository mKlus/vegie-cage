import { describe, expect, it } from 'vitest'
import { buildBom } from './bom'
import { endAnchorOutM, layoutBracing } from './bracing'
import { buildGeometry, hoopStations } from './geometry'
import { buildGuide } from './guide'
import { PRESETS, sanitise } from './model'

describe('layoutBracing', () => {
  const marekZs = hoopStations(10, 1.25)

  it('keeps a 45° end guy inside 1.2–1.5 m of the end wall', () => {
    expect(endAnchorOutM(0.5)).toBe(1.2)
    expect(endAnchorOutM(1.2)).toBe(1.2)
    expect(endAnchorOutM(1.4)).toBe(1.4)
    expect(endAnchorOutM(2)).toBe(1.5)
  })

  it('guys the four corners along the length and every second hoop on +x', () => {
    const b = layoutBracing({
      length: 10,
      width: 5,
      stickUp: 1.2,
      hoopZs: marekZs,
      doorWall: 'end',
    })
    expect(marekZs).toHaveLength(9)
    expect(b.endGuys).toHaveLength(4)
    expect(b.sideGuys).toHaveLength(5)
    expect(b.braces).toHaveLength(4)
    expect(b.anchorCount).toBe(4 + 5)
    expect(b.guyCount).toBe(9)
    expect(b.strainerCount).toBe(9)
    expect(b.braceClipCount).toBe(4)
    expect(b.windward).toBe('+x')
    expect(b.guyWireM).toBeCloseTo(9 * 1.7, 5)

    const nearWind = b.endGuys.find((g) => g.from.x > 0 && g.from.z < 0)
    expect(nearWind?.from).toEqual({ x: 2.5, y: 1.2, z: -5 })
    expect(nearWind?.to.x).toBeCloseTo(2.5, 5)
    expect(nearWind?.to.y).toBe(0)
    expect(nearWind?.to.z).toBeCloseTo(-6.2, 5)
    expect(nearWind?.angleDeg).toBeCloseTo(45, 5)

    const farLee = b.endGuys.find((g) => g.from.x < 0 && g.from.z > 0)
    expect(farLee?.to.z).toBeCloseTo(6.2, 5)

    expect(b.sideGuys.map((g) => g.from.z)).toEqual([-5, -2.5, 0, 2.5, 5])
    for (const g of b.sideGuys) {
      expect(g.from.x).toBeCloseTo(2.5, 5)
      expect(g.to.x).toBeCloseTo(3.7, 5)
      expect(g.to.y).toBe(0)
      expect(g.to.z).toBeCloseTo(g.from.z, 5)
      expect(g.angleDeg).toBeCloseTo(45, 5)
    }

    const nearBrace = b.braces.find((br) => br.from.x > 0 && br.from.z < 0)
    expect(nearBrace?.from).toEqual({ x: 2.5, y: 1.2, z: -5 })
    expect(nearBrace?.to).toEqual({ x: 2.5, y: 0, z: -4 })
    expect(nearBrace?.footAlongSideM).toBe(1)
    const farBrace = b.braces.find((br) => br.from.x < 0 && br.from.z > 0)
    expect(farBrace?.to.z).toBeCloseTo(4, 5)
  })

  it('moves the windward wall off a side door', () => {
    const b = layoutBracing({
      length: 10,
      width: 5,
      stickUp: 1.2,
      hoopZs: marekZs,
      doorWall: 'side',
    })
    expect(b.windward).toBe('-x')
    expect(b.sideGuys[0]?.from.x).toBeCloseTo(-2.5, 5)
    expect(b.sideGuys[0]?.to.x).toBeCloseTo(-3.7, 5)
  })

  it('matches the classic 5×10 bill: 4 end anchors plus the side guys', () => {
    const classic = sanitise({
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
    })
    const geo = buildGeometry(classic)
    const bom = buildBom(classic)
    expect(geo.bracing.anchorCount).toBe(9)
    expect(bom.lines.find((l) => l.id === 'anchors')?.qty).toBe(geo.bracing.anchorCount)
    expect(bom.lines.find((l) => l.id === 'anchors')?.exact).toMatch(/4 end \+ 5 side = 9/)
    expect(bom.lines.find((l) => l.id === 'guys')?.exact).toMatch(
      /4 end × 1\.70 m \+ 5 windward × 1\.70 m = 15\.30 m/,
    )
    expect(bom.lines.find((l) => l.id === 'strainers')?.qty).toBe(9)
    expect(bom.lines.find((l) => l.id === 'strainers')?.note).toMatch(/Unverified/)
    expect(bom.lines.find((l) => l.id === 'strainers')?.inTotal).toBe(true)
    expect(bom.lines.find((l) => l.id === 'brace-clips')?.qty).toBe(4)
    expect(bom.lines.find((l) => l.id === 'brace-clips')?.note).toMatch(/Unverified/)
    expect(bom.lines.find((l) => l.id === 'brace-clips')?.inTotal).toBe(true)

    const step = buildGuide(classic, geo).find((s) => s.id === 'braces')
    expect(step?.text).toMatch(/Stays & bracing/)
    expect(step?.text).toMatch(/4 end \+ 5 side = 9/)
    expect(step?.text).toMatch(/Gripple/)
    expect(step?.text).toMatch(/4 brace clips/)
    expect(step?.text).toMatch(/45°/)
  })

  it('guys every second hoop on the 12 × 6 as well', () => {
    const preset = PRESETS.find((p) => p.id === '12x6')
    const geo = buildGeometry(sanitise(preset!.patch))
    expect(geo.hoopCount).toBe(13)
    expect(geo.bracing.sideGuys).toHaveLength(7)
    expect(geo.bracing.anchorCount).toBe(4 + 7)
    expect(geo.bracing.endAnchorOutM).toBeCloseTo(1.4, 5)
    expect(geo.bracing.endGuys[0]?.angleDeg).toBeCloseTo(45, 5)
  })
})
