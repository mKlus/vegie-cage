import { sameInputs, sanitise, type CageInputs } from './model'

const PARAM = 'cfg'

export function encodeCfg(input: CageInputs): string {
  const json = JSON.stringify(input)
  const bytes = new TextEncoder().encode(json)
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

export function decodeCfg(token: string): CageInputs | null {
  try {
    const pad = token.length % 4 === 0 ? '' : '='.repeat(4 - (token.length % 4))
    const b64 = token.replace(/-/g, '+').replace(/_/g, '/') + pad
    const bin = atob(b64)
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0))
    const json = new TextDecoder().decode(bytes)
    return sanitise(JSON.parse(json) as Partial<CageInputs>)
  } catch {
    return null
  }
}

export function readShare(search: string): CageInputs | null {
  const token = new URLSearchParams(search).get(PARAM)
  if (!token) return null
  return decodeCfg(token)
}

/** Debounce for the address-bar mirror. WebKit allows ~100 replaceState calls per 10s. */
export const SHARE_WRITE_MS = 300

/**
 * Write `?cfg=` only when the decoded settings differ from `input`.
 * Reading a share link must not call replaceState again: that feedback loop
 * blows Safari's history rate limit and the error boundary takes the page down.
 * Returns true when history actually changed.
 */
export function writeShare(input: CageInputs): boolean {
  if (typeof window === 'undefined') return false
  const current = readShare(window.location.search)
  if (current && sameInputs(current, input)) return false
  const url = new URL(window.location.href)
  url.searchParams.set(PARAM, encodeCfg(input))
  const next = `${url.pathname}${url.search}${url.hash}`
  const here = `${window.location.pathname}${window.location.search}${window.location.hash}`
  if (next === here) return false
  window.history.replaceState(null, '', next)
  return true
}

export type SettingsSync = {
  schedule: (input: CageInputs) => void
  /** Drop a pending write. Does not write. */
  cancel: () => void
  /** Write the pending settings now, if they differ from the last write. */
  flush: () => void
}

/** Coalesce a burst of edits into one save/URL write, `delay` ms after the last change. */
export function createDebouncedSync(run: (input: CageInputs) => void, delay = SHARE_WRITE_MS): SettingsSync {
  let timer: ReturnType<typeof setTimeout> | undefined
  let pending: CageInputs | null = null
  let last = ''

  const flush = () => {
    if (timer !== undefined) {
      clearTimeout(timer)
      timer = undefined
    }
    const next = pending
    pending = null
    if (!next) return
    const json = JSON.stringify(next)
    if (json === last) return
    run(next)
    last = json
  }

  const cancel = () => {
    if (timer !== undefined) {
      clearTimeout(timer)
      timer = undefined
    }
    pending = null
  }

  const schedule = (input: CageInputs) => {
    const json = JSON.stringify(input)
    if (json === last) {
      cancel()
      return
    }
    pending = input
    if (timer !== undefined) clearTimeout(timer)
    timer = setTimeout(flush, delay)
  }

  return { schedule, cancel, flush }
}
