import { describe, expect, it } from 'vitest'
import { computeCage } from './compute'
import { DEFAULTS } from './model'

describe('build guide', () => {
  it('walks the Marek 5×10 in order, with live lengths', () => {
    const result = computeCage()
    expect(result.guide.map((step) => step.id)).toEqual([
      'markout',
      'test-pull',
      'pickets',
      'posts',
      'sleeper',
      'hoops',
      'bolts',
      'battens',
      'headers',
      'diagonals',
      'cold-galv',
      'mesh',
      'gate',
      'cover',
      'tomato',
      'recheck',
    ])
    const text = result.guide.map((step) => `${step.title}\n${step.text}`).join('\n')
    expect(text).toMatch(/1100/)
    expect(text).toMatch(/Dial Before You Dig/)
    expect(text).toMatch(/3-4-5/)
    expect(text).toMatch(/800 mm/)
    expect(text).toMatch(/150 mm/)
    expect(text).toMatch(/8 hoops at 1\.43 m/)
    expect(text).toMatch(/8\.10 m/)
    expect(text).toMatch(/Seven roof battens|seven|Ridge/)
    expect(text).toMatch(/No tensioned wires/)
    expect(text).toMatch(/1\.89 m/)
    expect(text).toMatch(/36\.9°/)
    expect(text).toMatch(/no Gripples/)
    expect(text).toMatch(/no angle stays/i)
    expect(result.guide.find((step) => step.id === 'diagonals')?.text).toMatch(/Stays & bracing/)
    expect(result.guide.find((step) => step.id === 'gate')?.text).toMatch(/opens outward/)
    expect(result.guide.find((step) => step.id === 'mesh')?.text).toMatch(/No chicken wire/)
    expect(result.guide.find((step) => step.id === 'mesh')?.text).toMatch(/No apron/)
    const hoops = result.guide.find((step) => step.id === 'hoops')
    expect(hoops?.text).toContain(result.geometry.pipeEachM.toFixed(2))
    expect(result.guide.find((step) => step.id === 'tomato')?.text).toMatch(/Ultrapost/)
    expect(result.guide.find((step) => step.id === 'tomato')?.text).toMatch(/not on the walls/)
    expect(result.geometry.hoopCount).toBe(8)
    expect(result.geometry.peakY).toBeCloseTo(DEFAULTS.peakHeight, 2)
    expect(result.warnings.some((w) => /not engineering/.test(w.text))).toBe(true)
  })

  it('shade cloth guide adds the mid-bay pair', () => {
    const result = computeCage({ cover: 'shade-30', hoopSpacing: 1.25 })
    const step = result.guide.find((s) => s.id === 'diagonals')
    expect(result.geometry.hoopCount).toBe(9)
    expect(step?.text).toMatch(/6 in all/)
    expect(step?.text).toMatch(/1\.75 m/)
    expect(step?.text).toMatch(/bay 4/)
    expect(step?.text).toMatch(/40\.7°/)
  })
})
