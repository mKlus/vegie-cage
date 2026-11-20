# Vegie Cage

Walk-in vegetable garden enclosure planner. Lower mesh fence, poly (or galv) U-hoops, taut wildlife-safe net, full-size door, raised timber beds. Live 3D + elevations, metre-exact cut list for Mitre 10 / steel supply lengths.

Default preset **Marek 4.6×10** (id `marek-5x10`): 10 m long, 4.6 m picket centres, peak 2.5 m. Galstar MaxY 1.8 m pickets driven 800 mm (1.0 m stick-up; 4 already bought, the list prices only the rest). Each hoop is 1.0 m of vertical leg plus a semi-ellipse, cut 8.1 m, and the poly sleeves over the picket to the ground. Bird net is the default: 8 hoops at about 1.43 m. 30% shade cloth is an option: 9 hoops at 1.25 m, with its own costs. Seven 40 mm 0.55 BMT roof battens (ridge, two shoulders each side, a low line each side at 0.9 m) are screwed and UV-tied to every hoop, plus a header batten at 1.95 m on each end. Diagonal batten braces replace outside guys: one per side in each end bay (four on bird net; shade cloth adds a pair in bay 4). No tensioned wires, Gripples, struts, or angle stays. Walls are a 900 mm band of 25 mm welded mesh (0.05–0.95 m) on a 200×50 H4 sleeper (150 mm buried, 50 mm above), with bird net overlapping the mesh 150 mm. No chicken wire and no apron. Ends are 50×50×2 galv SHS posts, 3.0 m, set 550 mm in concrete. The door is a 1.0 × 1.8 m mesh gate that opens outward. List prices are AUD GST-inc as at 20 Nov 2026: about $2,788 for bird net and $3,119 for shade cloth, including $245 of estimates (end-post steel, hinges and latch, DPC) and excluding freight. An optional tomato trellis (2 × Whites Ultrapost 2.4 m and Whites Dog Fence Medium 120 cm × 10 m, already bought) sits inside the cage. The older classic presets (12 × 6 m and the rest) still use guys, a ridge pipe, and purlin wires. The Build guide tab follows the live config.

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually http://localhost:5173).

```bash
npm test          # vitest
npm run lint      # oxlint
npm run build     # typecheck + production bundle
npm run cage      # JSON for the Marek 4.6×10 default
npm run mcp       # stdio MCP server
```

Headless cut list. Prints `{ geometry, warnings, bom, guide }` as JSON. Partial files and flags are filled from the Marek preset. `--guide` prints the build steps as plain text.

```bash
npm run cage -- --preset marek-5x10
npm run cage -- --cover shade-30
npm run cage -- --guide
npm run cage -- --json inputs.json
npm run cage -- --design classic --length 10 --width 5 --peak 3 --wire 1 --spacing 1.25 --picket 1.8 --embed 0.6 --gust 40
```

`--cover bird-net|shade-30` picks the v2 cover. Shade cloth sets 1.25 m hoop spacing unless `--spacing` is passed. `--design classic` keeps the older guyed frame. `--skirt buried-vertical|l-outward|none` and `--skirt-depth 0.25` set an optional apron. The wind block is a rough gust check, not an engineering design.

Share links put the settings in the `cfg` query parameter. Opening that URL restores the cage.

### MCP

[`mcp/server.ts`](mcp/server.ts) speaks stdio via `@modelcontextprotocol/sdk`. Tools: `compute_cage`, `build_guide`, `list_presets`, `get_defaults`.

```bash
npm run mcp
```

Register it with the repo as the working directory. Example for a client that takes a JSON config:

```json
{
  "mcpServers": {
    "vegie-cage": {
      "command": "npm",
      "args": ["run", "mcp"],
      "cwd": "/absolute/path/to/vegie-cage"
    }
  }
}
```

`npm run` writes its banner on stderr. Leave stdout alone — that stream is the JSON-RPC channel.

GitHub Actions runs test, `tsc -b`, oxlint, and a production build on every push and pull request. On a **public** `main` branch, a green check then deploys `dist/` to **GitHub Pages** (private repos skip that step — free Pages is public-only):

https://mklus.github.io/vegie-cage/

First time: repo **Settings → Pages → Source = GitHub Actions**. After that, every green `main` push publishes.

Sizes persist in `localStorage`. Print the board for a shopping list. Cage and Birdies buy lists are priced separately (AUD GST-inc estimates, not a quote).
