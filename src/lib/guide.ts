import {
  HOG_SPACING_M,
  PURLIN_TAIL_M,
  RIDGE_PAST_END_M,
  STAPLE_SPACING_M,
  pipeTakeoff,
  wireTakeoff,
} from './fixings'
import { NET_OVERLAP_M, type CageGeometry, type ExtraPost } from './geometry'
import {
  HOOP_MATERIAL,
  MESH_GATE,
  SLEEPER,
  WALL_MESH,
  formatM,
  round2,
  type CageInputs,
} from './model'

export type Step = {
  id: string
  title: string
  text: string
}

function mm(metres: number): string {
  return `${Math.round(metres * 1000)} mm`
}

function listM(values: number[], empty = 'none between the corner hoops'): string {
  return values.length ? values.map((n) => formatM(n, 2)).join(', ') : empty
}

function fromEnd(zs: number[], length: number): number[] {
  return zs.map((z) => round2(z + length / 2)).sort((a, b) => a - b)
}

function acrossFromSide(posts: ExtraPost[], z: number, width: number): number[] {
  return posts
    .filter((p) => p.role !== 'stay' && Math.abs(p.z - z) < 1e-6)
    .map((p) => round2(p.x + width / 2))
    .sort((a, b) => a - b)
}

/** Build steps for the current cage. Lengths and counts come from the same inputs as the cut list. */
export function buildGuide(input: CageInputs, geo: CageGeometry): Step[] {
  if (input.design === 'v2' && geo.v2) return buildV2Guide(input, geo)
  const hoop = HOOP_MATERIAL[input.hoopMaterial]
  const mesh = WALL_MESH[input.wallMesh]
  const pipe = pipeTakeoff(input, geo.hoopCount, geo.pipeEachM)
  const wire = wireTakeoff(input, geo.hoopCount, geo.meshRunM, geo.stickUp, geo.hoopZs)
  const bracing = geo.bracing
  const guyAngle = Math.round(bracing.endGuys[0]?.angleDeg ?? 45)
  const sideFromEnd = bracing.sideGuys
    .map((g) => round2(g.from.z + input.length / 2))
    .sort((a, b) => a - b)
  const diagonal = Math.hypot(input.length, input.width)
  const hoopFromEnd = fromEnd(geo.hoopZs, input.length)
  const nearZ = -input.length / 2
  const farZ = input.length / 2
  const nearRow = acrossFromSide(geo.extraPosts, nearZ, input.width)
  const farRow = acrossFromSide(geo.extraPosts, farZ, input.width)
  const jambs = geo.extraPosts
    .filter((p) => p.role === 'jamb')
    .map((p) => round2((input.doorWall === 'end' ? p.x + input.width / 2 : p.z + input.length / 2)))
    .sort((a, b) => a - b)
  const purlinY = geo.purlinPoints[0]?.y
  const sleeperRun = input.sleeperBase ? Math.max(0, geo.perimeterM - input.doorWidth) : 0
  const sleeperSticks = sleeperRun > 0 ? Math.ceil(sleeperRun / 2.4 - 1e-9) : 0
  const coils = Math.ceil(pipe.totalM / hoop.stockM - 1e-9)
  const origin = input.doorWall === 'end' ? 'the door end' : 'one end'
  const lineWhere =
    wire.lineCount === 2 ? 'one at mid-height and one at the top of the mesh' : 'bottom, middle, and top of the mesh'

  const steps: Step[] = [
    {
      id: 'tools',
      title: 'Tools and safety',
      text: `Call 1100 (Dial Before You Dig) before any peg, picket, or trench. Gloves and eye protection for the whole job. Cap every picket the hoop will not cover. Take a 30 m tape, string line, pegs, post driver or club hammer, spirit level, marker, spade, drill, fencing pliers, wire grips, hog-ring pliers, side cutters, a hacksaw or poly cutter, galvanised staples, and a ladder.${input.doorStyle === 'mesh-gate' ? ' Post-hole shovel and concrete for the two door posts.' : ''}`,
    },
    {
      id: 'setout',
      title: 'Set out and square',
      text: `Mark a ${formatM(input.length, 2)} × ${formatM(input.width, 2)} rectangle. Square the first corner with a 3-4-5 triangle: 3 m along one side, 4 m along the other, 5 m on the diagonal. Then check both full diagonals. Each must be ${formatM(diagonal, 2)}.`,
    },
    {
      id: 'string',
      title: 'String lines',
      text: `Run string on both long sides and both ends, on the outside face of the pickets. Hoop pairs sit on these lines, square across the ${formatM(input.width, 2)} span. Leave the lines up until every picket is in.`,
    },
    {
      id: 'pickets',
      title: 'Drive the pickets',
      text: `${geo.hoopCount} hoops at ${formatM(geo.actualSpacing, 2)}, so ${geo.hoopCount} pickets on each long side (${geo.pickets.hoop} under hoops). From ${origin}: ${listM(hoopFromEnd)}. ${input.picketLength.toFixed(2)} m pickets. Mark ${mm(input.embedDepth)} up from the tip and drive until the mark meets finished ground. Check plumb both ways. Tops level, ${formatM(geo.stickUp, 2)} above ground. Between the corner hoops, measure from the same long side. ${input.doorWall === 'end' ? 'Door end' : 'Near end'}: ${listM(nearRow)}. Far end: ${listM(farRow)}. ${jambs.length ? `Door jambs at ${listM(jambs)} (${formatM(input.doorWidth, 2)} opening on the ${input.doorWall} wall).` : `Door opening ${formatM(input.doorWidth, 2)} on the ${input.doorWall} wall, left clear of pickets.`} ${geo.pickets.total} pickets in all.`,
    },
    {
      id: 'stays',
      title: 'Diagonal braces',
      text: `The ${geo.pickets.stays} corner stays are diagonal braces, not extra vertical posts. Inside each end, run a star picket from the top of the corner hoop picket down to the ground ${formatM(bracing.braceFootM, 1)} along the side wall. Clip the top to the picket (${bracing.braceClipCount} brace clips). The foot goes into the ground. These braces do not take the guys. The Stays & bracing diagram shows the foot.`,
    },
    {
      id: 'sleeper',
      title: 'Sleeper base',
      text: input.sleeperBase
        ? `Trench ${mm(SLEEPER.buryM)} deep outside the pickets. Leave the ${formatM(input.doorWidth, 2)} door gap open. Set 200×50 sleepers on edge: ${mm(SLEEPER.buryM)} in the ground, ${mm(SLEEPER.revealM)} proud. ${formatM(sleeperRun, 2)} of sleeper (${sleeperSticks} × 2.4 m). Fix each length to the pickets it passes.`
        : `No sleeper on this build. Skip the trench. Staple the mesh to the bottom rail instead.`,
    },
    {
      id: 'lines',
      title: 'Line wires',
      text: `Run ${wire.lineCount} lengths of 2.5 mm high-tensile wire, ${lineWhere}. About ${wire.lineM.toFixed(1)} m including tails. Strain them lightly now and finish the tension after the mesh is on. Keep every wire below the sleeve (${formatM(geo.sleeveBot, 2)}–${formatM(geo.sleeveTop, 2)}).`,
    },
    {
      id: 'mesh',
      title: 'Chicken wire',
      text: `Hang ${mesh.label} from ground level to ${formatM(input.meshHeight, 2)}. ${input.sleeperBase ? `Staple it to the sleeper face every ${mm(STAPLE_SPACING_M)}.` : `Staple it to the rails every ${mm(STAPLE_SPACING_M)}.`} Hog-ring it to the line wires every ${mm(HOG_SPACING_M)} with 19 mm rings. Hog rings are for the chicken wire on the line wires only. Stop the mesh at ${formatM(geo.sleeveBot, 2)} so it stays clear of the ${mm(input.pipeInsert)} sleeve.`,
    },
    {
      id: 'skirt',
      title: 'Buried skirt',
      text:
        input.skirtMode === 'none'
          ? `No skirt on this build. ${input.sleeperBase ? `A rabbit can still dig under the ${mm(SLEEPER.buryM)} sleeper.` : 'A rabbit can still dig under the mesh.'} Optional: bury a separate strip of the same mesh ${formatM(input.skirtDepth, 2)} deep, vertical, all the way round. Do not use the wall wire for it.`
          : input.skirtMode === 'buried-vertical'
            ? `Bury a separate strip of mesh ${formatM(input.skirtDepth, 2)} deep, vertical, around the whole perimeter. Keep it off the wall wire.`
            : `Fold a separate apron ${formatM(input.skirtDepth, 2)} outward on the soil, peg it about every 0.4 m, and cover it with mulch.`,
    },
    {
      id: 'hoops',
      title: 'Poly hoops',
      text: `Roll the ${hoop.label} out in the sun until it lies straight. Cut ${geo.hoopCount} hoops at ${geo.pipeEachM.toFixed(2)} m each (${formatM(geo.pipeInsertM, 2)} of sleeve on each leg). Slide each hoop over a picket pair until the sleeve covers ${formatM(geo.sleeveBot, 2)}–${formatM(geo.sleeveTop, 2)}. The peak, ground to ridge, should read ${formatM(input.peakHeight, 2)}. Optional: a tek screw or a hose clamp on each leg so the hoop does not rattle in the sleeve. Hoops, ridge, and any pipe purlins are ${pipe.totalM.toFixed(1)} m together — ${coils} × ${hoop.stockM} m ${hoop.stockKind}${coils === 1 ? '' : 's'}.`,
    },
    {
      id: 'ridge',
      title: 'Ridge pipe',
      text: `Cut one continuous ridge, ${pipe.ridgeM.toFixed(2)} m of the same pipe, from the hoop coil. It runs ${mm(RIDGE_PAST_END_M)} past each end hoop. Sit it under the crossings. At every hoop, figure-eight 2.5 mm galvanised tie wire, twist it tight, and fold the tails in. A saddle clip (one per hoop, ${geo.hoopCount} on this cage) or a UV-stabilised heavy-duty cable tie is the alternative. Use one method at each crossing, not all three.`,
    },
    {
      id: 'purlins',
      title: 'Purlin wires',
      text:
        input.purlins === 1
          ? `Ridge only on this build. No side purlins. On a wide span the net will sail — add two if it billows.`
          : input.purlinMaterial === 'wire'
            ? `Two 2.5 mm wires, one each side, midway between the ridge (${formatM(geo.peakY, 2)}) and the shoulder (${formatM(geo.hoopStartY, 2)})${purlinY === undefined ? '' : `, about ${formatM(purlinY, 2)} up`}. Each wire is ${wire.purlinEach.toFixed(2)} m: the ${formatM(input.length, 2)} run plus ${formatM(PURLIN_TAIL_M, 2)} tails to the end bracing or a ground anchor. Tie every hoop with the same figure-eight, then tension the wires.`
            : `Two pipe purlins, one each side, midway between ridge and shoulder. ${formatM(input.length, 2)} each, cut from the hoop coil. Tie or saddle-clip them to every hoop.`,
    },
    {
      id: 'braces',
      title: 'End braces and guys',
      text: `End guys: 2.5 mm wire from each corner picket top, out along the length at about ${guyAngle}°, to a ground anchor ${formatM(bracing.endAnchorOutM)} past the end wall. ${bracing.endGuys.length} end guys. Side guys: windward wall (${bracing.windward}), every second hoop from ${origin} (${listM(sideFromEnd)}). Each runs square to the wall, ${formatM(bracing.sideAnchorOutM)} out, down to an anchor. ${bracing.sideGuys.length} side guys. ${bracing.endGuys.length} end + ${bracing.sideGuys.length} side = ${bracing.anchorCount} ground anchors. One wire strainer (Gripple) on each guy (${bracing.strainerCount}). The ${bracing.braceClipCount} brace clips are already on the diagonal braces. Strain the purlins and the guys after the hoops are tied. Layout, angle, and dimensions are on the Stays & bracing diagram.`,
    },
    {
      id: 'door',
      title: 'Door',
      text:
        input.doorStyle === 'mesh-gate'
          ? `On the ${input.doorWall} wall, dig two holes about ${mm(MESH_GATE.holeDiaM)} across and at least ${mm(MESH_GATE.embedM)} deep, at the edges of the ${formatM(input.doorWidth, 2)} opening. Set two galvanised round posts (${MESH_GATE.postOdMinMm}–${MESH_GATE.postOdMaxMm} mm, ${formatM(MESH_GATE.postLengthM, 1)} long) in concrete, plumb both ways. About ${formatM(MESH_GATE.postLengthM - MESH_GATE.embedM, 2)} stays above ground, clear of a ${formatM(input.doorHeight, 2)} gate. Leave the concrete to cure. Hang a prefabricated galvanised mesh gate about ${formatM(input.doorWidth, 2)} × ${formatM(input.doorHeight, 2)}. Gate hinges and a latch a dog cannot nose. No star-picket jambs and no pine frame.`
          : `Frame a ${formatM(input.doorWidth, 2)} × ${formatM(input.doorHeight, 2)} door on the ${input.doorWall} wall, between the jamb pickets. 70×35 leaf: two stiles, three rails, one diagonal brace. Three hinges, a latch a dog cannot nose, and a drop bolt into a pipe socket. Mesh on the lower ${formatM(Math.min(input.meshHeight, input.doorHeight), 2)}, net above that.`,
    },
    ...(input.tomatoTrellis
      ? [
          {
            id: 'tomato',
            title: 'Tomato trellis',
            text: 'Optional, and already bought. Inside the cage, not on the walls or the door: stand 2 × Whites Ultrapost 2.4 m and hang Whites Dog Fence Medium, 120 cm × 10 m, as a tomato trellis.',
          },
        ]
      : []),
    {
      id: 'net',
      title: 'End walls and roof net',
      text: `Cut the end walls to the arch, not a rectangle. The roof overlaps the top of the wall by ${mm(NET_OVERLAP_M)} and is clipped at every hoop. ${input.doorWall === 'end' ? 'Cut the door out of the near end.' : 'Cut the door out of the side net.'} Pull the net taut. Slack net traps animals. Clips hold the net. Hog rings stay on the line wires.`,
    },
    {
      id: 'caps',
      title: 'Picket caps',
      text:
        geo.pickets.caps > 0
          ? `Fit safety caps on the ${geo.pickets.caps} pickets the hoop does not cover: end wall${geo.pickets.jambs ? ', door jambs,' : ''} and diagonal braces. Hoop pickets are sleeved and stay bare. Cap the bare ones before you leave the site.`
          : `This post type does not take a star-picket cap. Still cover or file any sharp top before you leave the site.`,
    },
    {
      id: 'check',
      title: 'Final check',
      text: `Walk the cage. Line wires${input.purlins === 3 ? ' and purlins are' : ' are'} tight. Every hoop is tied ${input.purlins === 3 ? 'at the ridge and at both purlins' : 'at the ridge'}, tails folded in. No rattle in the sleeves. Mesh stops below ${formatM(geo.sleeveBot, 2)}. No gap at the sleeper, the door, or the net overlap that a rabbit or a bird can use. End guys on both ends, windward side guys on every second hoop, one anchor and one strainer on each guy, ${bracing.braceCount} diagonal braces clipped. Caps are on every bare picket. Peak still reads ${formatM(input.peakHeight, 2)}.${input.doorStyle === 'mesh-gate' ? ' Gate closes, latches, and clears the ground.' : ''}`,
    },
  ]

  return steps
}

