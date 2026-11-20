import { STAY_COLOUR, type Bracing } from '../lib/bracing'
import type { CageGeometry } from '../lib/geometry'
import { formatM, type CageInputs } from '../lib/model'

type Props = { input: CageInputs; geo: CageGeometry }

function poly(pts: { x: number; y: number }[], sx: (n: number) => number, sy: (n: number) => number): string {
  return pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join(' ')
}

export function BracingLegend({ scene = false, windward }: { scene?: boolean; windward?: '+x' | '-x' }) {
  return (
    <ul className={scene ? 'bracing-legend' : 'stay-legend'}>
      <li>
        <i style={{ background: STAY_COLOUR.guy }} />
        Guys, 2.5 mm
      </li>
      <li>
        <i style={{ background: STAY_COLOUR.brace }} />
        Diagonal braces
      </li>
      <li>
        <i style={{ background: STAY_COLOUR.anchor }} />
        Ground anchors
      </li>
      {scene ? (
        <>
          <li>
            <i style={{ background: STAY_COLOUR.purlin }} />
            Purlin wires
          </li>
          <li>
            <i style={{ background: STAY_COLOUR.ridge }} />
            Ridge
          </li>
        </>
      ) : null}
      <li>Windward is the {windward ?? 'labelled'} long side</li>
    </ul>
  )
}

export function StaysDiagram({ input, geo }: Props) {
  const b = geo.bracing
  const angle = Math.round(b.endGuys[0]?.angleDeg ?? 45)
  return (
    <div className="stay-sheet">
      <p>
        {b.endGuys.length} end guys, {b.sideGuys.length} windward side guys, {b.anchorCount} ground anchors (
        {b.endGuys.length} end + {b.sideGuys.length} side), {b.strainerCount} strainers, {b.braceCount} diagonal
        braces, {b.braceClipCount} brace clips. Windward is the {b.windward} long side. Same colours as the 3D view.
      </p>
      <h3>Plan</h3>
      <Plan input={input} geo={geo} bracing={b} />
      <h3>End elevation</h3>
      <EndSheet input={input} geo={geo} bracing={b} angle={angle} />
      <BracingLegend windward={b.windward} />
    </div>
  )
}

function Plan({ input, geo, bracing }: Props & { bracing: Bracing }) {
  const pad = 46
  const w = 680
  const h = 440
  const halfL = input.length / 2
  const halfW = input.width / 2
  const wind = bracing.windward === '+x' ? 1 : -1
  const zMin = -halfL - bracing.endAnchorOutM - 0.85
  const zMax = halfL + bracing.endAnchorOutM + 0.55
  const xMin = -halfW - bracing.sideAnchorOutM - 0.7
  const xMax = halfW + bracing.sideAnchorOutM + 0.85
  const s = Math.min((w - pad * 2) / (zMax - zMin), (h - pad * 2) / (xMax - xMin))
  const sx = (z: number) => pad + (z - zMin) * s
  const sy = (x: number) => pad + (xMax - x) * s
  const guys = [...bracing.endGuys, ...bracing.sideGuys]
  const doorOnEnd = input.doorWall === 'end'

  return (
    <figure>
      <figcaption>Top — door {doorOnEnd ? 'on the near end' : 'on the side'}</figcaption>
      <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Stays and bracing plan">
        <rect
          x={sx(-halfL)}
          y={sy(halfW)}
          width={input.length * s}
          height={input.width * s}
          className="d-outline"
        />
        {geo.hoopZs.map((z) => (
          <line key={z} x1={sx(z)} y1={sy(-halfW)} x2={sx(z)} y2={sy(halfW)} className="d-hoop" />
        ))}
        {bracing.braces.map((br, i) => (
          <line
            key={`b-${i}`}
            x1={sx(br.from.z)}
            y1={sy(br.from.x)}
            x2={sx(br.to.z)}
            y2={sy(br.to.x)}
            className="d-brace"
          />
        ))}
        {guys.map((g, i) => (
          <line
            key={`g-${i}`}
            x1={sx(g.from.z)}
            y1={sy(g.from.x)}
            x2={sx(g.to.z)}
            y2={sy(g.to.x)}
            className="d-guy"
          />
        ))}
        {guys.map((g, i) => (
          <circle key={`a-${i}`} cx={sx(g.to.z)} cy={sy(g.to.x)} r={5} className="d-anchor" />
        ))}
        {doorOnEnd ? (
          <line
            x1={sx(-halfL)}
            y1={sy(input.doorWidth / 2)}
            x2={sx(-halfL)}
            y2={sy(-input.doorWidth / 2)}
            className="d-door-mark"
          />
        ) : (
          <line
            x1={sx(-input.doorWidth / 2)}
            y1={sy(halfW)}
            x2={sx(input.doorWidth / 2)}
            y2={sy(halfW)}
            className="d-door-mark"
          />
        )}
        <text
          x={sx(doorOnEnd ? -halfL - bracing.endAnchorOutM - 0.08 : 0)}
          y={sy(doorOnEnd ? 0 : halfW + 0.35)}
          className="d-dim"
          textAnchor={doorOnEnd ? 'end' : 'middle'}
        >
          Door
        </text>
        <text
          x={sx(0)}
          y={sy(wind * (halfW + bracing.sideAnchorOutM)) + (wind === 1 ? -10 : 16)}
          className="d-dim"
          textAnchor="middle"
        >
          Windward ({bracing.windward})
        </text>
        <text x={sx(0)} y={h - 14} className="d-label" textAnchor="middle">
          {formatM(input.length, 1)} × {formatM(input.width, 1)} · hoops {geo.hoopCount} · anchors {formatM(bracing.endAnchorOutM)} past each end · side guys {formatM(bracing.sideAnchorOutM)} out · braces {formatM(bracing.braceFootM, 1)} along the side
        </text>
      </svg>
    </figure>
  )
}

