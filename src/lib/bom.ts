import { bedLabel, bedSku, growingM2, soilM3 } from './birdies'
import { guyExact } from './bracing'
import {
  HOG_SPACING_M,
  PURLIN_TAIL_M,
  RIDGE_PAST_END_M,
  STAPLE_SPACING_M,
  TIE_PER_CROSSING_M,
  TIE_WIRE_STOCK_M,
  pipeTakeoff,
  saddleClipCount,
  wireTakeoff,
} from './fixings'
import { buildGeometry, warnings, type CageGeometry } from './geometry'
import {
  HOOP_MATERIAL,
  MESH_GATE,
  POST_TYPE,
  SLEEPER,
  WALL_MESH,
  type CageInputs,
  round1,
  round2,
} from './model'
import {
  V2_ESTIMATE_AUD,
  V2_MESH,
  V2_POST,
  V2_PRICE,
  battenStockCount,
  shadeClothMetres,
  sleeperStockCount,
} from './v2'
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
  /** Shelf price is an estimate or an allowance, not a checked list price. */
  estimate?: boolean
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

function bedSection(input: CageInputs): { bedLines: BomLine[]; soilTotal: number; growTotal: number } {
  const bedLines: BomLine[] = []
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
  return { bedLines, soilTotal, growTotal }
}