function buildV2Guide(input: CageInputs, geo: CageGeometry): Step[] {
  const frame = geo.v2!
  const shade = input.cover === 'shade-30'
  const cover = shade
    ? '30% shade cloth: two roof strips, then the ends'
    : 'bird net: roof first, then both ends, gate opening cut out'
  const mid = shade ? ' Shade cloth also gets one pair in bay 4.' : ''
  const steps: Step[] = [
    {
      id: 'markout',
      title: 'Mark out',
      text: `Call 1100 (Dial Before You Dig) before any peg, picket, or trench. Measure the beds first and confirm the ${formatM(input.width, 2)} picket centres (bed width plus 0.06 m). This build is ${formatM(input.length, 2)} long, peak ${formatM(input.peakHeight, 2)}. Square the first corner with a 3-4-5 triangle, then check both full diagonals.`,
    },
    {
      id: 'test-pull',
      title: 'Test-pull one picket',
      text: `Drive one Galstar MaxY ${mm(input.embedDepth)} into the ground. Push it sideways at ${formatM(geo.stickUp, 2)}. If it moves easily, go deeper or concrete the corner pickets before you drive the rest. Soil is the unknown.`,
    },
    {
      id: 'pickets',
      title: 'Drive the pickets',
      text: `Drive all the pickets on a string line. ${geo.hoopCount} hoops at ${formatM(geo.actualSpacing, 2)}, so ${geo.hoopCount} pickets each side (${geo.pickets.total} in all). ${input.picketLength.toFixed(2)} m pickets, ${mm(input.embedDepth)} in, ${formatM(geo.stickUp, 2)} out. Leave the door opening clear. No extra end-wall pickets: the ends are steel posts.`,
    },
    {
      id: 'posts',
      title: 'Concrete the end posts',
      text: `Four 50×50×2 galv SHS posts, 3.0 m, cut from two 6.0 m bars. Set ${mm(0.55)} in concrete, both ends, at ±${frame.postX.toFixed(3)} m off the centreline. About ${formatM(frame.endPosts[0]?.top ?? 2.45, 2)} stays above ground. Cure 24 h. The door-end pair carries the gate.`,
    },
    {
      id: 'sleeper',
      title: 'Sleeper ring',
      text: `Trench ${mm(SLEEPER.buryM)} and lay the 200×50 H4 MicroPro ring: ${mm(SLEEPER.buryM)} buried, ${mm(SLEEPER.revealM)} above. Sides join over pickets. Screw the corners. Do not bolt the pickets yet.`,
    },
    {
      id: 'hoops',
      title: 'Poly hoops',
      text: `Check that 50 mm rural poly (about 60 mm outside) slides over a MaxY before you cut the roll. Warm the pipe and cut ${geo.hoopCount} hoops at ${geo.pipeEachM.toFixed(2)} m. Each hoop is a ${formatM(geo.stickUp, 2)} vertical leg plus a semi-ellipse, peak ${formatM(input.peakHeight, 2)}. Slide each hoop to the ground over its picket pair.`,
    },
    {
      id: 'bolts',
      title: 'Bolt the hoops down',
      text: `Bolt each picket through the poly and the sleeper with an M10×130 HDG cup-head, about 50 mm below ground, nut inside. ${geo.pickets.total} picket bolts plus 4 post-to-sleeper bolts. Cut the long tails.`,
    },
    {
      id: 'battens',
      title: 'Seven roof battens',
      text: `Crown out. Fit the ridge at ${formatM(input.peakHeight, 2)}, then the two low battens at ${formatM(frame.lowY, 2)}, then the four shoulder battens (upper at ${formatM(frame.upperY, 2)}, lower at ${formatM(frame.lowerY, 2)}). Two 10g×16 teks and two crossed UV ties at every hoop. Check the hoops are plumb and the spacing is ${formatM(geo.actualSpacing, 2)}. Each line is two 6.1 m lengths, nested from ${formatM(frame.lapFrom, 2)} to ${formatM(frame.lapTo, 2)} off the door end, with 4 teks in the lap. Stagger the laps between neighbouring lines. No tensioned wires.`,
    },
    {
      id: 'headers',
      title: 'Headers and end rails',
      text: `End header at ${formatM(frame.headerY, 2)}, ${formatM(frame.headerHalf * 2, 2)} hoop to hoop, on each end. Two teks into each post face, and two teks plus two UV ties to the end hoop. It is the gate lintel: gate head about 1.87 m, 80 mm clear. Tie each post top to the end hoop at about 2.43 m, one tek and a UV tie. Door-end low rails, 2 × ${formatM(frame.rails[0]?.cutM ?? 1.75, 2)}, from the posts out to the walls at ${formatM(frame.lowY, 2)}. Back-end low rail ${formatM(input.width, 2)} at the same height. The door rails come from the header offcuts.`,
    },
    {
      id: 'diagonals',
      title: 'Batten diagonals',
      text: `Square the frame lengthways (the two floor diagonals equal), then screw the diagonals. ${frame.diagonals.length} in all, cut ${frame.diagonalCut.toFixed(2)} m (${frame.diagonalLength.toFixed(2)} m bolt to bolt, ${frame.diagonalAngle.toFixed(1)}° in the roof surface). Each runs from the low batten at the end hoop up to the lower-shoulder batten on the next hoop, both sides.${mid} The diagonal lies over the battens. At each end: 4 teks through both, plus 1 UV tie round the hoop. No other batten is crossed. No outside guys, no Gripples, no angle stays. Layout is on the Stays & bracing diagram.`,
    },
    {
      id: 'cold-galv',
      title: 'Cold-galv the cuts',
      text: 'Cold-galv every cut batten end and every drilled hole before the mesh goes on. Keep the Zincalume battens off the treated timber.',
    },
    {
      id: 'mesh',
      title: 'Mesh band',
      text: `DPC on the sleeper top, then the 900 mm 25 mm welded mesh from 0.05 m to 0.95 m, then the 42×18 H3 pine strip, screwed with 10g×50 every 250 mm. Hog-ring the mesh to the hoop legs every 250 mm. Tie the mesh top to the 0.90 m batten. No chicken wire. No apron. A rabbit can still dig under the ${mm(SLEEPER.buryM)} sleeper: watch that line.`,
    },
    {
      id: 'gate',
      title: 'Gate',
      text: `Hang the ${formatM(input.doorWidth, 2)} × ${formatM(input.doorHeight, 2)} mesh gate on the door-end posts so it opens outward. Bottom about 0.07 m, head about 1.87 m. Nothing projects into the opening or the swing.`,
    },
    {
      id: 'cover',
      title: shade ? 'Shade cloth' : 'Bird net',
      text: `Fit the ${cover}. The cover comes down to ${formatM(0.8, 2)} and overlaps the mesh by ${mm(NET_OVERLAP_M)}. Tie it to every batten line every 300 mm.`,
    },
  ]
  if (input.tomatoTrellis) {
    steps.push({
      id: 'tomato',
      title: 'Tomato trellis',
      text: 'Optional, and already bought. Inside the cage, not on the walls or the door: stand 2 × Whites Ultrapost 2.4 m and hang Whites Dog Fence Medium, 120 cm × 10 m, as a tomato trellis.',
    })
  }
  steps.push({
    id: 'recheck',
    title: 'After the first blow',
    text: `Re-check the ties and the teks after the first big blow. The diagonals rely on teks in 0.55 mm steel: 4 at each end. Peak still reads ${formatM(input.peakHeight, 2)}.`,
  })
  return steps
}

export function guidePlainText(steps: Step[]): string {
  return steps.map((step, i) => `${i + 1}. ${step.title}\n${step.text}`).join('\n\n') + '\n'
}