function EndSheet({
  input,
  geo,
  bracing,
  angle,
}: Props & { bracing: Bracing; angle: number }) {
  const w = 760
  const h = 390
  const halfW = input.width / 2
  const embed = geo.embedDepth
  const top = geo.stickUp

  const left = fit(
    { x0: -halfW - 1.8, x1: halfW + 0.4, y0: -embed - 0.45, y1: Math.max(geo.peakY, top) + 0.25 },
    { x: 12, y: 26, w: 360, h: 300 },
  )
  const right = fit(
    {
      x0: -bracing.endAnchorOutM - 0.7,
      x1: bracing.braceFootM + 0.7,
      y0: -embed - 0.55,
      y1: top + 0.55,
    },
    { x: 390, y: 26, w: 350, h: 300 },
  )

  return (
    <figure>
      <figcaption>End hoop, and one corner looking along the side wall</figcaption>
      <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label="End elevation of stays and bracing">
        <text x={18} y={16} className="d-panel">
          End hoop
        </text>
        <text x={390} y={16} className="d-panel">
          Corner — guy along the length, brace along the side
        </text>
        <line x1={left.sx(-halfW - 0.3)} y1={left.sy(0)} x2={left.sx(halfW + 0.3)} y2={left.sy(0)} className="d-ground" />
        <line x1={left.sx(-halfW)} y1={left.sy(-embed)} x2={left.sx(-halfW)} y2={left.sy(top)} className="d-post" />
        <line x1={left.sx(halfW)} y1={left.sy(-embed)} x2={left.sx(halfW)} y2={left.sy(top)} className="d-post" />
        <path d={poly(geo.hoopPoints, left.sx, left.sy)} className="d-hoop" />
        <circle cx={left.sx(-halfW)} cy={left.sy(top)} r={3.5} className="d-anchor" />
        <circle cx={left.sx(halfW)} cy={left.sy(top)} r={3.5} className="d-anchor" />
        <text x={left.sx(-halfW) - 8} y={left.sy(top / 2)} className="d-dim" textAnchor="end">
          {formatM(top)} out
        </text>
        <text x={left.sx(-halfW) - 8} y={left.sy(-embed / 2)} className="d-dim" textAnchor="end">
          {Math.round(embed * 1000)} mm in
        </text>
        <text x={left.sx(0)} y={left.sy(-embed - 0.2)} className="d-dim" textAnchor="middle">
          Guys leave the picket tops along the length
        </text>

        <line
          x1={right.sx(-bracing.endAnchorOutM - 0.35)}
          y1={right.sy(0)}
          x2={right.sx(bracing.braceFootM + 0.35)}
          y2={right.sy(0)}
          className="d-ground"
        />
        <line x1={right.sx(0)} y1={right.sy(-embed)} x2={right.sx(0)} y2={right.sy(top)} className="d-post" />
        <line
          x1={right.sx(0)}
          y1={right.sy(top)}
          x2={right.sx(-bracing.endAnchorOutM)}
          y2={right.sy(0)}
          className="d-guy"
        />
        <line
          x1={right.sx(0)}
          y1={right.sy(top)}
          x2={right.sx(bracing.braceFootM)}
          y2={right.sy(0)}
          className="d-brace"
        />
        <circle cx={right.sx(-bracing.endAnchorOutM)} cy={right.sy(0)} r={5} className="d-anchor" />
        <text x={right.sx(-bracing.endAnchorOutM * 0.22)} y={right.sy(top * 0.78)} className="d-dim" textAnchor="end">
          {angle}°
        </text>
        <text x={right.sx(-bracing.endAnchorOutM / 2)} y={right.sy(-embed - 0.2)} className="d-dim" textAnchor="middle">
          {formatM(bracing.endAnchorOutM)} to anchor
        </text>
        <text x={right.sx(bracing.braceFootM / 2)} y={right.sy(-embed - 0.2)} className="d-dim" textAnchor="middle">
          {formatM(bracing.braceFootM, 1)} along side
        </text>
        <text x={right.sx(0.08)} y={right.sy(top / 2)} className="d-dim">
          {formatM(top)} out
        </text>
        <text x={right.sx(0.08)} y={right.sy(-embed / 2)} className="d-dim">
          {Math.round(embed * 1000)} mm in
        </text>
        <text x={w / 2} y={h - 12} className="d-label" textAnchor="middle">
          Picket {Math.round(embed * 1000)} mm in the ground, {formatM(top)} above. Guy about {angle}°. Anchor {formatM(bracing.endAnchorOutM)} out. Brace foot {formatM(bracing.braceFootM, 1)} along the side.
        </text>
      </svg>
    </figure>
  )
}

function fit(
  world: { x0: number; x1: number; y0: number; y1: number },
  box: { x: number; y: number; w: number; h: number },
): { sx: (x: number) => number; sy: (y: number) => number } {
  const s = Math.min(box.w / (world.x1 - world.x0), box.h / (world.y1 - world.y0))
  return {
    sx: (x) => box.x + (x - world.x0) * s,
    sy: (y) => box.y + (world.y1 - y) * s,
  }
}

