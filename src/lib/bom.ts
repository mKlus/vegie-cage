import { bedLabel, bedSku, growingM2, soilM3 } from './birdies'
import { buildGeometry, warnings, type CageGeometry } from './geometry'
import {
  HOOP_MATERIAL,
  POST_TYPE,
  SLEEPER,
  WALL_MESH,
  type CageInputs,
  round1,
  round2,
} from './model'
import {
  PRICE_NOTE,
  birdiesBedAud,
  formatAud,
  hoopPrice,
  meshRollAud,
  postPrice,
  price,
  roundMoney,
} from './prices'

export type BomLine = {
  id: string
  category: string
  item: string
  spec: string
  exact: string
  exactM: number
  buy: string
  note: string
  qty: number
  unitAud: number
  lineAud: number
  inTotal: boolean
}

export type BomResult = {
  lines: BomLine[]
  bedLines: BomLine[]
  geo: CageGeometry
  totals: {
    hoopPipeM: number
    meshM: number
    netM2: number
    timberM: number
    soilM3: number
    growM2: number
    cageAud: number
    bedsAud: number
  }
  priceNote: string
}

function moneyLine(
  base: Omit<BomLine, 'qty' | 'unitAud' | 'lineAud' | 'inTotal'>,
  qty: number,
  unitAud: number,
  inTotal = qty > 0 && unitAud > 0,
): BomLine {
  return {
    ...base,
    qty,
    unitAud,
    lineAud: inTotal ? roundMoney(qty * unitAud) : 0,
    inTotal,
  }
}

function ceilTo(n: number, stock: number): number {
  if (stock <= 0) return 0
  return Math.ceil(n / stock - 1e-9)
}

function pickHeight(needed: number, stocks: number[]): number {
  const fit = stocks.find((h) => h + 1e-6 >= needed)
  return fit ?? stocks[stocks.length - 1]!
}

function pickRoll(lengthM: number, stocks: number[]): { count: number; size: number } {
  let best = { count: Infinity, size: stocks[0]!, bought: Infinity }
  for (const size of stocks) {
    const count = ceilTo(lengthM, size)
    const bought = count * size
    if (bought < best.bought - 1e-9 || (Math.abs(bought - best.bought) < 1e-9 && count < best.count)) {
      best = { count, size, bought }
    }
  }
  return { count: best.count, size: best.size }
}

function coilOrSticks(exactM: number, stockM: number, kind: 'coil' | 'stick', extraJoiners = 0): string {
  const n = ceilTo(exactM, stockM)
  if (kind === 'coil') return `${n} × ${stockM} m coil${n === 1 ? '' : 's'}`
  const joiner = extraJoiners > 0 ? ` + ${extraJoiners} joiner${extraJoiners === 1 ? '' : 's'}` : ''
  return `${n} × ${stockM} m stick${n === 1 ? '' : 's'}${joiner}`
}

const SLEEPER_STOCK_M = 2.4
const STAPLES_PER_KG = 400

