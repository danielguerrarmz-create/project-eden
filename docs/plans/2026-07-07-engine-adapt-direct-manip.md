# Plan: adapt the engine page to the splash flow + direct-manipulation shaping

Date: 2026-07-07 · Branch: `worktree-agent-a7fa1b51a1ddf61fd` (off V3 @ 84b252f) ·
Author: Edward (claudio)

Two goals. Goal 1 (adapt `#/engine` to the splash branding) is a ship. Goal 2 (direct
manipulation of the lattice, replacing sliders) is a feasibility spike + working
prototype behind a route, for Sai's interaction spec to refine.

## Context recap (what already exists)

- The engine is a pipeline of PURE functions (`src/engine/`): `DesignParams` -> `deriveBounds`
  (grammar) -> `generateGeometry` -> components/nesting/pricing/sunpath/strut/ecology/growth.
  `runEngine(params)` returns the whole `EngineOutputs` bundle. The store (`state/store.ts`)
  calls `runEngine` on every change and **keeps the clamped params the engine actually used**
  (`outputs.geometry.params`), so the UI always reflects what the grammar allowed.
- The fabrication grammar (`engine/grammar.ts`) clamps the four shaping params to a buildable
  family: `footprintM2` 12-18, `riseM` 1.9-2.5 (dynamically capped by crown curvature),
  `strutSpacingM` 0.25-0.5, `apertureDeg` wraps 0-359. `clampParams()` is the single choke point.
- The splash home (`SplashPage`) established the documentation-layer language: one fixed
  floating `SplashHeader` (the single `[data-wordmark]`), `typeScale.ts` (H1 Bodoni / H2 Source
  Serif / BODY), `EngineSection` field grounds (blue/chartreuse/yellow/vellum), navy hairline
  diagrams, background `#FBF9F3` (paperVellum).
- `#/engine` (`EnginePage`) renders the full six-section `HowItWorks` walkthrough but wraps it
  in a BESPOKE thin header (`BowerMark` + "· the generative engine" + nav "home / the studio")
  that predates the splash system and clashes with it.
- `#/studio` (`App`) is the current shaping UI: four `ParamSlider`s driving the store. Sliders
  are exactly what the pitch wants to escape.

## Goal 1 — adapt `#/engine` to the splash

Minimal, because `HowItWorks` already uses `EngineSection` + `typeScale` (splash-consistent).
The only clash is the page chrome.

- Replace the bespoke header in `EnginePage` with the shared `SplashHeader`. That gives exactly
  ONE `[data-wordmark]` per page and one nav concern across the whole site. No `BowerIntro` runs
  here (it lives only in `SplashPage`), so the static wordmark is harmless.
- Keep the `bg-paperVellum` page wrapper (already `#FBF9F3`). The first `HowItWorks` section is
  field-blue with `py-20 md:py-32` top padding, which clears the fixed floating nav.
- Add a discoverable mono link to the Goal 2 prototype (`#/shape`) so it is reviewable without
  touching the home nav.
- Update `EnginePage.test.ts` chrome assertions (the old "the studio" / "· the generative engine"
  header strings are gone; assert the shared header: wordmark, "how it works", "about", `#/`,
  `#/studio`).

## Goal 2 — direct manipulation (the novel core)

### Feasibility verdict: YES for footprint / rise / aperture; strut-spacing stays a control.

The engine's four params split cleanly into spatial vs non-spatial:

| Param          | Spatial? | Direct-manip mapping                                            |
|----------------|----------|----------------------------------------------------------------|
| `footprintM2`  | yes      | radial drag of an eave handle on the major (X) axis            |
| `riseM`        | yes      | vertical drag of a crown-apex handle                          |
| `apertureDeg`  | yes      | azimuthal drag of a handle around the eave perimeter          |
| `strutSpacingM`| **no**   | lattice *density*, not a shape dimension — no natural cage grab |

Three of the four map to a control cage. `strutSpacingM` is the honest exception: it is mesh
density, not a dimension you can grab, so it stays a small non-cage control (documented as the
path to a "grain" gesture). This is a faithful feasibility finding, not a cop-out.

### The buildability-preserving loop (the key architecture decision)

Direct manipulation routes THROUGH the grammar, never around it:

```
drag handle -> proposeFromDrag(kind, worldPoint) -> Partial<DesignParams>
            -> store.setParam(key, value) -> runEngine() -> clampParams() (grammar)
            -> outputs.geometry.params (CLAMPED) -> handleAnchors(params) re-positions the handle
```

Handles are **controlled**: their positions are derived from the clamped geometry every frame.
When a drag proposes a value outside the grammar family, the engine clamps it and the handle
visibly STICKS at the fabrication limit (and the grammar note explains why). The gesture cannot
produce an unbuildable shape because it is literally the same `setParam` path the sliders use —
the form's inability to leave the grammar is preserved and made physical. This is on-thesis:
the fabrication limit becomes something you can feel with the cursor.

### Pure mapping module (tested): `src/engine/directManip.ts`

- `majorSemiAxisM(footprintM2)` / `footprintFromMajorAxisM(aM)` — inverse of `planDims` on the
  major (X) axis: `footprint = π·a²/aspect`.
- `apertureFromPlanXZ(x, z)` — bearing in the engine convention (0=N/+Z, 90=E/+X).
- `handleAnchors(params)` — world positions for each handle from the current clamped design
  (reuses `surfacePoint` so the anchors ride the real engine surface).
- `proposeFromDrag(kind, worldPoint)` — maps a dragged world point to a param patch.

Tested for round-trips (`footprintFromMajorAxisM(majorSemiAxisM(f)) ≈ f`), bearing quadrants,
and that out-of-family drags get clamped by `clampParams` to the grammar cap (buildability).

### R3F prototype: `src/scene/CageHandles.tsx` + `Scene` `manipulate` prop + `ShapePage`

- `CageHandles` renders four draggable spheres + faint hairline guide lines. Each `DragHandle`
  raycasts the pointer onto a constraint plane (horizontal for footprint/aperture, camera-facing
  vertical for rise), maps the hit to a param via `proposeFromDrag`, and calls `setParam`.
  OrbitControls is paused while dragging (`controls.enabled = false`).
- `Scene` gains a `manipulate?: boolean` prop: renders `CageHandles`, hides the overlays for a
  clean cage view, and stops auto-rotate.
- `ShapePage` (`#/shape`) mounts `<Scene manipulate />` full-bleed under the shared `SplashHeader`,
  with a live mono readout (params, feet, grammar notes, price) so a reviewer sees the engine
  responding and clamping in real time. Routed in `routing.ts` + `Root.tsx`.

### What is stubbed / path to the full version

- Only three of four params are cage-driven; `strutSpacingM` stays a minimal control. Full
  version: a "grain" pinch or a density handle on a lattice cell.
- Handles are discrete grabs, not a continuous deformable NURBS cage. Full free-form editing
  (drag any surface point, least-squares fit back to the nearest buildable `DesignParams`) is the
  next step: replace `proposeFromDrag`'s per-handle mapping with a solver that fits an arbitrary
  cage deformation to the closest in-grammar params. The controlled-handle loop here is the
  foundation that already proves the fit-then-clamp architecture.
- Interaction polish (hit areas, hover states, snapping feedback, mobile) defers to Sai's spec.

## Quality gates

`npm run test` (add `directManip.test.ts`; keep 75 green + new), `npx tsc --noEmit`, `npm run build`.
```
