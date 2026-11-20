/** AUD GST-inc shelf prices. `verified` means the figure was read off a retailer page. Others are ballpark. Not a quote. */

import type { HoopMaterial, PicketLength, PostType } from './model'

export type PriceRow = {
  id: string
  label: string
  aud: number
  unit: string
  source: string
  date: string
  verified: boolean
}

const UNVERIFIED = 'Unverified 2026 retail estimate — check Mitre 10, Bunnings, or a steel yard'

function row(
  id: string,
  label: string,
  aud: number,
  unit: string,
  source: string,
  date: string,
  verified: boolean,
): PriceRow {
  return { id, label, aud, unit, source, date, verified }
}

export const PRICE_TABLE: PriceRow[] = [
  row('poly25', '25 mm rural poly, 50 m coil', 82, '50 m coil', UNVERIFIED, '2026-01-01', false),
  row(
    'poly32',
    '32 mm (1¼ in) rural poly, 50 m coil',
    127,
    '50 m coil',
    'Bunnings Vinidex Rural Plus 1¼ in × 50 m (I/N 4779980)',
    '2026-11-20',
    true,
  ),
  row('poly50', '50 mm rural poly, 50 m coil', 284, '50 m coil', UNVERIFIED, '2026-01-01', false),
  row('conduit20', '20 mm grey conduit, 4 m', 8.5, '4 m stick', UNVERIFIED, '2026-01-01', false),
  row('conduit25', '25 mm grey conduit, 4 m', 12, '4 m stick', UNVERIFIED, '2026-01-01', false),
  row('galv25', '25 NB galv pipe, 6.5 m', 55, '6.5 m stick', UNVERIFIED, '2026-01-01', false),
  row('galv32', '32 NB galv pipe, 6.5 m', 72, '6.5 m stick', UNVERIFIED, '2026-01-01', false),
  row('star-1.65', 'Star picket 1.65 m', 9.5, 'each', UNVERIFIED, '2026-01-01', false),
  row(
    'star-1.8',
    'Waratah Galstar Maxy galvanised steel post 1.8 m',
    29.4,
    'each',
    'Southern Farm Supplies Bega receipt',
    '2026-11-20',
    true,
  ),
  row('star-2.1', 'Star picket 2.1 m', 18.5, 'each', UNVERIFIED, '2026-01-01', false),
  row('star-2.4', 'Star picket 2.4 m', 22, 'each', UNVERIFIED, '2026-01-01', false),
  row('pine90', '90 × 90 H4 pine post', 26, 'each', UNVERIFIED, '2026-01-01', false),
  row('galv50nb', '50 NB galv post', 38, 'each', UNVERIFIED, '2026-01-01', false),
  row('pine-70x35-2.4', '70 × 35 H3 pine, 2.4 m', 6.8, '2.4 m', UNVERIFIED, '2026-01-01', false),
  row('pine-70x35-5.4', '70 × 35 H3 pine, 5.4 m', 14.5, '5.4 m', UNVERIFIED, '2026-01-01', false),
  row('sleeper-200x50-2.4', '200 × 50 H4 treated pine, 2.4 m', 22, '2.4 m', UNVERIFIED, '2026-01-01', false),
  row('soil-m3', 'Bulk potting mix', 95, 'm³', UNVERIFIED, '2026-01-01', false),
  row('net-m2', 'Wildlife-safe knitted net', 2.4, 'm²', UNVERIFIED, '2026-01-01', false),
  row('ties-100', 'UV cable ties, bag of 100', 8, '100', UNVERIFIED, '2026-01-01', false),
  row('tie-wire-30', '2.5 mm galvanised tie wire, 30 m', 14, '30 m', UNVERIFIED, '2026-01-01', false),
  row('saddle', 'Pipe saddle', 0.9, 'each', UNVERIFIED, '2026-01-01', false),
  row('staples-kg', 'Galvanised fence staples, 1 kg', 22, 'kg', UNVERIFIED, '2026-01-01', false),
  row('peg-50', 'Landscape staples, bag of 50', 14, '50', UNVERIFIED, '2026-01-01', false),
  row('clip-50', 'Poly hoop / net clips, 50', 16, '50', UNVERIFIED, '2026-01-01', false),
  row('door-iron', 'T-hinges, latch, drop bolt', 52, 'set', UNVERIFIED, '2026-01-01', false),
  row('door-post-50', 'Galvanised round post 50–65 mm × 3.0 m', 65, 'each', UNVERIFIED, '2026-01-01', false),
  row('concrete-20', 'Premix concrete, 20 kg', 9, 'bag', UNVERIFIED, '2026-01-01', false),
  row('mesh-gate-1x2', 'Galvanised mesh gate, about 1.0 × 2.0 m', 165, 'each', UNVERIFIED, '2026-01-01', false),
  row('gate-hardware', 'Galvanised gate hinges and latch', 48, 'set', UNVERIFIED, '2026-01-01', false),
  row('birdies-ship', 'Birdies mainland shipping', 25.5, 'order', 'Birdies listed flat rate', '2026-01-01', false),
  row('hog-500', '19 mm (3/4 in) hog rings, box of 500', 24, '500', UNVERIFIED, '2026-01-01', false),
  row('wire-2.5-100', '2.5 mm fencing wire, 100 m', 28, '100 m', UNVERIFIED, '2026-01-01', false),
  row('wire-2.5-500', '2.5 mm fencing wire, 500 m', 89, '500 m', UNVERIFIED, '2026-01-01', false),
  row('anchor', 'Screw-in ground anchor', 14, 'each', UNVERIFIED, '2026-01-01', false),
  row('brace-clip', 'Star-picket brace clip', 4.5, 'each', UNVERIFIED, '2026-01-01', false),
  row('strainer', 'Wire strainer (Gripple-style)', 6.8, 'each', UNVERIFIED, '2026-01-01', false),
  row('cap-10', 'Star picket safety caps, pack of 10', 12, '10', UNVERIFIED, '2026-01-01', false),
]

