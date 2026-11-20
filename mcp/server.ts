import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'

import { computeCage } from '../src/lib/compute.ts'
import { guidePlainText } from '../src/lib/guide.ts'
import { DEFAULTS, PRESETS, type CageInputs } from '../src/lib/model.ts'

const server = new McpServer({
  name: 'vegie-cage',
  version: '1.0.0',
})

const inputSchema = {
  length: z.number().optional(),
  width: z.number().optional(),
  meshHeight: z.number().optional(),
  peakHeight: z.number().optional(),
  hoopSpacing: z.number().optional(),
  hoopOrigin: z.enum(['ground', 'rail']).optional(),
  hoopMaterial: z.enum(['poly25', 'poly32', 'poly50', 'conduit20', 'conduit25', 'galv25', 'galv32']).optional(),
  wallMesh: z.enum(['hex50', 'hex40', 'hex25', 'weld25', 'weld12']).optional(),
  postType: z.enum(['star', 'pine90', 'galv50nb']).optional(),
  purlins: z.union([z.literal(1), z.literal(3)]).optional(),
  purlinMaterial: z.enum(['pipe', 'wire']).optional(),
  skirtMode: z.enum(['buried-vertical', 'l-outward', 'none']).optional(),
  skirtDepth: z.number().optional(),
  sleeperBase: z.boolean().optional(),
  picketLength: z.number().optional(),
  embedDepth: z.number().optional(),
  pipeInsert: z.number().optional(),
  windGust: z.number().optional(),
  doorWall: z.enum(['end', 'side']).optional(),
  doorWidth: z.number().optional(),
  doorHeight: z.number().optional(),
  doorStyle: z.enum(['timber', 'mesh-gate']).optional(),
  ownedPickets: z.number().optional(),
  tomatoTrellis: z.boolean().optional(),
  netType: z.enum(['wildlife5', 'bird5']).optional(),
  design: z.enum(['classic', 'v2']).optional(),
  cover: z.enum(['bird-net', 'shade-30']).optional(),
}

function applyCover(args: Partial<CageInputs>): Partial<CageInputs> {
  if (args.design === 'classic' || args.cover === undefined || args.hoopSpacing !== undefined) return args
  return { ...args, hoopSpacing: args.cover === 'shade-30' ? 1.25 : 10 / 7 }
}

function text(payload: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(payload, null, 2) }] }
}

server.registerTool(
  'compute_cage',
  {
    description:
      'Size a walk-in vegie cage. Partial inputs are filled from the Marek 4.6×10 v2 default (bird net, 8 hoops). Pass cover shade-30 for 30% shade cloth at 1.25 m (9 hoops) unless hoopSpacing is set. design classic keeps guys and a ridge pipe. Returns geometry, warnings, and the bill of materials. The wind figures are a rough check, not engineering.',
    inputSchema,
  },
  async (args) => text(computeCage(applyCover(args as Partial<CageInputs>))),
)

server.registerTool(
  'build_guide',
  {
    description:
      'Step-by-step build guide for this cage. Lengths, counts, and positions come from computeCage. Partial inputs are filled from the Marek 4.6×10 v2 default. cover shade-30 selects 9 hoops at 1.25 m unless hoopSpacing is set.',
    inputSchema,
  },
  async (args) => {
    const result = computeCage(applyCover(args as Partial<CageInputs>))
    return text({ guide: result.guide, warnings: result.warnings, text: guidePlainText(result.guide) })
  },
)

server.registerTool(
  'list_presets',
  {
    description: 'List built-in cage presets (id, label, note, and the input patch).',
    inputSchema: {},
  },
  async () =>
    text(
      PRESETS.map((p) => ({
        id: p.id,
        label: p.label,
        note: p.note,
        patch: p.patch,
      })),
    ),
)

server.registerTool(
  'get_defaults',
  {
    description: 'Return the default cage inputs (Marek 4.6×10, bird net, seven battens).',
    inputSchema: {},
  },
  async () => text(DEFAULTS),
)

async function main(): Promise<void> {
  const transport = new StdioServerTransport()
  await server.connect(transport)
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err)
  process.stderr.write(`${message}\n`)
  process.exit(1)
})
