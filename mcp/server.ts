import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'

import { computeCage } from '../src/lib/compute.ts'
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
  netType: z.enum(['wildlife5', 'bird5']).optional(),
}

function text(payload: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(payload, null, 2) }] }
}

server.registerTool(
  'compute_cage',
  {
    description:
      'Size a walk-in vegie cage. Partial inputs are filled from the Marek 5×10 default. Returns geometry, warnings, and the bill of materials. The wind figures are a rough check, not engineering.',
    inputSchema,
  },
  async (args) => text(computeCage(args as Partial<CageInputs>)),
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
    description: 'Return the default cage inputs (Marek 5×10).',
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
