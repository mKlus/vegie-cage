/**
 * Hoop held vertical at both shoulders, then bent.
 * The in-plane shape is an elastica (horizontal thrust, no self-weight):
 * curvature is highest as the pipe leaves the sleeve and eases toward the crown.
 * A non-inflected elastica cannot go flatter than about rise / (span/2) ≈ 0.62.
 * Below that, or above the tall range of this family, the drawing falls back to a
 * vertical-tangent ellipse so the requested peak is still met.
 */

export type ArchPoint = { x: number; y: number }

export type ArchKind = 'elastica' | 'ellipse'

export type ArchShape = {
  kind: ArchKind
  /** Requested rise was below the non-inflected elastica, so an ellipse was used. */
  belowElastica: boolean
  minBendRadius: number
  bendAt: 'shoulder' | 'crown'
  shoulderRadius: number
  crownRadius: number
  arcLength: number
  rise: number
  /** Lowest rise a non-inflected elastica can draw for this span. */
  elasticaMinRise: number
  /** Left shoulder, over the crown, to the right shoulder. */
  points: ArchPoint[]
}

const ALPHA_FLAT = 0.999
const ALPHA_TALL = -40
const HALF_STEPS = 48

type Integrals = { Is: number; Ic: number; Il: number; rho: number }

function integrals(alpha: number, steps = 360): Integrals | null {
  const dth = Math.PI / 2 / steps
  let Is = 0
  let Ic = 0
  let Il = 0
  for (let i = 0; i < steps; i++) {
    const th = (i + 0.5) * dth
    const inside = 1 - alpha * (1 - Math.cos(th))
    if (inside <= 1e-12) return null
    const k = Math.sqrt(inside)
    Is += (Math.sin(th) / k) * dth
    Ic += (Math.cos(th) / k) * dth
    Il += dth / k
  }
  return { Is, Ic, Il, rho: Ic / Is }
}

let rhoCache: { min: number; max: number } | null = null

function rhoBounds(): { min: number; max: number } {
  if (!rhoCache) {
    const flat = integrals(ALPHA_FLAT)
    const tall = integrals(ALPHA_TALL)
    rhoCache = { min: flat?.rho ?? 0.62, max: tall?.rho ?? 1.7 }
  }
  return rhoCache
}

function solveAlpha(rho: number): { alpha: number; integ: Integrals } | null {
  const bounds = rhoBounds()
  if (rho < bounds.min * 0.998 || rho > bounds.max * 1.002) return null
  let lo = ALPHA_TALL
  let hi = ALPHA_FLAT
  let best = integrals(0)
  if (!best) return null
  for (let i = 0; i < 48; i++) {
    const mid = (lo + hi) / 2
    const got = integrals(mid)
    if (!got) {
      hi = mid
      continue
    }
    best = got
    if (got.rho > rho) lo = mid
    else hi = mid
  }
  const alpha = (lo + hi) / 2
  const integ = integrals(alpha) ?? best
  return { alpha, integ }
}

function elastica(span: number, rise: number, shoulderY: number): ArchShape | null {
  const half = span / 2
  const rho = rise / half
  const solved = solveAlpha(rho)
  if (!solved) return null
  const { alpha, integ } = solved
  const k0 = integ.Is / half
  const kCrown = k0 * Math.sqrt(Math.max(0, 1 - alpha))
  const shoulderRadius = 1 / k0
  const crownRadius = kCrown > 1e-8 ? 1 / kCrown : 1e6
  const minBendRadius = Math.min(shoulderRadius, crownRadius)
  const arcLength = (2 * integ.Il) / k0

  const dth = Math.PI / 2 / HALF_STEPS
  const rel: ArchPoint[] = [{ x: 0, y: 0 }]
  let x = 0
  let y = 0
  for (let i = 0; i < HALF_STEPS; i++) {
    const th = (i + 0.5) * dth
    const k = k0 * Math.sqrt(Math.max(1e-12, 1 - alpha * (1 - Math.cos(th))))
    const ds = dth / k
    x += Math.sin(th) * ds
    y += Math.cos(th) * ds
    rel.push({ x, y })
  }
  const sx = half / Math.max(1e-9, rel[rel.length - 1]!.x)
  const sy = rise / Math.max(1e-9, rel[rel.length - 1]!.y)
  const left: ArchPoint[] = rel.map((p) => ({
    x: -half + p.x * sx,
    y: shoulderY + p.y * sy,
  }))
  left[left.length - 1] = { x: 0, y: shoulderY + rise }

  const points = mirror(left)
  return {
    kind: 'elastica',
    belowElastica: false,
    minBendRadius,
    bendAt: shoulderRadius <= crownRadius ? 'shoulder' : 'crown',
    shoulderRadius,
    crownRadius,
    arcLength,
    rise,
    elasticaMinRise: rhoBounds().min * half,
    points,
  }
}