export function buildBom(input: CageInputs): BomResult {
  const geo = buildGeometry(input)
  const hoop = HOOP_MATERIAL[input.hoopMaterial]
  const mesh = WALL_MESH[input.wallMesh]
  const post = POST_TYPE[input.postType]
  const hoopQuote = hoopPrice(input.hoopMaterial)
  const lines: BomLine[] = []
  const bedLines: BomLine[] = []

  const hoopPipeM = geo.hoopCount * geo.pipeEachM
  const ridgeM = input.length
  const purlinPipeM = input.purlins === 3 && input.purlinMaterial === 'pipe' ? 2 * input.length : 0
  const hoopTotalM = hoopPipeM + ridgeM + purlinPipeM

  let hoopJoiners = 0
  if (hoop.stockKind === 'stick' && geo.pipeEachM > hoop.stockM) {
    hoopJoiners = geo.hoopCount * Math.max(0, ceilTo(geo.pipeEachM, hoop.stockM) - 1)
  }

  const pipeBuyN = ceilTo(hoopTotalM, hoop.stockM)
  lines.push(
    moneyLine(
      {
        id: 'hoop-pipe',
        category: 'Frame',
        item: 'Hoop pipe',
        spec: hoop.label,
        exact: `${geo.hoopCount} hoops × ${geo.pipeEachM.toFixed(2)} m = ${round1(hoopPipeM).toFixed(1)} m`,
        exactM: round2(hoopPipeM),
        buy: coilOrSticks(hoopPipeM, hoop.stockM, hoop.stockKind, hoopJoiners),
        note: `${(geo.pipeInsertM * 1000).toFixed(0)} mm sleeve on the picket top (${geo.sleeveBot.toFixed(2)}–${geo.sleeveTop.toFixed(2)} m). Pipe stays vertical in the sleeve, then bends. Tightest radius ${geo.minBendRadius.toFixed(2)} m at the ${geo.bendAt}.`,
      },
      0,
      0,
      false,
    ),
  )

  lines.push(
    moneyLine(
      {
        id: 'ridge',
        category: 'Frame',
        item: 'Ridge pipe',
        spec: hoop.label,
        exact: `${ridgeM.toFixed(2)} m`,
        exactM: round2(ridgeM),
        buy: coilOrSticks(ridgeM, hoop.stockM, hoop.stockKind),
        note: 'Zip-tie or saddle to every hoop peak. Stops the net sagging and the hoops walking.',
      },
      0,
      0,
      false,
    ),
  )

  if (purlinPipeM > 0) {
    lines.push(
      moneyLine(
        {
          id: 'purlins',
          category: 'Frame',
          item: 'Side purlins (2)',
          spec: hoop.label,
          exact: `2 × ${input.length.toFixed(2)} m = ${purlinPipeM.toFixed(2)} m`,
          exactM: round2(purlinPipeM),
          buy: coilOrSticks(purlinPipeM, hoop.stockM, hoop.stockKind),
          note: 'Pipe purlins halfway down each shoulder. On a wide span, wire purlins do the same job lighter.',
        },
        0,
        0,
        false,
      ),
    )
  }

  lines.push(
    moneyLine(
      {
        id: 'hoop-pipe-all',
        category: 'Frame',
        item: 'All hoop / ridge / purlin pipe',
        spec: hoop.label,
        exact: `${round1(hoopTotalM).toFixed(1)} m`,
        exactM: round2(hoopTotalM),
        buy: coilOrSticks(hoopTotalM, hoop.stockM, hoop.stockKind, hoopJoiners),
        note: `${hoopQuote.source}. ${hoopQuote.verified ? 'Verified' : 'Unverified'} ${hoopQuote.date}. Cut hoops first.`,
      },
      pipeBuyN,
      hoopQuote.aud,
    ),
  )

  const postCount = geo.pickets.total
  const postQuote = postPrice(input.postType, input.picketLength)
  lines.push(
    moneyLine(
      {
        id: 'posts',
        category: 'Fence',
        item: 'Posts',
        spec: `${post.label}, ${input.picketLength.toFixed(2)} m`,
        exact: `${postCount} posts × ${input.picketLength.toFixed(2)} m (${round1(postCount * input.picketLength).toFixed(1)} m)`,
        exactM: round2(postCount * input.picketLength),
        buy: `${postCount} × ${input.picketLength.toFixed(2)} m`,
        note: `Embed ${(input.embedDepth * 1000).toFixed(0)} mm, stick-up ${geo.stickUp.toFixed(2)} m. ${geo.pickets.hoop} under hoops (no caps), ${geo.pickets.end} end-wall including ${geo.pickets.jambs} door jambs, ${geo.pickets.stays} corner stays. ${postQuote.source}.`,
      },
      postCount,
      postQuote.aud,
    ),
  )

  if (geo.pickets.caps > 0) {
    const cap = price('cap-10')
    const packs = ceilTo(geo.pickets.caps, 10)
    lines.push(
      moneyLine(
        {
          id: 'caps',
          category: 'Fence',
          item: 'Picket caps',
          spec: cap.label,
          exact: `${geo.pickets.caps} caps`,
          exactM: geo.pickets.caps,
          buy: `${packs} × pack of 10`,
          note: 'Only pickets the hoop does not cover: end wall, door jambs, corner stays. Hoop pickets are sleeved.',
        },
        packs,
        cap.aud,
      ),
    )
  }

  const railM = 2 * input.length + 2 * input.width
  if (input.postType !== 'star') {
    const railQuote = price('pine-70x35-5.4')
    const railSticks = ceilTo(railM, 5.4)
    lines.push(
      moneyLine(
        {
          id: 'top-rail',
          category: 'Fence',
          item: 'Top rail',
          spec: '70 × 35 H3 pine, or 32 NB galv',
          exact: `${railM.toFixed(2)} m (full perimeter)`,
          exactM: round2(railM),
          buy: `${railSticks} × 5.4 m of 70 × 35`,
          note: 'Staple mesh to this. Saddle-clip hoops to it when the pipe starts at a rail.',
        },
        railSticks,
        railQuote.aud,
      ),
    )
    if (!input.sleeperBase) {
      lines.push(
        moneyLine(
          {
            id: 'bottom-rail',
            category: 'Fence',
            item: 'Bottom rail',
            spec: '70 × 35 H3 pine',
            exact: `${railM.toFixed(2)} m`,
            exactM: round2(railM),
            buy: `${railSticks} × 5.4 m of 70 × 35`,
            note: 'Keeps mesh tight at the soil line when there is no sleeper.',
          },
          railSticks,
          railQuote.aud,
        ),
      )
    }
  }

  const sleeperRun = input.sleeperBase ? Math.max(0, geo.perimeterM - input.doorWidth) : 0
  if (sleeperRun > 0) {
    const sleeper = price('sleeper-200x50-2.4')
    const sticks = ceilTo(sleeperRun, SLEEPER_STOCK_M)
    lines.push(
      moneyLine(
        {
          id: 'sleeper',
          category: 'Fence',
          item: 'Base sleeper',
          spec: sleeper.label,
          exact: `${sleeperRun.toFixed(2)} m outside the pickets, door gap left open`,
          exactM: round2(sleeperRun),
          buy: `${sticks} × ${SLEEPER_STOCK_M} m`,
          note: `200 × 50 on edge: ${(SLEEPER.buryM * 1000).toFixed(0)} mm in the ground, ${(SLEEPER.revealM * 1000).toFixed(0)} mm above. Fix to the pickets. Staple the wire to the face from ground level.`,
        },
        sticks,
        sleeper.aud,
      ),
    )
  }

  const meshHeightStock = pickHeight(input.meshHeight, mesh.stockHeights)
  const wallMeshM = geo.meshRunM
  const wallRoll = pickRoll(wallMeshM, mesh.stockLengths)

  lines.push(
    moneyLine(
      {
        id: 'wall-mesh',
        category: 'Fence',
        item: 'Wall mesh',
        spec: `${mesh.label}, ${meshHeightStock.toFixed(1)} m tall roll`,
        exact: `${wallMeshM.toFixed(2)} m run × ${input.meshHeight.toFixed(2)} m high (${(wallMeshM * input.meshHeight).toFixed(1)} m²)`,
        exactM: round2(wallMeshM),
        buy: `${wallRoll.count} × ${meshHeightStock.toFixed(1)} m × ${wallRoll.size} m roll${wallRoll.count === 1 ? '' : 's'}`,
        note: input.sleeperBase
          ? `From ground level to ${input.meshHeight.toFixed(2)} m, stapled to the sleeper face. Perimeter ${geo.perimeterM.toFixed(2)} m minus the ${input.doorWidth.toFixed(2)} m door, plus joins.`
          : `Wire height is independent of the sleeve. Perimeter ${geo.perimeterM.toFixed(2)} m minus the ${input.doorWidth.toFixed(2)} m door, plus joins.`,
      },
      wallRoll.count,
      meshRollAud(mesh.apertureMm, meshHeightStock, wallRoll.size),
    ),
  )

  let skirtM = 0
  if (input.skirtMode !== 'none' && input.skirtDepth > 0) {
    const skirtH = pickHeight(Math.max(input.skirtDepth, 0.3), mesh.stockHeights)
    const strips = Math.max(1, Math.floor((skirtH + 1e-9) / input.skirtDepth))
    const coverPerMetreOfRoll = strips
    const skirtRun = input.skirtMode === 'l-outward' ? Math.max(0, geo.perimeterM - input.doorWidth) : geo.perimeterM
    skirtM = skirtRun
    const rollNeed = skirtRun / coverPerMetreOfRoll
    const skirtRoll = pickRoll(rollNeed, mesh.stockLengths)
    const folded = input.skirtMode === 'l-outward'
    lines.push(
      moneyLine(
        {
          id: 'skirt',
          category: 'Fence',
          item: folded ? 'L-folded apron' : 'Buried skirt',
          spec: `${mesh.label}, ripped from a ${skirtH.toFixed(1)} m roll (${strips} strips)`,
          exact: `${skirtRun.toFixed(2)} m × ${input.skirtDepth.toFixed(2)} m = ${(skirtRun * input.skirtDepth).toFixed(1)} m²`,
          exactM: round2(skirtRun),
          buy: `${skirtRoll.count} × ${skirtH.toFixed(1)} m × ${skirtRoll.size} m roll${skirtRoll.count === 1 ? '' : 's'}`,
          note: folded
            ? 'Separate from the wall wire. Fold outward on the soil, peg, cover with mulch.'
            : 'Separate from the wall wire. Bury vertical in a trench, 200–300 mm deep.',
        },
        skirtRoll.count,
        meshRollAud(mesh.apertureMm, skirtH, skirtRoll.size),
      ),
    )
  }

  const net = geo.net
  const netRate = price('net-m2')
  const pieceAud = roundMoney(net.stockW * net.stockL * netRate.aud)
  lines.push(
    moneyLine(
      {
        id: 'net-roof',
        category: 'Cover',
        item: 'Roof and end net',
        spec:
          input.netType === 'wildlife5'
            ? 'Knitted white wildlife-safe net, ≤ 5 mm mesh'
            : 'Knitted anti-bird net, 5 mm',
        exact: `Roof ${net.roofWidthM.toFixed(2)} × ${net.roofLengthM.toFixed(2)} m (${net.roofAreaM2.toFixed(1)} m²) + ends ${net.endAreaM2.toFixed(1)} m² arch = ${net.usedM2.toFixed(1)} m²`,
        exactM: round2(net.roofWidthM),
        buy: net.buy,
        note: 'Cut to stock pieces. Roof runs down to overlap the top of the wire. End walls follow the arch, not a rectangle. Taut net: loose net traps bats and possums.',
      },
      net.pieces,
      pieceAud,
    ),
  )

  lines.push(
    moneyLine(
      {
        id: 'net-ends',
        category: 'Cover',
        item: 'End-wall net',
        spec: 'Same net, arch shape',
        exact: `${net.endAreaM2.toFixed(1)} m² both ends, door cut out of the near end`,
        exactM: round2(net.endAreaM2),
        buy: 'Cut from the stock pieces above',
        note: 'Area under the real hoop above the wire, including the short drop that overlaps the mesh. Not width × peak.',
      },
      0,
      0,
      false,
    ),
  )

  const doorH = input.doorHeight
  const doorW = input.doorWidth
  const doorStick = 2 * doorH + 3 * doorW
  const doorQuote = price('pine-70x35-2.4')
  const doorSticks = ceilTo(doorStick + 2 * doorH, 2.4)
  lines.push(
    moneyLine(
      {
        id: 'door-frame',
        category: 'Door',
        item: 'Door frame + leaf',
        spec: '70 × 35 H3 pine',
        exact: `Leaf ${doorStick.toFixed(2)} m (2 stiles, 3 rails) + 2 jamb linings × ${Math.max(doorH, input.meshHeight).toFixed(2)} m`,
        exactM: round2(doorStick + 2 * Math.max(doorH, input.meshHeight)),
        buy: `${doorSticks} × 2.4 m of 70 × 35`,
        note: 'Diagonal brace on the leaf. Three hinges. Drop bolt into a pipe socket. Latch a dog cannot nose. Picket door jambs are in the post count.',
      },
      doorSticks,
      doorQuote.aud,
    ),
  )

  const doorMeshH = Math.min(input.meshHeight, doorH)
  lines.push(
    moneyLine(
      {
        id: 'door-skin',
        category: 'Door',
        item: 'Door skin',
        spec: `${mesh.label} lower, net upper`,
        exact: `Mesh ${doorW.toFixed(2)} × ${doorMeshH.toFixed(2)} m; net ${doorW.toFixed(2)} × ${Math.max(0, doorH - doorMeshH).toFixed(2)} m`,
        exactM: round2(doorW * doorH),
        buy: 'Cut from wall mesh + roof net leftovers',
        note: 'Same rule as the walls: stiff mesh where animals push, net where they climb.',
      },
      0,
      0,
      false,
    ),
  )

  const lineCount = input.sleeperBase ? 2 : 3
  const lineM = lineCount * geo.meshRunM * 1.05
  const purlinWireM = input.purlins === 3 && input.purlinMaterial === 'wire' ? 2 * (input.length + 2) : 0
  const guyCount = 4
  const guyEach = 4
  const guyM = guyCount * guyEach
  const wireM = lineM + purlinWireM + guyM
  const wireBuy = cheapestWire(wireM)

  lines.push(
    moneyLine(
      {
        id: 'line-wire',
        category: 'Frame',
        item: 'Line wires',
        spec: '2.5 mm high-tensile fencing wire',
        exact: `${lineCount} runs × ${geo.meshRunM.toFixed(2)} m ≈ ${lineM.toFixed(1)} m`,
        exactM: round2(lineM),
        buy: 'Included in the 2.5 mm coil',
        note: input.sleeperBase
          ? 'Mid and top of the wire. The bottom sits at ground level and is stapled to the sleeper face, so no bottom line wire.'
          : 'Bottom, mid, and top. Hog-ring the mesh to each line.',
      },
      0,
      0,
      false,
    ),
  )

  if (purlinWireM > 0) {
    lines.push(
      moneyLine(
        {
          id: 'purlins',
          category: 'Frame',
          item: 'Wire purlins (2)',
          spec: '2.5 mm high-tensile, tensioned',
          exact: `2 × ${(input.length + 2).toFixed(2)} m = ${purlinWireM.toFixed(1)} m`,
          exactM: round2(purlinWireM),
          buy: 'Included in the 2.5 mm coil',
          note: 'Halfway down each shoulder, strained between the end hoops. Stops the net sailing between hoops.',
        },
        0,
        0,
        false,
      ),
    )
  }

  lines.push(
    moneyLine(
      {
        id: 'guys',
        category: 'Frame',
        item: 'End guys',
        spec: '2.5 mm wire, diagonal, both end hoops',
        exact: `${guyCount} × ${guyEach} m = ${guyM} m`,
        exactM: guyM,
        buy: 'Included in the 2.5 mm coil',
        note: 'One pair on each end hoop, down to a ground anchor. These are the diagonal braces.',
      },
      0,
      0,
      false,
    ),
  )

  const wireQuote = price(wireBuy.id)
  lines.push(
    moneyLine(
      {
        id: 'wire-coil',
        category: 'Frame',
        item: '2.5 mm fencing wire',
        spec: wireQuote.label,
        exact: `${wireM.toFixed(1)} m (lines + purlins + guys)`,
        exactM: round2(wireM),
        buy: `${wireBuy.count} × ${wireBuy.stock} m coil${wireBuy.count === 1 ? '' : 's'}`,
        note: wireQuote.source,
      },
      wireBuy.count,
      wireQuote.aud,
    ),
  )

  const anchor = price('anchor')
  lines.push(
    moneyLine(
      {
        id: 'anchors',
        category: 'Frame',
        item: 'Ground anchors',
        spec: anchor.label,
        exact: `${guyCount} anchors`,
        exactM: guyCount,
        buy: `${guyCount} anchors`,
        note: 'One per guy, outside the end hoops.',
      },
      guyCount,
      anchor.aud,
    ),
  )

  const grouped = new Map<
    string,
    { label: string; owned: number; buy: number; m2: number; m3: number; w: number; l: number; h: number }
  >()
  for (const bed of input.beds) {
    const key = bedSku(bed)
    const g = grouped.get(key) ?? {
      label: bedLabel(bed),
      owned: 0,
      buy: 0,
      m2: 0,
      m3: 0,
      w: bed.width,
      l: bed.length,
      h: bed.height,
    }
    if (bed.owned) g.owned += 1
    else g.buy += 1
    g.m2 += growingM2(bed)
    g.m3 += soilM3(bed)
    grouped.set(key, g)
  }
  let gi = 0
  for (const g of grouped.values()) {
    gi += 1
    const n = g.owned + g.buy
    const unit = birdiesBedAud(g.w, g.l, g.h)
    bedLines.push(
      moneyLine(
        {
          id: `birdies-${gi}`,
          category: 'Birdies',
          item: g.label,
          spec: 'Aluzinc steel, PVC safety edge, stainless fasteners. Size ±50 mm.',
          exact: `${n} bed${n === 1 ? '' : 's'} · ${g.m2.toFixed(2)} m² soil surface · ${g.m3.toFixed(2)} m³ fill`,
          exactM: round2(g.m3),
          buy: g.buy === 0 ? `${g.owned} owned — none to buy` : `${g.buy} to buy` + (g.owned ? ` (${g.owned} already owned)` : ''),
          note: 'Birdies Select-A-Size. Same width/height family mixes lengths. Pale Eucalypt is Colorbond mist green.',
        },
        g.buy,
        unit,
      ),
    )
  }
  if (input.beds.length === 0) {
    bedLines.push(
      moneyLine(
        {
          id: 'beds-empty',
          category: 'Birdies',
          item: 'No beds placed',
          spec: 'Add from the Birdies picker, then drag on the Plan view',
          exact: '0',
          exactM: 0,
          buy: '—',
          note: 'Four 122 × 244 × 37 cm Pale Eucalypt beds are already bought — Pack 4 owned to drop them in.',
        },
        0,
        0,
        false,
      ),
    )
  }

  const soilTotal = input.beds.reduce((s, b) => s + soilM3(b), 0)
  const growTotal = input.beds.reduce((s, b) => s + growingM2(b), 0)
  const soilQuote = price('soil-m3')
  bedLines.push(
    moneyLine(
      {
        id: 'soil',
        category: 'Birdies',
        item: 'Potting mix / soil fill',
        spec: 'Fill to ~20 mm below the safety edge',
        exact: `${soilTotal.toFixed(2)} m³ (${(soilTotal * 1000).toFixed(0)} L)`,
        exactM: round2(soilTotal),
        buy: `Bulk ${soilTotal.toFixed(2)} m³ (or ${Math.ceil(soilTotal / 0.03)} × 30 L bags)`,
        note: 'Birdies walls are thin steel — volume is the outside L × W × H. Priced as bulk mix.',
      },
      round2(soilTotal),
      soilQuote.aud,
    ),
  )
  const bedsToBuy = input.beds.filter((b) => !b.owned).length
  if (bedsToBuy > 0) {
    const ship = price('birdies-ship')
    bedLines.push(
      moneyLine(
        {
          id: 'birdies-ship',
          category: 'Birdies',
          item: 'Birdies shipping',
          spec: 'Flat rate mainland AU (Birdies listed $25.50)',
          exact: '1 order',
          exactM: 0,
          buy: '1 × shipping',
          note: 'Edging excluded. Remote depot extra.',
        },
        1,
        ship.aud,
      ),
    )
  }

  const zipTies = geo.hoopCount * (input.purlins + 8)
  const tieBags = Math.ceil(zipTies / 100)
  const ties = price('ties-100')
  lines.push(
    moneyLine(
      {
        id: 'zips',
        category: 'Fixings',
        item: 'UV cable ties',
        spec: '200 × 4.8 mm black',
        exact: `~${zipTies} ties`,
        exactM: zipTies,
        buy: `${tieBags * 100} ties (bags of 100)`,
        note: 'Hoop-to-ridge, hoop-to-purlin, net-to-hoop. Snip tails so they do not punch the net.',
      },
      tieBags,
      ties.aud,
    ),
  )

  if (input.postType !== 'star') {
    const saddle = price('saddle')
    lines.push(
      moneyLine(
        {
          id: 'saddles',
          category: 'Fixings',
          item: 'Pipe saddles',
          spec: `${hoop.odMm} mm saddles`,
          exact: `${geo.hoopCount * 2} saddles`,
          exactM: geo.hoopCount * 2,
          buy: `${geo.hoopCount * 2} saddles + 12 g × 25 mm screws`,
          note: 'Two per hoop, into the top rail.',
        },
        geo.hoopCount * 2,
        saddle.aud,
      ),
    )
  }

  const stapleRun = input.sleeperBase ? sleeperRun : geo.meshRunM
  const stapleCount = Math.ceil(stapleRun / 0.15)
  const stapleKg = Math.max(1, Math.ceil(stapleCount / STAPLES_PER_KG))
  const staples = price('staples-kg')
  lines.push(
    moneyLine(
      {
        id: 'staples',
        category: 'Fixings',
        item: 'Fence staples',
        spec: 'Galvanised 20–25 mm',
        exact: `~${stapleCount} staples (every 150 mm)`,
        exactM: stapleCount,
        buy: `${stapleKg} kg`,
        note: input.sleeperBase
          ? `Staple the wire to the sleeper face every 150 mm. The ${(input.meshHeight * 1000).toFixed(0)} mm wire starts at ground level, on the ${(SLEEPER.revealM * 1000).toFixed(0)} mm above the trench.`
          : 'Staple mesh every 150 mm on the rails.',
      },
      stapleKg,
      staples.aud,
    ),
  )

  const hogAlong = Math.ceil((lineCount * geo.meshRunM) / 0.2)
  const hogNet = Math.ceil(geo.perimeterM / 0.15)
  const hogCount = hogAlong + hogNet
  const hog = price('hog-500')
  const hogBoxes = ceilTo(hogCount, 500)
  lines.push(
    moneyLine(
      {
        id: 'hog-rings',
        category: 'Fixings',
        item: 'Hog rings',
        spec: '19 mm (3/4 in) galvanised',
        exact: `~${hogCount} rings (${hogAlong} mesh-to-line, ${hogNet} net-to-wire)`,
        exactM: hogCount,
        buy: `${hogBoxes} × box of 500, plus hog-ring pliers`,
        note: 'Every 200 mm on the line wires, every 150 mm where the net overlaps the wire.',
      },
      hogBoxes,
      hog.aud,
    ),
  )

  if (input.skirtMode === 'l-outward') {
    const pegQuote = price('peg-50')
    const pegBags = ceilTo(geo.perimeterM / 0.4, 50)
    lines.push(
      moneyLine(
        {
          id: 'pegs',
          category: 'Fixings',
          item: 'Apron pegs',
          spec: '150 mm landscape staples',
          exact: `${Math.ceil(geo.perimeterM / 0.4)} pegs`,
          exactM: Math.ceil(geo.perimeterM / 0.4),
          buy: `${pegBags} bags of 50`,
          note: 'Peg the outward L every 0.4 m and cover it with mulch.',
        },
        pegBags,
        pegQuote.aud,
      ),
    )
  }

  const clip = price('clip-50')
  const clipBags = Math.max(1, Math.ceil((geo.hoopCount * 6) / 50))
  lines.push(
    moneyLine(
      {
        id: 'clips',
        category: 'Fixings',
        item: 'Net clips',
        spec: clip.label,
        exact: `~${geo.hoopCount * 6} clips`,
        exactM: geo.hoopCount * 6,
        buy: `${clipBags * 50} clips`,
        note: 'Hold the net to the pipe without punching holes.',
      },
      clipBags,
      clip.aud,
    ),
  )

  const iron = price('door-iron')
  lines.push(
    moneyLine(
      {
        id: 'ironmongery',
        category: 'Fixings',
        item: 'Door ironmongery',
        spec: '3 × 100 mm galvanised T-hinges, latch, drop bolt',
        exact: '3 hinges, 1 latch, 1 drop bolt, 1 pipe socket',
        exactM: 0,
        buy: '1 set',
        note: 'Self-closing spring optional. Threshold strip so the leaf does not snag mulch.',
      },
      1,
      iron.aud,
    ),
  )

  const timberPosts = input.postType === 'pine90' ? postCount * input.picketLength : 0
  const cageAud = roundMoney(lines.reduce((s, l) => s + (l.inTotal ? l.lineAud : 0), 0))
  const bedsAud = roundMoney(bedLines.reduce((s, l) => s + (l.inTotal ? l.lineAud : 0), 0))

  return {
    lines,
    bedLines,
    geo,
    totals: {
      hoopPipeM: round1(hoopTotalM),
      meshM: round1(wallMeshM + skirtM),
      netM2: round1(net.usedM2),
      timberM: round1(timberPosts + sleeperRun + doorStick),
      soilM3: round1(soilTotal),
      growM2: round1(growTotal),
      cageAud,
      bedsAud,
    },
    priceNote: PRICE_NOTE,
  }
}