const BY_ID = new Map(PRICE_TABLE.map((r) => [r.id, r]))

export function price(id: string): PriceRow {
  const found = BY_ID.get(id)
  if (!found) throw new Error(`missing price ${id}`)
  return found
}

export const PRICE_NOTE =
  'AUD GST-inc. Verified rows are dated retailer prices; the rest are unverified estimates. Not a quote.'

const HOOP_PRICE_ID: Record<HoopMaterial, string> = {
  poly25: 'poly25',
  poly32: 'poly32',
  poly50: 'poly50',
  conduit20: 'conduit20',
  conduit25: 'conduit25',
  galv25: 'galv25',
  galv32: 'galv32',
}

export function hoopPrice(material: HoopMaterial): PriceRow {
  return price(HOOP_PRICE_ID[material])
}

export function postPrice(post: PostType, picketLength: PicketLength): PriceRow {
  if (post === 'star') return price(`star-${picketLength}`)
  if (post === 'pine90') return price('pine90')
  return price('galv50nb')
}

/** Unverified per-m² rates used to roll up mesh. 2026-01-01. */
export function meshRollAud(apertureMm: number, heightM: number, lengthM: number): number {
  const area = heightM * lengthM
  const perM2 = apertureMm <= 15 ? 18 : apertureMm <= 30 ? 8.5 : apertureMm <= 40 ? 6.4 : 5.2
  return roundMoney(area * perM2)
}

export function birdiesBedAud(widthM: number, lengthM: number, heightM: number): number {
  const lengthCm = Math.round(lengthM * 100)
  const steps = (lengthCm - 61) / 31
  let cost = 168.4 + steps * 17.82
  if (Math.abs(widthM - 0.92) < 0.04) cost *= 0.88
  else if (Math.abs(widthM - 0.61) < 0.04) cost *= 0.76
  if (Math.abs(heightM - 0.74) < 0.04) cost *= 1.72
  return roundMoney(cost)
}

export function roundMoney(n: number): number {
  return Math.round(n * 100) / 100
}

export function formatAud(n: number): string {
  return n.toLocaleString('en-AU', { style: 'currency', currency: 'AUD' })
}

export const BIRDIES_SHIP_AUD = price('birdies-ship').aud
export const SOIL_M3_AUD = price('soil-m3').aud