function buildV2Bom(input: CageInputs): BomResult {
  const geo = buildGeometry(input)
  const frame = geo.v2
  const lines: BomLine[] = []
  const standard = Math.abs(input.length - 10) < 0.02 && Math.abs(input.width - 4.6) < 0.02
  const hoopM = round2(geo.hoopCount * geo.pipeEachM)
  const polyRolls = Math.max(1, Math.ceil(hoopM / 100 - 1e-9))
  lines.push(
    moneyLine(
      {
        id: 'hoop-pipe',
        category: 'Frame',
        item: 'Hoop pipe',
        spec: 'Vinidex Rural Plus 50 mm (2 in) × 100 m',
        exact: `${geo.hoopCount} hoops × ${geo.pipeEachM.toFixed(2)} m = ${hoopM.toFixed(1)} m`,
        exactM: hoopM,
        buy: `${polyRolls} × 100 m roll`,
        note: 'Sleeved over the full picket, down to the ground. 1.0 m vertical legs plus a semi-ellipse. Bunnings rural poly, 20 Nov 2026. No ridge pipe.',
      },
      polyRolls,
      V2_PRICE.polyRoll,
    ),
  )

  const battenN = frame?.battenStock ?? battenStockCount(input.length, input.width, 4, 1.89)
  const perLine = Math.max(1, Math.ceil((input.length - 1e-9) / V2_PRICE.battenM))
  const diagN = frame?.diagonals.length ?? 0
  const diagCut = frame?.diagonalCut ?? 0
  const diagBars = diagN === 0 ? 0 : Math.max(1, Math.ceil((diagN * diagCut - 1e-9) / V2_PRICE.battenM))
  lines.push(
    moneyLine(
      {
        id: 'battens',
        category: 'Frame',
        item: 'Roof battens',
        spec: 'Stramit 40 mm 0.55 BMT TRUECORE, 6.1 m',
        exact: `7 lines × ${perLine} + 2 end headers + 1 back rail + ${diagBars} diagonal lengths = ${battenN}`,
        exactM: round2(battenN * V2_PRICE.battenM),
        buy: `${battenN} × 6.1 m`,
        note: `Ridge ${input.peakHeight.toFixed(2)} m, upper shoulders 2.36 m, lower shoulders 1.88 m, low lines 0.90 m. Screwed and UV-tied at every hoop. Door-end rails come from the header offcuts. Diagonals cut ${diagCut.toFixed(2)} m. Online NSW supplier. Freight to Bega not checked.`,
      },
      battenN,
      V2_PRICE.batten,
    ),
  )

  const sleeperN = input.sleeperBase ? sleeperStockCount(input.length, input.width) : 0
  if (sleeperN > 0) {
    lines.push(
      moneyLine(
        {
          id: 'sleeper',
          category: 'Fence',
          item: 'Base sleeper',
          spec: '200 × 50 mm × 2.4 m H4 MicroPro (Sienna)',
          exact: `Outside about ${(input.width + 0.16).toFixed(2)} × ${(input.length + 0.2).toFixed(2)} m`,
          exactM: round2(sleeperN * V2_PRICE.sleeperM),
          buy: `${sleeperN} × 2.4 m`,
          note: '150 mm buried, 50 mm above. Sides join over pickets. Every picket bolted through the sleeper. Bunnings, 20 Nov 2026.',
        },
        sleeperN,
        V2_PRICE.sleeper,
      ),
    )
  }

  lines.push(
    moneyLine(
      {
        id: 'end-posts',
        category: 'Door',
        item: 'End posts',
        spec: '50 × 50 × 2.0 mm galv SHS, 6.0 m',
        exact: `4 × ${V2_POST.lengthM.toFixed(1)} m posts, ${Math.round(V2_POST.embedM * 1000)} mm in concrete, from ${V2_POST.stockLengths} × ${V2_POST.stockM.toFixed(1)} m`,
        exactM: V2_POST.stockLengths * V2_POST.stockM,
        buy: `${V2_POST.stockLengths} × 6.0 m`,
        note: 'ESTIMATE. Page lists $30–$120 by length. 6 m price not shown. Both ends, centres ±0.555 m.',
        estimate: true,
      },
      V2_POST.stockLengths,
      V2_POST.unitAud,
    ),
  )

  lines.push(
    moneyLine(
      {
        id: 'door-concrete',
        category: 'Door',
        item: 'Concrete',
        spec: 'Australian Builders Quick Set, 20 kg',
        exact: `4 holes ~${Math.round(V2_POST.holeDiaM * 1000)} mm dia × ${Math.round(V2_POST.embedM * 1000)} mm deep, 3 bags each`,
        exactM: V2_POST.concreteBags,
        buy: `${V2_POST.concreteBags} × 20 kg`,
        note: 'Bunnings, 20 Nov 2026. Cure 24 h before loading the posts.',
      },
      V2_POST.concreteBags,
      V2_PRICE.concrete,
    ),
  )

  if (input.doorStyle === 'mesh-gate') {
    lines.push(
      moneyLine(
        {
          id: 'mesh-gate',
          category: 'Door',
          item: 'Mesh gate',
          spec: 'Galvanised mesh gate 1800 h × 1000 w, 25NB frame',
          exact: `${input.doorWidth.toFixed(2)} × ${input.doorHeight.toFixed(2)} m, opens outward`,
          exactM: round2(input.doorWidth * input.doorHeight),
          buy: '1 gate',
          note: 'RHS Steel, Revesby NSW. Freight extra. Head at about 1.87 m. Nothing in the opening.',
        },
        1,
        V2_PRICE.gate,
      ),
    )
  }

  lines.push(
    moneyLine(
      {
        id: 'ironmongery',
        category: 'Door',
        item: 'Hinges and latch',
        spec: 'Hinges and latch to suit a 50 mm square post',
        exact: '1 set',
        exactM: 0,
        buy: '1 set',
        note: 'ALLOWANCE, not verified. A latch a dog cannot nose.',
        estimate: true,
      },
      1,
      V2_PRICE.hardware,
    ),
  )

  const wallM = geo.meshRunM
  const meshRolls = Math.max(1, Math.ceil(wallM / V2_MESH.rollM - 1e-9))
  lines.push(
    moneyLine(
      {
        id: 'wall-mesh',
        category: 'Fence',
        item: 'Wall mesh',
        spec: 'Jack 25 × 25 mm welded cage mesh, 900 mm × 5 m',
        exact: `${wallM.toFixed(2)} m × 0.90 m band (0.05–0.95 m), gate left out`,
        exactM: wallM,
        buy: `${meshRolls} × 5 m rolls`,
        note: 'Screwed under a pine strip on the sleeper. Hog-ringed to the hoop legs. No apron. Bunnings, 20 Nov 2026.',
      },
      meshRolls,
      V2_PRICE.mesh,
    ),
  )

  const pineN = Math.max(1, Math.ceil(wallM / V2_PRICE.pineStripM - 1e-9))
  lines.push(
    moneyLine(
      {
        id: 'clamp-strip',
        category: 'Fence',
        item: 'Clamp strip',
        spec: 'Treated pine 42 × 18 mm H3, 5.4 m',
        exact: `${wallM.toFixed(2)} m on the sleeper top`,
        exactM: wallM,
        buy: `${pineN} × 5.4 m`,
        note: 'Price from the Bunnings dressed-treated category listing, 20 Nov 2026. DPC under the mesh, then this strip.',
      },
      pineN,
      V2_PRICE.pineStrip,
    ),
  )

  const screwPacks = standard ? 1 : Math.max(1, Math.ceil(wallM / 0.25 / 500))
  lines.push(
    moneyLine(
      {
        id: 'pine-screws',
        category: 'Fixings',
        item: 'Treated-pine screws',
        spec: 'Titan Weather Force 10g × 50 mm, 500 pack',
        exact: 'Clamp strip every 250 mm, plus sleeper corners',
        exactM: screwPacks * 500,
        buy: `${screwPacks} × 500`,
        note: 'Bunnings, 20 Nov 2026. Treated-pine screws only in the timber.',
      },
      screwPacks,
      V2_PRICE.screws,
    ),
  )

  const tekPacks = standard ? 3 : Math.max(1, Math.ceil((14 * geo.hoopCount + 8 * diagN + 80) / 100))
  lines.push(
    moneyLine(
      {
        id: 'teks',
        category: 'Fixings',
        item: 'Tek screws',
        spec: 'Buildex 10g × 16 mm Class 4, 100 pack',
        exact: '2 per batten crossing, 4 on each lap, 8 on each diagonal, plus headers and rails',
        exactM: tekPacks * 100,
        buy: `${tekPacks} × 100`,
        note: 'Bunnings, 20 Nov 2026. Crown of the batten out. Clutch drill. Class 4 only.',
      },
      tekPacks,
      V2_PRICE.teks,
    ),
  )

  const tiePacks = standard ? 5 : Math.max(1, Math.ceil((geo.hoopCount * 40) / 100))
  lines.push(
    moneyLine(
      {
        id: 'cable-ties',
        category: 'Fixings',
        item: 'UV cable ties',
        spec: 'Crescent 300 × 4.8 mm black, 100 pack',
        exact: '2 crossed ties at each batten crossing, 1 at each diagonal end, net every 300 mm',
        exactM: tiePacks * 100,
        buy: `${tiePacks} × 100`,
        note: 'Bunnings, 20 Nov 2026. UV-stable. Tie the net to every batten line.',
      },
      tiePacks,
      V2_PRICE.ties,
    ),
  )

  const boltCount = geo.pickets.total + V2_POST.stockLengths * 2
  const boltPacks = Math.max(1, Math.ceil(boltCount / V2_PRICE.boltPack - 1e-9))
  lines.push(
    moneyLine(
      {
        id: 'bolts',
        category: 'Fixings',
        item: 'Cup-head bolts',
        spec: 'Zenith M10 × 130 mm HDG bolts and nuts, 25 pack',
        exact: `${boltCount} bolts (pickets to the sleeper, plus 4 posts)`,
        exactM: boltCount,
        buy: `${boltPacks} × 25`,
        note: 'Bunnings, 20 Nov 2026. About 50 mm below ground, nut inside. Cut long tails. Mark picket holes before the poly goes on.',
      },
      boltPacks,
      V2_PRICE.bolts,
    ),
  )

  lines.push(
    moneyLine(
      {
        id: 'cold-gal',
        category: 'Fixings',
        item: 'Cold galv',
        spec: 'White Knight Cold Gal spray, 300 g',
        exact: '1 can, every cut and hole',
        exactM: 1,
        buy: '1 can',
        note: 'Bunnings, 20 Nov 2026. Every cut batten end and every drilled hole. Keep the Zincalume off the timber.',
      },
      1,
      V2_PRICE.coldGal,
    ),
  )

  lines.push(
    moneyLine(
      {
        id: 'dpc',
        category: 'Fence',
        item: 'DPC strip',
        spec: "DPC or builder's plastic under the mesh",
        exact: '1 roll along the sleeper top',
        exactM: wallM,
        buy: '1 allowance',
        note: 'ALLOWANCE. Isolates the galv mesh from the copper-treated sleeper.',
        estimate: true,
      },
      1,
      V2_PRICE.dpc,
    ),
  )

  lines.push(
    moneyLine(
      {
        id: 'hog-rings',
        category: 'Fixings',
        item: 'Hog rings',
        spec: '3/4 in hog rings and Mr Pen pliers',
        exact: 'Mesh to the hoop legs every 250 mm',
        exactM: 0,
        buy: 'already owned',
        note: 'Already owned. Not in the total. Not for the net.',
      },
      0,
      0,
      false,
    ),
  )

  const galstar = input.postType === 'star' && input.picketLength === 1.8
  const owned = galstar ? Math.min(input.ownedPickets, geo.pickets.total) : 0
  const postBuy = geo.pickets.total - owned
  const postUnit = galstar ? V2_PRICE.picket : postPrice(input.postType, input.picketLength).aud
  lines.push(
    moneyLine(
      {
        id: 'posts',
        category: 'Fence',
        item: 'Pickets',
        spec: galstar ? 'Waratah Galstar MaxY 180 cm' : `${input.picketLength.toFixed(2)} m posts`,
        exact: `${geo.pickets.total} pickets, ${Math.round(input.embedDepth * 1000)} mm in the ground, ${geo.stickUp.toFixed(2)} m out`,
        exactM: geo.pickets.total,
        buy: owned > 0 ? `already have ${owned}; buy ${postBuy}` : `${postBuy} pickets`,
        note: galstar
          ? 'Bacchus Marsh Farm Supplies list, 20 Nov 2026. Seen $24.08–$29.50 elsewhere. Hoop pickets only. No caps: the poly covers them.'
          : 'Not the MaxY price. Check the yard.',
      },
      postBuy,
      postUnit,
    ),
  )

  if (input.cover === 'shade-30') {
    const metres = shadeClothMetres(input.length, input.width)
    const rolls = Math.max(1, Math.ceil(metres / 20 - 1e-9))
    lines.push(
      moneyLine(
        {
          id: 'cover',
          category: 'Cover',
          item: 'Shade cloth',
          spec: 'Pillar 3.66 × 20 m green 30% shade cloth',
          exact: `${metres.toFixed(1)} m used (2 roof strips + 2 ends)`,
          exactM: metres,
          buy: `${rolls} × 3.66 × 20 m`,
          note: 'Bunnings, 20 Nov 2026. 9 hoops at 1.25 m, and 6 batten diagonals. Cloth from the ridge down to 0.80 m.',
        },
        rolls,
        V2_PRICE.shadeCloth,
      ),
    )
  } else {
    lines.push(
      moneyLine(
        {
          id: 'cover',
          category: 'Cover',
          item: 'Bird net',
          spec: 'Backyard Farmer 10 × 10 m × 5 mm anti-bird net',
          exact: `Roof 6.7 × ${input.length.toFixed(1)} m + both ends from the remainder`,
          exactM: geo.net.usedM2,
          buy: geo.net.buy,
          note: 'Bunnings category, 20 Nov 2026. Net from the ridge down to 0.80 m, overlapping the mesh 150 mm. 5 mm net will not stop cabbage moth.',
        },
        geo.net.pieces,
        V2_PRICE.birdNet,
      ),
    )
  }

  if (input.skirtMode !== 'none' && input.skirtDepth > 0) {
    const folded = input.skirtMode === 'l-outward'
    lines.push(
      moneyLine(
        {
          id: 'skirt',
          category: 'Fence',
          item: folded ? 'L-folded apron' : 'Buried skirt',
          spec: 'Extra 25 mm welded mesh, separate from the wall band',
          exact: `${geo.perimeterM.toFixed(2)} m × ${input.skirtDepth.toFixed(2)} m`,
          exactM: round2(geo.perimeterM),
          buy: 'Not in the v2 default — add if digging shows up',
          note: folded
            ? 'Marek’s build has no apron. This line is only because the skirt was turned on.'
            : 'Separate from the wall band. Bury it vertical. The default build has no skirt.',
        },
        0,
        0,
        false,
      ),
    )
  }

  if (input.tomatoTrellis) {
    lines.push(
      moneyLine(
        {
          id: 'tomato-trellis',
          category: 'Inside',
          item: 'Tomato trellis',
          spec: '2 × Whites Ultrapost 2.4 m + Whites Dog Fence Medium 120 cm × 10 m',
          exact: 'Separate fence inside the cage. Not the walls, the skirt, or the door.',
          exactM: 10,
          buy: 'already have',
          note: 'Optional. Already bought. Do not use it on the cage.',
        },
        0,
        0,
        false,
      ),
    )
  }

  const beds = bedSection(input)
  const cageAud = roundMoney(lines.reduce((s, l) => s + (l.inTotal ? l.lineAud : 0), 0))
  const bedsAud = roundMoney(beds.bedLines.reduce((s, l) => s + (l.inTotal ? l.lineAud : 0), 0))
  return {
    lines,
    bedLines: beds.bedLines,
    geo,
    totals: {
      hoopPipeM: round1(hoopM),
      meshM: round1(wallM),
      netM2: round1(geo.net.usedM2),
      timberM: round1(sleeperN * V2_PRICE.sleeperM + pineN * V2_PRICE.pineStripM),
      soilM3: round1(beds.soilTotal),
      growM2: round1(beds.growTotal),
      cageAud,
      bedsAud,
    },
    priceNote: `AUD GST-inc list prices, 20 Nov 2026. Totals include $${V2_ESTIMATE_AUD.toFixed(2)} of estimates (end-post steel $180, hinges and latch $45, DPC $20) and exclude freight. Not a quote.`,
  }
}