function mirror(left: ArchPoint[]): ArchPoint[] {
  const crown = left[left.length - 1]!
  const right: ArchPoint[] = []
  for (let i = left.length - 2; i >= 0; i--) {
    const p = left[i]!
    right.push({ x: -p.x, y: p.y })
  }
  return [...left.slice(0, -1), crown, ...right]
}

function ellipse(span: number, rise: number, shoulderY: number, belowElastica: boolean): ArchShape {
  const a = span / 2
  const b = rise
  const steps = HALF_STEPS * 2
  const points: ArchPoint[] = []
  let arc = 0
  let prev: ArchPoint | null = null
  for (let i = 0; i <= steps; i++) {
    const phi = Math.PI - (Math.PI * i) / steps
    const p = { x: a * Math.cos(phi), y: shoulderY + b * Math.sin(phi) }
    if (prev) {
      arc += Math.hypot(p.x - prev.x, p.y - prev.y)
    }
    prev = p
    points.push(p)
  }
  const shoulderRadius = (b * b) / a
  const crownRadius = (a * a) / b
  const minBendRadius = Math.min(shoulderRadius, crownRadius)
  return {
    kind: 'ellipse',
    belowElastica,
    minBendRadius,
    bendAt: shoulderRadius <= crownRadius ? 'shoulder' : 'crown',
    shoulderRadius,
    crownRadius,
    arcLength: arc,
    rise,
    elasticaMinRise: rhoBounds().min * a,
    points,
  }
}

/** Semi-ellipse with a vertical tangent at each shoulder. Used by the v2 hoop. */
export function forcedEllipse(span: number, rise: number, shoulderY: number): ArchShape {
  const safeRise = Math.max(0.15, rise)
  const safeSpan = Math.max(0.4, span)
  const minRise = rhoBounds().min * (safeSpan / 2)
  return ellipse(safeSpan, safeRise, shoulderY, safeRise < minRise - 1e-6)
}

export function buildArch(span: number, rise: number, shoulderY: number): ArchShape {
  const safeRise = Math.max(0.15, rise)
  const safeSpan = Math.max(0.4, span)
  const elastic = elastica(safeSpan, safeRise, shoulderY)
  if (elastic) return elastic
  const minRise = rhoBounds().min * (safeSpan / 2)
  return ellipse(safeSpan, safeRise, shoulderY, safeRise < minRise - 1e-6)
}

/** Point on the arch nearest a fraction of the half-arc measured from the crown. */
export function archShoulderPoint(points: ArchPoint[], fractionFromCrown: number): { left: ArchPoint; right: ArchPoint } {
  if (points.length < 3) {
    const p = points[0] ?? { x: 0, y: 0 }
    return { left: p, right: p }
  }
  let crown = 0
  for (let i = 1; i < points.length; i++) {
    if (points[i]!.y > points[crown]!.y) crown = i
  }
  const target = Math.min(0.95, Math.max(0.05, fractionFromCrown))
  return {
    left: walkFromCrown(points, crown, -1, target),
    right: walkFromCrown(points, crown, 1, target),
  }
}

function walkFromCrown(points: ArchPoint[], crown: number, dir: -1 | 1, fraction: number): ArchPoint {
  let total = 0
  for (let i = crown; dir < 0 ? i > 0 : i < points.length - 1; i += dir) {
    const a = points[i]!
    const b = points[i + dir]!
    total += Math.hypot(b.x - a.x, b.y - a.y)
  }
  const want = total * fraction
  let run = 0
  for (let i = crown; dir < 0 ? i > 0 : i < points.length - 1; i += dir) {
    const a = points[i]!
    const b = points[i + dir]!
    const step = Math.hypot(b.x - a.x, b.y - a.y)
    if (run + step >= want) {
      const t = step > 0 ? (want - run) / step : 0
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }
    }
    run += step
  }
  return points[dir < 0 ? 0 : points.length - 1]!
}
