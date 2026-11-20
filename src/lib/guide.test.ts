import { describe, expect, it } from 'vitest'
import { computeCage } from './compute'
import { DEFAULTS } from './model'

describe('build guide', () => {
  it('walks the Marek 5×10 in order, with live lengths', () => {
    const result = computeCage()
    expect(result.guide.map((step) => step.id)).toEqual([
      'tools',
      'setout',
      'string',
      'pickets',
      'stays',
      'sleeper',
      'lines',
      'mesh',
      'skirt',
      'hoops',
      'ridge',
      'purlins',
      'braces',
      'door',
      'net',
      'caps',
      'check',
    ])
    const text = result.guide.map((step) => `${step.title}\n${step.text}`).join('\n')
    expect(text).toMatch(/1100/)
    expect(text).toMatch(/Dial Before You Dig/)
    expect(text).toMatch(/3-4-5/)
    expect(text).toMatch(/600 mm/)
    expect(text).toMatch(/150 mm/)
    expect(text).toMatch(/50 mm proud/)
    expect(text).toMatch(/9 hoops at 1\.25 m/)
    expect(text).toMatch(/figure-eight/)
    expect(text).toMatch(/19 mm/)
    expect(text).toMatch(/sleeve/)
    expect(text).toMatch(/tek screw/i)
    expect(text).toMatch(/ground anchors/)
    expect(text).toContain('0 m, 1.25 m, 2.5 m, 3.75 m, 5 m, 6.25 m, 7.5 m, 8.75 m, 10 m')
    const hoops = result.guide.find((step) => step.id === 'hoops')
    expect(hoops?.text).toContain(result.geometry.pipeEachM.toFixed(2))
    expect(result.geometry.hoopCount).toBe(9)
    expect(result.geometry.peakY).toBeCloseTo(DEFAULTS.peakHeight, 2)
    expect(result.warnings.some((w) => /not engineering/.test(w.text))).toBe(true)
  })
})
