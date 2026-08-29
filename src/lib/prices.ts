/** AUD GST-inc ballpark, Mitre 10 / Bunnings / Birdies / steel yards 2026. Not a quote. */

import type { HoopMaterial, PostType } from './model'

export const PRICE_NOTE = 'AUD GST-inc estimate, 2026 retail. Not a quote — check Mitre 10, Bunnings, steel yard, Birdies.'

export const HOOP_COIL_AUD: Record<HoopMaterial, { unitAud: number; unit: string }> = {
  poly25: { unitAud: 82, unit: '50 m coil' },
  poly32: { unitAud: 130, unit: '50 m coil' },
  poly50: { unitAud: 284, unit: '50 m coil' },
  conduit20: { unitAud: 8.5, unit: '4 m stick' },
  conduit25: { unitAud: 12, unit: '4 m stick' },
  galv25: { unitAud: 55, unit: '6.5 m stick' },
  galv32: { unitAud: 72, unit: '6.5 m stick' },
}

export const POST_EACH_AUD: Record<PostType, number> = {
  star: 9.5,
  pine90: 26,
  galv50nb: 38,
}

export const PINE_70x35_2_4_AUD = 6.8
export const PINE_70x35_5_4_AUD = 14.5
export const SOIL_M3_AUD = 95
export const NET_M2_AUD = 2.4
export const TIES_100_AUD = 8
export const SADDLE_AUD = 0.9
export const STAPLES_KIT_AUD = 22
export const PEG_BAG_AUD = 14
export const CLIP_50_AUD = 16
export const DOOR_IRON_AUD = 52
export const BIRDIES_SHIP_AUD = 25.5

export function meshRollAud(apertureMm: number, heightM: number, lengthM: number): number {
  const area = heightM * lengthM
  const perM2 = apertureMm <= 15 ? 18 : apertureMm <= 30 ? 8.5 : 5.2
  return roundMoney(area * perM2)
}

export function birdiesBedAud(widthM: number, lengthM: number, heightM: number): number {
  const lengthCm = Math.round(lengthM * 100)
  const steps = (lengthCm - 61) / 31
  let price = 168.4 + steps * 17.82
  if (Math.abs(widthM - 0.92) < 0.04) price *= 0.88
  else if (Math.abs(widthM - 0.61) < 0.04) price *= 0.76
  if (Math.abs(heightM - 0.74) < 0.04) price *= 1.72
  return roundMoney(price)
}

export function roundMoney(n: number): number {
  return Math.round(n * 100) / 100
}

export function formatAud(n: number): string {
  return n.toLocaleString('en-AU', { style: 'currency', currency: 'AUD' })
}
