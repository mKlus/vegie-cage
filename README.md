# Vegie Cage

Walk-in vegetable garden enclosure planner. Lower mesh fence, poly (or galv) U-hoops, taut wildlife-safe net, full-size door, raised timber beds. Live 3D + elevations, metre-exact cut list for Mitre 10 / steel supply lengths.

Default preset **Marek 5×10**: 10 × 5 m, 1.8 m star pickets driven 600 mm (1.2 m stick-up), 1.0 m chicken wire stopping where the 200 mm sleeve starts, buried skirt, 200×50 H4 sleeper, 11 hoops of 50 mm rural poly, wire purlins, wildlife-safe net. The older 12 × 6 m walk-in is still a preset.

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually http://localhost:5173).

```bash
npm test          # vitest
npm run lint      # oxlint
npm run build     # typecheck + production bundle
npm run cage      # JSON for the Marek 5×10 default
npm run mcp       # stdio MCP server
```

Headless cut list. Prints `{ geometry, warnings, bom }` as JSON. Partial files and flags are filled from the Marek preset.

```bash
npm run cage -- --preset marek-5x10
npm run cage -- --json inputs.json
npm run cage -- --length 10 --width 5 --peak 2.8 --wire 1 --picket 1.8 --embed 0.6 --gust 40
```

`--skirt buried-vertical|l-outward|none` and `--skirt-depth 0.25` set the apron. The wind block is a rough gust check, not an engineering design.

Share links put the settings in the `cfg` query parameter. Opening that URL restores the cage.

### MCP

[`mcp/server.ts`](mcp/server.ts) speaks stdio via `@modelcontextprotocol/sdk`. Tools: `compute_cage`, `list_presets`, `get_defaults`.

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
