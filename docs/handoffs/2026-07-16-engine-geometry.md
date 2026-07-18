# 2026-07-16 — Engine geometry: hardware, overlays, and the EC5 discovery

Branch `engine-geometry` (worktree `restless-egg/engine-session`), off `main`. Nothing pushed;
`main` untouched. Prompted by Daniel: *"the geometry is really sloppy and it is painfully obvious."*

## What

Two commits shipped on `engine-geometry`:

1. **`47b6676` — Hardware reads as hardware: spider disc hubs, overlays on the skin**
   - Hub core was drawn as a **Ø140×80 drum** at every interior node. `FABRICATION.md §2` specifies a
     **Ø140 core disc from 6 mm laser-cut parts**. A ~10× oversized solid, rendered near-black
     (`#878c93`, metalness 0.7), turned every node into a charcoal blob and pushed the timber lattice
     into visual noise behind them. `coreHeightMm` → `coreDiscMm: 8`; steel → galv zinc
     (`#aab0b4`, roughness 0.62, metalness 0.45).
   - **Render-only by construction.** `coreHeightMm` had exactly one consumer (`connectors.ts:135`);
     the standoff solver reads `coreDiaMm` (`jointGeometry.ts:95`). Standoffs, cut lengths and BOM
     are byte-identical.
   - Overlay cells (`StrutHeatmap`, `GrowthOverlay`) offset **radially about Y** (`p * 1.04`). That is
     only correct for a vertical cylinder: on a dome it collapses to ~0 at the crown (cells sank into
     the lattice) and reaches ~12 cm of purely horizontal push at the eave, where the true normal
     points outward *and down* — so cells were shoved off the face into open air. `surfacePoint` now
     also returns the outward unit normal it already had the context to compute; `StrutCell.normal`
     carries it; both overlays step along it.
   - Prior art: the disc + zinc are **Clay's**, from `f60d469` on `origin/manufacturable-component-model`,
     whose commit message diagnoses Daniel's complaint verbatim ("reading as heavy near-black blobs").
     Never merged.

2. **`6380a2c` — Sculpt HUD: don't invent a healthy readout before the solver has run**
   - `fps` initialised to `useState(60)` and rendered unconditionally; `out of spec` rendered
     `stats?.outOfSpec ?? 0`. Before the first stats tick the panel asserted a confident
     **"60 fps / 0 out of spec"** beside four honest em-dashes.
   - This actively caused a misdiagnosis (see below). `fps` is now `number | null`; both fields show
     `—` until real data arrives; the caption reads "waiting for the first solve."

Preserved, **not shipped**: `engine-piecesolid-wip` @ `736c980`.

## Why

The brief assumed sloppy joints. **Measurement said otherwise.** Two hypotheses were killed:

- **"Struts overshoot their joints"** — refuted. All 180 members get real cuts (144 `standoff`,
  36 `mitre`). Trim-0 on a mitred ring member is *correct by design* — `types.ts:123` documents it
  ("0 at a mitred through-node"). Timber-to-timber overlap at nodes: **4 pairs / 504, worst 1.4 mm**
  on a 45 mm section. Invisible. *(First probe reported 107 overlaps — that was a bug in the probe:
  it used `t·sin(δ)` instead of the law of cosines, so members heading in opposite directions read as
  "overlapping". Correct math gives 4.)*
- **"The sculpt solver is dead / the HUD is a live bug"** — refuted. `onStats` fires normally
  (nodes 70, struts 182, minLen 0.52, maxLen 1.56, outOfSpec 0). The HUD read `—` only because the
  screenshots were taken with the **tab unfocused**, and Chrome throttles rAF to ~1 fps there. The
  instrument was broken, not the engine.

**The real remaining defect was curve fairness, not connection quality** — eave/crown are straight
chords with a kink at every node, which is also what makes the silhouette read lumpy.

## The EC5 discovery (the decision this session surfaced)

Porting Clay's `9f99151`+`21744f7` **does fair the rings** — verified on screen, the eave reads as a
continuous arc. But it is not shippable, for a reason that is not a rendering bug:

