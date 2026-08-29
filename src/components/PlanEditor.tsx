import { useCallback, useMemo, useRef, useState } from 'react'
import {
  BIRDIES_COLORS,
  bedBox,
  bedFootprint,
  type PlacedBed,
} from '../lib/birdies'
import { measureGaps, snapBedCentre, type GapMeasure } from '../lib/layout'
import { formatM, inputAisles, type CageInputs } from '../lib/model'

type PlanEditorProps = {
  input: CageInputs
  selectedId: string | null
  placing: PlacedBed | null
  onSelect: (id: string | null) => void
  onMove: (id: string, x: number, z: number) => void
  onPlace: (x: number, z: number) => void
}

export function PlanEditor({ input, selectedId, placing, onSelect, onMove, onPlace }: PlanEditorProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const drag = useRef<{ id: string; dx: number; dz: number } | null>(null)
  const [cursor, setCursor] = useState<{ x: number; z: number } | null>(null)

  const pad = 48
  const vbW = 720
  const vbH = 440
  const s = Math.min((vbW - pad * 2) / input.length, (vbH - pad * 2) / input.width)
  const ox = pad + ((vbW - pad * 2) - input.length * s) / 2
  const oy = pad + ((vbH - pad * 2) - input.width * s) / 2

  const toSvg = useCallback(
    (x: number, z: number) => ({
      px: ox + (z + input.length / 2) * s,
      py: oy + (input.width / 2 - x) * s,
    }),
    [input.length, input.width, ox, oy, s],
  )

  const fromSvg = useCallback(
    (px: number, py: number) => ({
      z: (px - ox) / s - input.length / 2,
      x: input.width / 2 - (py - oy) / s,
    }),
    [input.length, input.width, ox, oy, s],
  )

  function clientToMetres(e: React.PointerEvent<SVGSVGElement>) {
    const svg = svgRef.current
    if (!svg) return { x: 0, z: 0 }
    const pt = svg.createSVGPoint()
    pt.x = e.clientX
    pt.y = e.clientY
    const ctm = svg.getScreenCTM()
    if (!ctm) return { x: 0, z: 0 }
    const p = pt.matrixTransform(ctm.inverse())
    return fromSvg(p.x, p.y)
  }

  function onPointerDown(e: React.PointerEvent<SVGSVGElement>) {
    const m = clientToMetres(e)
    if (placing) {
      const s = snapBedCentre(m.x, m.z, { ...placing, x: m.x, z: m.z }, input.beds, {
        length: input.length,
        width: input.width,
        ...inputAisles(input),
      })
      onPlace(s.x, s.z)
      return
    }
    const hit = [...input.beds].reverse().find((b) => {
      const box = bedBox(b)
      return m.x >= box.x0 && m.x <= box.x1 && m.z >= box.z0 && m.z <= box.z1
    })
    if (!hit) {
      onSelect(null)
      return
    }
    onSelect(hit.id)
    drag.current = { id: hit.id, dx: hit.x - m.x, dz: hit.z - m.z }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function onPointerMove(e: React.PointerEvent<SVGSVGElement>) {
    const m = clientToMetres(e)
    setCursor(m)
    if (!drag.current) return
    const rawX = m.x + drag.current.dx
    const rawZ = m.z + drag.current.dz
    const moving = input.beds.find((b) => b.id === drag.current!.id)
    if (!moving) return
    const s = snapBedCentre(rawX, rawZ, moving, input.beds, {
      length: input.length,
      width: input.width,
      ...inputAisles(input),
    })
    onMove(drag.current.id, s.x, s.z)
  }

  function onPointerUp() {
    drag.current = null
  }

  const grid = useMemo(() => {
    const lines: { x1: number; y1: number; x2: number; y2: number; major: boolean }[] = []
    for (let z = -input.length / 2; z <= input.length / 2 + 0.001; z += 0.5) {
      const a = toSvg(-input.width / 2, z)
      const b = toSvg(input.width / 2, z)
      lines.push({ x1: a.px, y1: a.py, x2: b.px, y2: b.py, major: Math.abs(z % 1) < 0.001 })
    }
    for (let x = -input.width / 2; x <= input.width / 2 + 0.001; x += 0.5) {
      const a = toSvg(x, -input.length / 2)
      const b = toSvg(x, input.length / 2)
      lines.push({ x1: a.px, y1: a.py, x2: b.px, y2: b.py, major: Math.abs(x % 1) < 0.001 })
    }
    return lines
  }, [input.length, input.width, toSvg])

  const ghost = placing && cursor
    ? {
        ...placing,
        ...snapBedCentre(cursor.x, cursor.z, { ...placing, x: cursor.x, z: cursor.z }, input.beds, {
          length: input.length,
          width: input.width,
          ...inputAisles(input),
        }),
      }
    : null

  const gaps = useMemo(
    () =>
      measureGaps(input.beds, {
        length: input.length,
        width: input.width,
        ...inputAisles(input),
      }),
    [input.beds, input.length, input.width, input.aisleWork, input.aisleWalk, input.aisleDoor, input.aisleWallLong, input.aisleWallShort],
  )

  const doorSwing = useMemo(() => {
    const hinge = toSvg(-input.doorWidth / 2, -input.length / 2)
    const closed = toSvg(input.doorWidth / 2, -input.length / 2)
    const open = toSvg(-input.doorWidth / 2, -input.length / 2 - input.doorWidth)
    const r = input.doorWidth * s
    return { hinge, closed, open, r }
  }, [input.doorWidth, input.length, s, toSvg])

  return (
    <div className="plan-editor">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${vbW} ${vbH}`}
        role="application"
        aria-label="Bed plan. Drag beds. Click empty to place."
        className={placing ? 'is-placing' : undefined}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={() => setCursor(null)}
      >
        <rect x={0} y={0} width={vbW} height={vbH} className="plan-bg" />
        {grid.map((g, i) => (
          <line key={i} {...g} className={g.major ? 'plan-grid-major' : 'plan-grid'} />
        ))}
        <rect
          x={toSvg(input.width / 2, -input.length / 2).px}
          y={toSvg(input.width / 2, -input.length / 2).py}
          width={input.length * s}
          height={input.width * s}
          className="plan-cage"
        />
        <path
          d={`M ${doorSwing.closed.px} ${doorSwing.closed.py} A ${doorSwing.r} ${doorSwing.r} 0 0 1 ${doorSwing.open.px} ${doorSwing.open.py}`}
          className="plan-swing"
        />
        <rect
          x={toSvg(input.doorWidth / 2, -input.length / 2).px - 5}
          y={toSvg(input.doorWidth / 2, -input.length / 2).py}
          width={8}
          height={input.doorWidth * s}
          className="plan-door"
        />
        <text
          x={toSvg(0, -input.length / 2).px - 36}
          y={toSvg(0, -input.length / 2).py + input.doorWidth * s + 12}
          className="plan-anno"
        >
          door out
        </text>
        {input.beds.map((b) => (
          <BedShape key={b.id} bed={b} selected={b.id === selectedId} toSvg={toSvg} scale={s} />
        ))}
        {ghost ? <BedShape bed={ghost} selected ghost toSvg={toSvg} scale={s} /> : null}
        {gaps.map((g, i) => (
          <GapDim key={i} gap={g} toSvg={toSvg} />
        ))}
        <text x={vbW / 2} y={vbH - 12} className="plan-anno" textAnchor="middle">
          {formatM(input.length, 1)} × {formatM(input.width, 1)} · work {Math.round(input.aisleWork * 1000)} · walk{' '}
          {Math.round(input.aisleWalk * 1000)} · door {Math.round(input.aisleDoor * 1000)} mm
        </text>
      </svg>
      <p className="plan-hint">
        {placing
          ? 'Click the plan to drop. Snap is 50 mm grid plus walls and walk-aisle. Esc cancels.'
          : 'Drag beds — they snap to grid, walls, and walk gaps. Red labels are tighter than the aisle.'}
      </p>
    </div>
  )
}

function BedShape({
  bed,
  selected,
  ghost,
  toSvg,
  scale,
}: {
  bed: PlacedBed
  selected?: boolean
  ghost?: boolean
  toSvg: (x: number, z: number) => { px: number; py: number }
  scale: number
}) {
  const { w, d } = bedFootprint(bed)
  const nw = toSvg(bed.x + w / 2, bed.z - d / 2)
  const fill = BIRDIES_COLORS[bed.color].hex
  return (
    <g className={ghost ? 'plan-bed is-ghost' : selected ? 'plan-bed is-on' : 'plan-bed'}>
      <rect
        x={nw.px}
        y={nw.py}
        width={d * scale}
        height={w * scale}
        rx={3}
        fill={fill}
        fillOpacity={ghost ? 0.35 : 0.88}
        stroke={selected ? '#f0f4c8' : '#1c2416'}
        strokeWidth={selected ? 2.4 : 1.2}
      />
      <text
        x={nw.px + (d * scale) / 2}
        y={nw.py + (w * scale) / 2 + 4}
        textAnchor="middle"
        className="plan-bed-label"
      >
        {Math.round(bed.width * 100)}×{Math.round(bed.length * 100)}
        {bed.owned ? ' · owned' : ''}
      </text>
    </g>
  )
}

function GapDim({
  gap,
  toSvg,
}: {
  gap: GapMeasure
  toSvg: (x: number, z: number) => { px: number; py: number }
}) {
  const a = toSvg(gap.x1, gap.z1)
  const b = toSvg(gap.x2, gap.z2)
  const mx = (a.px + b.px) / 2
  const my = (a.py + b.py) / 2
  return (
    <g className={gap.ok ? 'gap-ok' : 'gap-tight'}>
      <line x1={a.px} y1={a.py} x2={b.px} y2={b.py} />
      <text x={mx} y={my - 3} textAnchor="middle">
        {gap.label}
      </text>
    </g>
  )
}
