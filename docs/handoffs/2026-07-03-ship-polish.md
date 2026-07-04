# Handoff — ship polish: robustness, accessibility, link hygiene

**Date:** 2026-07-03 · **Commit:** `58553b1`

## What

One shipping-hardening pass over the guided 3-step demo so the public link survives any
reviewer's machine and reads professional under scrutiny. The engine is untouched
(zero `src/engine` changes) — this is all surface and infrastructure.

- **Crash-proofing:** `ErrorBoundary` (paper-styled reload screen, inline styles so it
  renders even if the CSS layer broke) wraps the app in `main.tsx`; `webgl.ts` support check
  renders a quiet explanation card in `Scene.tsx` instead of a broken canvas; a `#root:empty`
  loading state in `index.html` so first paint is never blank.
- **Reduced motion:** `useReducedMotion` hook; stage `autoRotate` stops, the growth overlay
  snaps to its stage (no ease, no sway), CSS animations disabled via media query.
- **Keyboard accessibility:** the plot mapper's 4 edge handles + north knob are focusable
  ARIA sliders (arrow keys nudge 0.5 m / 5°), distinct per-edge labels, and a painted SVG
  focus style (Chromium doesn't reliably paint `outline` on focused `<g>` elements).
  `aria-pressed` on the size / species / year toggles; labels on the openness slider.
- **Link hygiene:** meta description, Open Graph + Twitter cards, theme-color, sprout
  `favicon.svg`.
- **Build:** three/fiber/drei split into a cached vendor chunk — app JS is now 43 kB and
  edits no longer re-ship the ~1 MB 3D stack; build is warning-free.
- **Two visible bugs fixed:** the price-card spec line printed raw floats
  (`4.800000000000001 × 3 m`, now `toFixed(1)`); the "back to design" ghost link's arrow
  pointed forward (now `←`).

## Verify

- `npm run build` — green (tsc + vite).
- `npm run dev` → walk Site → Design → Grow end to end. Year 0→3 growth animates, ecology
  metrics climb, the reserve flow reaches its Reserved state, zero console errors.
- Keyboard: Tab into the mapper — the focused knob swells moss with a thick ring; arrows
  resize the plot and the engine readout follows (e.g. "fits a 8.5×6 m plot").
- Reduced motion: enable "reduce motion" in OS settings — the stage stops rotating and the
  growth toggle snaps between years.

## Left

- Wire a real fabrication quote into `PRICING.ratePerComponentGBP`
  (`src/data/config.ts`) — the one on-screen number that is still a placeholder.
- Optional: a mid-session WebGL context-loss handler (currently falls through to the
  error boundary, acceptable for a demo).

## Files

- New: `src/ui/ErrorBoundary.tsx`, `src/ui/useReducedMotion.ts`, `src/ui/webgl.ts`,
  `public/favicon.svg`.
- Touched: `main.tsx`, `scene/Scene.tsx`, `scene/overlays/GrowthOverlay.tsx`,
  `ui/PlotMapper.tsx`, `steps/StepDesign.tsx`, `steps/StepPreview.tsx`, `index.css`,
  `index.html`, `vite.config.ts`, `README.md`.
