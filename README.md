# Living Eden

A generative design demo for **living garden architecture**: organic timber pavilions whose
lattice is a designed armature for climbing plants. You shape a pollinator pavilion, the
engine recomputes strut density and orientation for your chosen plant species and the site's
sun-path, routes roof water to the beds, prices the build live, and previews it grown in at
year three.

The idea it makes tangible: a living structure that isn't finished on installation day, it's
finished in year three, when the garden has grown into it.

Non-occupied typology only (a pollinator pavilion / bower). Client-side only, no backend.

## Run it

```bash
npm install
npm run dev
```

Vite prints a local URL (default `http://localhost:5173/`, or the next free port). Open it.

```bash
npm run build      # tsc --noEmit + vite production build
npm run typecheck  # types only
```

## The flow (three steps, built to be filmed in one take)

1. **Site.** Map the patch of ground your Eden will live on: drag the plot edges to set width
   and depth in metres, drag the coral dot to orient it to the sun.
2. **Design.** Three choices only: Size (Intimate / Standard / Grand), Openness, and Planting.
   Pick a climbing species and the strut field visibly re-weights for how that plant climbs
   (twiner gets close verticals, tendril gets a fine mesh, scrambler gets horizontal rails,
   self-clinger gets a near-solid skin). The Eden renders fitted to your mapped plot.
3. **Grow.** Toggle year 0 / 1 / 3 and the foliage animates in, ecology metrics climb, and the
   price and cut list resolve. Reserve with an email (stored locally in this demo).

## Architecture

- `src/engine/` — pure, typed functions. **The core.** `runEngine(params)` runs the whole
  pipeline; the store calls it on every change. Testable in a plain node repl.
- `src/scene/` — react-three-fiber canvas: the dry timber Eden, the mapped garden plot, and
  the growth overlay.
- `src/steps/` — the three-step guided flow (`StepSite`, `StepDesign`, `StepPreview`).
- `src/ui/` — the plot mapper, navbar, progress marker, controls, readout, reserve CTA.
- `src/state/store.ts` — zustand: the surface controls plus plot are folded back into the
  engine's full parameters by `deriveParams()`, then `runEngine` recomputes live.
- `src/data/config.ts` — **every stubbed constant, in one place, each TODO-labelled.**

## What is real vs. stubbed

This is an honest demo, not a finished product. The line is drawn explicitly:

- **Real:** the parametric geometry, component decomposition and count, the pricing *formula*,
  species traits keyed on climbing habit, the strut density/orientation computation, sun-path
  astronomy (declination / altitude / azimuth), the ecology *formulas*, and the year 0/1/3
  growth curve.
- **Stubbed (all named constants in `src/data/config.ts`):** the per-component fabrication
  rate and the other cost rates, the ecology coefficients, lead time, envelope bounds, and the
  reserve-email capture (local only).

See `docs/SCREENS.md` for the full real-vs-stubbed table.

## Engineering honesty, baked into the code

- **The structure stays dry.** The living layer attaches to a conceptual *sacrificial
  armature* keyed off `(u,v)` surface coords; it never enters the load path. Changing species
  changes the strut *pattern*, never the structural members. (A real living structure should
  keep plants and channelled water off the load-bearing timber to avoid rot.)
- **No fake structural analysis.** Validity is guaranteed by clamping every control to a
  pre-engineered envelope (`ENVELOPE` in `config.ts`, enforced in `geometry.clampParams`), not
  by a live solve. The honest claim is "certainty inside a designed family," not "any form is
  valid."
- **The price moves correctly, it is not yet true.** `PRICING.ratePerComponentGBP` is a
  placeholder until a real fabrication quote is wired in. The on-screen number is labelled as
  such and should not be presented as a quote.

## Robustness + accessibility

- An error boundary catches any render crash with a calm reload screen; browsers without
  WebGL get a quiet explanation card instead of a broken canvas.
- `prefers-reduced-motion` is respected end to end: the stage stops auto-rotating, the growth
  animation snaps to its stage instead of easing, and CSS transitions are disabled.
- The plot mapper is fully keyboard-operable: every drag handle is a focusable slider
  (arrow keys nudge width/depth by 0.5 m and north by 5°), with proper ARIA values throughout.

## Stack

Vite · React · TypeScript · react-three-fiber / drei · zustand · Tailwind.
