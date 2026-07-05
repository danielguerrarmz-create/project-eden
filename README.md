# Bower

A generative design demo for **living garden architecture**: an organic timber gridshell
pavilion whose design space is parametrized by a **fabrication grammar** — every reachable
form compiles to flat CNC components, a proven structural family, an assembly sequence, and a
fixed price. You shape the canopy like clay, a guaranteed price moves live beside it, and the
lattice is designed as an armature for the climbing plant that will clothe it by year three.

One typology only: an open garden pavilion (the "dining bower") — a curved gridshell canopy on
3–4 grounded feet, no glazing, no doors, no services. Client-side only, no backend; a design
persists as a URL.

> The wordmark is a single constant (`WORDMARK` in `src/data/config.ts`) — swap it when the
> name locks.

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

## The screen (single page, built to be filmed in one take)

1. **Shape it.** Four sliders, no more: footprint (12–18 m²), rise (1.9–2.5 m), lattice (strut
   spacing 250–500 mm), aperture (where the canopy lifts open). Every slider stops at a
   grammar-derived bound and a one-line reason appears — *"crown curvature would exceed the
   flat-piece cutting tolerance"*, *"2.5 m permitted-development cap"*. Bounds are dynamic:
   shrink the footprint and the rise cap moves down, because curvature governs before planning
   does. Push the footprint past ~15.5 m² and the engine adds a fourth foot so the eave blanks
   keep fitting the 2.4 m sheet — and says so.
2. **Price, fixed.** A live figure beside the viewport, rebuilt from the component model on
   every change, decomposed one disclosure away (components / fabrication / install & groundwork /
   planting / margin — the margin shown plainly).
3. **Planting.** Pick a climbing species and the strut armature visibly re-weights for how that
   plant climbs and how heavy it gets ("wisteria needs heavier struts"). Toggle year 0 / 1 / 3
   and the foliage grows in; ecology metrics climb.
4. **Commission.** Opens the spec sheet: component count, BOM, assembly steps, lead time, the
   fixed price, and the **nesting preview** — this design's actual blanks laid on 2.4 × 1.2 m
   CNC sheets. Reserve with an email (stored locally in this demo). "Copy link" in the navbar
   shares the design as URL parameters.

## Architecture

- `src/engine/` — pure, typed functions. **The core.** `runEngine(params)` runs the whole
  pipeline; the store calls it on every change. Testable in a plain node repl.
  - `grammar.ts` — **the pitch**: fabrication rules → live per-parameter bounds with reasons.
  - `geometry.ts` — the canopy generator: catenary-ish cap over an elliptical plan,
    discretised into a diagrid of straight cuttable members, swept to ground at the feet.
  - `components.ts` / `nesting.ts` — members → tidy cut list → blanks shelf-packed onto sheets.
  - `pricing.ts` — components × rate + fabrication + install + groundwork + planting + margin,
    rounded **up** to a fixed figure.
  - `strutOptimizer.ts` / `sunpath.ts` / `growth.ts` / `ecology.ts` — the living layer.
- `src/scene/` — react-three-fiber canvas: the dry timber canopy, garden ground, and the
  heatmap + growth overlays.
- `src/ui/` — sliders with constraint captions, price panel, commission sheet, nesting SVG.
- `src/state/store.ts` — zustand: runs the engine on every change, keeps the CLAMPED params
  the engine actually used, and encodes the design into the URL.
- `src/data/config.ts` — **every stubbed constant, in one place, each TODO-labelled.**

## What is real vs. stubbed

This is an honest demo, not a finished product. The line is drawn explicitly:

- **Real:** the parametric geometry, the grammar-derived dynamic bounds (and their captions),
  component decomposition and counts, the sheet nesting layout, the pricing *formula*, species
  traits keyed on climbing habit + stem load, the strut density/orientation computation,
  sun-path astronomy (declination / altitude / azimuth), the ecology *formulas*, and the
  year 0/1/3 growth curve.
- **Stubbed (all named constants in `src/data/config.ts`):** the per-component fabrication
  rate and the other cost rates (swap in Clay's fab quote in minutes), the grammar's numeric
  limits (they stand in for a stamped joint family), the ecology coefficients, lead time, and
  the reserve-email capture (local only).

See `docs/SCREENS.md` for the full real-vs-stubbed table.

## Engineering honesty, baked into the code

- **Not machine learning, and never claimed to be.** A parametric design space whose bounds
  ARE the fabrication grammar, plus a component-derived pricing function. The constraint
  architecture is the invention; the ML layer (learning cost/assembly models from delivered
  commissions) is roadmap, stated as such.
- **No fake structural analysis.** Validity is guaranteed by clamping every control to a
  grammar-derived envelope (`engine/grammar.ts`), not by a live solve. The honest claim is
  "certainty inside a designed family," not "any form is valid."
- **The structure stays dry.** The living layer attaches to a conceptual *sacrificial
  armature* keyed off `(u,v)` surface coords; it never enters the load path. Changing species
  changes the strut *pattern*, never the structural members.
- **The price moves correctly, it is not yet true.** `PRICING.ratePerComponentGBP` is a
  placeholder until a real fabrication quote is wired in. The on-screen number is labelled as
  such and the fixed total always rounds **up**.

## Robustness + accessibility

- An error boundary catches any render crash with a calm reload screen; browsers without
  WebGL get a quiet explanation card instead of a broken canvas.
- `prefers-reduced-motion` is respected end to end: the stage stops auto-rotating, the growth
  animation snaps to its stage, and CSS transitions are disabled.
- Constraint captions are `aria-live` so the grammar's reasons are announced, not just painted;
  all controls are native inputs/buttons with labels and pressed states.

## Stack

Vite · React · TypeScript · react-three-fiber / drei · zustand · Tailwind.
