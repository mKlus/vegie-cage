import { DEFAULTS, STORAGE_KEY, sanitise, type CageInputs } from './model'

export function loadInputs(): CageInputs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULTS
    return sanitise(JSON.parse(raw) as Partial<CageInputs>)
  } catch {
    return DEFAULTS
  }
}

export function saveInputs(inputs: CageInputs): void {
  try {
    const json = JSON.stringify(inputs)
    if (localStorage.getItem(STORAGE_KEY) === json) return
    localStorage.setItem(STORAGE_KEY, json)
  } catch {
    /* quota */
  }
}
