import { afterEach, describe, expect, it, vi } from 'vitest'
import { DEFAULTS, sanitise } from './model'
import { saveInputs } from './persist'
import { createDebouncedSync, decodeCfg, encodeCfg, readShare, writeShare } from './share'

describe('share links', () => {
  it('round-trips the Marek settings through the URL token', () => {
    const back = decodeCfg(encodeCfg(DEFAULTS))
    expect(back?.length).toBe(10)
    expect(back?.width).toBe(5)
    expect(back?.picketLength).toBe(1.8)
    expect(back?.embedDepth).toBeCloseTo(0.6)
    expect(back?.meshHeight).toBe(1)
    expect(back?.pipeInsert).toBeCloseTo(0.2)
    expect(back?.skirtMode).toBe('none')
    expect(back?.sleeperBase).toBe(true)
    expect(back?.purlinMaterial).toBe('wire')
    expect(back?.windGust).toBe(40)
    expect(back?.beds).toHaveLength(4)
  })

  it('does not replaceState when the URL already decodes to these settings', () => {
    const { replaceState } = installLocation(`http://localhost:5173/?cfg=${encodeCfg(DEFAULTS)}`)
    expect(writeShare(DEFAULTS)).toBe(false)
    expect(replaceState).not.toHaveBeenCalled()
  })

  it('does not replaceState for a non-canonical token of the same settings', () => {
    const shuffled = Object.fromEntries(Object.entries(DEFAULTS).reverse()) as typeof DEFAULTS
    const { replaceState } = installLocation(`http://localhost:5173/?cfg=${encodeCfg(shuffled)}`)
    expect(encodeCfg(shuffled)).not.toBe(encodeCfg(DEFAULTS))
    expect(writeShare(sanitise(DEFAULTS))).toBe(false)
    expect(replaceState).not.toHaveBeenCalled()
  })

  it('writes once when settings change, then stops', () => {
    const { replaceState } = installLocation(`http://localhost:5173/?cfg=${encodeCfg(DEFAULTS)}`)
    const next = sanitise({ ...DEFAULTS, length: 12 })
    expect(writeShare(next)).toBe(true)
    expect(replaceState).toHaveBeenCalledTimes(1)
    expect(readShare(window.location.search)?.length).toBe(12)
    expect(writeShare(next)).toBe(false)
    expect(replaceState).toHaveBeenCalledTimes(1)
  })

  it('reading ?cfg= and writing it back does not loop', () => {
    const { replaceState } = installLocation('http://localhost:5173/')
    let input = DEFAULTS
    for (let i = 0; i < 20; i++) {
      input = readShare(window.location.search) ?? input
      writeShare(input)
    }
    expect(replaceState).toHaveBeenCalledTimes(1)

    replaceState.mockClear()
    for (let i = 0; i < 20; i++) {
      input = readShare(window.location.search) ?? DEFAULTS
      writeShare(input)
    }
    expect(replaceState).not.toHaveBeenCalled()
  })
})

describe('debounced settings sync', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('coalesces a burst into one write 300 ms after the last change', () => {
    vi.useFakeTimers()
    const run = vi.fn()
    const sync = createDebouncedSync(run, 300)
    sync.schedule(DEFAULTS)
    sync.schedule(sanitise({ ...DEFAULTS, length: 11 }))
    sync.schedule(sanitise({ ...DEFAULTS, length: 12 }))
    vi.advanceTimersByTime(299)
    expect(run).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(run).toHaveBeenCalledTimes(1)
    expect(run.mock.calls[0]?.[0].length).toBe(12)
    sync.schedule(sanitise({ ...DEFAULTS, length: 12 }))
    vi.advanceTimersByTime(300)
    expect(run).toHaveBeenCalledTimes(1)
  })

  it('drops a pending write when the edit is reverted', () => {
    vi.useFakeTimers()
    const run = vi.fn()
    const sync = createDebouncedSync(run, 300)
    sync.schedule(sanitise({ ...DEFAULTS, length: 12 }))
    sync.flush()
    run.mockClear()
    sync.schedule(sanitise({ ...DEFAULTS, length: 11 }))
    sync.schedule(sanitise({ ...DEFAULTS, length: 12 }))
    vi.advanceTimersByTime(300)
    expect(run).not.toHaveBeenCalled()
  })
})

describe('localStorage settings', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('does not write again when the stored JSON is unchanged', () => {
    const mem = new Map<string, string>()
    let sets = 0
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => mem.get(key) ?? null,
      setItem: (key: string, value: string) => {
        mem.set(key, value)
        sets += 1
      },
    })
    saveInputs(DEFAULTS)
    saveInputs(DEFAULTS)
    expect(sets).toBe(1)
    saveInputs(sanitise({ ...DEFAULTS, length: 12 }))
    expect(sets).toBe(2)
  })
})

function installLocation(href: string): { replaceState: ReturnType<typeof vi.fn> } {
  const url = new URL(href)
  const replaceState = vi.fn((_state: unknown, _title: string, next: string) => {
    const parsed = new URL(next, url.origin)
    url.pathname = parsed.pathname
    url.search = parsed.search
    url.hash = parsed.hash
  })
  vi.stubGlobal('window', {
    location: {
      get href() {
        return url.href
      },
      get search() {
        return url.search
      },
      get pathname() {
        return url.pathname
      },
      get hash() {
        return url.hash
      },
    },
    history: { replaceState },
  })
  return { replaceState }
}
