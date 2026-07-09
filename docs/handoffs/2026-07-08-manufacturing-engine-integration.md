# Manufacturing-engine integration onto form-finding-core

Date: 2026-07-08 (integration) / 2026-07-09 (green-close-out)
Branch: `integrate/manufacturing-engine` (cut from `form-finding-core`, LOCAL ONLY — not pushed)
Author: Edward (claudio)

## STATUS: GREEN (2026-07-09)

`npm run typecheck` clean, `npm run test` 126/126 passing. Both collisions in the
original report were resolved per Daniel's decisions (commit `bb5f89f`, on top of the
integration commit `ac65646`):

1. Min-spacing fork -> option (a): retuned form-finding to Clay's 0.45 m joint floor
   (the solver bends to the manufacturable reality; Clay's GRAMMAR constant was NOT
   reverted). See "Resolution" below.
2. Fixed the 3 landing typecheck errors (hero reuses engine geometry).

This branch is now the intended Clay hand-off: his engine + an up-to-date, green
front-end. HOLD PUSH until Daniel confirms.

## Resolution (2026-07-09)

### form-finding retune (`src/engine/formFinding.ts`)
- `DEFAULT_SHELL` re-tuned to a coarser, larger seed so every seed strut clears the
  new 0.45 m floor: rings 6->4, spokes 18->14, a/b/rise 2.2/1.76/2.3 -> 3.1/2.5/3.0,
  oculus 0.43->0.48. Shortest seed strut ~0.52 m, longest ~1.56 m (was min ~0.26 m).
  `outOfSpec` back to 0; relaxation/grab tests pass by construction.
- `buildBand` no longer inverts: when a rest is so short the x1.6 ceiling would fall
  below the 0.45 floor, the band collapses to a single rigid length at `FAB_MIN_M`
  rather than returning `lmax < lmin`.
- `formFinding.test.ts` node-count expectation updated to `(4+1)*14`. All other
  formFinding assertions derive from `FAB_MIN_M`/`FAB_MAX_M` and needed no change.

### Studio density presets (`src/pages/SculptPage.tsx`) — a real design consequence
The studio overrides `spokes/rings/oculus` per density preset, so the presets feed
`buildGridshell` directly. At the 0.45 m floor the OLD presets went badly out of spec
(default 56, fine 146, perf 1586 struts under the floor). Re-tuned the three buildable
presets to a coarser buildable band (coarse/default/fine now top out ~90 nodes, not
~170); `perf` still deliberately crosses the ceiling to visualise the break.

IMPORTANT for Daniel/Sai: this is the physically-correct consequence of Clay's floor —
**a fine mesh is not manufacturable when joints cannot sit closer than 0.45 m.** The
studio's buildable density range is therefore genuinely coarser than the pre-fabrication
spike, and the pavilion seed is larger (~6.2 m major axis vs 4.4 m). If a denser studio
look is wanted, it needs a bigger pavilion or a different joint family — not a solver
tweak. Flagging as a product call, not a bug.

### Landing (`src/pages/splash/*`)
- `HeroScene.tsx` GAUGE Record extended: `lamella: 1.3`, `crown: 1.7` (tracks real
  section depths — strut 70 mm, lamella 120 mm, blank 180 mm).
- `copy.test.ts` + `HeroReveal.test.ts` DesignParams literals carry the new required
  `jointSystem`, read from `ENVELOPE.jointSystem` (matches their existing pattern of
  sourcing defaults from ENVELOPE).

## What

Brought Clay's geometry/fabrication engine rewrite (`origin/manufacturable-component-model`)
onto `form-finding-core` as an ENGINE-ONLY integration. Clay's branch was cut from the old
V3 monolith where `src/App.tsx` held both the marketing landing AND the studio, so it also
carried an `App.tsx` + landing delta. Per Daniel's decision that delta was DROPPED entirely —
`form-finding-core` already separates landing (`src/pages/splash/*` behind `src/Root.tsx`)
from the engine, and that separation is preserved.

