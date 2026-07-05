# Handoff: integrate Clay's Bower respec, our engine page grafted on top

Date: 2026-07-05
Author: Edward
Repo: danielguerrarmz-create/living-eden (app at ~/restless-egg/app)

## What

Daniel ruled to adopt Clay's PR #1 (branch bower-respec) as the trunk, weight his
work heavier on any clash, and push the result to main. Done. PR #1 is now MERGED,
main is pushed to origin at commit 3edb12d, and the pre-existing 12-commit Eden main
is preserved (nothing lost).

History is linear and Clay's authorship is intact:

    37b2e86  (old origin main, "Living Folly" ship-polish)
      dbce55f  Clay: the Bower respec (PR #1)  <- author cseifert512, unchanged
        3edb12d  Edward: graft the engine page + test harness on top

## Why

Clay's respec is the stronger demo core for the Restless Egg application (deadline
Jul 17). His fabrication grammar answers the stress-test demand that the engine be a
real computational problem, not a render toy. His branch was built from the old
origin main (37b2e86) and had never seen our unpushed Eden work, so both sides had
rewritten the same core engine files in divergent directions. Rather than a brutal
3-way merge, we took his branch as the base and re-applied only our genuinely
orthogonal pieces, re-pointed at his engine. On every clash, his design wins.

## What was kept from Clay (his surface, unchanged)

His fabrication grammar (engine/grammar.ts), gridshell geometry, nesting preview,
pricing model, single-page studio, commission spec sheet, and Bower copy are all
untouched. The old 3-step flow, plot mapper, and size presets stay removed.

## What we grafted on top (re-pointed at his engine)

- The #/engine generative-engine explainer + the tiny hash router (src/routing.ts,
  src/Root.tsx, src/pages/EnginePage.tsx, src/pages/engine/*). It reads his live
  EngineOutputs. Every diagram renders his real engine output:
  - SunPathDiagram and StrutFieldDiagram map onto his SunPath / StrutField / species
    unchanged.
  - SiteEnvelopeDiagram and GrowthPhasesDiagram were rewritten. The old dome
    silhouette used a removed ribProfile plus the removed plot mapper. They now draw
    his actual gridshell via a new pure helper, canopyProfile() in engine/geometry.ts,
    which samples his real surface function edge-to-crown along the aperture axis
    (so the lifted aperture side reads higher than its opposite, truthfully).
  - Copy corrected from "the plot, three sliders / enclosure" to his four-parameter
    model (footprint, rise, lattice spacing, aperture) and the fabrication grammar.
    The product name is read from the WORDMARK constant, not hard-coded, so the page
    reflects whatever the Day-3 naming call locks (see Naming below).
- The vitest harness, re-pointed at his engine (46 tests, all green):
  grammar (rise-cap switch at small footprint, 4th-foot threshold ~15.5 m2, clamps),
  geometry invariants swept across the range (feet grounded at y>=0, no component
  over the 2.35 m sheet), pricing (rounds up, decomposition sums, placeholder note),
  nesting (all parts placed, none over-sheet, utilisation in (0,1]), growth
  (saturating, never a warranty), sunpath (deterministic, 8 sectors), store (grammar
  clamps), and deDash coverage now includes his grammar captions + price notes.
- Dev port pinned to 5333 with strictPort.
- Eden field tokens + editorial fonts added additively to tailwind.config.js /
  main.tsx (Source Serif 4, Bodoni Moda, IBM Plex Mono). The studio is untouched;
  these serve the documentation layer only. One shared refinement: IBM Plex Mono now
  leads the mono stack for drafting-style labels in both layers (one line to revert
  if Clay dislikes it).

## What of ours was dropped as superseded (preserved by the tag)

- The Folly -> Eden rename commit and all Eden visual-language work on the studio
  surface.
- The 3-step configurator overhaul (StepSite / StepDesign / StepPreview, PlotMapper,
  ProgressMarker, the Eden-language configurator UI). His single-page studio replaces
  it by design.

All of it is reachable at tag pre-bower-integration-2026-07-05 (pushed to origin).
To inspect or cherry-pick later: `git checkout pre-bower-integration-2026-07-05`.

## Naming (NOT settled here, deliberately)

Three names are in flight: Folly (old), Eden (our unpushed rename), Bower (Clay's
spec working name). Clay parked it behind one constant, WORDMARK = 'bower' in
src/data/config.ts, to swap on the Day-3 call. The GitHub repo is `living-eden`; the
package.json name is still `living-folly-commissioner`. This is a joint Clay + Daniel
call. The engine page and studio both read WORDMARK, so locking the name is a
one-line change plus a package rename. Left open on purpose.

## Verify

- npm run build: green (tsc --noEmit + vite build, fonts bundled, engine page in the
  bundle).
- npm run test (vitest run): 46 passed, 8 files.
- Dev server boots on http://localhost:5333/ (strictPort held; it refused to drift
  when a stale server occupied the port, which is the pin working as intended),
  serves 200, main.tsx transforms with no vite errors, lockfile updated.
- Static verification only for the #/engine visual layer: tsc + tests + build + dev
  boot all pass, but this was not confirmed in a real browser DOM here (no headless
  browser available in this run). Recommend a quick eyes-on of http://localhost:5333/#/engine
  before the film: check the plan/section diagram, sun ring, strut small-multiples,
  and year-0/1/3 growth all render and animate.

## Left

- Wire Clay's real fab quote into PRICING.ratePerComponentGBP (+ the other rate
  constants) in src/data/config.ts. Still the one load-bearing placeholder (rate is
  honestly labelled as such; value unchanged at 42).
- Lock the name (WORDMARK + package.json + repo) on the Day-3 call.
- Optional: add the #/engine route to the app README / docs/SCREENS.md (left as
  Clay's, unchanged, to minimise churn).
- Eyes-on browser pass of #/engine per Verify.

## Files

- New (grafted): src/routing.ts, src/Root.tsx, src/pages/EnginePage.tsx,
  src/pages/engine/{EngineSection,PipelineSchematic,SiteEnvelopeDiagram,
  SunPathDiagram,StrutFieldDiagram,GrowthPhasesDiagram,hairline}.tsx, vitest.config.ts,
  src/engine/{grammar,geometry,pricing,nesting,growth,sunpath}.test.ts,
  src/state/store.test.ts, src/ui/text.test.ts.
- Modified: src/engine/geometry.ts (added pure canopyProfile helper), src/main.tsx
  (render Root + font imports), tailwind.config.js (additive Eden tokens + fonts),
  vite.config.ts (port 5333 strictPort), package.json + package-lock.json (fonts +
  vitest + test script).
- Untouched (Clay's): the entire studio surface, engine grammar/geometry/nesting/
  pricing/species logic, config, index.html.
