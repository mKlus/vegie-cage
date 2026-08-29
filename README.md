# Vegie Cage

Walk-in vegetable garden enclosure planner. Lower mesh fence, poly (or galv) U-hoops, taut wildlife-safe net, full-size door, raised timber beds. Live 3D + elevations, metre-exact cut list for Mitre 10 / steel supply lengths.

Default: **12 × 6 m**, 1.2 m welded 25 mm mesh, 2.7 m peak, 50 mm rural poly over star pickets, ridge + two purlins, three 1.2 m beds.

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually http://localhost:5173).

```bash
npm test          # vitest
npm run lint      # oxlint
npm run build     # typecheck + production bundle
```

GitHub Actions runs test, `tsc -b`, oxlint, and a production build on every push and pull request. On a **public** `main` branch, a green check then deploys `dist/` to **GitHub Pages** (private repos skip that step — free Pages is public-only):

https://mklus.github.io/vegie-cage/

First time: repo **Settings → Pages → Source = GitHub Actions**. After that, every green `main` push publishes.

Sizes persist in `localStorage`. Print the board for a shopping list. Cage and Birdies buy lists are priced separately (AUD GST-inc estimates, not a quote).