function cheapestWire(metres: number): { count: number; stock: number; id: string } {
  const options = [
    { stock: 100, id: 'wire-2.5-100' },
    { stock: 500, id: 'wire-2.5-500' },
  ]
  let best = { count: Infinity, stock: 500, id: 'wire-2.5-500', bought: Infinity }
  for (const opt of options) {
    const count = ceilTo(metres, opt.stock)
    const bought = count * opt.stock
    if (bought < best.bought - 1e-9 || (Math.abs(bought - best.bought) < 1e-9 && count < best.count)) {
      best = { count, stock: opt.stock, id: opt.id, bought }
    }
  }
  return best
}

function dumpLines(rows: BomLine[]): string[] {
  const out: string[] = []
  let cat = ''
  for (const line of rows) {
    if (line.category !== cat) {
      cat = line.category
      out.push(`## ${cat}`)
    }
    out.push(`${line.item} — ${line.spec}`)
    out.push(`  exact: ${line.exact}`)
    out.push(`  buy:   ${line.buy}`)
    if (line.inTotal) out.push(`  est:   ${formatAud(line.lineAud)}`)
    if (line.note) out.push(`  note:  ${line.note}`)
    out.push('')
  }
  return out
}

export function bomPlainText(input: CageInputs, bom: BomResult): string {
  const g = bom.geo
  const notes = warnings(input, g).map((w) => `${w.level}: ${w.text}`)
  return [
    `Vegie cage cut list`,
    `${input.length.toFixed(2)} m long × ${input.width.toFixed(2)} m wide × ${g.peakY.toFixed(2)} m peak`,
    `Stick-up ${g.stickUp.toFixed(2)} m, embed ${(input.embedDepth * 1000).toFixed(0)} mm. Wire ${input.meshHeight.toFixed(2)} m. ${g.hoopCount} hoops @ ${g.actualSpacing.toFixed(2)} m. Each hoop ${g.pipeEachM.toFixed(2)} m. Tightest bend ${g.minBendRadius.toFixed(2)} m.`,
    ``,
    `## Cage (est. ${formatAud(bom.totals.cageAud)})`,
    ...dumpLines(bom.lines),
    `## Birdies beds (est. ${formatAud(bom.totals.bedsAud)})`,
    ...dumpLines(bom.bedLines),
    `## Checks`,
    ...notes,
    ``,
    bom.priceNote,
  ].join('\n')
}
