import {
  BIRDIES_COLORS,
  BIRDIES_HEIGHTS_M,
  BIRDIES_LENGTHS_M,
  BIRDIES_WIDTHS_M,
  cm,
  type BirdiesColor,
  type PlacedBed,
} from '../lib/birdies'
import {
  HOOP_MATERIAL,
  LIMITS,
  SLEEPER,
  PICKET_LENGTHS,
  POST_TYPE,
  PRESETS,
  WALL_MESH,
  formatM,
  frameHeights,
  type CageInputs,
  type DoorStyle,
  type HoopMaterial,
  type HoopOrigin,
  type NetType,
  type PicketLength,
  type PostType,
  type PurlinMaterial,
  type PurlinSet,
  type SkirtMode,
  type WallMesh,
} from '../lib/model'
import { formatAud, price } from '../lib/prices'

export type BedDraft = {
  width: number
  length: number
  height: number
  color: BirdiesColor
  owned: boolean
  rot: 0 | 90
}

type ControlsProps = {
  input: CageInputs
  patch: (p: Partial<CageInputs>) => void
  selectedId: string | null
  placing: boolean
  draft: BedDraft
  setDraft: (d: BedDraft) => void
  onSelect: (id: string | null) => void
  onStartPlace: () => void
  onCancelPlace: () => void
  onPackFour: () => void
  onRotate: () => void
  onDuplicate: () => void
  onDelete: () => void
  onToggleOwned: () => void
  onFillCage: () => void
  onFillLeftover: () => void
}

function Slider({
  label,
  field,
  input,
  patch,
  unit = 'm',
}: {
  label: string
  field: keyof typeof LIMITS
  input: CageInputs
  patch: (p: Partial<CageInputs>) => void
  unit?: string
}) {
  const lim = LIMITS[field]
  const value = input[field]
  return (
    <label className="slider">
      <span>
        {label}
        <em>
          {typeof value === 'number' && unit === 'm' ? formatM(value, value >= 10 && lim.step >= 1 ? 0 : 2) : `${value}${unit === 'm' ? '' : ` ${unit}`}`}
        </em>
      </span>
      <input
        type="range"
        min={lim.min}
        max={lim.max}
        step={lim.step}
        value={value}
        onChange={(e) => patch({ [field]: Number(e.target.value) })}
      />
    </label>
  )
}

function MmGap({
  label,
  metres,
  min,
  max,
  onChange,
}: {
  label: string
  metres: number
  min: number
  max: number
  onChange: (metres: number) => void
}) {
  const mm = Math.round(metres * 1000)
  function setMm(raw: number) {
    const clamped = Math.min(max, Math.max(min, Math.round(raw / 50) * 50))
    onChange(clamped / 1000)
  }
  return (
    <label className="slider mm-gap">
      <span>
        {label}
        <em>{mm} mm</em>
      </span>
      <span className="mm-row">
        <input
          type="range"
          min={min}
          max={max}
          step={50}
          value={mm}
          onChange={(e) => setMm(Number(e.target.value))}
        />
        <input
          type="number"
          min={min}
          max={max}
          step={50}
          value={mm}
          onChange={(e) => setMm(Number(e.target.value))}
          aria-label={`${label} millimetres`}
        />
      </span>
    </label>
  )
}

