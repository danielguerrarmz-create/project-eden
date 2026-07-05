# SCREENS — the single-page studio + real-vs-stubbed

One screen on a warm paper canvas, built to be filmed in a single 60–90 s take
(demo-spec §4). A floating pill navbar (wordmark · copy link · start over) over a stage +
control rail.

```
┌──────────────────────────────────────────────┬──────────────────────────┐
│  [engine: strategy chip]   [year chip]       │  YOUR PRICE, FIXED       │
│                                              │  £38,200                 │
│        [ 3D CANOPY on garden ground ]        │  how this price is built │
│                                              │  [ Commission · 465 ]    │
│                                              ├──────────────────────────┤
│                                              │  shape it                │
│   [dims chip]      [Year 0 | 1 | 3]          │  footprint ──────●       │
├──────────────────────────────────────────────┤  rise ────────●          │
│  habitat · pollinator cells · rainwater ·    │   ● constraint caption   │
│  flowering                                   │  lattice ──●             │
│                                              │  aperture ─●             │
│                                              │  grammar: 3 feet, …      │
│                                              ├──────────────────────────┤
│                                              │  planting (7 species)    │
└──────────────────────────────────────────────┴──────────────────────────┘
Commission → full-screen spec sheet: fixed price · facts grid · nesting SVG · BOM · reserve
```

## The filmed loop (≈60–90 s, demo-spec §4)

1. **(0–10 s)** The pavilion sitting quietly on its ground plane. Price visible: fixed figure.
2. **(10–35 s)** Sliders move — the diagrid morphs, the price ticks with it. Push rise: it
   **stops at 2.5 m** — "permitted-development cap". Shrink footprint to 12 m²: rise is pulled
   down to 2.24 m — "crown curvature would exceed the flat-piece cutting tolerance". Push
   footprint past ~15.5 m²: **a fourth foot appears** and the grammar note explains the eave
   blank would have exceeded the 2.35 m cut limit. Hold on that beat; it's the thesis.
3. **(35–50 s)** Species selected → the armature heatmap re-weights (wisteria: heavier,
   up-gauged) → Year 3 toggle → green grows through the lattice, ecology metrics climb.
4. **(50–75 s)** Commission → spec sheet → nesting preview. End on the fixed price.

## Real vs stubbed (the honest line)

| Element | Status | Where |
|---|---|---|
| Canopy parametrics (gridshell generator, feet, aperture) | **REAL** — parametric, grammar-clamped | `engine/geometry.ts` |
| Grammar bounds + constraint captions | **REAL mechanism, STUBBED limits** — rules stand in for a stamped joint family; **no live FEA** | `engine/grammar.ts`, `config.ts` `GRAMMAR` |
| Dynamic rise cap (curvature vs planning) | **REAL** — recomputed per design | `grammar.riseCapM` |
| Foot count from eave-blank sheet fit | **REAL** — grammar reshaping form | `grammar.feetCountFor` |
| Component decomposition + count | **REAL** — members → tidy cut-list | `engine/components.ts` |
| Nesting preview (blanks on 2.4×1.2 m sheets) | **REAL layout, conservative shelf packing** (sheet count errs high) | `engine/nesting.ts` |
| Price = components + fabrication + install/groundwork + planting + margin, fixed | **REAL formula**, total rounds **up** | `engine/pricing.ts` |
| Per-component fab rate | **STUBBED — the #1 TODO (Clay's quote, Day 4–6)** | `config.ts` `PRICING.ratePerComponentGBP` |
| Install / groundwork / planting / margin rates | **STUBBED (labelled)** | `config.ts` `PRICING` |
| Species traits (habit, stem load, growth, spacing) | **REAL species, rule-of-thumb numbers** | `engine/species.ts` |
| Strut density/orientation field | **REAL rule-based computation** (planting-informed parametrics, not black-box optimisation) | `engine/strutOptimizer.ts` |
| Sun-path (declination, altitude, azimuth) | **REAL astronomy**, deterministic | `engine/sunpath.ts` |
| Ecology (habitat, pollinator cells, rainwater, carbon) | **REAL formulas, STUBBED coefficients** | `engine/ecology.ts` + `config.ts` `ECOLOGY` |
| Growth year 0/1/3 coverage | **REAL saturating curve, VISUAL approximation** | `engine/growth.ts` |
| URL-encoded design (copy link) | **REAL** — the only persistence | `state/store.ts` |
| Assembly steps / lead time | **DERIVED from component model / STUBBED rates** | `engine/index.ts`, `config.ts` `LEAD_TIME` |
| Foliage, heat-map nodes | **VISUAL approximations** of engine outputs | `scene/*` |
| Reserve email capture | **STUBBED** — console + local state, no backend | `ui/ReserveCTA.tsx` |

## Honesty constraints baked into the code

- **Not ML, not claimed as ML.** Parametric space bounded by an authored fabrication grammar +
  component-derived pricing. The learning loop is roadmap and is described that way.
- **Living layer decoupled from the load path.** Plants attach to a conceptual *sacrificial
  armature* addressed by `(u,v)` surface coords; structural members never depend on species.
- **No fake FEA.** Validity by clamping to grammar-derived bounds, stated in `grammar.ts`.
- **Non-occupied, open typology only:** a pavilion you stand under — no glazing, no services,
  height capped at 2.5 m permitted development.
- **Every stub is a named constant** in `data/config.ts`, never a magic number in the engine.

## Explicitly out of scope (demo-spec §2.6)

Accounts · payments · backend · mobile layout · multiple typologies · glazed/enclosed
variants · real ML · structural FEA · terrain/site import · AR.
