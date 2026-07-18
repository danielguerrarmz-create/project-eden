# 2026-07-17 — Round 4 shipped: demo-ready engine, merged to main, studio replaced

Resumes and closes `2026-07-17-round-4-pause.md`. Round 4 is done, verified live,
merged into `main`, and pushed to `origin/main`. The `/studio` route now IS the
engine. This is the sign-off record.

## What shipped

1. **Visible steel hub joints (the reference look).** The build renders the real
   FABRICATION.md kit again — core drums, fins per strut, bolt pairs, dome nuts —
   with the role colours INVERTED to match Daniel's reference: near-black hub
   bodies (`STEEL_STRUCTURAL #1c1a16`, kept darker than the wash's `INK #3e3a2d`
   and `WASH_SHADOW_WARM #3a3226` so it holds its ink outline) and bright silver
   bolt caps (`STEEL_FASTENER #aab0b4`). Hub boss bulked up (`coreDiscMm 8 -> 30`,
   render-only) and dome-nut caps enlarged (`0.022/0.012 -> 0.028/0.018`). Flipped
   on via `<Folly hardwareVisible>` in `DrawPage`; the round-3 concealed timber
   collar is switched off (it was the pale "blob" joints Daniel disliked).

2. **The draw phase renders in the same watercolour wash as the bake.** The
   pencil-sketch pre-bake mode (illegible grey cross-hatch plaid — "you cannot
   tell what the screen is") is retired: `DrawPage` drops `modeRef` on `InkPass`,
   so `uMode` stays at wash (1) throughout. Before-bake now looks like after-bake
   and stays legible. The **InkPass composer fix is real and kept**: composer is
   built once per `[gl, scene]` and the RenderPass camera is retargeted per frame,
   so the wash survives the bake (the handoff's "wash dies at bake -> raw render"
   was a MISDIAGNOSIS — it was the collar joints showing through a thin wash, not a
   composer teardown). Debug instrumentation (`__inkFrames` + `[InkPass]` logs)
   removed.

3. **The crown closes by default; holes come only from excavate.** A crown-apex
   node + a fan of cap ribs (ordinary diagrid members, so they flow through joint
   resolution / pricing / render unchanged) close the oculus into a solid boss.
   Added in `geometry.ts` BEFORE the excavation prune, so an excavation over the
   crown still reopens it by midpoint — excavate is the sole hole source now.

4. **Plants grow along the real lattice.** `PlantGrowth` was placing one primitive
   per (u,v) shell-grid cell pointing out of the skin ("floating things"). Rewritten
   to tile vine stations ALONG each member centreline in a climb frame (+Y up the
   strut, +Z outward), filling eave-to-crown by year and by species habit. New pure,
   tested `plantPlacement.placeVines` + `growthTiming.climbThreshold`.

5. **Year stages are 0 / 1 / 2** (was 0/1/3 — an inconsistent gap).

6. **The commission figure is computed, not flat.** Was pinned to a round
   £150,000 by a £5,000 rounding + floor clamp. New formula folds in a node factor
   and snaps to £10, so it lands on believable non-round numbers that move with the
   draw (observed live: £208,050, £211,570).

7. **`/studio` IS the engine.** `Root.tsx` routes `#/studio` to `DrawPage`. The
   STUDIO nav link and the "shape your Eden" CTA (both -> `#/studio`) now open the
   draw-and-bake engine instead of the old four-slider configurator. `/draw` stays
   as an alias. The old studio (`App`) is retired from routing (component kept,
   unrouted).

## Why

Daniel's demo-readiness pass, then "our studio page is what the engine should be."
The joints were the stated top priority; everything else followed from making the
draw tool the product the site actually presents.

## Verify (all green at sign-off)

- `tsc --noEmit`: **0 errors**.
- `vitest run`: **818 passed / 818** (43 engine-line files + the About-line suite,
  after merge). The plant rewrite added ~+7; two stale splash-copy assertions were
  realigned (the ~count moved out of ritual step 3 into the compact recap upstream).
- `vite build`: clean; `three` chunk **1,067 kB** under the hard **1,100 kB** ceiling.
- Live demo arc walked in Chrome (`/studio` and `/draw`): draw two crossing lines ->
  soft vault -> BAKE -> closed dome with dark hub joints -> select species -> YR
  0/1/2 (wisteria climbs the lattice) -> EXPLODE (hub clusters fly with their bolts,
  same travel) -> reassemble. `/studio` confirmed rendering the engine.
- **QA gotcha (unchanged, still true):** the Chrome window MUST be foregrounded or
  rAF stalls and every animation freezes (stills still capture). `GradientSky.tsx`
  forces a full reload on edit. Dev server: `npx vite --port 5199 --strictPort`.

## Git state

- `main` @ **5ac6f57**, pushed to `origin/main`. History:
  `5ac6f57` studio->engine · `294d580` splash-copy test fix · `5f7541c` merge
  origin/main · `ce8665b` merge engine-draw into main · `980b867` Round 4 body.
- The merge folded the engine/draw line onto the About/home line. Two conflicts
  resolved: `.gitignore` unioned; the home page kept main's product-reduced
  `SplashPage` (engine-draw's older paragraph tweak was superseded upstream).
- `engine-draw` @ `980b867` locally; `origin/engine-draw` is a touch behind (main
  carries everything, so this is cosmetic — sync if you want the branch tidy).
- Safety branch **`backup-all-six-parts` still exists** — delete once you're happy
  round 4 is truly settled.
- The `engine-session` worktree is checked out on **`main`** (switched for the
  merge); the `app` worktree is untouched on `about-round-10`.

## Left / open (nothing blocking)

- **Deploy:** the push updates `origin/main`; the live site reflects it on the next
  deploy/build from `main` (auto if CI is wired, otherwise a manual deploy). Not
  verified from here.
- **Sky palette** calibration is still open (the Enscape blue is a first guess seen
  through a healthy wash now, but never dialled in with Daniel's eyes on candidates).
- **Explode runs ~33–36 fps** at ~1568×726 (below 60; the added steel instances
  contribute). Fine for the demo; worth a look before filming at larger sizes.
- **`GrowthOverlay.tsx`** (the `#/studio`-era studio + splash `HeroScene`) still uses
  the OLD shell-cell plant algorithm — only `DrawPage`'s `PlantGrowth` was rewritten.
  If the hero/overlay foliage needs to match, it's the same swap (needs `members`
  from the store).
- **Wisteria raceme** hangs along `-axis` — correct on vertical struts, sideways on
  the few horizontal ring members that carry a flower. Reads fine; flag if it bothers.
- `App.tsx` (old slider studio) is now dead code kept in the tree — delete when sure.

## Files touched (this session)

- Engine/geometry: `src/engine/geometry.ts` (crown cap), `src/engine/growth.ts`,
  `src/data/config.ts` (years, `coreDiscMm`, dynamic-cost inputs).
- Joints/render: `src/scene/Folly.tsx` (`hardwareVisible`, steel tones),
  `src/scene/connectors.ts` (dome-nut size), `src/scene/npr/inkShader.ts`,
  `src/scene/npr/InkPass.tsx` (composer fix, strip), `src/scene/npr/GradientSky.tsx`,
  deleted `src/scene/SkyGradient.tsx`.
- Draw page: `src/pages/DrawPage.tsx` (wash mode, `BakeFog`, `hardwareVisible`,
  cost call-site), `src/pages/SplashPage.tsx`.
- Plants: `src/pages/draw/PlantGrowth.tsx`, `src/pages/draw/plantPlacement.ts`,
  `src/pages/draw/growthTiming.ts` + their tests.
- Pricing/copy: `src/ui/priceCopy.ts`, `src/pages/splash/copy.test.ts`.
- Year diagrams: `src/pages/engine/GrowthPhasesDiagram.tsx`,
  `src/pages/splash/SeasonalBecomingDiagram.tsx`, `src/App.tsx`, `src/pages/draw/SpeciesRail.tsx`.
- Routing: `src/Root.tsx` (`/studio` -> engine).

## How it was built

Orchestrated across the fleet (advisory/patch, one writer to the worktree): Sai
(joint visual spec), Edward x3 (crown cap, plant algorithm, year+cost), Gojo (QA +
gate baseline). Patches were applied and QA'd live by the team lead.

— Signed off, 2026-07-17.
