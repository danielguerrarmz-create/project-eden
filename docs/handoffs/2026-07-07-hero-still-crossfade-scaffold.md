# Handoff: hero beauty-still cross-fade scaffold (Option 1)

Date: 2026-07-07 · Branch: `V3` · Not committed

Scaffolds "Option 1": the live three.js hero owns the MOTION (free, procedural); a single
Fuser-rendered still owns the final photoreal FRAME and cross-fades in at the end. No
per-frame generation — one image, reproducible.

## What

**Phase A — endpoint capture (dev tool).** Open the home with `?capture=1`
(`http://localhost:5333/?capture=1#/`): the hero freezes at progress = 1 (structure
resolved, still suppressed) and `HeroScene` exposes `window.__captureHero()`, which renders
the WebGL canvas and downloads `hero-endpoint.png` — the exact dome geometry from the exact
hero camera + framing. That PNG is the structure-lock conditioning image for Fuser. Canvas
`preserveDrawingBuffer` is enabled only in capture mode. (The capture reads the canvas, so
DOM overlays — copy, nav — are not in the PNG.)

**Phase B — Fuser prompt.** Drafted by Kamina at `docs/hero-fuser-prompt.md`: geometry-silent
positive prompt (mood from the 194029 render only), a negative prompt that bans barrel-vault
/ arch / placeholder-sphere residue, structure-lock settings (denoise 0.30–0.45, style-ref
weight 0.35–0.5 so the wrong reference geometry can't bleed through), framing notes, and a
reject checklist to converge in a handful of gens.

**Phase C — cross-fade (code).** New `STILL_IN = [0.82, 1.0]` threshold. `AutoHero` renders a
preloaded `<img>` layer over the three.js canvas and fades its opacity 0→1 across the tail of
the reveal, so the low-poly scene dissolves into the still; then three.js idles
(frameloop=demand). The still is also wired as the reduced-motion final frame
(`StaticRenderHero`). Verified end-to-end with the placeholder.

**Versioning.** `public/hero/v1/pavilion.jpg` (currently a PLACEHOLDER = the 194029 render,
wrong barrel-vault geometry, just to prove the fade) + `public/hero/v1/README.md` with the
full produce-the-real-still flow. `src/pages/splash/heroStill.ts` centralizes the path +
`isCaptureMode()`. Bump to `v2/` to reland a new render.

## To land the real still

1. `?capture=1` → `__captureHero()` → `hero-endpoint.png`.
2. Fuser: condition on that PNG, use `docs/hero-fuser-prompt.md`, iterate a few gens.
3. Overwrite `public/hero/v1/pavilion.jpg` (~2560px), set `placeholder: false` in `heroStill.ts`.

## Verify

- `npm run test` = 75/75 · `npm run build` = clean · console clean.
- Eyes-verified: cross-fade completes (three.js → photoreal still) with copy over it;
  `?capture=1` freezes the endpoint, still suppressed, `__captureHero` present. Screenshots
  in session scratchpad.

## Left / open

- Nav legibility over a PHOTO hero: floating dark titles lose some contrast over busy
  foliage (fine over the vellum sections). When the real still lands, consider a whisper
  top scrim gradient or a soft text-shadow on the nav — not a rectangle.
- Placeholder geometry is wrong (barrel vault) by design; it only demonstrates the fade.
- Commit + push V3.

## Files

src/pages/splash/heroStill.ts (new) · src/pages/splash/HeroScene.tsx ·
src/pages/splash/HeroReveal.tsx · src/pages/splash/HeroReveal.test.ts ·
public/hero/v1/pavilion.jpg (placeholder) + README.md · docs/hero-fuser-prompt.md (Kamina)