## Why

Clay's rewrite turns the pavilion into a real manufacturable component model: an explicit
joint graph (nodes + connectors), planar milled end-cuts, a hub/lamella joint-system choice,
priced hardware, and steel connector geometry in the 3D view. We want that engine, but on the
branch that already keeps the landing clean — not by merging Clay's V3-era App.tsx back in.

## How it was isolated (branch ancestry)

- Common ancestor of V3, form-finding-core, and Clay's branch: `ba68832`.
- Clay branched from `ba68832`, NOT from V3 tip (V3 is not an ancestor of his branch).
- Change-set analysis from the ancestor showed only TWO files were touched by BOTH
  form-finding-core and Clay: `src/data/config.ts` and `src/scene/Scene.tsx`.
  Everything else Clay changed was untouched by form-finding-core, so it drops in without a
  3-way conflict.

## Files brought over (from Clay's branch)

Pure engine core (form-finding-core had NOT modified these vs the ancestor):
- `src/engine/types.ts` — new `JointSystem`, `CanopyNode`, `EndCut`, `Piece`, `HardwareItem`;
  `Member` gained `nodeStartId/nodeEndId/pieceId/normal/endCuts/startTrimM/endTrimM`; the
  `Member.type` union expanded `lattice|eave|foot` -> `lattice|lamella|eave|crown|foot`.
  `start/end` and `u/v` were KEPT (overlays + hero still resolve).
- `src/engine/geometry.ts` (+ `.test.ts`) — ~410-line rewrite (node graph + joint cuts).
- `src/engine/grammar.ts` (+ `.test.ts`), `components.ts`, `index.ts`,
  `nesting.ts` (+ `.test.ts`), `pricing.ts` (+ `.test.ts`).

Net-new files:
- `src/engine/jointGeometry.ts`, `src/engine/joints.ts`, `src/engine/vec.ts`
- `src/scene/connectors.ts` (steel connector meshes; consumed by Folly via `buildSteel`)
- `docs/FABRICATION.md`

Downstream consumers Clay updated to match the new engine (form-finding-core had NOT touched
these vs the ancestor, so no conflict — they are the matching renderers/readers):
- `src/scene/Folly.tsx` (studio 3D; renders members + steel; mounted via ffc's `Scene.tsx`)
- `src/ui/NestingPreview.tsx`, `src/ui/CommissionSheet.tsx` (engine-output readers)
- `src/state/store.ts` (+8 lines: initial params now carry `jointSystem`, `?j=` URL param)
- `src/ui/text.test.ts`

Merged by hand:
- `src/data/config.ts` — took Clay's engine config (GRAMMAR/STOCK/JOINTS/FOUNDATION/ENVELOPE/
  PRICING) as the base and grafted form-finding-core's appended NAMING/marketing block
  (`WORDMARK='Bower'`, `PRODUCT`, `ENGINE_NAME`, `CTA_PRIMARY_*`). form-finding-core's config
  change was purely appended copy constants; it did NOT touch engine config bodies, so this
  was a clean graft, not a semantic conflict.

Fixed (engine test, in-bounds):
- `src/engine/directManip.test.ts` — added `jointSystem: 'hub'` to the `base` DesignParams
  literal (new required field).

## Deliberately NOT touched (protected per the task)

- `src/App.tsx`, `src/Root.tsx`, everything under `src/pages/splash/*` — the landing.
- `src/scene/Scene.tsx` — dual-touched. form-finding-core added a `manipulate` cage
  (CageHandles); Clay added an orthogonal `?inspect` free-camera dev mode. Both edit the same
  overlay/autoRotate lines. Kept form-finding-core's version verbatim; Clay's `?inspect`
  affordance was DROPPED (non-engine dev nicety, easy to re-add later). Scene.tsx is therefore
  NOT in the change set.
