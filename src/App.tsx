import { useEffect, useMemo, useState } from 'react'
import { BomPanel } from './components/BomPanel'
import { CageScene, type ViewId } from './components/CageScene'
import { Controls, type BedDraft } from './components/Controls'
import { Diagrams } from './components/Diagrams'
import { PlanEditor } from './components/PlanEditor'
import { ThemeSwitch } from './components/ThemeSwitch'
import { OWNED_BIRDIE, makeBed, packOwnedFour, snap } from './lib/birdies'
import { fillCage, fillLeftover, ownedMatching } from './lib/layout'
import { buildBom } from './lib/bom'
import { buildGeometry } from './lib/geometry'
import { DEFAULTS, formatM, inputAisles, sanitise, type CageInputs } from './lib/model'
import { loadInputs, saveInputs } from './lib/persist'
import { useThemePref } from './lib/theme'

const VIEWS: { id: ViewId; label: string }[] = [
  { id: 'plan', label: 'Plan' },
  { id: 'iso', label: 'Iso' },
  { id: 'end', label: 'End' },
  { id: 'side', label: 'Side' },
  { id: 'top', label: 'Top' },
]

function viewFromSearch(): ViewId {
  if (typeof window === 'undefined') return 'iso'
  const v = new URLSearchParams(window.location.search).get('view')
  return v === 'end' || v === 'side' || v === 'top' || v === 'iso' || v === 'plan' ? v : 'iso'
}

