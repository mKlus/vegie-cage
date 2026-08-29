import { describe, expect, it } from 'vitest'
import { makeBed, OWNED_BIRDIE } from './birdies'
import { buildBom } from './bom'
import { DEFAULTS } from './model'
import { BIRDIES_SHIP_AUD, birdiesBedAud, SOIL_M3_AUD } from './prices'

describe('buildBom', () => {
  it('counts 13 hoops of pipe for the 12 × 6 default', () => {
    const bom = buildBom(DEFAULTS)
    expect(bom.geo.hoopCount).toBe(13)
    const hoop = bom.lines.find((l) => l.id === 'hoop-pipe')
    expect(hoop?.exactM).toBeGreaterThan(13 * 6)
    expect(hoop?.buy).toMatch(/coil/)
  })

  it('wall mesh run is perimeter minus door plus joins', () => {
    const bom = buildBom(DEFAULTS)
    const wall = bom.lines.find((l) => l.id === 'wall-mesh')
    expect(wall?.exactM).toBeGreaterThan(2 * (12 + 6) - 1)
    expect(wall?.buy).toMatch(/roll/)
  })

  it('lists four owned Birdies beds and soil volume', () => {
    const bom = buildBom(DEFAULTS)
    const row = bom.bedLines.find((l) => l.id === 'birdies-1')
    expect(row?.buy).toMatch(/owned/)
    expect(row?.exact).toMatch(/4 bed/)
    expect(row?.inTotal).toBe(false)
    expect(bom.totals.soilM3).toBeGreaterThan(4)
    expect(bom.totals.growM2).toBeCloseTo(4 * 1.22 * 2.44, 1)
  })

  it('plain numbers stay in metres', () => {
    const bom = buildBom(DEFAULTS)
    expect(bom.totals.hoopPipeM).toBeGreaterThan(50)
    expect(bom.totals.netM2).toBeGreaterThan(80)
  })

  it('prices cage separately from owned Birdies (soil only)', () => {
    const bom = buildBom(DEFAULTS)
    expect(bom.lines.some((l) => l.id.startsWith('birdies') || l.id === 'soil')).toBe(false)
    expect(bom.totals.cageAud).toBeGreaterThan(200)
    const soil = bom.bedLines.find((l) => l.id === 'soil')
    expect(soil?.inTotal).toBe(true)
    expect(bom.totals.bedsAud).toBeCloseTo(soil!.lineAud, 2)
    expect(bom.bedLines.find((l) => l.id === 'birdies-ship')).toBeUndefined()
    const hoopLot = bom.lines.find((l) => l.id === 'hoop-pipe-all')
    expect(hoopLot?.inTotal).toBe(true)
    expect(hoopLot!.lineAud).toBeGreaterThan(0)
  })

  it('prices unowned Birdies beds on the beds list only', () => {
    const extra = makeBed({ ...OWNED_BIRDIE, owned: false, x: 0, z: 0, rot: 0 })
    const bom = buildBom({ ...DEFAULTS, beds: [...DEFAULTS.beds, extra] })
    const buy = bom.bedLines.find((l) => l.id.startsWith('birdies-') && l.inTotal)
    expect(buy?.qty).toBe(1)
    expect(buy?.lineAud).toBeCloseTo(birdiesBedAud(1.22, 2.44, 0.37), 2)
    expect(bom.bedLines.find((l) => l.id === 'birdies-ship')?.lineAud).toBe(BIRDIES_SHIP_AUD)
    const soil = bom.bedLines.find((l) => l.id === 'soil')
    expect(bom.totals.bedsAud).toBeCloseTo(buy!.lineAud + soil!.lineAud + BIRDIES_SHIP_AUD, 2)
    expect(bom.lines.every((l) => !l.id.startsWith('birdies'))).toBe(true)
    expect(soil?.lineAud).toBeCloseTo(5 * 1.22 * 2.44 * 0.37 * SOIL_M3_AUD, 0)
  })
})
