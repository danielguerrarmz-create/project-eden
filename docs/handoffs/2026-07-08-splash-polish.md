# Splash polish

Date: 2026-07-08
Branch: `frontend/splash-polish` -> merged into `integrate/manufacturing-engine` (LOCAL, not pushed)
Author: Edward (claudio) · against Sai's `docs/interaction/splash-polish-spec.md`

## What

A polish pass on the Bower/Eden splash: six spec items plus two follow-up fixes from
Daniel's live review. All landed on `frontend/splash-polish` and merged down to
`integrate/manufacturing-engine`.

1. **Tab title + favicon** — `<title>` is exactly `Bower`; `public/favicon.svg` is the
   real Oculus company mark (eight circles, exact locked centers, olive accent),
   replacing a placeholder sprout. og/twitter titles keep the descriptive tagline.
2. **Hero "Eden"** — broken out of the inline sentence onto its own line, drastically
   larger (`clamp(3.5rem,11vw,8rem)` in Track A; now an SVG in Track B, below).
3. **"A structure that keeps becoming" diagram** — the emotional-core strip earns its
   claim: the anonymous dot scatter became a 6-shape hand-inked leaf vocabulary
   (deterministic pick + rotation off the same scatter index), a sampled lattice
   understructure (ribs + two ring hoops) now sits under the foliage so panel 1 reads as
   "a bare lattice" not an empty outline, and one `accentOlive` bloom marks the crown in
   the full-leaf panel only. All inline SVG, zero new asset weight.
4. **Copy** — 5 verbatim rewrites (flagship line, the same-choices/same-pavilion closer,
   the ritual payoff, the register CTA, ritual step 3). Numbered ritual-step fragments
   left intentionally alone (that register is correct).
5. **Glass pill nav** — the three links became one frosted glass capsule (`.nav-pill`):
   guaranteed frosted base (`backdrop-filter` blur+saturate+brightness), with the SVG
   `feDisplacementMap` lens warp (`#lensWarp`) layered only via `@supports` so Safari and
   any browser that drops an SVG filter ref get plain frosted glass, never a broken nav.
   Per-link hover backlight; reduced-motion collapses the backlight transition to instant.
6. **Adaptive cursor** — a fixed white circle, `mix-blend-mode: difference` (inverts any
   ground), on framer-motion springs. Grows over interactive targets. Splash-only.

Follow-up fixes (Daniel's live review):

- **Hero copy grows in, not fades** — the plain opacity/translateY fade was replaced with
  a composed framer-motion growth reveal: each line rises from its baseline under an
  upward clip + a slight scale-from-0.96 on a soft settling spring, lines staggered into
  one orchestrated moment. "Eden" is excluded (its stroke-draw is its growth).
- **Cursor crisp over the glass nav** — the blend-difference ring rasterised coarse when
  composited through the nav's `backdrop-filter`/`feDisplacementMap`. Over
  `[data-cursor-solid]` (the capsule) it now drops the blend and becomes a crisp solid
  accent-olive ring, never touching the filter's low-res raster.

## Why

The splash is the evaluator-facing surface before the Jul 17 deadline. The brief was
craft: make the one product word a real moment, make the emotional-core diagram earn its
copy, give the nav a legible surface over busy field grounds, and add one tasteful cursor
signature — all without overclaiming a feature that isn't built (Sai's spec is careful
about this; the diagram stays inline-SVG linework, not a photoreal render of an
unbuilt Eden).

## Verify

- `npm run typecheck` — clean.
- `npm run test` — 16 files, 126/126 pass (updated the copy/SplashPage assertions that
  pinned the old strings).
- `npm run build` — green.
- Dev server: `http://localhost:5333/`.
- STATIC-VERIFIED ONLY: the growth-reveal feel, the glass lens warp, the cursor
  crispness over the nav, and the interim Eden path are all visual and need a real
  browser eyeball. The cursor pixelation fix is correct by construction (it removes the
  blend-through-filter compositing path entirely over the nav), but confirm sharpness
  live.

## Left / follow-ups

- **Eden Track B is an INTERIM asset.** `EDEN_PATH` in `HeroReveal.tsx` is a hand-authored
  cursive tracing in one swappable constant. The full stroke-draw mechanism (dashoffset
  draw-on `pathLength=1`, fill settling in under the stroke) is done and asset-agnostic,
  but the path itself wants replacing with Daniel's own hand-lettered "Eden" or a clean
  Dancing-Script glyph extraction for true signature fidelity (no local ttf was available
  to extract from). The commit (`5dc2005`) is isolated so it reverts cleanly to the Track
  A treatment if the interim path doesn't hold up on a live look.
- Sai's open questions for Daniel (spec §"Open questions"): Eden stacked-vs-inline shape;
  whether the nav capsule should carry a current-route highlight.
- Not pushed. `integrate/manufacturing-engine` is Clay's shared branch — the origin push
  is the lead's call to make with Daniel.

## Files

- `index.html` — `<title>`.
- `public/favicon.svg` — Oculus mark.
- `src/pages/splash/HeroReveal.tsx` — Eden Track B (EdenWord + EDEN_PATH) + growth reveal.
- `src/pages/splash/SeasonalBecomingDiagram.tsx` — leaf vocabulary + lattice + bloom.
- `src/pages/SplashPage.tsx` (+ `SplashPage.test.ts`) — copy rewrites, cursor mount.
- `src/pages/splash/copy.ts` (+ `copy.test.ts`) — ritual step 3 rewrite.
- `src/pages/splash/SplashHeader.tsx` — glass pill nav + lens filter + `data-cursor-solid`.
- `src/pages/splash/AdaptiveCursor.tsx` — framer-motion cursor + glass-crisp fix.
- `src/index.css` — `.nav-pill` glass + `.adaptive-cursor-active` cursor hide.

Commits (on `frontend/splash-polish`, oldest first): `9e847aa`, `dc656d4`, `93afc5f`,
`7ff8875`, `5dc2005`, `2001390`, `3b8e567`.
