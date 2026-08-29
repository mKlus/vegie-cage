import { useEffect, useState } from 'react'
import { THEME_KEY } from './model'

export type ThemePref = 'auto' | 'dark' | 'light'
export type ThemeResolved = 'dark' | 'light'

export const THEME_COLOR = {
  dark: '#12180f',
  light: '#e8eedc',
} as const

export function parseThemePref(raw: unknown): ThemePref {
  return raw === 'dark' || raw === 'light' || raw === 'auto' ? raw : 'auto'
}

export function loadThemePref(): ThemePref {
  try {
    return parseThemePref(localStorage.getItem(THEME_KEY))
  } catch {
    return 'auto'
  }
}

export function saveThemePref(pref: ThemePref): void {
  try {
    localStorage.setItem(THEME_KEY, pref)
  } catch {
    /* private mode */
  }
}

export function systemTheme(): ThemeResolved {
  if (typeof window === 'undefined' || !window.matchMedia) return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function resolveTheme(pref: ThemePref): ThemeResolved {
  return pref === 'auto' ? systemTheme() : pref
}

export function applyTheme(pref: ThemePref): ThemeResolved {
  const resolved = resolveTheme(pref)
  if (typeof document === 'undefined') return resolved
  const root = document.documentElement
  root.dataset.theme = pref
  root.style.colorScheme = resolved
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', THEME_COLOR[resolved])
  return resolved
}

export function useThemePref(): [ThemePref, (pref: ThemePref) => void] {
  const [pref, setPref] = useState<ThemePref>(() => {
    if (typeof document === 'undefined') return 'auto'
    return parseThemePref(document.documentElement.dataset.theme)
  })

  useEffect(() => {
    const stored = loadThemePref()
    setPref(stored)
    applyTheme(stored)
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => {
      if (loadThemePref() === 'auto') applyTheme('auto')
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  function choose(next: ThemePref) {
    setPref(next)
    saveThemePref(next)
    applyTheme(next)
  }

  return [pref, choose]
}