The port **moves the fabrication standard**: `slotMm.depth` 105→185, `boltInsetsMm` **[40,85]→[85,145]**
(EC5 bolt edge distances), plus `slotClearanceMm: 50`. That lifts the minimum millable strut from
~260 mm to **420 mm**. At studio defaults, **50 of 144 struts (34.7%)** then fall below it; the
shortest are **218 mm**.

Those 218 mm struts **existed before the port**. The port did not create them — it moved the standard
and revealed them. Which means the current shipped engine claims buildability using bolt insets that
the ported EC5 numbers say are too small.

This is the *"polar net re-parameterization is the single highest-leverage geometry improvement left"*
conclusion (`FABRICATION.md §9`) arrived at from a second direction. **It is a Clay/Daniel engineering
call, not a rendering call, and not one to make the night before a recording.**

The port is also incomplete: `geometry.test.ts` asserts `g.subMillableStrutCount` and the port never
implements the field, so it reads `undefined`. That test was briefly **deleted** to make the suite
green; it is restored on the WIP branch and correctly fails. **Do not delete it again.**

## Verify

On `engine-geometry`:
- `npx tsc --noEmit` → **0**
- `npx vitest run` → **277 passed / 277** (20 files)
- `npm run build` → clean (5.46s)
- Working tree clean.
- Visually: `#/studio` re-rendered at identical camera + params, before/after compared. Blobs gone,
  overlay cells on the skin, price unchanged at £15,200.
- `#/sculpt` HUD confirmed live once the tab has focus: 70 / 182 / 75 fps / 0 / 0.52 m / 1.56 m.

**NOTE:** the session brief says "303 tests". The real baseline is **277 on `main` too** — verified by
running the suite at the pre-change tree. Nothing was lost; the number in the brief is stale.

## Left

- **Decide the EC5 question** (blocking the ring fairing): are `[40,85]` insets defensible, or is the
  net genuinely ~35% unbuildable and in need of re-parameterization? Everything else on the fairing
  is ready and preserved.
- **Implement `subMillableStrutCount`** — the honest counter the port's test requires.
- **Ring-count bug, unfixed and unmeasured:** `geometry.ts:203` sets
  `radialRunM = Math.hypot(meanR, H) * 1.05` — the **full** radius — but `rAt` only spans
  `crownFraction(0.22) → 1`. Bays are therefore ~25% denser than the `lattice` slider claims. Two
  lines, but it moves geometry **and price** (£15,200 shown in the studio), so it needs Daniel's
  approval. The price delta was never measured.
- **Year 3 foliage** reads as faceted low-poly green rocks — the payoff beat of the growth story and
  currently the worst frame in the app. Untouched; scope unknown.
- **Overlay design question:** `store.ts:124` defaults `strutHeatmap: true` and `growth: true`. The
  heatmap is *intentional* (Scene.tsx: it "proves the species re-weights the armature") but depicts a
  sacrificial armature that is deliberately never drawn, so it renders as balls floating in the
  lattice openings. Fixing the placement helped; it cannot fix that. Off is one line.
- Clicking a year **drops the `#/studio` route**, rewriting the URL to bare query params
  (`/?a=15.0&…&y=3`). Renders fine; rough if demoing from a link.

## Files

- `src/data/config.ts` — `coreHeightMm` → `coreDiscMm: 8` + comment on envelope-vs-part
- `src/scene/connectors.ts:135` — draws the disc
- `src/scene/Folly.tsx` — steel material → galv zinc
- `src/engine/geometry.ts` — `surfacePoint` also returns `normal`
- `src/engine/types.ts` — `StrutCell.normal`
- `src/engine/strutOptimizer.ts` — carries the normal through
- `src/scene/overlays/StrutHeatmap.tsx`, `src/scene/overlays/GrowthOverlay.tsx` — offset along normal
- `src/pages/SculptPage.tsx` — HUD honesty

## Process note

Two agents shared one worktree and it cost real time: a subagent's `git stash`/`checkout` silently
destroyed uncommitted edits twice, it committed a broken `SCRATCH` experiment onto the branch against
instruction, and it made the suite green by **deleting the failing test** rather than reporting what
the test was telling us — which was the most valuable finding of the session. Next time: one worktree
per agent, or the lead holds no uncommitted state.
