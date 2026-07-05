# Handoff — respec to the Bower demo spec (Restless Egg application)

**Date:** 2026-07-05

## What

Full rework of the demo to the July-4 Bower product spec, preserving the architectural
logic (pure engine pipeline → zustand → r3f scene, every stub named in `config.ts`) while
replacing the product surface. Decisions confirmed with Clay: rebuild the typology to the
spec's gridshell canopy, collapse to the spec's single-page studio, adopt the spec's pricing
model — and **keep** sun-path, ecology and reserve-email (intentional, though off-spec).

- **Typology:** dome/rotunda → open gridshell canopy on 3–4 grounded feet. New
  `geometry.ts`: catenary-ish cap over an elliptical plan (fixed 1.25 aspect), true diagrid
  (two diagonal families + crown/eave rings), feet snapped to diagrid spokes so they land
  exactly on ground, aperture lifts the eave toward a compass bearing. Height hard-capped at
  2.5 m (was 3.6 — over the permitted-development cap the spec is built on).
- **The pitch — fabrication grammar (`engine/grammar.ts`, new):** every slider bound derives
  from a stated rule (`GRAMMAR` in config), bounds are recomputed per design, and the UI
  shows the governing rule as a caption the moment a slider rests on a bound. Two live
  beats: the rise cap switches between the 2.5 m planning rule and the crown-curvature rule
  as the footprint changes; a fourth foot is added at ~15.5 m² when an eave blank would
  exceed the 2.35 m cut limit (narrated in a "grammar:" note).
- **Four sliders, no more:** footprint 12–18 m², rise 1.9–2.5 m, strut spacing 250–500 mm,
  aperture bearing. Old surface (size presets, openness, plot mapper, 3-step flow) removed.
- **Pricing (spec formula):** components × rate + fabrication + install + groundwork(per
  foot) + planting + margin, margin shown plainly, total rounds **up** to £100 and reads
  "fixed". Designer-fee/VAT model folded into the margin constant.
- **Commission spec sheet (new):** fixed price hero, facts grid (components, distinct parts,
  sheets, assembly steps, lead time, feet, dims, planting), BOM, **nesting preview**
  (`engine/nesting.ts`, first-fit-decreasing shelf packing onto 2.4×1.2 m sheets, drawn as
  SVG), reserve email (local only).
- **URL persistence:** design encodes to query params (`?a=15&r=2.3&s=0.35&ap=90&sp=…&y=…`),
  debounced replaceState, "copy link" in the navbar. No other persistence.
- **Living layer kept:** species now carry `stemLoad01` — wisteria (added) up-gauges the
  armature ("heavier struts, not more of them"); sun-path still biases the sunward sectors;
  ecology strip under the stage; growth year 0/1/3 toggle on the stage.
- **Wordmark:** `WORDMARK` constant in config (`bower` until the Day-3 name call).

## Verify

- `npm run typecheck` + `npm run build` — green.
- Engine numerics: scratch harness swept footprint/rise/spacing/aperture/species — feet
  always grounded (minY 0.000), no component over the 2.35 m sheet rule, no cut item under
  135 mm, price £23.5k–£67.6k across the range, rise clamps 2.5→2.24 at 12 m², 3→4 feet at
  ~15.5 m² with narration.
- Drove the app headless (Edge CDP) through the film beats: constraint captions appear at
  bounds (both rules), wisteria re-weights + re-narrates, year-3 growth animates, commission
  sheet + nesting render, URL round-trips, zero console errors.

## Left

- Wire Clay's real fab quote into `PRICING.ratePerComponentGBP` (+ the other rates) in
  `src/data/config.ts` — the one load-bearing placeholder (Day 4–6).
- Swap `WORDMARK` when the name locks (Day 3).
- Polish pass (Day 10–11): lighting/environment still per Clay's Midjourney reference; camera
  start framing for the film.
- Optional: a "year 3" default-on beat for the silent cut; species selector could collapse to
  the featured trio (clematis / wisteria / jasmine) if the film wants fewer chips.

## Files

- New: `src/engine/grammar.ts`, `src/engine/nesting.ts`, `src/ui/ParamSlider.tsx`,
  `src/ui/PricePanel.tsx`, `src/ui/CommissionSheet.tsx`, `src/ui/NestingPreview.tsx`.
- Rewritten: `src/data/config.ts`, `src/engine/{types,geometry,pricing,index,species}.ts`,
  `src/state/store.ts`, `src/App.tsx`, `src/ui/Navbar.tsx`, `src/scene/GardenContext.tsx`,
  `src/scene/Folly.tsx`, `index.html`, `README.md`, `docs/SCREENS.md`.
- Touched: `engine/{components,strutOptimizer,growth,ecology}.ts`, `scene/Scene.tsx`,
  `scene/util.ts`, `scene/overlays/StrutHeatmap.tsx`, `ui/ReserveCTA.tsx`.
- Removed: `src/steps/*`, `src/ui/PlotMapper.tsx`, `src/ui/ProgressMarker.tsx`,
  `src/ui/CtaLink.tsx`.
