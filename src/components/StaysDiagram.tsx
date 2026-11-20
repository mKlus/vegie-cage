import { STAY_COLOUR, type Bracing } from '../lib/bracing'
import type { CageGeometry } from '../lib/geometry'
import { formatM, type CageInputs } from '../lib/model'
import type { V2Frame } from '../lib/v2'

type Props = { input: CageInputs; geo: CageGeometry }

function poly(pts: { x: number; y: number }[], sx: (n: number) => number, sy: (n: number) => number): string {
  return pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join(' ')
}

export function BracingLegend({
  scene = false,
  windward,
  v2 = false,
}: {
  scene?: boolean
  windward?: '+x' | '-x'
  v2?: boolean
}) {
  if (v2) {
    return (
      <ul className={scene ? 'bracing-legend' : 'stay-legend'}>
        <li>
          <i style={{ background: STAY_COLOUR.batten }} />
          Roof battens, headers, end rails
        </li>
        <li>
          <i style={{ background: STAY_COLOUR.diagonal }} />
          Diagonal batten braces
        </li>
      </ul>
    )
  }
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
  if (geo.v2) return <V2Sheet input={input} geo={geo} frame={geo.v2} />
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

function V2Sheet({ input, geo, frame }: Props & { frame: V2Frame }) {
  const shade = frame.cover === 'shade-30'
  return (
    <div className="stay-sheet">
      <p>
        {frame.diagonals.length} batten diagonals, cut {frame.diagonalCut.toFixed(2)} m (
        {frame.diagonalLength.toFixed(2)} m bolt to bolt, {frame.diagonalAngle.toFixed(1)}° in the roof surface). Each
        runs from the low batten on the end hoop up to the lower shoulder on the next hoop.
        {shade ? ' Shade cloth adds one pair in bay 4.' : ''} Seven longitudinal battens, two end headers, end low
        rails. No wires, Gripples, struts, or outside guys. Same colours as the 3D view.
      </p>
      <h3>Plan</h3>
      <V2Plan input={input} geo={geo} frame={frame} />
      <h3>Side</h3>
      <V2Side input={input} geo={geo} frame={frame} />
      <h3>Door end</h3>
      <V2End input={input} geo={geo} frame={frame} />
      <BracingLegend v2 />
    </div>
  )
}

function V2Plan({ input, geo, frame }: Props & { frame: V2Frame }) {
  const pad = 36
  const w = 720
  const h = 420
  const halfL = input.length / 2
  const halfW = input.width / 2
  const zMin = -halfL - 0.8
  const zMax = halfL + 0.6
  const xMin = -halfW - 0.7
  const xMax = halfW + 0.55
  const s = Math.min((w - pad * 2) / (zMax - zMin), (h - pad * 2) / (xMax - xMin))
  const sx = (z: number) => pad + (z - zMin) * s
  const sy = (x: number) => pad + (xMax - x) * s
  return (
    <figure>
      <figcaption>
        Top — door on the near end, opening outward. Diagonals run from the wall line into the next hoop.
      </figcaption>
      <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Stays and bracing plan">
        <rect x={sx(-halfL)} y={sy(halfW)} width={input.length * s} height={input.width * s} className="d-outline" />
        {geo.hoopZs.map((z) => (
          <line key={z} x1={sx(z)} y1={sy(-halfW)} x2={sx(z)} y2={sy(halfW)} className="d-hoop" />
        ))}
        {frame.battens.map((m) => (
          <line key={m.name} x1={sx(m.from.z)} y1={sy(m.from.x)} x2={sx(m.to.z)} y2={sy(m.to.x)} className="d-batten" />
        ))}
        {frame.headers.map((m) => (
          <line key={m.name} x1={sx(m.from.z)} y1={sy(m.from.x)} x2={sx(m.to.z)} y2={sy(m.to.x)} className="d-batten" />
        ))}
        {frame.diagonals.map((m) => (
          <line key={m.name} x1={sx(m.from.z)} y1={sy(m.from.x)} x2={sx(m.to.z)} y2={sy(m.to.x)} className="d-brace" />
        ))}
        {frame.endPosts.map((p, i) => (
          <rect key={`p-${i}`} x={sx(p.z) - 3.5} y={sy(p.x) - 3.5} width={7} height={7} className="d-door-post" />
        ))}
        <line
          x1={sx(-halfL)}
          y1={sy(input.doorWidth / 2)}
          x2={sx(-halfL)}
          y2={sy(-input.doorWidth / 2)}
          className="d-door-mark"
        />
        <text x={sx(-halfL - 0.15)} y={sy(0)} className="d-dim" textAnchor="end">
          Door, opens out
        </text>
        <text x={sx(0)} y={h - 12} className="d-label" textAnchor="middle">
          {formatM(input.length, 1)} × {formatM(input.width, 1)} centres · {geo.hoopCount} hoops @{' '}
          {formatM(geo.actualSpacing, 2)} · {frame.diagonals.length} diagonals cut {frame.diagonalCut.toFixed(2)} m
        </text>
      </svg>
    </figure>
  )
}

function V2Side({ input, geo, frame }: Props & { frame: V2Frame }) {
  const w = 720
  const h = 380
  const halfL = input.length / 2
  const plot = fit(
    { x0: -halfL - 0.45, x1: halfL + 0.45, y0: -0.35, y1: geo.peakY + 0.4 },
    { x: 36, y: 24, w: w - 72, h: h - 68 },
  )
  const heights = [...new Set(frame.battens.map((m) => m.from.y))]
  const side = frame.diagonals.filter((m) => m.from.x > 0)
  return (
    <figure>
      <figcaption>
        Side — one wall. Diagonals climb from {formatM(frame.lowY, 2)} on the end hoop to {formatM(frame.lowerY, 2)} on
        the next hoop. Both sides are the same.
      </figcaption>
      <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Side elevation of battens and diagonal braces">
        <line x1={plot.sx(-halfL)} y1={plot.sy(0)} x2={plot.sx(halfL)} y2={plot.sy(0)} className="d-ground" />
        {geo.hoopZs.map((z) => (
          <line key={z} x1={plot.sx(z)} y1={plot.sy(0)} x2={plot.sx(z)} y2={plot.sy(geo.peakY)} className="d-hoop" />
        ))}
        {heights.map((y) => (
          <line key={y} x1={plot.sx(-halfL)} y1={plot.sy(y)} x2={plot.sx(halfL)} y2={plot.sy(y)} className="d-batten" />
        ))}
        {side.map((m) => (
          <line
            key={m.name}
            x1={plot.sx(m.from.z)}
            y1={plot.sy(m.from.y)}
            x2={plot.sx(m.to.z)}
            y2={plot.sy(m.to.y)}
            className="d-brace"
          />
        ))}
        <text x={w / 2} y={h - 14} className="d-label" textAnchor="middle">
          {frame.diagonals.length} diagonals · cut {frame.diagonalCut.toFixed(2)} m · {frame.diagonalAngle.toFixed(1)}°
          in the roof surface · lap {formatM(frame.lapFrom, 2)}–{formatM(frame.lapTo, 2)}
        </text>
      </svg>
    </figure>
  )
}

function V2End({ input, geo, frame }: Props & { frame: V2Frame }) {
  const w = 720
  const h = 420
  const halfW = input.width / 2
  const embed = geo.embedDepth
  const plot = fit(
    { x0: -halfW - 0.55, x1: halfW + 0.55, y0: -embed - 0.35, y1: geo.peakY + 0.35 },
    { x: 28, y: 28, w: w - 56, h: h - 70 },
  )
  const doorZ = -input.length / 2
  const unit = plot.sx(1) - plot.sx(0)
  const rails = frame.rails.filter((m) => Math.abs(m.from.z - doorZ) < 1e-6)
  return (
    <figure>
      <figcaption>
        Door end — header at {formatM(frame.headerY, 2)}, seven batten positions, low rails beside the gate
      </figcaption>
      <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label="End elevation of battens and bracing">
        <line x1={plot.sx(-halfW - 0.3)} y1={plot.sy(0)} x2={plot.sx(halfW + 0.3)} y2={plot.sy(0)} className="d-ground" />
        <path d={poly(geo.hoopPoints, plot.sx, plot.sy)} className="d-hoop" />
        {([-1, 1] as const).map((side) => (
          <line
            key={side}
            x1={plot.sx(side * halfW)}
            y1={plot.sy(-embed)}
            x2={plot.sx(side * halfW)}
            y2={plot.sy(geo.stickUp)}
            className="d-post"
          />
        ))}
        {frame.endPosts
          .filter((p) => Math.abs(p.z - doorZ) < 1e-6)
          .map((p) => (
            <line
              key={`${p.x}`}
              x1={plot.sx(p.x)}
              y1={plot.sy(-p.embed)}
              x2={plot.sx(p.x)}
              y2={plot.sy(p.top)}
              className="d-door-post"
            />
          ))}
        <line
          x1={plot.sx(-frame.headerHalf)}
          y1={plot.sy(frame.headerY)}
          x2={plot.sx(frame.headerHalf)}
          y2={plot.sy(frame.headerY)}
          className="d-batten"
        />
        {rails.map((m) => (
          <line
            key={m.name}
            x1={plot.sx(m.from.x)}
            y1={plot.sy(m.from.y)}
            x2={plot.sx(m.to.x)}
            y2={plot.sy(m.to.y)}
            className="d-batten"
          />
        ))}
        {frame.battens.map((m) => (
          <circle key={m.name} cx={plot.sx(m.from.x)} cy={plot.sy(m.from.y)} r={4.5} className="d-batten-dot" />
        ))}
        <rect
          x={plot.sx(-halfW)}
          y={plot.sy(geo.meshBand.top)}
          width={(halfW - input.doorWidth / 2) * unit}
          height={(geo.meshBand.top - geo.meshBand.bottom) * (plot.sy(0) - plot.sy(1))}
          className="d-mesh"
        />
        <rect
          x={plot.sx(input.doorWidth / 2)}
          y={plot.sy(geo.meshBand.top)}
          width={(halfW - input.doorWidth / 2) * unit}
          height={(geo.meshBand.top - geo.meshBand.bottom) * (plot.sy(0) - plot.sy(1))}
          className="d-mesh"
        />
        <rect
          x={plot.sx(-input.doorWidth / 2)}
          y={plot.sy(0.07 + input.doorHeight)}
          width={input.doorWidth * unit}
          height={input.doorHeight * (plot.sy(0) - plot.sy(1))}
          className="d-door-mesh"
        />
        <text x={plot.sx(0)} y={plot.sy(-embed - 0.12)} className="d-dim" textAnchor="middle">
          Gate {formatM(input.doorWidth, 1)} × {formatM(input.doorHeight, 1)}, opens outward · posts 550 mm in concrete
        </text>
        <text x={w / 2} y={h - 14} className="d-label" textAnchor="middle">
          Peak {formatM(geo.peakY, 2)} · sleeve to the ground · mesh band 0.05–0.95 m · header {formatM(frame.headerHalf * 2, 2)}
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

