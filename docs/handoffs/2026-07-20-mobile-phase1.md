# Mobile / responsive overhaul — Phase 1 shipped LIVE — 2026-07-20

Live on `main` → www.bowerbuild.org (`origin/main` at `dd30628`). Verified: the deployed bundle
hash (`index-BYV5T69s.js`) is byte-identical to the reviewed local `vite build`, so the code that
was screenshot-reviewed is the code now serving. Plan: `docs/plans/2026-07-18-mobile-overhaul-architecture.md`.

## What
Phase 1 of the plan (WP0–WP3). Below `lg` (1024px) the site now recomposes instead of shrinking.

- **WP1 — About timeline dual tree.** New `src/pages/about/MobileTimeline.tsx` renders a DOM/flexbox
  vertical timeline below `lg`: left-rail sepia spine, full-width stacked cards (year → image →
  caption) in natural scroll, a static twist glyph at the top and the Oculus-mark + wordmark lockup
  at the bottom. The drawn scroll-scrub SVG (`CrossPathsTimeline.tsx`) is now `lg:`-and-up only.
  Cutover fires at exactly 1024 (`useMediaQuery.ts`). Card sides driven by existing `packSide` data;
  no new layout math, desktop constants untouched.
- **WP2 — Responsive images.** `scripts/gen-image-variants.mjs` (uses `sharp`, run via
  `npm run gen:images`) emits width variants into `public/`; `src/data/imageVariants.generated.json`
  (586 lines) is the manifest; `src/ui/responsiveImg.ts` resolves `srcset`/`sizes` at each `<img>`.
  Applied across About (`AboutPage.tsx`), Splash (`SplashPage`, `HeroReveal`, `HowItWorks`) and the
  founder portraits + reduced-motion posters. 209 variant files generated.
- **WP3 — Splash + Engine mobile pass.** Hero overlay kept (holds at 375, no crowding = D2). Engine
  diagram legibility checked. 44/48px touch targets on coarse pointers (`Footer`, `RegisterInterest`,
  `SplashHeader`, nav).
- **Studio stayed desktop-only** (D1 = no).

## Why
The old timeline was one fixed 1200-world-unit SVG; on a 390px phone it meet-scaled to ~0.30x —
9px year labels, a 0.66px hairline spine. It did not break, it shrank to illegibility, which reads
as intentional. A dual tree (mirroring the project-gallery pattern) sidesteps the entire
camera/bleed machinery. Responsive images were the highest mobile-perf leverage: About was serving
500KB–1.17MB webp (and a 2.6MB hero JPG) into ~400px cells with no `srcset` anywhere.

## Verify (done)
- `npm run typecheck` clean · `npm run test` 826 green across 8/8 runs (no flake fired) ·
  `npm run build` clean.
- `npm run qa:matrix` → `qa/shots/2026-07-20-phase1/` (7-viewport matrix + `about-center/` for the
  D3 alternative). Pixels reviewed, not just the verdict.
- **Coupling landmine held:** the desktop founders' closed-bower parenthesis
  (`querySelector('[data-timeline-track] svg')`) still resolves — verified intact at 1440. The
  mobile tree renders its own spine, not a stray svg in that subtree.
- Desktop timeline + garland + finale unchanged at 1440 (no regression). Sepia law and the
  no-cover-crop laws respected on the new mobile tree.

## Left / open (none blocking the live site)
- **D3 — mobile timeline spine:** shipped the **left-rail** default (bigger images, more legible on
  a phone). The **center-spine / alternating-cards** alternative is captured at
  `qa/shots/2026-07-20-phase1/about-center/1-timeline.png` — Daniel's pick; trivial to swap.
- **D2 — splash hero:** overlay kept; no crowding at 375. No action unless Daniel disagrees on-device.
- **Phase 2 (WP4–6), not started:** mobile About typography/plate-spacing polish; dead-font
  declaration cleanup + preload audit; `/shape` `/sculpt` desktop-gate cards; extend the numeric QA
  probes (`hero-clip`, `project-media`, `divider`, `wall`) to mobile widths + a portrait↔landscape
  rotation-state check.
- Cosmetic capture artifact to ignore: `about/4-768x1024@2.png` shows the timeline appearing to
  repeat — a Chrome tiling artifact on a ~20000px-tall element screenshot, not a bug (DOM-verified
  single tree; cutover correct at 1024).

## Process notes
- Built on **live `origin/main`**, NOT the local `about-round-10` working branch — that branch was
  **52 commits behind main** and its WP0 baseline captures were stale. The unrelated `/lab/seeds`
  dev-rig WIP (`src/pages/seeds/`, `Root.tsx`, `HeroScene.tsx`, `routing.ts`, `scene/util.ts`) is
  another agent's uncommitted work and remains untouched on `about-round-10`.
- Work done in a dedicated worktree `../mobile-overhaul` on branch `mobile/responsive-overhaul`
  (pushed to origin for traceability; `main` was fast-forwarded to its tip). The `engine-session`
  worktree (also on `main`) was left untouched.

## Files
New: `src/pages/about/MobileTimeline.tsx` (+ `.test.ts`), `src/ui/responsiveImg.ts`,
`src/ui/useMediaQuery.ts`, `src/data/imageVariants.generated.json`, `scripts/gen-image-variants.mjs`,
`qa/lib.mjs`, `qa/capture-matrix.mjs`. Edited: `CrossPathsTimeline.tsx`, `AboutPage.tsx`,
`usePageCardLine.ts`, `SplashPage.tsx`, `HeroReveal.tsx`, `HowItWorks.tsx`, `RegisterInterest.tsx`,
`SplashHeader.tsx`, `EnginePage.tsx`, `Footer.tsx`, `package.json`. Assets: 209 generated variants.
