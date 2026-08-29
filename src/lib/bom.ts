import { bedLabel, bedSku, growingM2, soilM3 } from './birdies'
import { buildGeometry, type CageGeometry } from './geometry'
import {
  HOOP_MATERIAL,
  POST_TYPE,
  WALL_MESH,
  type CageInputs,
  round1,
  round2,
} from './model'
import {
  BIRDIES_SHIP_AUD,
  CLIP_50_AUD,
  DOOR_IRON_AUD,
  HOOP_COIL_AUD,
  NET_M2_AUD,
  PEG_BAG_AUD,
  PINE_70x35_2_4_AUD,
  PINE_70x35_5_4_AUD,
  POST_EACH_AUD,
  PRICE_NOTE,
  SADDLE_AUD,
  SOIL_M3_AUD,
  STAPLES_KIT_AUD,
  TIES_100_AUD,
  birdiesBedAud,
  formatAud,
  meshRollAud,
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
  const preferred = stocks.includes(30) && lengthM > 12 ? 30 : (stocks.includes(10) ? 10 : stocks[0]!)
  return { count: ceilTo(lengthM, preferred), size: preferred }
}

function coilOrSticks(exactM: number, stockM: number, kind: 'coil' | 'stick', extraJoiners = 0): string {
  const n = ceilTo(exactM, stockM)
  if (kind === 'coil') return `${n} × ${stockM} m coil${n === 1 ? '' : 's'}`
  const joiner = extraJoiners > 0 ? ` + ${extraJoiners} joiner${extraJoiners === 1 ? '' : 's'}` : ''
  return `${n} × ${stockM} m stick${n === 1 ? '' : 's'}${joiner}`
}

