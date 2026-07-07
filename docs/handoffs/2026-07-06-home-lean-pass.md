# Handoff: home page lean pass — cut fat, collapse scroll, smooth intro

Date: 2026-07-06 · Branch: `V3` (from `Front-End` @ 9d6d7e9) · Not pushed

## What

Full evaluation-loop overhaul of the home page: 17 screens → ~8.8, 1,868 → 858 words,
12 → 7 beats (hero, becoming, the engine, ritual, habitat, register, monument footer).

- **Hero:** original choreography kept per Daniel (logo only at p=0, full-page logo → gridshell
  → render scrub, copy + CTAs + live price strip arrive at the end). Scrub shortened 280vh → 210vh;
  thresholds retuned (OCULUS_OUT/CANVAS_IN [0.08,0.2], TILT [0.2,0.5], RESOLVE [0.5,0.76],
  COPY_IN [0.8,0.94], STATS_IN [0.82,0.94]); new stats strip = footprint · rise · "this shape,
  priced live: £…" (live engine output, no "from £" claim).
- **Intro:** 3.8s → 3.0s; letter blur/rotate removed (opacity+y only, stagger kept); settle lands
  before the backdrop fade; scrollRestoration='manual' + scrollTo(0,0) while playing (fixes the
  reload handoff seam).
- **Structure:** new merged "The Engine" section at position 3 (pipeline + single SiteEnvelope
  diagram + honesty coda + deep link). Full 6-section explainer restored at `#/engine`
  (EnginePage). Duplicates deleted: 2nd SiteEnvelope + 2nd StrutField diagram, compact ritual,
  repeated close CTA, BNG paragraph, becoming's 2nd paragraph.
- **Copy:** rewritten per docs/design-cutlist-2026-07-06.md §4 (de-AI'd: page-personification,
  "cannot fake", rhymes, "not AI" disclaimer gone; ≤2 not-X-but-Y constructions page-wide).
- **Fixes:** north pennant cone hidden in hero (GardenContext showNorthMarker prop);
  GrowthOverlay driven by scroll progress (no more frozen growth under frameloop=demand);
  RegisterInterest input id/name/autoComplete.

## Why

Three-persona pressure test (RE evaluator / architect+buyer / developer) + Sai's cut-list;
memos in the session scratchpad, spec at docs/design-cutlist-2026-07-06.md (incl. both Daniel
overrides). Daniel consciously overruled the "no value prop at p=0" finding: the reveal is the pitch.

## Verify

npm run test = 75/75 green · tsc + vite build clean · Gojo QA = GO (no blockers) · lead
eyes-verified p=0 / scrub end / engine section / #/engine / console clean on localhost:5333.

## Left

- Gojo SHOULD-FIX (low): BowerIntro scrollRestoration restore on early unmount; sweep for
  orphaned dead hero files (Edward's report claims none, unswept).
- Evaluator recs for Daniel+Clay (out of scope): real built/planted photography near the hero
  (Senku's #1 lever); name an engineering partner; Fuser animation to replace placeholder 3D.
- Push + Daniel's visual verification of branch V3.

## Files

src/pages/SplashPage.tsx · src/pages/splash/{HeroReveal,HeroScene,BowerIntro,RegisterInterest}.tsx ·
src/pages/engine/EnginePage.tsx (new) · src/Root.tsx · src/routing.ts · src/scene/GardenContext.tsx ·
src/scene/overlays/GrowthOverlay.tsx · tests (SplashPage, HeroReveal, EnginePage new) ·
docs/design-cutlist-2026-07-06.md (new)
