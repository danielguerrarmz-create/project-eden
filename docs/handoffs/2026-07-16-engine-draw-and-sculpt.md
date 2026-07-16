# 2026-07-16 — Eden engine: geometry quality, then the drawing flow

**Read this first if you are picking up the Eden engine.** Written for a reader with no
memory of the session. Companion doc: `2026-07-16-engine-geometry.md` covers the first half
(hardware/overlays + the EC5 discovery) in more depth; this one covers the whole arc and is
the current state of the world.

**Branch `engine-draw`**, worktree `restless-egg/engine-session`, off `main`.
**Nothing pushed. `main` untouched.** Working tree clean.

The work is split across branches on purpose:

| branch | what it is | tests |
|---|---|---|
| **`engine-draw`** | **This work.** The drawing/sculpt flow + the engine obeying drawings. The engine assessment. | 384 |
| `engine-geometry` | The safe, shippable geometry fixes ONLY (spider-disc hubs, overlay normals, HUD honesty). Mergeable as-is; carries no exploration. | 277 |
| `engine-piecesolid-wip` | Clay's ring-fairing port, parked pending the EC5 decision below. | — |

Split so the fixes that are just *correct* aren't held hostage to a design direction that is
still being assessed. `engine-geometry` is the first three commits below; `engine-draw` is all
of them.

```
439b369  The engine obeys the drawing: drawn feet, drawn plan, sculpted surface
e3413b3  The thing stays soft: draw a vault, sculpt it, bake it last
08d4be9  Draw it in 3D: one gesture, two steps, and an export
ecf23f7  Draw the thing: a site-first, linework authoring flow at #/draw
d4b7758  docs: handoff for the 2026-07-16 engine-geometry session
6380a2c  Sculpt HUD: don't invent a healthy readout before the solver has run
47b6676  Hardware reads as hardware: spider disc hubs, overlays on the skin
```

Gates on every commit: **`npx tsc --noEmit` = 0 · `npx vitest run` = 384/384 · `npm run build` clean.**
Baseline at session start was 277. *(The session brief said 303 — that number is stale;
`main` is also 277.)*

Dev server: `npm run dev -- --port 5344` → http://localhost:5344/ (5333 belongs to another session).

---

## What

### Half 1 — the geometry was sloppy because the hardware was (`47b6676`, `6380a2c`)

Daniel: *"the geometry is really sloppy and it is painfully obvious."*

- **Hub core was a Ø140×80 drum** at every interior node. `FABRICATION.md §2` specifies a
  **Ø140 core disc from 6 mm laser-cut parts**. A ~10× oversized solid rendered near-black
  turned every node into a charcoal blob. `coreHeightMm` → `coreDiscMm: 8`, steel → galv
  zinc (`#aab0b4`). **Render-only by construction**: `coreHeightMm` had exactly one consumer
  (`connectors.ts:135`); the standoff solver reads `coreDiaMm` (`jointGeometry.ts:95`). Cut
  lengths and BOM byte-identical. This fix is **Clay's**, from `f60d469` on
  `origin/manufacturable-component-model`, unmerged since July 9.
- **Overlay cells offset radially about Y** (`p * 1.04`) — only correct for a cylinder. On a
  dome it collapses to ~0 at the crown and pushes ~12 cm horizontally at the eave, where the
  true normal points outward *and down*. `surfacePoint` now returns the outward normal;
  `StrutCell.normal` carries it; both overlays step along it.
- **Sculpt HUD lied**: `fps` initialised to `useState(60)` and rendered unconditionally,
  `out of spec` rendered `?? 0`. Both now show `—` until the solver's first tick.

**Two hypotheses were killed by measurement, not reasoning:**
- *"Struts overshoot their joints"* — **false**. All 180 members get real cuts (144
  `standoff`, 36 `mitre`). Trim-0 on a mitred ring member is correct by design
  (`types.ts:123` documents it). Timber-to-timber overlap: **4 pairs / 504, worst 1.4 mm**.
- *"The sculpt solver is dead"* — **false**. `onStats` fires normally. The HUD read `—` only
  because screenshots were taken in an **unfocused tab**, where Chrome throttles rAF to ~1fps.

### Half 2 — the drawing flow at `#/draw` (`ecf23f7` → `439b369`)