export function Controls({
  input,
  patch,
  selectedId,
  placing,
  draft,
  setDraft,
  onSelect,
  onStartPlace,
  onCancelPlace,
  onPackFour,
  onRotate,
  onDuplicate,
  onDelete,
  onToggleOwned,
  onFillCage,
  onFillLeftover,
}: ControlsProps) {
  return (
    <div className="controls">
      <section>
        <h2>Preset</h2>
        <div className="preset-row">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              title={p.note}
              onClick={() => patch(p.patch)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2>Cage size</h2>
        <Slider label="Length" field="length" input={input} patch={patch} />
        <Slider label="Width" field="width" input={input} patch={patch} />
        <Slider label="Peak height" field="peakHeight" input={input} patch={patch} />
        <p className="hint">
          Length is the hoop-run. Width is the span the pipes jump. Peak is ground to the ridge.
        </p>
      </section>

      <section>
        <h2>Gaps</h2>
        <MmGap
          label="Work (between long sides)"
          metres={input.aisleWork}
          min={400}
          max={1500}
          onChange={(m) => patch({ aisleWork: m })}
        />
        <MmGap
          label="Walk (between short ends)"
          metres={input.aisleWalk}
          min={400}
          max={1200}
          onChange={(m) => patch({ aisleWalk: m })}
        />
        <MmGap
          label="Door / entrance to first bed"
          metres={input.aisleDoor}
          min={400}
          max={1500}
          onChange={(m) => patch({ aisleDoor: m })}
        />
        <MmGap
          label="Wall to long side"
          metres={input.aisleWallLong}
          min={400}
          max={1500}
          onChange={(m) => patch({ aisleWallLong: m })}
        />
        <MmGap
          label="Wall to short side"
          metres={input.aisleWallShort}
          min={400}
          max={1200}
          onChange={(m) => patch({ aisleWallShort: m })}
        />
        <p className="hint">
          Bed-to-bed: work on 244 cm faces, walk on 122 cm ends. Fence: long face, short face, and door
          each have their own millimetres. Fill cage to pack with these numbers.
        </p>
        <div className="preset-row">
          <button
            type="button"
            onClick={() =>
              patch({ aisleWork: 0.6, aisleWalk: 0.6, aisleDoor: 0.6, aisleWallLong: 0.6, aisleWallShort: 0.6 })
            }
          >
            All 600
          </button>
          <button
            type="button"
            onClick={() =>
              patch({ aisleWork: 0.8, aisleWalk: 0.6, aisleDoor: 0.8, aisleWallLong: 0.8, aisleWallShort: 0.6 })
            }
          >
            Recommended
          </button>
          <button
            type="button"
            onClick={() =>
              patch({ aisleWork: 1, aisleWalk: 0.6, aisleDoor: 0.8, aisleWallLong: 1, aisleWallShort: 0.6 })
            }
          >
            1000 work
          </button>
        </div>
      </section>

      <section>
        <h2>Birdies beds</h2>
        <p className="hint">
          Select-A-Size: 61 / 92 / 122 cm wide, 37 or 74 cm high, length 61–762 cm. Four 122 × 244 ×
          37 Pale Eucalypt already owned.
        </p>
        <label className="select">
          Width
          <select
            value={String(draft.width)}
            onChange={(e) => setDraft({ ...draft, width: Number(e.target.value) })}
          >
            {BIRDIES_WIDTHS_M.map((w) => (
              <option key={w} value={w}>
                {cm(w)} wide
              </option>
            ))}
          </select>
        </label>
        <label className="select">
          Length
          <select
            value={String(draft.length)}
            onChange={(e) => setDraft({ ...draft, length: Number(e.target.value) })}
          >
            {BIRDIES_LENGTHS_M.map((w) => (
              <option key={w} value={w}>
                {cm(w)} long
              </option>
            ))}
          </select>
        </label>
        <label className="select">
          Height
          <select
            value={String(draft.height)}
            onChange={(e) => setDraft({ ...draft, height: Number(e.target.value) })}
          >
            {BIRDIES_HEIGHTS_M.map((w) => (
              <option key={w} value={w}>
                {cm(w)} high
              </option>
            ))}
          </select>
        </label>
        <label className="select">
          Colour
          <select
            value={draft.color}
            onChange={(e) => setDraft({ ...draft, color: e.target.value as BirdiesColor })}
          >
            {(Object.keys(BIRDIES_COLORS) as BirdiesColor[]).map((k) => (
              <option key={k} value={k}>
                {BIRDIES_COLORS[k].label}
              </option>
            ))}
          </select>
        </label>
        <label className="select">
          Rotation
          <select
            value={String(draft.rot)}
            onChange={(e) => setDraft({ ...draft, rot: Number(e.target.value) === 90 ? 90 : 0 })}
          >
            <option value="0">Length along cage (244 cm runs door-to-end)</option>
            <option value="90">Length across cage (244 cm runs side-to-side)</option>
          </select>
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={draft.owned}
            onChange={(e) => setDraft({ ...draft, owned: e.target.checked })}
          />
          Already bought
        </label>
        <div className="preset-row">
          {placing ? (
            <button type="button" className="is-on" onClick={onCancelPlace}>
              Cancel place
            </button>
          ) : (
            <button type="button" onClick={onStartPlace}>
              Place on plan
            </button>
          )}
          <button type="button" onClick={onPackFour}>
            Pack 4 owned
          </button>
          <button type="button" onClick={onFillCage} title="Replace layout with as many of this size as fit">
            Fill cage
          </button>
          <button type="button" onClick={onFillLeftover} title="Keep current beds, add more of this size in leftover space">
            Fill leftover
          </button>
        </div>
        <p className="hint">
          Fill uses this size and rotation, with 800 mm work / 600 mm walk (or whatever you set). First four
          122 × 244 × 37 stay owned; extras are to-buy.
        </p>
        <ul className="bed-list">
          {input.beds.map((b, i) => (
            <li key={b.id}>
              <button
                type="button"
                className={b.id === selectedId ? 'is-on' : undefined}
                onClick={() => onSelect(b.id)}
              >
                {i + 1}. {shortBed(b)}
                {b.owned ? ' · owned' : ''}
              </button>
            </li>
          ))}
        </ul>
        {selectedId ? (
          <div className="preset-row">
            <button type="button" onClick={onRotate}>
              Rotate 90°
            </button>
            <button type="button" onClick={onDuplicate}>
              Duplicate
            </button>
            <button type="button" onClick={onToggleOwned}>
              Toggle owned
            </button>
            <button type="button" onClick={onDelete}>
              Delete
            </button>
          </div>
        ) : null}
      </section>

      <section>
        <h2>Fence</h2>
        <Slider label="Wire height" field="meshHeight" input={input} patch={patch} />
        <label className="select">
          Picket / post length
          <select
            value={String(input.picketLength)}
            onChange={(e) => patch({ picketLength: Number(e.target.value) as PicketLength })}
          >
            {PICKET_LENGTHS.map((m) => (
              <option key={m} value={m}>
                {formatM(m, 2)}
              </option>
            ))}
          </select>
        </label>
        <Slider label="Embed depth" field="embedDepth" input={input} patch={patch} />
        <FrameHint input={input} />
        <label className="select">
          Wall mesh
          <select
            value={input.wallMesh}
            onChange={(e) => patch({ wallMesh: e.target.value as WallMesh })}
          >
            {(Object.keys(WALL_MESH) as WallMesh[]).map((k) => (
              <option key={k} value={k}>
                {WALL_MESH[k].label}
              </option>
            ))}
          </select>
        </label>
        <label className="select">
          Posts
          <select
            value={input.postType}
            onChange={(e) => patch({ postType: e.target.value as PostType })}
          >
            {(Object.keys(POST_TYPE) as PostType[]).map((k) => (
              <option key={k} value={k}>
                {POST_TYPE[k].label}
              </option>
            ))}
          </select>
        </label>
        {input.postType === 'star' && input.picketLength === 1.8 && input.ownedPickets > 0 ? (
          <p className="hint">
            {price('star-1.8').label}, {formatAud(price('star-1.8').aud)} each. Southern Farm Supplies, Bega, 20 Nov
            2026. Already have {input.ownedPickets}. The list prices only the rest.
          </p>
        ) : null}
        <label className="select">
          Skirt
          <select
            value={input.skirtMode}
            onChange={(e) => patch({ skirtMode: e.target.value as SkirtMode })}
          >
            <option value="buried-vertical">Buried vertical</option>
            <option value="l-outward">L folded outward</option>
            <option value="none">None</option>
          </select>
        </label>
        {input.skirtMode === 'none' ? null : (
          <Slider label="Skirt depth" field="skirtDepth" input={input} patch={patch} />
        )}
        <label className="check">
          <input
            type="checkbox"
            checked={input.sleeperBase}
            onChange={(e) => patch({ sleeperBase: e.target.checked })}
          />
          {`200×50 H4 sleeper, ${Math.round(SLEEPER.buryM * 1000)} mm in the ground, ${Math.round(SLEEPER.revealM * 1000)} mm above`}
        </label>
      </section>

      <section>
        <h2>Hoops + net</h2>
        <Slider label="Hoop spacing" field="hoopSpacing" input={input} patch={patch} />
        <label className="select">
          Pipe starts
          <select
            value={input.hoopOrigin}
            onChange={(e) => patch({ hoopOrigin: e.target.value as HoopOrigin })}
          >
            <option value="ground">Sleeved over the picket tops</option>
            <option value="rail">Saddle-clipped to a top rail</option>
          </select>
        </label>
        <Slider label="Sleeve on picket" field="pipeInsert" input={input} patch={patch} />
        <p className="hint">
          Pipe slides {(input.pipeInsert * 1000).toFixed(0)} mm over the picket top and stays vertical there.
          The wire must stop at the bottom of that sleeve.
        </p>
        <label className="select">
          Hoop pipe
          <select
            value={input.hoopMaterial}
            onChange={(e) => patch({ hoopMaterial: e.target.value as HoopMaterial })}
          >
            {(Object.keys(HOOP_MATERIAL) as HoopMaterial[]).map((k) => (
              <option key={k} value={k}>
                {HOOP_MATERIAL[k].label}
              </option>
            ))}
          </select>
        </label>
        <label className="select">
          Purlins
          <select
            value={String(input.purlins)}
            onChange={(e) => patch({ purlins: Number(e.target.value) as PurlinSet })}
          >
            <option value="1">Ridge only</option>
            <option value="3">Ridge + two side purlins</option>
          </select>
        </label>
        {input.purlins === 3 ? (
          <label className="select">
            Purlin material
            <select
              value={input.purlinMaterial}
              onChange={(e) => patch({ purlinMaterial: e.target.value as PurlinMaterial })}
            >
              <option value="wire">2.5 mm tensioned wire</option>
              <option value="pipe">Same pipe as the hoops</option>
            </select>
          </label>
        ) : null}
        <Slider label="Design gust" field="windGust" input={input} patch={patch} unit="m/s" />
        <p className="hint">
          Rough wind check only, not engineering. Default 40 m/s. Net is taken as about 35% solid.
        </p>
        <label className="select">
          Net
          <select
            value={input.netType}
            onChange={(e) => patch({ netType: e.target.value as NetType })}
          >
            <option value="wildlife5">Wildlife-safe knitted ≤ 5 mm (white)</option>
            <option value="bird5">Anti-bird 5 mm</option>
          </select>
        </label>
      </section>

      <section>
        <h2>Door</h2>
        <label className="select">
          Door
          <select
            value={input.doorStyle}
            onChange={(e) => patch({ doorStyle: e.target.value as DoorStyle })}
          >
            <option value="mesh-gate">Galvanised mesh gate on round posts</option>
            <option value="timber">Pine leaf on picket jambs</option>
          </select>
        </label>
        <Slider label="Door width" field="doorWidth" input={input} patch={patch} />
        <Slider label="Door height" field="doorHeight" input={input} patch={patch} />
        <label className="check">
          <input
            type="checkbox"
            checked={input.tomatoTrellis}
            onChange={(e) => patch({ tomatoTrellis: e.target.checked })}
          />
          Tomato trellis (already have)
        </label>
        {input.tomatoTrellis ? (
          <p className="hint">
            2 × Whites Ultrapost 2.4 m and Whites Dog Fence Medium 120 cm × 10 m. Inside the cage, not the walls or
            the door.
          </p>
        ) : null}
      </section>
    </div>
  )
}

function FrameHint({ input }: { input: CageInputs }) {
  const frame = frameHeights(input)
  const third = input.picketLength / 3
  return (
    <p className="hint">
      Stick-up {formatM(frame.stickUp, 2)}. Sleeve {Math.round(frame.sleeveBot * 1000)}–
      {Math.round(frame.sleeveTop * 1000)} mm. One-third of this picket is {formatM(third, 2)}.
      {frame.overlaps ? ' Wire currently runs into the sleeve.' : ''}
    </p>
  )
}

function shortBed(b: PlacedBed): string {
  return `${cm(b.width)} × ${cm(b.length)} × ${cm(b.height)}`
}

