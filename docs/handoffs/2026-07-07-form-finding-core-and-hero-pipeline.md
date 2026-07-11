# Handoff: form-finding core + hero video pipeline (session wrap)

Date: 2026-07-07 · Branch: `form-finding-core` (new, off V3 @ `25fc1c5`) · Pushed to origin

Big session. Two arcs: (A) the home/hero + brand pass, and (B) a decision to move the
shaping engine from parametric sliders to a **form-finding core**, de-risked with a working
spike. **Daniel has NOT yet tested the engine live — that is tomorrow's first task.**

## What shipped

### A — Home / hero / brand
- **Timed hero reveal** (`HeroReveal.tsx`): scroll-scrub → auto-playing timed reveal that
  starts after the intro veil lifts; copy is a bottom band with an animated cursive "Eden";
  CTAs + stats removed. Ends on the three.js geometry (placeholder cross-fade gated off).
- **Fixed floating nav** (`SplashHeader.tsx`): no background rectangle, hover underline,
  higher contrast, "the studio" → "engine", new **`#/about`** page.
- **Intro**: first-paint veil (kills the page flash), trimmed 0.5s, `INTRO_DONE_EVENT`.
- **Simplification**: decorative eyebrows + "always becoming" cut; longest paragraphs trimmed.
- **Backgrounds unified** to `#FBF9F3` (beige/white seam gone).

### B — Hero video pipeline (Option 1 → pivoted to video-to-video)
- **Canvas recorder** (`?capture=1&record=1`): MediaRecorder captures the WebGL canvas
  (geometry only) to a clean `hero-animation.webm`. Verified (~4.6 MB).
- **Higgsfield brief** (`docs/prompts/higgsfield-v2v.txt`): feed the recording +
  golden-hour garden reference to Higgsfield **video-to-video** — keeps our geometry + motion,
  re-skins the look. This supersedes the earlier 3-still Fuser workflow (kept for reference in
  `docs/prompts/shot-*.txt` + seeds). **Not yet run — Daniel to generate.**
- Endpoint-capture scaffold retained (`?capture=1` + `__captureHero()`, `view=top`/`grown`).

### C — Shaping: sliders → direct manipulation → **form-finding**
- **`#/shape`** — param-fit direct manipulation (drag a control cage, 3 of 4 DOF). Edward.
- **`#/sculpt`** — the **form-finding SPIKE** (the headline). A node at every lattice
  intersection; grab-and-pull → XPBD-style constrained relaxation → projects onto the nearest
  **buildable** gridshell every frame; struts soft inside the fab band, rigid at the edges
  ("clay with a grain"). **159 FPS, 0 out of spec.** `formFinding.ts` (+26 tests),
  `SculptShell.tsx`, `SculptPage.tsx`.
- **`#/engine`** adapted to the splash chrome (shared `SplashHeader`).

### Specs (fleet)
- `docs/research/form-finding-method.md` (Senku) — XPBD recommended; buildability as
  constraints; ~530 nodes for a pavilion; risks: crown-curvature cap (derived), 3↔4-feet pop.
- `docs/design/sculpting-gestures.md` (Sai) — one motor pattern → 6 gestures (carve, cantilever,
  root-a-column, flatten, twist); limits as anisotropic "grain".
- `docs/design/site-selection-face.md` (Sai) — address → aerial → trace → our reveal onto the
  lawn; wires the stubbed `SITE` constant into real sun-path.

## Why
Daniel's review drove the hero to a timed, calmer, more editorial home; the video pivot fixes
AI geometry-drift by making our own animation the structural guide; and the shaping tool moved
to form-finding because sliders are the anti-thesis — the material must *resist toward buildable*,
which is how real shells (Otto/Isler/Gaudí) were always designed.

## Verify
- `npx tsc --noEmit` clean · `npm run test` **111/111** · `npm run build` clean · console clean.
- Eyes-verified (headless screenshots): home reveal, nav over sections, `#/about`, `#/engine`,
  `#/shape`, `#/sculpt` render; recorder produces a webm.
- **NOT verified: the live drag FEEL** on `#/shape` and `#/sculpt` — synthetic pointer events
  don't engage R3F's 3D picking. This is the #1 thing Daniel must test tomorrow with a mouse.

## Left / open (tomorrow)
1. **TEST `#/sculpt`** (localhost:5333 or `npm run dev`) — does the pull feel like clay? Does it
   stiffen believably at the fab limits? This decides whether we commit to the production core.
2. If GO, the production path (Edward + Senku order): (1) **geodesic / density-adaptive mesh**
   (retire the polar-crown topology ceiling — the one real risk), (2) project onto the **real**
   grammar + wire the live **cut-list + price**, (3) Sai's gestures, (4) the **site face**.
3. **Run the Higgsfield** video-to-video with the recording + brief.
4. Grammar gap: no `minJointAngleDeg`/`maxJointAngleDeg` yet — needs a real number from Clay's
   fab shop before joint-angle constraints are honest.
5. Minor: floating nav loses some contrast over a busy photo hero (fine over the flat sections).

## Routes to review
`#/` (home) · `#/engine` · `#/about` · `#/shape` (handles) · `#/sculpt` (form-finding — the one)

## Key files
Home/hero: `src/pages/SplashPage.tsx`, `src/pages/splash/{HeroReveal,SplashHeader,BowerIntro,heroStill}.tsx` ·
Shaping: `src/pages/{ShapePage,SculptPage}.tsx`, `src/scene/{CageHandles,SculptShell}.tsx`,
`src/engine/{directManip,formFinding}.ts` · Docs: `docs/research/`, `docs/design/`, `docs/plans/`,
`docs/prompts/`, this handoff.