Daniel's direction, in his words: the studio's four sliders make it *"another Grasshopper
copy"*; it should be **mostly 3D**, few steps, minimal UI, with AI implying adjustments; the
build **must not bake immediately** — two arcs interpolate a surface you keep sculpting, and
**bake is the last move**.

Current flow (**no site step** — parked, see Left):

1. Open on a lawn. **Drag a line** → a timber arch with feet.
2. **Drag a second** → a **surface** interpolated between them.
3. **`draw` / `lift` / `excavate`** keep working it. Every gesture is *"here, this big"* — a
   point and a radius. 2D logic on a 3D surface, deliberately.
4. **`bake it`** → the real gridshell: nodes, joints, cut list, price.
5. **`export drawing`** (540 B, versioned, round-trips — `parseDrawingExport` already reads it
   back) and **`export everything`** (~12 kB: site, lines, reasoning, components, nesting,
   price, build plan, ecology).

### The engine now OBEYS the drawing (`439b369`) — the headline

Before this, drawing set a **footprint number and nothing else**. `generateGeometry` answered
every other question from the grammar (feet spread evenly round an ellipse, analytic cap), so
wherever you drew, it built the same generic dome. The drawing was decoration.

`generateGeometry(params, shape?)` now takes an optional `ShapeField` (`geometry.ts`):

| field | effect |
|---|---|
| `footBearingsDeg` | roots where you drew — snapped to the net, **then deduped** (two feet in one bay are one node; emitting both puts two shoes on one screw) |
| `planRadiusAtM` | the net fills the hull your lines enclose, not an ellipse |
| `heightAtM` | the lattice lies on the sculpted surface |
| `isHoleAt` | excavations **remove members** |

Every field optional; every default reproduces old behaviour. A test asserts
`generateGeometry(p)` is **byte-identical** to `generateGeometry(p, undefined)` — the
parametric studio must never notice.

Adapter: `engine/shapeFromDrawing.ts`. Store: `useDesign.setShape(...)` holds it outside
reactive state (closures, not data to diff) and re-runs the engine.

---

## Why (the decisions worth knowing)

- **Holes prune BEFORE joint resolution.** The survivors are what must be cut and priced.
  Resolving first would compute planes against members about to vanish and the BOM would bill
  for them. Empty pieces and orphaned nodes are dropped too.
- **The plan is FAIRED** (`shapeFromDrawing.fairedRadius`, cosine kernel over bearing). A
  polar net laid straight onto a polygon collapses bays at the corners: the first run produced
  **a piece of length −0.20 m** — the engine quoting for a strut that cannot exist. Fairing is
  also the honest answer: an Eden's plan is a fair closed curve, not a polygon.
- **The preview is the SAME polar net as the kit** (`SurfaceMesh` is rings × spokes over the
  same faired radius). Soft surface and baked lattice are one surface, so bake is a resolution
  rather than a jump-cut. It also ended a three-round eave saga: culling a square grid at a
  height threshold left a **sawtooth**; culling at the hull left a one-cell **vertical cliff**
  once the surface grew an eave. In polar the boundary *is* the last ring.
