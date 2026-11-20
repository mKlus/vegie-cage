import { readFileSync } from 'node:fs'

import { computeCage } from '../src/lib/compute.ts'
import { presetInputs, type CageInputs } from '../src/lib/model.ts'

type Flags = Record<string, string | true>

const NUMBER_FLAGS: Record<string, keyof CageInputs> = {
  length: 'length',
  width: 'width',
  peak: 'peakHeight',
  wire: 'meshHeight',
  spacing: 'hoopSpacing',
  embed: 'embedDepth',
  sleeve: 'pipeInsert',
  gust: 'windGust',
  picket: 'picketLength',
  'door-width': 'doorWidth',
  'door-height': 'doorHeight',
  'skirt-depth': 'skirtDepth',
}

function parseArgs(argv: string[]): Flags {
  const out: Flags = {}
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (!arg?.startsWith('--')) continue
    const key = arg.slice(2)
    const next = argv[i + 1]
    if (next !== undefined && !next.startsWith('--')) {
      out[key] = next
      i += 1
    } else {
      out[key] = true
    }
  }
  return out
}

function fail(message: string): never {
  process.stderr.write(`${message}\n`)
  process.exit(1)
}

function main(): void {
  const flags = parseArgs(process.argv.slice(2))
  let raw: Partial<CageInputs> = {}

  if (typeof flags.preset === 'string') {
    const preset = presetInputs(flags.preset)
    if (!preset) fail(`Unknown preset "${flags.preset}". Try marek-5x10, 12x6, 10x6, 14x6, reach.`)
    raw = preset
  }

  if (typeof flags.json === 'string') {
    let text: string
    try {
      text = readFileSync(flags.json, 'utf8')
    } catch {
      fail(`Cannot read ${flags.json}`)
    }
    try {
      raw = { ...raw, ...(JSON.parse(text) as Partial<CageInputs>) }
    } catch {
      fail(`Invalid JSON in ${flags.json}`)
    }
  }

  for (const [flag, field] of Object.entries(NUMBER_FLAGS)) {
    const value = flags[flag]
    if (typeof value !== 'string') continue
    const n = Number(value)
    if (!Number.isFinite(n)) fail(`--${flag} needs a number`)
    raw = { ...raw, [field]: n }
  }

  if (flags.skirt === 'buried-vertical' || flags.skirt === 'l-outward' || flags.skirt === 'none') {
    raw = { ...raw, skirtMode: flags.skirt }
  }
  if (flags.sleeper === 'false' || flags.sleeper === '0') raw = { ...raw, sleeperBase: false }
  if (flags.sleeper === 'true' || flags.sleeper === '1') raw = { ...raw, sleeperBase: true }
  if (flags.purlins === 'wire' || flags.purlins === 'pipe') raw = { ...raw, purlinMaterial: flags.purlins }
  if (flags.mesh === 'hex50' || flags.mesh === 'hex40' || flags.mesh === 'hex25' || flags.mesh === 'weld25' || flags.mesh === 'weld12') {
    raw = { ...raw, wallMesh: flags.mesh }
  }

  const result = computeCage(raw)
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
}

main()
