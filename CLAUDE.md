# CLAUDE.md

Scrollytelling visualization of **US presidential election results by county, 2000-2024**.
Static site, no framework, no build step. Deployed at
https://johnguerra.co/viz/USElectionsResults/.

## How the parts connect

```
data/2000_2024_US_County_Level_Presidential_Results.csv  (county x year results)
data/counties-10m.json                                   (TopoJSON, US counties + states)
data/US_Regions.csv                                      (state -> census division)
        │
        ▼  Promise.all + display()          js/sections.js:320
   js/sections.js ── scrollVis() ── 24 activateFunctions, one per <section class="step">
        │                                    js/sections.js:87
        │  drives, via the reusable-chart accessors
        ▼
   js/scrollerElections.js ── d3.forceSimulation over ~3.1k counties
        │                     two stacked <canvas>: .bg (map) + .fg (circles)
        ▲
        │  scroll position -> step index
   js/scroller.js                            js/sections.js:297
```

`js/variables.js` holds the shared globals (`YEAR`, `LEFT`, `RIGHT`). They are `let`/`const`
at script scope, so they are **not** on `window` - don't look for `window.YEAR`.

## index.html is GENERATED - never edit it

`index.jade` is the source; `index.html` is built from it by `npm run build`
(`scripts/build.mjs`). **Edits to `index.html` are overwritten.**

This used to be hand-synced, and the drift caused a real bug: in the Pug, `head`/`body` sat at
the same indentation as `html`, and `.container` at the same indentation as `body`, so both
`<html>` and `<body>` rendered empty and the page lived outside them. That broke
`position: sticky`, which is why the year picker went offscreen on mobile.

## Commands

```sh
npm install
npm run dev      # build + watch index.jade + serve on :8899 (no-store headers)
npm run build    # index.jade -> index.html
npm run lint     # eslint 9, flat config in eslint.config.mjs
npm run format   # prettier
npm run check    # lint + build, the pre-commit gate
```

`npm run dev` sends `Cache-Control: no-store` on everything. This matters: Chrome caches
`js/*.js` hard enough that a plain reload silently runs the *previous* version. If you serve
the directory some other way, cache-bust with `index.html?v=N`.

## Verifying in the browser

Use **Claude in Chrome** (`mcp__claude-in-chrome__*`), invoking the `claude-in-chrome` skill first.

- `window.scrollViz` is a debug handle on the chart (set in `js/sections.js`).
  `window.scrollViz.nodes()` returns the county nodes, each with `pct` / `totalVotes`
  (year-keyed) and `pctNow` / `totalVotesNow` (the currently displayed, tweened values).
- Change year programmatically rather than clicking the pill - clicking opens a **native
  select dropdown**, which is an OS-level menu that blocks the extension:
  ```js
  const s = document.getElementById("yearSelect");
  s.value = "2012"; s.dispatchEvent(new Event("change"));
  ```
- **Known gap:** these tools expose `resize_window` but *not* DevTools device emulation. Mobile
  checks are therefore viewport-width only - they cover CSS breakpoints, fixed positioning and
  overflow, but do **not** exercise `devicePixelRatio` (used by `getPixelRatio()`), touch input,
  or `env(safe-area-inset-*)`. Verify those on a real device.
- Don't screenshot-verify routine changes; measure instead (`getBoundingClientRect`,
  `scrollWidth`) and screenshot only when appearance is the thing in question.

## Year transitions

Every node stores `pct` and `totalVotes` as **year-keyed objects**. Everything that draws or
positions reads the derived `pctNow` / `totalVotesNow` instead, so a year change interpolates:
`tweenYear()` runs a `d3.timer`, and because d3-force caches force targets at `initialize()`
time, each frame calls `resetForces(false)` to retarget without kicking alpha.

- The pacing lives in one place: `yearTweenPacing()` in `js/scrollerElections.js`. Tune there.
- Discrete per-year readouts (tooltip figures, the example counties, the state choropleth)
  deliberately **snap** rather than tween; only the circles interpolate.
- If you add a new read of `pct[YEAR]` or `totalVotes[YEAR]` in drawing or force code, use the
  `Now` variants instead or that property will jump while everything else glides.

## Data notes

- Main CSV is county x year; 2000-2020 from the MIT Election Data and Science Lab, 2024 merged
  in from https://github.com/tonmcg/US_County_Level_Election_Results_08-24.
- Counties are joined to geometry by `county_fips` -> TopoJSON id, and to census divisions by
  uppercased state name. Unmatched counties are skipped silently (the `console.error` calls for
  this are commented out in `init()`).
- **31 FIPS codes are not present in all 7 years.** Categories, all confirmed in the CSV:
  - *created*: Broomfield CO `8014` (2001) - genuinely absent in 2000
  - *dissolved*: Bedford VA `51515` - reverted to a town in 2013, absorbed by Bedford County
  - *renamed*: Shannon SD `46113` (2000-12) -> Oglala Lakota SD `46102` (2016-24), a clean 1:1
  - *reorganized*: the 8 Connecticut counties `9001-9015` (2000-20) became **9** planning
    regions `9110-9190` (2024). Many-to-many; a correct crosswalk needs areal weights we do
    not have, so **do not fabricate one**.
  - *reporting artifacts*: 7 DC wards `11002-11008` (2024 only), Kansas City MO `2938000`,
    Alaska `DISTRICT 99`, and a literal `NA` FIPS for a Rhode Island federal precinct
  The code does not crosswalk any of these. `hasData(d, year)` decides presence, and absent
  counties fade out via `opacityNow` rather than showing stale or invented numbers.
- `data/2024_US_County_Level_Presidential_Results.csv` and
  `Departamentos_y_municipios_de_Colombia.csv` are leftovers, not loaded by the page.
- `js/stackedBarChartFromMatrix.js` is dead code (not loaded, and references an undefined
  `yValue`); it is excluded in `eslint.config.mjs`.

## Conventions

- Commit often as checkpoints; **ask before pushing or deploying**.
- `./update.sh` rsyncs the whole directory to the production server. **Never run it unless
  explicitly asked.** Note it currently hardcodes a `.pem` path outside the repo.
- `lib/css/bootstrap.min.css` is the one actually linked; `css/bootstrap.min.css` is an unused
  duplicate. Don't "fix" the link without checking which is newer.