export function buildBom(input: CageInputs): BomResult {
  const geo = buildGeometry(input)
  const hoop = HOOP_MATERIAL[input.hoopMaterial]
  const mesh = WALL_MESH[input.wallMesh]
  const post = POST_TYPE[input.postType]
  const hoopPrice = HOOP_COIL_AUD[input.hoopMaterial]
  const lines: BomLine[] = []
  const bedLines: BomLine[] = []

  const hoopPipeM = geo.hoopCount * geo.pipeEachM
  const ridgeM = input.length
  const purlinM = input.purlins === 3 ? 2 * input.length : 0
  const hoopTotalM = hoopPipeM + ridgeM + purlinM

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
        note: `${(geo.pipeInsertM * 1000).toFixed(0)} mm sleeve on each post (pipe slides onto the post).`,
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

  if (purlinM > 0) {
    lines.push(
      moneyLine(
        {
          id: 'purlins',
          category: 'Frame',
          item: 'Side purlins (2)',
          spec: hoop.label,
          exact: `2 × ${input.length.toFixed(2)} m = ${purlinM.toFixed(2)} m`,
          exactM: round2(purlinM),
          buy: coilOrSticks(purlinM, hoop.stockM, hoop.stockKind),
          note: 'Halfway down each shoulder. Required at 6 m width in wind.',
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
        note: 'Buy as one lot. Cut hoops first, leftover becomes ridge offcuts if you are on coils.',
      },
      pipeBuyN,
      hoopPrice.unitAud,
    ),
  )

  const longPosts = geo.hoopCount * 2
  const endPosts = Math.max(3, Math.round(input.width / 1.2) + 1) * 2
  const doorJambs = 2
  const postCount = longPosts + endPosts + doorJambs
  const postLen = Math.max(post.stockM, input.meshHeight + 0.45)

  lines.push(
    moneyLine(
      {
        id: 'posts',
        category: 'Fence',
        item: 'Posts',
        spec: post.label,
        exact: `${postCount} posts, ${postLen.toFixed(2)} m each (${round1(postCount * postLen).toFixed(1)} m)`,
        exactM: round2(postCount * postLen),
        buy: `${postCount} × ${post.stockM} m`,
        note:
          input.postType === 'star'
            ? 'One picket per hoop on each long side, extras on the ends and door. Drive 400 mm into soil.'
            : 'Corners, every ~2.4 m, plus two door jambs. Concrete or ram 400 mm.',
      },
      postCount,
      POST_EACH_AUD[input.postType],
    ),
  )

  const railM = 2 * input.length + 2 * input.width
  if (input.postType !== 'star') {
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
          note: 'Staple mesh to this. Saddle-clip hoops to it if they start at the rail.',
        },
        railSticks,
        PINE_70x35_5_4_AUD,
      ),
    )
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
          note: 'Keeps mesh tight at soil line. Skip only if you bury the mesh into a trench.',
        },
        railSticks,
        PINE_70x35_5_4_AUD,
      ),
    )
  }

  const meshHeightStock = pickHeight(input.meshHeight + input.bury, mesh.stockHeights)
  const meshRun = geo.meshRunM + 0.3 * 4
  const apronM = input.apron > 0 ? geo.perimeterM : 0
  const wallMeshM = meshRun
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
        note: `Perimeter ${geo.perimeterM.toFixed(2)} m minus ${input.doorWidth.toFixed(2)} m door, plus joins. ${input.bury > 0 ? `Includes ${input.bury.toFixed(2)} m to drop into a trench.` : 'No bury — rely on the apron.'}`,
      },
      wallRoll.count,
      meshRollAud(mesh.apertureMm, meshHeightStock, wallRoll.size),
    ),
  )

  if (apronM > 0) {
    const apronRoll = pickRoll(apronM, mesh.stockLengths)
    const apronH = pickHeight(Math.max(0.3, input.apron), [0.3, 0.6, 0.9])
    lines.push(
      moneyLine(
        {
          id: 'apron',
          category: 'Fence',
          item: 'Dig apron',
          spec: `${mesh.label} (or 12.5 mm if rats appear later)`,
          exact: `${apronM.toFixed(2)} m run × ${input.apron.toFixed(2)} m wide = ${(apronM * input.apron).toFixed(1)} m²`,
          exactM: round2(apronM),
          buy: `${apronRoll.count} × ${apronH.toFixed(1)} m × ${apronRoll.size} m, folded out`,
          note: 'L-shape on the outside, peg every 0.4 m, cover with mulch. Stops rabbits and dogs digging at the line.',
        },
        apronRoll.count,
        meshRollAud(mesh.apertureMm, apronH, apronRoll.size),
      ),
    )
  }

  const netClip = 0.3
  const roofNetW = geo.netArcM + 2 * netClip
  const roofNetL = input.length + 1.0
  const roofM2 = roofNetW * roofNetL
  const endNetW = input.width + 0.4
  const endNetH = input.peakHeight + 0.3
  const endM2 = 2 * endNetW * endNetH
  const doorCredit = input.doorWidth * input.doorHeight
  const netM2 = roofM2 + endM2

  const netWide = roofNetW <= 5.2 ? 5 : roofNetW <= 6.2 ? 6 : 10
  const roofBuyL = roofNetL
  const endPieces = 2

  lines.push(
    moneyLine(
      {
        id: 'net-roof',
        category: 'Cover',
        item: 'Roof net',
        spec:
          input.netType === 'wildlife5'
            ? 'Knitted white wildlife-safe net, ≤ 5 mm mesh'
            : 'Knitted anti-bird net, 5 mm',
        exact: `${roofNetW.toFixed(2)} m developed width × ${roofNetL.toFixed(2)} m long = ${roofM2.toFixed(1)} m²`,
        exactM: round2(roofNetW),
        buy:
          netWide >= 10 && roofNetW > 6.2
            ? `1 × 10 m wide × ${Math.ceil(roofBuyL)} m, or two 5 m strips seamed on the ridge`
            : `1 × ${netWide} m wide × ${Math.ceil(roofBuyL)} m`,
        note: 'Taut. Loose net traps bats and possums — illegal in VIC at > 5 mm, stupid everywhere. Clip to every hoop and to the top of the wall mesh.',
      },
      round2(roofM2 + endM2),
      NET_M2_AUD,
    ),
  )

  lines.push(
    moneyLine(
      {
        id: 'net-ends',
        category: 'Cover',
        item: 'End-wall net',
        spec: 'Same net as roof',
        exact: `2 × ${endNetW.toFixed(2)} m × ${endNetH.toFixed(2)} m = ${endM2.toFixed(1)} m²`,
        exactM: round2(endM2),
        buy: `${endPieces} panels, cut from leftover or +${Math.ceil(endNetH * 2)} m of the same roll`,
        note: `Cut around the door opening (credit ${doorCredit.toFixed(2)} m²). Sew or clip to the end hoop and the wall mesh so possums cannot squeeze the eave.`,
      },
      0,
      0,
      false,
    ),
  )

  const doorH = input.doorHeight
  const doorW = input.doorWidth
  const doorStick = 2 * doorH + 3 * doorW
  const doorSticks = ceilTo(doorStick + 2 * doorH, 2.4)
  lines.push(
    moneyLine(
      {
        id: 'door-frame',
        category: 'Door',
        item: 'Door frame + jambs',
        spec: '70 × 35 H3 pine',
        exact: `Leaf ${doorStick.toFixed(2)} m (2 stiles, 3 rails) + 2 jambs × ${Math.max(doorH, input.meshHeight).toFixed(2)} m`,
        exactM: round2(doorStick + 2 * Math.max(doorH, input.meshHeight)),
        buy: `${doorSticks} × 2.4 m of 70 × 35`,
        note: 'Diagonal brace on the leaf. Three hinges. Drop bolt into a pipe socket. Latch a dog cannot nose.',
      },
      doorSticks,
      PINE_70x35_2_4_AUD,
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
      SOIL_M3_AUD,
    ),
  )
  const bedsToBuy = input.beds.filter((b) => !b.owned).length
  if (bedsToBuy > 0) {
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
        BIRDIES_SHIP_AUD,
      ),
    )
  }

  const zipTies = geo.hoopCount * (input.purlins + 8)
  const tieBags = Math.ceil(zipTies / 100)
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
      TIES_100_AUD,
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
        SADDLE_AUD,
      ),
    )
  }

  lines.push(
    moneyLine(
      {
        id: 'staples',
        category: 'Fixings',
        item: 'Fence staples / tie wire',
        spec: 'Galvanised 20 mm staples, 1.6 mm tie wire',
        exact: `~${Math.ceil(geo.meshRunM * 4)} staples; 30 m tie wire`,
        exactM: geo.meshRunM * 4,
        buy: '1 kg staples + 1 × 30 m tie wire',
        note: 'Staple mesh every 150 mm on rails. Tie to star pickets every 200 mm.',
      },
      1,
      STAPLES_KIT_AUD,
    ),
  )

  const pegBags = ceilTo(geo.perimeterM / 0.4, 50)
  lines.push(
    moneyLine(
      {
        id: 'pegs',
        category: 'Fixings',
        item: 'Apron pegs + net clips',
        spec: '150 mm landscape staples, poly hoop clips',
        exact: `${Math.ceil(geo.perimeterM / 0.4)} pegs; ~${geo.hoopCount * 6} net clips`,
        exactM: Math.ceil(geo.perimeterM / 0.4),
        buy: `${pegBags} bags of 50 pegs + 50 hoop clips`,
        note: 'Peg the apron. Clips hold net to pipe without punching holes.',
      },
      pegBags,
      PEG_BAG_AUD + CLIP_50_AUD,
    ),
  )

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
      DOOR_IRON_AUD,
    ),
  )

  const timberM = input.postType === 'pine90' ? postCount * postLen : 0
  const timberDoor = doorStick
  const cageAud = roundMoney(lines.reduce((s, l) => s + (l.inTotal ? l.lineAud : 0), 0))
  const bedsAud = roundMoney(bedLines.reduce((s, l) => s + (l.inTotal ? l.lineAud : 0), 0))

  return {
    lines,
    bedLines,
    geo,
    totals: {
      hoopPipeM: round1(hoopTotalM),
      meshM: round1(wallMeshM + apronM),
      netM2: round1(netM2),
      timberM: round1(timberM + timberDoor),
      soilM3: round1(soilTotal),
      growM2: round1(growTotal),
      cageAud,
      bedsAud,
    },
    priceNote: PRICE_NOTE,
  }
}