- `src/scene/util.ts` — Clay had removed `segmentMatrix` from it; the landing's `HeroScene`
  still imports `segmentMatrix`, so form-finding-core's `util.ts` was kept (has segmentMatrix +
  heatColor + leafColor). Clay's Folly does not use util, so nothing was lost.

## Verify

- `npm run typecheck` — FAILS, 3 residual errors, ALL under the protected landing
  (`src/pages/splash/*`). See "Left / must reconcile" — these are the real engine<->landing
  coupling, not integration mistakes.
- `npm run test` — 120 passed / 6 failed. All 6 failures are in ONE file,
  `src/engine/formFinding.test.ts` (form-finding-core's own form-finding engine). Every other
  suite passes, including Clay's rewritten `geometry.test.ts` (17), `nesting`, `pricing`,
  `grammar`, `store`, and all landing/page suites. Clay's engine is internally self-consistent;
  the failures are purely at the formFinding <-> new-GRAMMAR seam (below).

## Left / must reconcile before this goes near V3

### 1. GRAMMAR floor collision with form-finding (the substantive one — 6 test failures)
`src/engine/formFinding.ts` derives its fabrication band from GRAMMAR:
`FAB_MIN_M = GRAMMAR.minStrutSpacingM`, `FAB_MAX_M = GRAMMAR.maxComponentLengthM`.
Clay's new GRAMMAR raised the minimum structural bay: `minStrutSpacingM` **0.25 -> 0.45 m**
(`maxStrutSpacingM` 0.5 -> 1.05, new `maxLamellaSpacingM: 0.6`), because real hub/lamella
connectors need clearance idealized strut-nodes did not. form-finding-core's `formFinding.ts`
seed diagrid + `buildBand` relaxation were tuned to the 0.25 floor, so:
- the seed struts are now born below 0.45 -> `shellStats().outOfSpec` counts ~100 struts;
- `buildBand(0.2)` inverts (floor 0.45 > short-rest cap ~0.32).

This is a genuine engineering-grammar conflict, NOT a bug to patch silently. Reconciliation is
a design call for Daniel/Clay, e.g. one of:
  (a) form-finding retunes its seed spacing + `buildBand` to the real 0.45 joint-clearance
      floor (form-finding owns this decision), or
  (b) form-finding reads a form-finding-specific min-spacing constant distinct from the
      fabricated-joint floor, if the two are intentionally different numbers.
I did NOT edit `formFinding.ts` or revert Clay's GRAMMAR value — either choice makes a real
structural decision.

### 2. Landing hero couples to the engine Member shape (3 typecheck errors, all in splash)
Because I was told not to touch `src/pages/splash/*`, these are left for the landing owner:
- `src/pages/splash/HeroScene.tsx:45` — `GAUGE: Record<Member['type'], number>` = `{lattice,
  eave, foot}` is now missing the two new union members `lamella` and `crown`. The hero
  re-implements a mini-Folly (`HeroFolly`) that renders engine members, so the expanded
  Member union leaks straight into the landing. Fix: add `lamella` + `crown` gauge values.
- `src/pages/splash/copy.test.ts:9` and `HeroReveal.test.ts:9` — DesignParams literals missing
  the new required `jointSystem` field. Fix: add `jointSystem: 'hub'` to each literal.

Takeaway for Daniel: "landing separate from engine" holds for copy/routing, but the landing
HERO still reuses engine geometry, so an engine type change is not fully insulated from it.

## Files (git status vs form-finding-core)

Added: docs/FABRICATION.md, src/engine/jointGeometry.ts, src/engine/joints.ts,
src/engine/vec.ts, src/scene/connectors.ts
Modified: src/data/config.ts, src/engine/{components,geometry,geometry.test,grammar,
grammar.test,index,nesting,nesting.test,pricing,pricing.test,types,directManip.test}.ts,
src/scene/Folly.tsx, src/state/store.ts, src/ui/{CommissionSheet,NestingPreview,text.test}.tsx/ts

(Untracked `docs/interaction/sculpt-canvas-spec.md` pre-existed on the branch; not mine.)
