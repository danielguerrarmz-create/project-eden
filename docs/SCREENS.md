# SCREENS — flow + real-vs-stubbed

A three-step guided flow on a warm paper canvas: **Site → Design → Grow**. One decision
surface at a time, a slim progress marker in a floating pill navbar. Built to be filmed in a
single take.

## The three steps

```
STEP 1 · SITE                          STEP 2 · DESIGN                 STEP 3 · GROW
where's your garden?                   design your Eden                watch it grow
┌───────────────┐  ┌──────────────┐    ┌───────────────────────┐       ┌─────────────────┐
│ address (stub)│  │ PLOT MAPPER  │    │    [ 3D EDEN on plot ]│       │ [ eden + plot ] │
│ sample plots  │  │ drag edges → │    │                       │       │ year 0 / 1 / 3  │
│               │  │ width×depth  │    │ 1 size  2 openness    │       │ big price       │
│               │  │ coral dot →  │    │ 3 planting (species)  │       │ ecology · reserve│
│               │  │ orientation  │    │                       │       │ cut list        │
└───────────────┘  └──────────────┘    └───────────────────────┘       └─────────────────┘
```

## The filmed loop (≈60s)

1. **Site.** Pick a sample plot or type an address (stub). Drag the plot edges to size it,
   drag the coral dot to orient it. Width, depth, area, and orientation read out live.
2. **Design.** Choose a Size preset, an Openness, and a Planting species. The Eden renders
   fitted to the mapped plot. Changing species visibly re-weights the strut field: twiner gets
   close verticals, tendril gets a fine mesh, scrambler gets horizontal rails, self-clinger
   gets a near-solid skin. Everything stays buildable because the controls are clamped to a
   pre-engineered envelope.
3. **Grow.** Toggle year 0 → 1 → 3: foliage animates in, ecology metrics climb, the price
   resolves to one number (with a visible placeholder-rate note), and the cut list is there to
   answer "is this real?". Reserve with an email (console + local state).

## Real vs stubbed (the honest line)

| Element | Status | Where |
|---|---|---|
| Form parametrics (Eden generator) | **REAL** — parametric, envelope-clamped | `engine/geometry.ts` |
| Envelope clamping = structural validity | **REAL mechanism, STUBBED bounds** — bounds stand in for a stamped joint library; **no live FEA** | `data/config.ts` `ENVELOPE`, `geometry.clampParams` |
| Component decomposition + count | **REAL** — members → tidy cut-list | `engine/components.ts` |
| Price = count × rate + install + planting + channel fee + VAT | **REAL formula** | `engine/pricing.ts` |
| Per-component fab rate | **STUBBED — the #1 TODO** | `config.ts` `PRICING.ratePerComponentGBP` |
| Install / cutting / planting / channel-fee / VAT rates | **STUBBED (labelled)** | `config.ts` `PRICING` |
| Species traits (habit, growth, spacing, pollinator value) | **REAL species, rule-of-thumb numbers** | `engine/species.ts` |
| Strut density/orientation field | **REAL rule-based computation** (planting-informed parametrics, not black-box optimisation) | `engine/strutOptimizer.ts` |
| Sun-path (declination, altitude, azimuth) | **REAL astronomy**, deterministic | `engine/sunpath.ts` |
| Per-sector solar exposure roll-up | **REAL-ish rule-of-thumb** (irradiance proxy) | `engine/sunpath.ts` |
| Ecology (habitat, pollinator cells, rainwater, carbon) | **REAL formulas, STUBBED coefficients** | `engine/ecology.ts` + `config.ts` `ECOLOGY` |
| Growth year 0/1/3 coverage | **REAL saturating curve, VISUAL approximation** (not a biological warranty) | `engine/growth.ts` + `config.ts` `GROWTH` |
| Plot mapper (dimensions + orientation) | **REAL** — drives footprint cap + sun-path | `ui/PlotMapper.tsx` |
| Lead time | **STUBBED (labelled)** | `config.ts` `LEAD_TIME` |
| Foliage, heat-map nodes | **VISUAL approximations** of engine outputs | `scene/*` |
| Reserve email capture | **STUBBED** — console + local state, no backend | `ui/ReserveCTA.tsx`, `store.submitReserve` |

## Honesty constraints baked into the code

- **Living layer decoupled from the load path.** Plants attach to a conceptual *sacrificial
  armature* addressed by `Member.u/v` surface coords; the structural members never depend on
  species or growth. The structure stays dry. See comments in `geometry.ts`,
  `strutOptimizer.ts`, `GrowthOverlay.tsx`.
- **No fake FEA.** Validity by clamping to `ENVELOPE`, not a live solve. Stated in
  `geometry.ts`.
- **Non-occupied only:** a pavilion you stand under.
- **Every stub is a named constant** in `data/config.ts`, never a magic number in the engine.

## Explicitly out of scope for the MVP

Live FEA · real checkout/payment · accounts · multiple typologies · backend persistence
beyond the (stubbed) reserve-email capture · doubly-curved discrete-timber realism (the
lattice is a clean parametric approximation).
