# Handoff: Bower front-end — brand, combined home, cinematic hero

Date: 2026-07-06 · Branch: `Front-End` (supersedes the redundant `V2`)

## What

A front-end pass establishing **Bower** as the company with **Eden** as its single product,
and rebuilding the home into a two-surface site with a cinematic scroll hero.

- **Brand mark:** the **Oculus** — a woven aperture of eight overlapping circles (`src/ui/OculusMark.tsx`),
  read as a plan/top-view of the Eden pavilion. Company wordmark is lowercase `bower` (serif).
  Board + assets live outside the app repo (`../docs/brand/`).
- **One company, one product.** All Render Critic / Archipedia / three-product framing removed.
  The company home and the Eden product page are the SAME page.
- **Two surfaces only:**
  - `#/` — Home: hero → Eden pitch → `#how-it-works` (the former engine explainer, folded in as
    `HowItWorks.tsx`) → commission / register → monumental `bower` close.
  - `#/studio` — the configurator (unchanged). `#/engine` route removed.
- **Cinematic hero** (`HeroReveal.tsx` + `HeroScene.tsx` + `BowerIntro.tsx`):
  - Intro (once per tab, framer-motion): the Oculus logo + `bower` wordmark load in together as a
    centered lockup, then the wordmark flies to the top-left nav and the logo settles to the hero's
    plan position (pixel-coincident hand-off). Slow/large register.
  - Scroll-scrubbed: Oculus plan → cross-fade to the pavilion top-down → camera tilts up into the
    3D gridshell → wireframe resolves to timber + garden + climbing greenery → copy fades in over
    the finished render (render as the hero image, right; copy left).
  - The 3D is a **temporary intent placeholder** (to be replaced by a Fuser frame-by-frame
    animation). Reuses the studio geometry (`Folly`/`Scene`).

## Why

Daniel's brand direction: abstract mark (no nests/birds/plants), Bower = company / Eden = product,
clearer two-surface IA, and a hero that turns the logo into the product (2D → 3D → render).

## Verify

- `npm run build` green; `npm run test` green (72 tests).
- On `http://localhost:5333/`: fresh tab plays the intro; scroll the top section for the 2D→3D→render;
  `#how-it-works` and `#/studio` reachable; reduced-motion + no-WebGL fallbacks in place.

## Key implementation notes

- Framer-motion motion-value style bindings stuck for scroll-linked opacity; the hero drives the
  canvas / Oculus / copy layers **imperatively** off one scroll signal (see `ScrubHero`).
- Perf: `HeroScene` renders `frameloop="demand"` (renders only while scrolling; zero GPU idle),
  DPR capped 1.5, dynamic shadows dropped (contact shadow baked once). Swap for a video/image
  sequence when the Fuser animation lands and delete the three.js scene.
- First-load flash fixed: `heroMode` decides synchronously (`isBrowser`), so the first browser
  frame is already the correct plan state, not the poster.

## Left

- Favicon not yet wired into `index.html`/`public` (assets exist in `../docs/brand/assets/`).
- 3D hero to be replaced by the Fuser frame-by-frame animation.
- `ENGINE_NAME` in `config.ts` unused by UI (kept as the Trellis naming placeholder).

## Files

New: `src/ui/OculusMark.tsx`, `src/pages/splash/{BowerIntro,HeroReveal,HeroScene,HowItWorks}.tsx`
(+ `BowerIntro.test.ts`, `HeroReveal.test.ts`). Changed: `src/Root.tsx`, `src/routing.ts`,
`src/pages/SplashPage.tsx` (+test), `src/pages/splash/SplashHero.tsx`, `src/ui/BowerMark.tsx`,
`src/scene/overlays/GrowthOverlay.tsx`, `package.json` (framer-motion). Removed: `src/pages/EnginePage.tsx`.
