# Vegie Cage

Walk-in vegetable garden enclosure planner. Lower mesh fence, poly (or galv) U-hoops, taut wildlife-safe net, full-size door, raised timber beds. Live 3D + elevations, metre-exact cut list for Mitre 10 / steel supply lengths.

Default preset **Marek 5×10**: 10 × 5 m, peak 3.0 m, galvanised Waratah Galstar Maxy 1.8 m star pickets driven 600 mm (1.2 m stick-up; 4 already bought, the list prices only the rest), 1.0 m chicken wire from ground level up to the sleeve, no skirt, 200×50 H4 sleeper (150 mm in the ground, 50 mm above), 9 hoops of 50 mm rural poly at 1.25 m, one continuous ridge 150 mm past each end hoop, two 2.5 mm purlin wires, wildlife-safe net. The door is a prefabricated galvanised mesh gate about 1.0 × 2.0 m on two concreted round posts (about 50–65 mm, 3.0 m, set 600 mm), not star-picket jambs or a pine leaf. Door-post, concrete, gate, and hinge prices are unverified. An optional tomato trellis (2 × Whites Ultrapost 2.4 m and Whites Dog Fence Medium 120 cm × 10 m, already bought) sits inside the cage and is not on the wall or the door. A buried skirt is still an option. The older 12 × 6 m walk-in is still a preset. The Build guide tab follows the live config.

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

Headless cut list. Prints `{ geometry, warnings, bom, guide }` as JSON. Partial files and flags are filled from the Marek preset. `--guide` prints the build steps as plain text.

```bash
npm run cage -- --preset marek-5x10
npm run cage -- --guide
npm run cage -- --json inputs.json
npm run cage -- --length 10 --width 5 --peak 3 --wire 1 --spacing 1.25 --picket 1.8 --embed 0.6 --gust 40
```

`--skirt buried-vertical|l-outward|none` and `--skirt-depth 0.25` set the apron. The wind block is a rough gust check, not an engineering design.

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
