import { sanitise, type CageInputs } from './model'

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

export function writeShare(input: CageInputs): void {
  if (typeof window === 'undefined') return
  const url = new URL(window.location.href)
  url.searchParams.set(PARAM, encodeCfg(input))
  window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`)
}
