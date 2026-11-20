import { describe, expect, it } from 'vitest'
import { DEFAULTS } from './model'
import { decodeCfg, encodeCfg } from './share'

describe('share links', () => {
  it('round-trips the Marek settings through the URL token', () => {
    const back = decodeCfg(encodeCfg(DEFAULTS))
    expect(back?.length).toBe(10)
    expect(back?.width).toBe(5)
    expect(back?.picketLength).toBe(1.8)
    expect(back?.embedDepth).toBeCloseTo(0.6)
    expect(back?.meshHeight).toBe(1)
    expect(back?.pipeInsert).toBeCloseTo(0.2)
    expect(back?.skirtMode).toBe('buried-vertical')
    expect(back?.sleeperBase).toBe(true)
    expect(back?.purlinMaterial).toBe('wire')
    expect(back?.windGust).toBe(40)
    expect(back?.beds).toHaveLength(4)
  })
})