export function buildBom(input: CageInputs): BomResult {
  if (input.design === 'v2') return buildV2Bom(input)
  const geo = buildGeometry(input)
  const hoop = HOOP_MATERIAL[input.hoopMaterial]
  const mesh = WALL_MESH[input.wallMesh]
  const post = POST_TYPE[input.postType]
  const hoopQuote = hoopPrice(input.hoopMaterial)
  const lines: BomLine[] = []
  const bedLines: BomLine[] = []

  const pipe = pipeTakeoff(input, geo.hoopCount, geo.pipeEachM)
  const hoopPipeM = pipe.hoopM
  const ridgeM = pipe.ridgeM
  const purlinPipeM = pipe.purlinPipeM
  const hoopTotalM = pipe.totalM

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
        note: `${(geo.pipeInsertM * 1000).toFixed(0)} mm sleeve on the picket top (${geo.sleeveBot.toFixed(2)}–${geo.sleeveTop.toFixed(2)} m). Pipe stays vertical in the sleeve, then bends. Tightest radius ${geo.minBendRadius.toFixed(2)} m at the ${geo.bendAt}. Optional: a tek screw or hose clamp on each leg stops the hoop rattling in the sleeve.`,
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
        exact: `${ridgeM.toFixed(2)} m (one length, ${(RIDGE_PAST_END_M * 1000).toFixed(0)} mm past each end hoop)`,
        exactM: round2(ridgeM),
        buy: 'One continuous length, cut from the hoop coil',
        note: 'Sit the ridge under each hoop crossing. Figure-eight it with 2.5 mm tie wire, or use one saddle clip per hoop. Stops the net sagging and the hoops walking.',
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
          note: 'Pipe purlins midway between ridge and shoulder. Tie or saddle-clip to every hoop. Wire purlins do the same job lighter.',
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
  const galstar = input.postType === 'star' && input.picketLength === 1.8
  const ownedPosts = galstar ? Math.min(input.ownedPickets, postCount) : 0
  const postBuy = postCount - ownedPosts
  const jambBit = geo.pickets.jambs > 0 ? ` including ${geo.pickets.jambs} door jambs` : ''
  const ownedBit =
    ownedPosts > 0
      ? ` Already have ${ownedPosts} (receipt 20 Nov 2026). The estimate prices the ${postBuy} still to buy.`
      : ''
  lines.push(
    moneyLine(
      {
        id: 'posts',
        category: 'Fence',
        item: 'Posts',
        spec: galstar ? postQuote.label : `${post.label}, ${input.picketLength.toFixed(2)} m`,
        exact: `${postCount} posts × ${input.picketLength.toFixed(2)} m (${round1(postCount * input.picketLength).toFixed(1)} m)`,
        exactM: round2(postCount * input.picketLength),
        buy:
          ownedPosts > 0
            ? `already have ${ownedPosts}; buy ${postBuy}`
            : `${postCount} × ${input.picketLength.toFixed(2)} m`,
        note: `Embed ${(input.embedDepth * 1000).toFixed(0)} mm, stick-up ${geo.stickUp.toFixed(2)} m. ${geo.pickets.hoop} under hoops (no caps), ${geo.pickets.end} end-wall${jambBit}, ${geo.pickets.stays} diagonal braces.${galstar ? ' Galvanised.' : ''}${ownedBit} ${postQuote.source}.`,
      },
      postBuy,
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
          note:
            input.doorStyle === 'mesh-gate'
              ? 'Only pickets the hoop does not cover: end wall and diagonal braces. Hoop pickets are sleeved. The concreted door posts take no caps.'
              : 'Only pickets the hoop does not cover: end wall, door jambs, diagonal braces. Hoop pickets are sleeved.',
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
  let doorStick = 0
  if (input.doorStyle === 'mesh-gate') {
    const doorPost = price('door-post-50')
    lines.push(
      moneyLine(
        {
          id: 'door-posts',
          category: 'Door',
          item: 'Door posts',
          spec: doorPost.label,
          exact: `2 × ${MESH_GATE.postLengthM.toFixed(1)} m, set ${Math.round(MESH_GATE.embedM * 1000)} mm in concrete`,
          exactM: round2(2 * MESH_GATE.postLengthM),
          buy: '2 posts',
          note: `Galvanised round, about ${MESH_GATE.postOdMinMm}–${MESH_GATE.postOdMaxMm} mm. Stick-up ${(MESH_GATE.postLengthM - MESH_GATE.embedM).toFixed(1)} m clears a ${doorH.toFixed(1)} m gate. Not star pickets. ${doorPost.source}.`,
        },
        2,
        doorPost.aud,
      ),
    )
    const concrete = price('concrete-20')
    lines.push(
      moneyLine(
        {
          id: 'door-concrete',
          category: 'Door',
          item: 'Concrete',
          spec: concrete.label,
          exact: `2 holes, ${Math.round(MESH_GATE.holeDiaM * 1000)} mm across × ${Math.round(MESH_GATE.embedM * 1000)} mm deep`,
          exactM: MESH_GATE.concreteBags,
          buy: `${MESH_GATE.concreteBags} × ${MESH_GATE.concreteBagKg} kg`,
          note: `Bag count is a rough volume for the two holes, plus waste. ${concrete.source}.`,
        },
        MESH_GATE.concreteBags,
        concrete.aud,
      ),
    )
    const gate = price('mesh-gate-1x2')
    lines.push(
      moneyLine(
        {
          id: 'mesh-gate',
          category: 'Door',
          item: 'Mesh gate',
          spec: gate.label,
          exact: `${doorW.toFixed(2)} × ${doorH.toFixed(2)} m opening`,
          exactM: round2(doorW * doorH),
          buy: '1 prefabricated gate',
          note: `Hang it on the round posts. Nominal size about 1.0 × 2.0 m. ${gate.source}.`,
        },
        1,
        gate.aud,
      ),
    )
  } else {
    doorStick = 2 * doorH + 3 * doorW
    const doorQuote = price('pine-70x35-2.4')
    const doorSticks = ceilTo(doorStick + 2 * doorH, 2.4)
    const doorTimber = doorStick + 2 * Math.max(doorH, input.meshHeight)
    lines.push(
      moneyLine(
        {
          id: 'door-frame',
          category: 'Door',
          item: 'Door frame + leaf',
          spec: '70 × 35 H3 pine',
          exact: `Leaf ${doorStick.toFixed(2)} m (2 stiles, 3 rails) + 2 jamb linings × ${Math.max(doorH, input.meshHeight).toFixed(2)} m`,
          exactM: round2(doorTimber),
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
  }

  const iron = price(input.doorStyle === 'mesh-gate' ? 'gate-hardware' : 'door-iron')
  lines.push(
    moneyLine(
      {
        id: 'ironmongery',
        category: 'Door',
        item: input.doorStyle === 'mesh-gate' ? 'Hinges and latch' : 'Door ironmongery',
        spec:
          input.doorStyle === 'mesh-gate'
            ? 'Galvanised gate hinges and latch'
            : '3 × 100 mm galvanised T-hinges, latch, drop bolt',
        exact: input.doorStyle === 'mesh-gate' ? 'Hinges and 1 latch' : '3 hinges, 1 latch, 1 drop bolt, 1 pipe socket',
        exactM: 0,
        buy: '1 set',
        note:
          input.doorStyle === 'mesh-gate'
            ? `A latch a dog cannot nose. ${iron.source}.`
            : 'Self-closing spring optional. Threshold strip so the leaf does not snag mulch.',
      },
      1,
      iron.aud,
    ),
  )

  if (input.tomatoTrellis) {
    lines.push(
      moneyLine(
        {
          id: 'tomato-trellis',
          category: 'Inside',
          item: 'Tomato trellis',
          spec: '2 × Whites Ultrapost 2.4 m + Whites Dog Fence Medium 120 cm × 10 m',
          exact: 'Separate fence inside the cage. Not the walls, the skirt, or the door.',
          exactM: 10,
          buy: 'already have',
          note: 'Optional. Already bought. Two Ultraposts and one 10 m roll of dog fence. Do not use them on the cage.',
        },
        0,
        0,
        false,
      ),
    )
  }

  const wire = wireTakeoff(input, geo.hoopCount, geo.meshRunM, geo.stickUp, geo.hoopZs)
  const bracing = geo.bracing
  const lineCount = wire.lineCount
  const lineM = wire.lineM
  const purlinWireM = wire.purlinWireM
  const guyM = wire.guyM
  const wireM = wire.fencingM
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
          exact: `2 × ${wire.purlinEach.toFixed(2)} m = ${purlinWireM.toFixed(1)} m (${input.length.toFixed(2)} m run + ${PURLIN_TAIL_M.toFixed(2)} m tail each end)`,
          exactM: round2(purlinWireM),
          buy: 'Included in the 2.5 mm high-tensile coil',
          note: 'One each side, midway between ridge and shoulder. Anchor both ends to the end bracing or a ground anchor. Tie to every hoop with 2.5 mm tie wire.',
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
        item: 'Guys',
        spec: '2.5 mm wire, about 45° where the stick-up allows',
        exact: guyExact(bracing),
        exactM: guyM,
        buy: 'Included in the 2.5 mm high-tensile coil',
        note: 'End guys leave the four corner picket tops and run out along the length. Side guys leave every second hoop on the windward wall. Straight run, plus a wrap at each end. Not the star-picket braces.',
      },
      bracing.guyCount,
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
        exact: `${wireM.toFixed(1)} m (lines + purlins + guys, not tie wire)`,
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
        exact: `${bracing.endGuys.length} end + ${bracing.sideGuys.length} side = ${bracing.anchorCount}`,
        exactM: bracing.anchorCount,
        buy: `${bracing.anchorCount} anchors`,
        note: `One per guy. ${bracing.endGuys.length} outside the ends, ${bracing.sideGuys.length} on the windward side. ${anchor.source}.`,
      },
      bracing.anchorCount,
      anchor.aud,
    ),
  )

  const braceClip = price('brace-clip')
  lines.push(
    moneyLine(
      {
        id: 'brace-clips',
        category: 'Frame',
        item: 'Brace clips',
        spec: braceClip.label,
        exact: `${bracing.braceClipCount} clips`,
        exactM: bracing.braceClipCount,
        buy: `${bracing.braceClipCount} clips`,
        note: `One per diagonal brace, where the stay meets the corner picket top. ${braceClip.source}.`,
      },
      bracing.braceClipCount,
      braceClip.aud,
    ),
  )

  const strainer = price('strainer')
  lines.push(
    moneyLine(
      {
        id: 'strainers',
        category: 'Frame',
        item: 'Wire strainers',
        spec: strainer.label,
        exact: `${bracing.strainerCount} strainers (one per guy)`,
        exactM: bracing.strainerCount,
        buy: `${bracing.strainerCount} strainers`,
        note: `One Gripple or wire strainer on each end guy and each windward side guy. ${strainer.source}.`,
      },
      bracing.strainerCount,
      strainer.aud,
    ),
  )

  const beds = bedSection(input)
  bedLines.push(...beds.bedLines)
  const soilTotal = beds.soilTotal
  const growTotal = beds.growTotal

  const tieCoils = ceilTo(wire.tieM, TIE_WIRE_STOCK_M)
  const tieQuote = price('tie-wire-30')
  lines.push(
    moneyLine(
      {
        id: 'tie-wire',
        category: 'Fixings',
        item: 'Tie wire',
        spec: '2.5 mm galvanised tie wire (soft)',
        exact: `${wire.tieCount} figure-eights × ${TIE_PER_CROSSING_M.toFixed(1)} m = ${wire.tieM.toFixed(1)} m`,
        exactM: round2(wire.tieM),
        buy: `${tieCoils} × ${TIE_WIRE_STOCK_M} m coil${tieCoils === 1 ? '' : 's'}`,
        note:
          input.purlins === 3
            ? 'Ridge and both purlins, at every hoop. Figure-eight, twist tight, fold the tails in. Not the high-tensile coil.'
            : 'One figure-eight at each hoop on the ridge. Twist tight, fold the tails in. Not the high-tensile coil.',
      },
      tieCoils,
      tieQuote.aud,
    ),
  )

  const zipBags = Math.ceil(wire.tieCount / 100)
  const ties = price('ties-100')
  lines.push(
    moneyLine(
      {
        id: 'zips',
        category: 'Fixings',
        item: 'UV cable ties (optional)',
        spec: 'UV-stabilised heavy-duty, 200 × 4.8 mm',
        exact: `${wire.tieCount} ties, one per crossing`,
        exactM: wire.tieCount,
        buy: `${zipBags * 100} ties — only if you skip the tie wire`,
        note: 'Optional alternative to the figure-eight tie wire. Not an extra, and not for the net. Snip tails.',
      },
      zipBags,
      ties.aud,
      false,
    ),
  )

  const ridgeSaddles = saddleClipCount(geo.hoopCount, input.purlins, input.purlinMaterial)
  const saddle = price('saddle')
  lines.push(
    moneyLine(
      {
        id: 'ridge-saddles',
        category: 'Fixings',
        item: 'Saddle clips (optional)',
        spec: `${hoop.odMm} mm saddle clips`,
        exact: `${ridgeSaddles} clips (one per pipe crossing)`,
        exactM: ridgeSaddles,
        buy: `${ridgeSaddles} clips — only if you skip tie wire at those crossings`,
        note:
          input.purlinMaterial === 'pipe' && input.purlins === 3
            ? 'Optional in place of tie wire where the ridge and the pipe purlins cross a hoop. Not both.'
            : 'Optional in place of tie wire at the ridge. One clip under each hoop. Wire purlins still use tie wire.',
      },
      ridgeSaddles,
      saddle.aud,
      false,
    ),
  )

  lines.push(
    moneyLine(
      {
        id: 'sleeve-stops',
        category: 'Fixings',
        item: 'Sleeve stops (optional)',
        spec: 'Tek screw or stainless hose clamp',
        exact: `${geo.hoopCount * 2} (one per hoop leg)`,
        exactM: geo.hoopCount * 2,
        buy: 'Optional — not in the total',
        note: 'Stops the hoop rattling in the picket sleeve. One tek screw through the poly into the picket, or a hose clamp.',
      },
      geo.hoopCount * 2,
      0,
      false,
    ),
  )

  if (input.postType !== 'star') {
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
  const stapleCount = Math.ceil(stapleRun / STAPLE_SPACING_M)
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

  const hogCount = Math.ceil((lineCount * geo.meshRunM) / HOG_SPACING_M)
  const hog = price('hog-500')
  const hogBoxes = ceilTo(hogCount, 500)
  lines.push(
    moneyLine(
      {
        id: 'hog-rings',
        category: 'Fixings',
        item: 'Hog rings',
        spec: '19 mm (3/4 in) galvanised',
        exact: `~${hogCount} rings (chicken wire to the line wires)`,
        exactM: hogCount,
        buy: `${hogBoxes} × box of 500, plus hog-ring pliers`,
        note: 'Chicken wire to the line wires only, every 200 mm. Not the net, and not the ridge. The net uses clips.',
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
    if (line.inTotal) out.push(`  est:   ${formatAud(line.lineAud)}${line.estimate ? ' (estimate)' : ''}`)
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