export default function App() {
  const [themePref, setThemePref] = useThemePref()
  const [input, setInput] = useState<CageInputs>(DEFAULTS)
  const [view, setView] = useState<ViewId>(viewFromSearch)
  const [showNet, setShowNet] = useState(true)
  const [showMesh, setShowMesh] = useState(true)
  const [doorOpen, setDoorOpen] = useState(true)
  const [ready, setReady] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [placing, setPlacing] = useState(false)
  const [draft, setDraft] = useState<BedDraft>({ ...OWNED_BIRDIE, owned: false, rot: 0 })

  useEffect(() => {
    setInput(loadInputs())
    setReady(true)
  }, [])

  useEffect(() => {
    if (ready) saveInputs(input)
  }, [input, ready])

  const geo = useMemo(() => buildGeometry(input), [input])
  const bom = useMemo(() => buildBom(input), [input])

  function patch(p: Partial<CageInputs>) {
    setInput((prev) => sanitise({ ...prev, ...p }))
  }

  function mapBeds(fn: (prev: CageInputs) => CageInputs['beds']) {
    setInput((prev) => sanitise({ ...prev, beds: fn(prev) }))
  }

  function startPlace() {
    setPlacing(true)
    setView('plan')
  }

  function placeAt(x: number, z: number) {
    const bed = makeBed({ ...draft, x, z })
    mapBeds((prev) => [...prev.beds, bed])
    setSelectedId(bed.id)
    setPlacing(false)
  }

  function moveBed(id: string, x: number, z: number) {
    mapBeds((prev) => prev.beds.map((b) => (b.id === id ? { ...b, x, z } : b)))
  }

  function rotateSelected() {
    if (!selectedId) return
    mapBeds((prev) =>
      prev.beds.map((b) => (b.id === selectedId ? { ...b, rot: b.rot === 90 ? 0 : 90 } : b)),
    )
  }

  function duplicateSelected() {
    if (!selectedId) return
    setInput((prev) => {
      const src = prev.beds.find((b) => b.id === selectedId)
      if (!src) return prev
      const copy = makeBed({ ...src, id: undefined, x: snap(src.x + 0.3), z: snap(src.z + 0.3), owned: false })
      setSelectedId(copy.id)
      return sanitise({ ...prev, beds: [...prev.beds, copy] })
    })
  }

  function deleteSelected() {
    if (!selectedId) return
    mapBeds((prev) => prev.beds.filter((b) => b.id !== selectedId))
    setSelectedId(null)
  }

  function toggleOwned() {
    if (!selectedId) return
    mapBeds((prev) => prev.beds.map((b) => (b.id === selectedId ? { ...b, owned: !b.owned } : b)))
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement | null)?.tagName
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return
      if (e.key === 'Escape') {
        setPlacing(false)
        setSelectedId(null)
      }
      if (e.key === 'r' || e.key === 'R') rotateSelected()
      if (e.key === 'Delete' || e.key === 'Backspace') deleteSelected()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedId])

  return (
    <div className="studio">
      <header className="mast">
        <div className="brand">
          <span className="mark" aria-hidden>
            <svg viewBox="0 0 36 36">
              <rect className="mark-plate" width="36" height="36" rx="10" />
              <path d="M6 25 V16 A12 9 0 0 1 30 16 V25" fill="none" stroke="currentColor" strokeWidth="1.7" />
              <path d="M6 25 H30" stroke="#c4a574" strokeWidth="2" />
              <rect x="9" y="21" width="5" height="4" rx="0.5" fill="#7aa33a" />
              <rect x="16" y="21" width="5" height="4" rx="0.5" fill="#7aa33a" />
              <rect x="23" y="21" width="5" height="4" rx="0.5" fill="#7aa33a" />
            </svg>
          </span>
          <div>
            <p className="eyebrow">Walk-in garden cage</p>
            <h1>Vegie Cage</h1>
          </div>
        </div>
        <p className="lede">
          Mesh fence, poly U-hoops, taut net. Place Birdies beds on the Plan, then read the metre cut
          list.
        </p>
        <div className="mast-tools">
          <ThemeSwitch value={themePref} onChange={setThemePref} />
          <div className="live">
            <span>
              Footprint
              <em>
                {formatM(input.length, 1)} × {formatM(input.width, 1)}
              </em>
            </span>
            <span>
              Peak
              <em>{formatM(input.peakHeight, 1)}</em>
            </span>
            <span>
              Hoops
              <em>
                {geo.hoopCount} × {formatM(geo.pipeEachM, 2)}
              </em>
            </span>
          </div>
        </div>
      </header>

      <div className="stage">
        <aside className="console">
          <div className="console-tools">
            <button type="button" onClick={() => patch(DEFAULTS)}>
              Reset 12 × 6
            </button>
          </div>
          <Controls
            input={input}
            patch={patch}
            selectedId={selectedId}
            placing={placing}
            draft={draft}
            setDraft={setDraft}
            onSelect={setSelectedId}
            onStartPlace={startPlace}
            onCancelPlace={() => setPlacing(false)}
            onPackFour={() => {
              patch({ beds: packOwnedFour(input.length, input.width) })
              setSelectedId(null)
              setView('plan')
            }}
            onRotate={rotateSelected}
            onDuplicate={duplicateSelected}
            onDelete={deleteSelected}
            onToggleOwned={toggleOwned}
            onFillCage={() => {
              const spec = {
                brand: 'birdies' as const,
                width: draft.width,
                length: draft.length,
                height: draft.height,
                color: draft.color,
                rot: draft.rot,
              }
              const owned = Math.max(ownedMatching(input.beds, spec), spec.width === 1.22 && spec.length === 2.44 ? 4 : 0)
              patch({
                beds: fillCage(
                  input.length,
                  input.width,
                  inputAisles(input),
                  spec,
                  owned,
                ),
              })
              setSelectedId(null)
              setView('plan')
            }}
            onFillLeftover={() => {
              const spec = {
                brand: 'birdies' as const,
                width: draft.width,
                length: draft.length,
                height: draft.height,
                color: draft.color,
                rot: draft.rot,
              }
              patch({
                beds: fillLeftover(
                  input.beds,
                  input.length,
                  input.width,
                  inputAisles(input),
                  spec,
                ),
              })
              setView('plan')
            }}
          />
        </aside>

        <section className="viewport">
          <div className="view-bar">
            {VIEWS.map((v) => (
              <button
                key={v.id}
                type="button"
                className={view === v.id ? 'is-on' : undefined}
                onClick={() => setView(v.id)}
              >
                {v.label}
              </button>
            ))}
            <label>
              <input type="checkbox" checked={showNet} onChange={(e) => setShowNet(e.target.checked)} />
              Net
            </label>
            <label>
              <input type="checkbox" checked={showMesh} onChange={(e) => setShowMesh(e.target.checked)} />
              Mesh
            </label>
            <label>
              <input type="checkbox" checked={doorOpen} onChange={(e) => setDoorOpen(e.target.checked)} />
              Door open
            </label>
            <span className="drag-hint">
              {view === 'plan' ? 'Drag beds on the grid' : 'Drag to orbit · scroll zoom'}
            </span>
          </div>
          <div className="canvas-wrap">
            {view === 'plan' ? (
              <PlanEditor
                input={input}
                selectedId={selectedId}
                placing={
                  placing
                    ? makeBed({
                        ...draft,
                        x: 0,
                        z: 0,
                      })
                    : null
                }
                onSelect={setSelectedId}
                onMove={moveBed}
                onPlace={placeAt}
              />
            ) : (
              <CageScene
                input={input}
                geo={geo}
                view={view}
                showNet={showNet}
                showMesh={showMesh}
                doorOpen={doorOpen}
                selectedId={selectedId}
                onSelect={setSelectedId}
              />
            )}
          </div>
        </section>

        <aside className="board">
          <Diagrams input={input} geo={geo} />
          <BomPanel input={input} geo={geo} bom={bom} />
        </aside>
      </div>
    </div>
  )
}