function dumpLines(lines: BomLine[]): string[] {
  const rows: string[] = []
  let cat = ''
  for (const line of lines) {
    if (line.category !== cat) {
      cat = line.category
      rows.push(`## ${cat}`)
    }
    rows.push(`${line.item} — ${line.spec}`)
    rows.push(`  exact: ${line.exact}`)
    rows.push(`  buy:   ${line.buy}`)
    if (line.inTotal) rows.push(`  est:   ${formatAud(line.lineAud)}`)
    if (line.note) rows.push(`  note:  ${line.note}`)
    rows.push('')
  }
  return rows
}

export function bomPlainText(input: CageInputs, bom: BomResult): string {
  const g = bom.geo
  return [
    `Vegie cage cut list`,
    `${input.length.toFixed(2)} m long × ${input.width.toFixed(2)} m wide × ${input.peakHeight.toFixed(2)} m peak`,
    `Wall mesh ${input.meshHeight.toFixed(2)} m. ${g.hoopCount} hoops @ ${g.actualSpacing.toFixed(2)} m. Each hoop pipe ${g.pipeEachM.toFixed(2)} m.`,
    ``,
    `## Cage (est. ${formatAud(bom.totals.cageAud)})`,
    ...dumpLines(bom.lines),
    `## Birdies beds (est. ${formatAud(bom.totals.bedsAud)})`,
    ...dumpLines(bom.bedLines),
    bom.priceNote,
  ].join('\n')
}
