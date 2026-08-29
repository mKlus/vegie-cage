import { BIRDIES_COLORS } from '../lib/birdies'
import type { CageGeometry } from '../lib/geometry'
import { formatM, type CageInputs } from '../lib/model'

type DiagramsProps = {
  input: CageInputs
  geo: CageGeometry
}

function polyline(pts: { x: number; y: number }[], sx: (n: number) => number, sy: (n: number) => number): string {
  return pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join(' ')
}

export function Diagrams({ input, geo }: DiagramsProps) {
  return (
    <div className="diagrams">
      <EndElevation input={input} geo={geo} />
      <SideElevation input={input} geo={geo} />
      <PlanView input={input} geo={geo} />
    </div>
  )
}

function EndElevation({ input, geo }: DiagramsProps) {
  const pad = 28
  const w = 320
  const h = 200
  const maxY = input.peakHeight
  const s = Math.min((w - pad * 2) / input.width, (h - pad * 2) / maxY)
  const sx = (x: number) => w / 2 + x * s
  const sy = (y: number) => h - pad - y * s
  const hoop = polyline(geo.hoopPoints, sx, sy)
  const sleeveH = geo.pipeInsertM
  const sleeveBot = Math.max(0, geo.hoopStartY - sleeveH)
  const postX = input.width / 2
  return (
    <figure>
      <figcaption>End (door)</figcaption>
      <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label="End elevation">
        <line x1={sx(-input.width / 2)} y1={sy(0)} x2={sx(input.width / 2)} y2={sy(0)} className="d-ground" />
        <line x1={sx(-postX)} y1={sy(-0.25)} x2={sx(-postX)} y2={sy(geo.hoopStartY)} className="d-post" />
        <line x1={sx(postX)} y1={sy(-0.25)} x2={sx(postX)} y2={sy(geo.hoopStartY)} className="d-post" />
        <rect
          x={sx(-postX) - 4}
          y={sy(geo.hoopStartY)}
          width={8}
          height={Math.max(2, (geo.hoopStartY - sleeveBot) * s)}
          className="d-sleeve"
        />
        <rect
          x={sx(postX) - 4}
          y={sy(geo.hoopStartY)}
          width={8}
          height={Math.max(2, (geo.hoopStartY - sleeveBot) * s)}
          className="d-sleeve"
        />
        <path d={hoop} className="d-hoop" />
        <rect
          x={sx(-input.width / 2)}
          y={sy(input.meshHeight)}
          width={input.width * s}
          height={input.meshHeight * s}
          className="d-mesh"
        />
        <rect
          x={sx(-input.doorWidth / 2)}
          y={sy(input.doorHeight)}
          width={input.doorWidth * s}
          height={input.doorHeight * s}
          className="d-door"
        />
        <path
          d={`M ${sx(-input.doorWidth / 2)} ${sy(0)} A ${input.doorWidth * s} ${input.doorWidth * s} 0 0 0 ${sx(-input.doorWidth / 2)} ${sy(0) + 8}`}
          className="d-swing"
        />
        <text x={w / 2} y={h - 8} className="d-label" textAnchor="middle">
          {formatM(input.width, 1)} wide · sleeve {(sleeveH * 1000).toFixed(0)} mm on post · door swings out
        </text>
      </svg>
    </figure>
  )
}

function SideElevation({ input, geo }: DiagramsProps) {
  const pad = 28
  const w = 320
  const h = 160
  const s = Math.min((w - pad * 2) / input.length, (h - pad * 2) / input.peakHeight)
  const sx = (z: number) => pad + (z + input.length / 2) * s
  const sy = (y: number) => h - pad - y * s
  return (
    <figure>
      <figcaption>Side</figcaption>
      <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Side elevation">
        <line x1={sx(-input.length / 2)} y1={sy(0)} x2={sx(input.length / 2)} y2={sy(0)} className="d-ground" />
        <rect
          x={sx(-input.length / 2)}
          y={sy(input.meshHeight)}
          width={input.length * s}
          height={input.meshHeight * s}
          className="d-mesh"
        />
        <path
          d={`M${sx(-input.length / 2)} ${sy(input.peakHeight)} L${sx(input.length / 2)} ${sy(input.peakHeight)}`}
          className="d-hoop"
        />
        {geo.hoopZs.map((z, i) => (
          <line
            key={i}
            x1={sx(z)}
            y1={sy(0)}
            x2={sx(z)}
            y2={sy(input.peakHeight)}
            className="d-post"
          />
        ))}
        <text x={w / 2} y={h - 8} className="d-label" textAnchor="middle">
          {formatM(input.length, 1)} long · {geo.hoopCount} hoops @ {formatM(geo.actualSpacing, 2)}
        </text>
      </svg>
    </figure>
  )
}

function PlanView({ input, geo }: DiagramsProps) {
  const pad = 36
  const w = 320
  const h = 200
  const s = Math.min((w - pad * 2) / input.length, (h - pad * 2) / input.width)
  const sx = (z: number) => pad + (z + input.length / 2) * s
  const sy = (x: number) => h / 2 - x * s
  return (
    <figure>
      <figcaption>Plan</figcaption>
      <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Plan">
        <rect
          x={sx(-input.length / 2)}
          y={sy(input.width / 2)}
          width={input.length * s}
          height={input.width * s}
          className="d-outline"
        />
        {geo.beds.map((b) => (
          <rect
            key={b.id}
            x={sx(b.z - b.d / 2)}
            y={sy(b.x + b.w / 2)}
            width={b.d * s}
            height={b.w * s}
            className="d-bed"
            fill={BIRDIES_COLORS[b.source.color].hex}
          />
        ))}
        <rect
          x={sx(-input.length / 2) - 3}
          y={sy(input.doorWidth / 2)}
          width={6}
          height={input.doorWidth * s}
          className="d-door"
        />
        <text x={w / 2} y={h - 8} className="d-label" textAnchor="middle">
          {input.beds.length} Birdies bed{input.beds.length === 1 ? '' : 's'} · side gap {formatM(geo.sideGap, 2)}
        </text>
      </svg>
    </figure>
  )
}
