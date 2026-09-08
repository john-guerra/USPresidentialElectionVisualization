# Architecture findings

Working notes on how this visualization is put together: purpose, data, components,
interactions, gotchas. Read before editing the viz. (Modelled on the per-page findings docs
in the `elecciones2026` project.)

## Purpose

A guided argument, not a dashboard. It walks the reader through 23 scroll steps from "here is
a map of the US" to "here is a beeswarm of counties positioned by vote margin and grouped by
census division", making the point that **area-based maps misrepresent votes** because land
does not vote, people do.

## The three layers

| File | Responsibility |
|---|---|
| `js/scroller.js` | Generic scroll-position -> active-step-index dispatcher. Reusable, knows nothing about elections. |
| `js/sections.js` | Storytelling layer. Owns `activateFunctions[]`, one per step, each flipping chart accessors. |
| `js/scrollerElections.js` | Rendering layer. Force simulation, canvas drawing, the reusable-chart accessor API. |

The split matters: **steps never draw**. A step only sets state (`scrollViz.showMap(true)`),
and the render layer reacts. Adding a step means adding a `<section class="step">` in *both*
`index.html` and `index.jade`, plus an entry in `activateFunctions`, and bumping `STEPS`
(`js/sections.js:88`).

## Rendering

Two stacked canvases inside the `position: fixed` `#vis`:

- **`.bg`** - the map. State outlines and the choropleth. Redrawn only on demand (`redrawMap()`),
  because it rasterizes ~51 TopoJSON state paths and is far too costly per frame.
- **`.fg`** - the ~3.1k county circles plus labels. Cleared and redrawn every simulation tick.

Both are sized by `createCanvasContext()` at `devicePixelRatio` and scaled, which is why text
stays crisp. `onResize()` (debounced 150ms, also bound to `orientationchange`) rebuilds them and
**re-runs `setupGeo()`**, because the projection is `fitExtent`-ed to the old width/height and
would otherwise keep the pre-resize scale; `setCentroids()` then has to run again too, since
centroids come out of that projection.

## The force simulation

One `d3.forceSimulation` whose forces are entirely rebuilt by `resetForces()` whenever any
accessor changes. Positions are driven by target-seeking forces, never set directly:

- `forceX` -> `width/2` (xToCenter), the geographic centroid (circlesByGeo), or `x(d.pctNow)`
  (the vote-margin axis).
- `forceY` -> `height/2`, the centroid, `yPopulation(d.totalVotesNow)`, or the region band.
- `forceCollide` -> radius from `size(d.totalVotesNow)`, giving the "respect my bubble" step.
- `forceBoundary` (vendored plugin) keeps circles on screen during the "dancing" intro.

**Gotcha:** d3-force reads force accessors once, inside `initialize()`, and caches the result
per node. Mutating `d.pctNow` therefore does nothing until the force is re-set. That is why
`tweenYear()` calls `resetForces(false)` every frame - the `false` retargets without kicking
alpha, which is what keeps the transition smooth instead of jolting.

## Data shape

`init()` reduces the flat CSV (one row per county x year) into one node per county, with the
per-year measures kept as **year-keyed objects**:

```js
{ county_name, state, geoId, region, feat, centroid,
  pct:        { "2000": -0.40, ..., "2024": 0.62 },   // (R - D) / total
  totalVotes: { "2000": 12345, ... },
  pctNow, totalVotesNow                                // displayed values; see below
}
```

`pctNow` / `totalVotesNow` are the **displayed** values. All drawing and all force targets read
those, so a year change can be interpolated rather than swapped. `tweenYear()` interpolates them
from whatever is currently on screen (not from the previous year's data), which makes rapid
year-flipping re-entrant instead of jumpy.

Deliberately *not* tweened, because they are discrete per-year facts: the hover tooltip figures,
the two example counties in step 7, and the state choropleth (`totalsByState[YEAR]`).

## Year picker

A `position: fixed` pill (`#yearPicker`), top-right, above `#vis` in the stacking order. The
visible year is a CSS odometer (`js/yearOdometer.js`): one overflow-hidden window per digit over
a 0-9 strip, translated on change, so only digits that actually differ move. The real `<select>`
is stretched transparently across the pill, so phones still get the native picker and screen
readers still see a form control.

It used to be a Bootstrap `.sticky-top` in normal flow, which failed on mobile for two
compounding reasons: the malformed document skeleton (see CLAUDE.md), and `#vis` being a
full-viewport `position: fixed` layer it had to out-stack.

## The mobile viewport

Two things conspire here, and both have bitten this file:

- `#vis` is `position: fixed`, so a percentage height resolves against the **initial containing
  block** - which on mobile is the *large* viewport, with the URL bar retracted. `height: 100%`
  therefore makes the canvas taller than the screen actually shows. `css/scroller.css` uses
  `calc(100svh - 70px)` (small viewport height, with a `%` fallback): it always fits, and unlike
  `dvh` it does not change as the bar moves.
- Mobile browsers fire `resize` when that URL bar hides or reappears **during scroll**, changing
  only the height by ~50-120px. Rebuilding on that re-runs `setupGeo()`, and since the projection
  is `fitExtent`-ed to width *and* height, every centroid shifts - measured at ~64px median for a
  53px height change, which reads as the map jumping while you scroll. `onResize()` therefore
  ignores height-only changes on touch devices (`(hover: none) and (pointer: coarse)`), where the
  only geometry change that matters is rotation, and rotation always changes the width.

## Counties that do not exist in every year

31 FIPS codes are missing from at least one election (see CLAUDE.md for the full breakdown -
Connecticut's 2022 county-to-planning-region reorganization is the big one). `hasData(d, year)`
is the single definition of presence, and each node carries an `opacityNow` that the year tween
drives to 0 or 1, so a county fades out in years it does not exist rather than showing stale
numbers.

Two details that matter:

- Displayed values are kept **finite even when absent** (0 rather than NaN). A NaN force target
  makes d3-force silently set that node's strength to 0, stranding it wherever it happened to be.
- A county *appearing* snaps its values and fades in, rather than interpolating - there is no
  meaningful previous value to travel from. A county *disappearing* holds its last values while
  fading out.

## Known rough edges

- `chart.nodes()` and `window.scrollViz` exist only as browser-verification handles.
- Two copies of Bootstrap (`lib/css/` is the linked one; `css/` is unused).
- `update.sh` hardcodes a `.pem` path outside the repo, so it only works on the author's machine.