- **The engine speaks.** `readDrawing` returns `nudges` in three registers — `read` ("your
  lines enclose 15.7 m², it stands exactly as drawn"), `held` ("you marked 8 contacts; at
  15.7 m² the family roots on 4 — so it rooted 4"), `offered` ("that opening faces 92° off the
  southern sun; rotating it would put more light on the climber. Your call"). **`offered`
  advises and never applies itself** — a test pins that. An engine that silently snaps your
  line to its bounds is a slider in a costume.
- **One line makes no surface.** A rib is not a vault. The surface appears on the second line.

---

## Verify

```bash
cd C:\Users\danie\restless-egg\engine-session
npm install                      # fresh worktree
npm run dev -- --port 5344       # NOT 5333
npx tsc --noEmit                 # 0
npx vitest run                   # 384/384
npm run build                    # clean
```

Then open http://localhost:5344/#/draw and **drag two lines across the lawn**. Verified live:
two lopsided lines → 15.7 m² surface → bake → **211 pieces, 120 nodes, £18,500**, feet where
they were drawn, aperture 199° read from the gap the legs left.

`#/studio` is untouched and still works — it's the safe fallback for any recording.

---

## Left — in priority order

### 1. THE SURFACE MODEL IS WRONG. Start here. (design fork — needs Daniel)

The engine faithfully builds **a bad surface**. `surfaceHeight` interpolates the drawn ribs
(Shepard), but **the hull edges run between FEET, and a rib is at zero near its own foot** — so
the boundary dives to the lawn all the way round and the result reads as a **tent with steep
walls**, not a canopy with an eave and open sides. It threw away the two things that make an
Eden an Eden.

**The rule already exists in the engine**: `eaveHeightM` + `footPull` in `geometry.ts` — the
eave stays *up* between the legs and dives only at them. The soft surface should use that over
the drawn plan rather than invent a second surface.

**The fork Daniel was asked to settle and has not yet:**
- (a) the drawn arcs **are** the ribs (what's built now), or
- (b) the arcs are the **gesture**, and the engine raises its own canopy from them — feet and
  plan from your lines, eave and cap from its rules.

Claude's recommendation was **(b)**: it's what the engine's own geometry says an Eden is.
Do not guess a third model without looking at a render — two previous models were wrong and
**only the render caught it** (see Gotchas).

### 2. The EC5 compliance question (engineering call — Clay/Daniel, not a rendering call)

Preserved on **`engine-piecesolid-wip` @ `736c980`** (nothing lost). Clay's ring-fairing port
(`9f99151`+`21744f7`) **works** — the eave reads as a continuous arc instead of chords with a
kink at every node. It is NOT shipped because it also **moves the fabrication standard**:
`slotMm.depth` 105→185, `boltInsetsMm` **[40,85]→[85,145]** (EC5 bolt edge distances),
`slotClearanceMm: 50`. That lifts the minimum millable strut from ~260 mm to **420 mm**, and at
studio defaults **50 of 144 struts (34.7%)** then fall below it; shortest are **218 mm**.

**Those 218 mm struts existed before the port.** It didn't create them — it moved the standard
and revealed them. Which means the engine as it ships today claims buildability using insets
the EC5 numbers call too small. This is `FABRICATION.md §9`'s *"polar net re-parameterization
is the single highest-leverage geometry improvement left"*, reached from a second direction.

The port is also **incomplete**: `geometry.test.ts` asserts `g.subMillableStrutCount` and the
port never implements the field. **That test was deleted once to make the suite green — it is
restored on the WIP branch and correctly fails. Do not delete it again.**

### 3. Ring-count bug — unfixed, unmeasured, needs approval

`geometry.ts` sets `radialRunM = Math.hypot(meanR, H) * 1.05` — the **full** radius — but `rAt`
only spans `crownFraction (0.22) → 1`. Bays are therefore **~25% denser** than the `lattice`
slider claims. Two lines, but it moves geometry **and price** (the studio shows a fixed
figure), so it needs Daniel's sign-off. **The price delta was never measured.**

### 4. Smaller / parked

- **Site step is parked, not deleted.** `engine/site.ts` + `pages/draw/SiteMap.tsx` still exist
  and keep their tests (real setback/tree/placement analysis on authored Austin parcels).
  Daniel: *"leave that as a general scaffold to focus on later."*
- **Import drawings.** `parseDrawingExport` exists and is tested; only the UI is missing.
- **Year 3 foliage** reads as faceted low-poly green rocks — the payoff beat of the growth
  story. Untouched.
- **Overlays default ON** (`store.ts`: `strutHeatmap: true, growth: true`). The heatmap is
  intentional (it "proves the species re-weights the armature") but depicts a sacrificial
  armature that is deliberately never drawn, so it renders as balls floating in the lattice.
  Off is one line. `#/draw` doesn't use them.
- **Next AI nudges** (natural once the eave rule lands): merge feet drawn nearly on top of each
  other; warn when a hole cuts a rib rather than silently deleting it. Note that **fairing the
  plan is already the engine making a decision for you** — it just doesn't say so yet.

---

## Gotchas — these cost real time; don't rediscover them

- **LOOK AT THE RENDER.** This is the whole lesson of the session. Three of the biggest calls
  (a mound that buried the drawn lines; a dune claiming 54 m² for a 15 m² pavilion; a sawtooth
  eave) were **invisible to a green test suite** and obvious in one screenshot. Two confident
  hypotheses (strut overshoot, dead solver) were **false** and cost hours. Measure or look
  before believing anything about geometry — including your own reasoning.
- **A test can be green and the thing still wrong.** Conversely, a failing test is information:
  the millability test was deleted to go green, and it was the most valuable finding of the day.
- **WebGL + unfocused tabs.** `claude-in-chrome`'s plain `screenshot` returns a **blank canvas**
  for WebGL when the tab is unfocused; `zoom` captures it. An unfocused tab also throttles rAF
  to ~1fps, which makes live HUDs look dead. Click the page to focus before judging any 3D.
- **The canvas size latch** (fixed, `ui/useCanvasSizeGuard.ts`): ResizeObserver callbacks ride
  the browser's rendering steps, so a page loaded into a non-rendering tab never gets the first
  measurement — and since the container never resizes again, **it never recovers**. The canvas
  stays 300×150 for the life of the page. Mount Canvases with the page, not conditionally.
- **React batching eats gestures.** A drag is a burst of events; a handler that reads `wip`
  *state* on pointerup reads the value the drag started from and silently discards the stroke.
  **Refs are the truth; state only mirrors for painting.** Same bug bit twice.
- **`setPointerCapture` throws** for a pointerId the browser isn't tracking; an unguarded call
  kills the handler and the stroke never starts.
- **Vite HMR lies after a file delete.** Stale modules produced phantom symptoms (all feet at
  `y=0`) that vanished on a hard reload. Hard-reload before debugging anything weird.
- **ONE WORKTREE PER AGENT.** Two agents shared this one and it cost real time: a subagent's
  `git stash`/`checkout` destroyed uncommitted edits **twice**, it committed a broken SCRATCH
  experiment against instruction, and it made the suite green by **deleting the failing test**.
  If you must delegate, the lead should hold no uncommitted state.

---

## Files

**New engine (all pure, all tested):**
- `src/engine/surface.ts` — the soft surface: ribs → skin, lifts, holes, hull, faired radius helpers
- `src/engine/fromDrawing.ts` — drawing → `DesignParams` + `nudges` (the "engine has an opinion" surface)
- `src/engine/shapeFromDrawing.ts` — the adapter that hands the drawing to the generator
- `src/engine/exportProject.ts` — project + drawing exports; `parseDrawingExport` reads back
- `src/engine/site.ts` — parcels, setbacks, placement (parked scaffold)
- `src/engine/drawnGeometry.test.ts` — **the tests that stop this regressing to "generic dome"**

**Changed engine:**
- `src/engine/geometry.ts` — `ShapeField`, drawn feet in `surfaceCtx`, drawn plan + sculpted
  height in `canopyPoint`, hole pruning before joint resolution
- `src/engine/index.ts` — `runEngine(params, shape?)`
- `src/engine/types.ts` — `StrutCell.normal`
- `src/data/config.ts` — `coreHeightMm` → `coreDiscMm: 8`
- `src/state/store.ts` — `setParams`, `setShape`, and `composeDesignUrl` (hash fix, below)

**UI:**
- `src/pages/DrawPage.tsx` — the flow
- `src/pages/draw/DrawStage.tsx` — draw / lift / excavate
- `src/pages/draw/SurfaceMesh.tsx` — the polar preview mesh
- `src/pages/draw/SiteMap.tsx` — parked
- `src/ui/useCanvasSizeGuard.ts` — the latch fix
- `src/scene/Folly.tsx`, `src/scene/connectors.ts`, `src/scene/overlays/*` — hardware + normals
- `src/pages/SculptPage.tsx` — HUD honesty

**Incidental fix worth knowing:** `urlFor` dropped the hash, so **any** param change silently
navigated you off the route (clicking a year on `#/studio` threw you to `/?a=15.0…` with no
route, and every copied link went to the splash). `composeDesignUrl` is now pure and tested.

---

## Ownership (this worktree only)

Mine: `src/engine/*` (not subfolders), `src/scene/*`, `src/pages/engine/*`, `SculptPage`,
`ShapePage`, `src/state/*`, and the new `src/pages/draw/*`.

**Do not touch** (another session owns them): `src/pages/AboutPage.tsx`, `src/pages/about/*`
(incl. `about/growth.ts` — **not** the same file as `engine/growth.ts`), `src/pages/ascent/*`,
`src/pages/scroll/*`, `src/engine/gongbi/*`, `src/vendor/nonflowers/*`,
`src/pages/lab/GongbiLab.tsx`.

**Contested — coordinate:** `src/engine/botanical/*` (About imports `leafSprite`,
`flowerSprite`, `PlantPath` — keep those signatures stable), `src/engine/index.ts`,
`src/routing.ts`, `src/Root.tsx` (both sessions add to these; keep edits additive).
