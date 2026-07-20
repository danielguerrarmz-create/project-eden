# Mobile / responsive overhaul — architecture plan (2026-07-18)

Planning document only; no code changed. Produced from a full-code audit (Edward: routes, viewport
assumptions, QA harness, perf, test invariants) and a responsive design strategy (Sai), synthesized
by the orchestrator. This is the recipe a build team executes; each work package below is sized to
hand to one agent.

**The one-paragraph answer to the framing question.** We do not build "three aspect ratios." The
site is already fluid-first (clamp() tokens in `index.css:49-56`, clamp type in `typeScale.ts`), and
standard practice is fluid layout plus content-driven breakpoints, not device buckets. The codebase
has already voted, twice and independently, for exactly one structural breakpoint: **1024px
(Tailwind `lg`)**, where the studio's three-rail grid (`App.tsx:53`) and About's master-detail
reader (`AboutPage.tsx:997`) both cut over. We standardize on Tailwind's default scale
(640/768/1024/1280, unmodified in `tailwind.config.js`), use **768 (`md`)** as the secondary reflow
point for editorial bands, and give iPads no tier of their own: iPad portrait (768w) falls in the
mobile/recompose tier on instrument pages, iPad landscape (1024w) falls in the desktop tier. Most
of the site squeezes; two authored surfaces must be **recomposed**, not squeezed.

---

## 1. Scope

| Route | Surface | Overhaul scope |
|---|---|---|
| `#/` | Splash | IN, light: verify/polish (already fluid) |
| `#/engine` | Engine walkthrough | IN, medium: diagram legibility |
| `#/about` | About (timeline + gallery + founders) | IN, heavy: the core of the overhaul |
| `#/studio` | Studio instrument | DECISION D1 (below). Default: "must not break" now, mobile recompose as Phase 3 |
| `#/shape`, `#/sculpt`, `#/lab/*` | Spikes / labs, unlinked | OUT. Gate `/shape` and `/sculpt` with a "open on desktop" card on coarse-pointer narrow viewports |

Global chrome (`SplashHeader`) is already correct: it flex-wraps and publishes its true height to
`--header-h` via ResizeObserver, so every `100svh - var(--header-h)` consumer survives the two-row
phone wrap. Verify visually; no rework planned.

## 2. Per-page strategy (fluid / reflow / recompose)

- **Splash: fluid.** Copy is clamp()-sized, photo bands are `md:grid-cols-2`, the hero is a photo
  still (the R3F HeroScene is tabled and unreferenced, so the landing page ships no WebGL). Work is
  verification at 375/390/430 widths: CTA wrap, scrim legibility, `object-bottom` crop.
- **Engine: fluid, plus diagram care.** `EnginePage`/`EngineSection` have zero breakpoints and lean
  on Frame tokens; the five SVG diagrams scale via viewBox so they shrink without breaking, but
  labels approach illegibility on phones. Treatment: per-diagram minimum label size check; where a
  diagram fails, stack its annotation text below the drawing at `max-md` rather than shrinking it
  inside the SVG.
- **About, project gallery + founders: already dual-tree.** The desktop master-detail is `lg:` only
  and a separate `space-y-16 lg:hidden` mobile stack already exists (`AboutPage.tsx:1126`). Work is
  polish, not architecture. Note the desktop list selects on `onMouseEnter` (`AboutPage.tsx:1013`);
  acceptable because that tree never renders below `lg`, but it must gain a click/tap equivalent if
  the trees are ever merged.
- **About, CrossPathsTimeline: recompose (the big one).** See section 3.
- **Studio: recompose deferred (D1).** Below `lg` it stacks and scrolls today, which is survivable
  but not a touch product. The mobile-native form, when built: stage + live price first, the four
  sliders / species / ecology demoted to a tap-open drawer, and on coarse-pointer phones default to
  the existing product stills with a "view live in 3D" tap-through instead of always mounting the
  R3F canvas (battery/thermal, not capability: `webgl.ts` only answers "can it," never "should it").

## 3. The two authored compositions

### 3a. CrossPathsTimeline — dual tree, not re-projection

The timeline is one fixed 1200-world-unit SVG (`TIMELINE_W = 1200`, total height ~7645 units) with
a scroll-scrubbed camera (`viewBox = 0 ${camY} 1200 ${viewH}`, `preserveAspectRatio="meet"`). On a
390px phone it meet-scales to ~0.30x: 30-unit year labels render ~9px, the 2.2-unit spine becomes a
0.66px hairline, plates become thumbnails. It does not break; it shrinks to illegibility, which is
worse because it looks intentional. Media queries cannot save a fixed viewBox.

Two viable strategies were weighed:

- (a) Re-project: author a ~390-430-unit-wide mobile coordinate space from the same data
  (`clusters.ts`, `pack.ts`, `growth.ts`, `subBranches.generated.json`). Truest to the drawing;
  ~4-7 days; high risk (the finale camera math, bleed math, and worldPerPx invariance all need
  mobile twins).
- **(b) Dual tree (CHOSEN): keep the drawn scroll-scrub timeline `lg:` and up; below `lg`, ship a
  DOM/flexbox vertical timeline.** ~2-4 days, low risk, sidesteps the entire camera/bleed
  machinery, and mirrors the dual-tree pattern the project gallery already uses. Both auditors
  independently recommended this for the first mobile ship.

Mobile timeline design (Sai): one vertical sepia spine (left rail or center), plates as stacked
cards in natural document flow (year, image, caption), alternation driven by the existing
`packSide` data rather than new layout math, page scroll instead of camera scrub. The twist-fuse
opening and the unravel-into-mark finale keep their *events* but as simple fixed compositions: a
small static twist glyph at top, the Oculus mark + wordmark lockup at bottom. The "words rest 18px
proud of centre" pin choreography is desktop-only. Color law is viewport-independent: structure
stays `INK_SEPIA`, pigment only on painted botanicals.

**Landmine: the founders parenthesis is coupled to the timeline** via
`querySelector('[data-timeline-track] svg')` (`AboutPage.tsx:1573`), and round 11 already recorded
a whole-bower-invisible bug from a stray svg in that subtree. The mobile timeline tree must either
render outside `[data-timeline-track]` or the selector must be tightened to the desktop svg
explicitly. Timeline + parenthesis are one refactor unit.

### 3b. Splash hero — verify, likely fluid

Audit found the hero healthier than assumed: clamp() type (Eden word `clamp(4.5rem,12vw,8.5rem)`
lands ~47px at 390w), lower-left column capped `max-w-[34rem]`, full-bleed `object-cover
object-bottom`. Default: keep the overlay composition and verify at phone widths. Fallback if
review shows crowding: below `md`, stack copy below a full-bleed image instead of overlaying
(the documented "portrait box around something natively landscape" trap). Decide from screenshots,
not in advance.

## 4. Breakpoint + token specification

- Breakpoints: Tailwind defaults, used semantically. `md` (768) = editorial reflow point.
  `lg` (1024) = the structural instrument cutover. No custom `screens` entries; no new scale.
- iPad portrait (768x1024): mobile tier on About-timeline and studio; fluid tier on Splash/Engine
  (already looks intentional at `md:grid-cols-2`). iPad landscape (1024x768): desktop tier.
  Caution: 1024 sits exactly on `lg` min-width; verify on a real device, browser chrome can shave
  pixels.
- Orientation change is a live resize, not a reload: the timeline camera and any R3F canvas must
  re-measure without resetting scroll or replaying one-time intros (the `BowerIntro` session gate
  and existing ResizeObservers are the right pattern; extend, don't fork).
- Tokens: keep `--gutter` (floors 20px), `--rhythm` (floors 64px; generous phone spacing is the
  brand, do not tighten), `--measure-*`, `--header-h` as-is. Fluid type stays clamp().
  Exception: dense mono instrument readouts (`text-[9px]`..`text-[11px]` in studio/shape) are
  **stepped, never fluid**; current px values are the floor. Data labels must be readable at every
  width, not proportional to it.
- Touch: 44x44 CSS minimum for all actionables, 48 for primary CTAs. Measure the species-picker
  cells and slider thumbs at real render. No new hover-only affordances anywhere in the overhaul
  (the current site has none that are load-bearing; keep it that way). `AdaptiveCursor` already
  self-gates to fine pointers; untouched.

## 5. Performance work (independent of layout, highest mobile leverage)

1. **Responsive images.** No `srcset`/`<picture>` anywhere; `public/assets` is 48MB and the About
   gallery serves 500KB-1.17MB webp per plate to a 400px cell. Generate width variants + `srcset`
   for the 12 project heroes, gallery plates, and the two product photos. Verify the mobile About
   tree lazy-loads (`loading="lazy" decoding="async"`) like Splash does.
2. **Fonts.** Only Fraunces/Inter/Dancing Script load from Google plus ~445KB of self-hosted
   display faces; Bodoni Moda, Source Serif 4, IBM Plex Mono are declared in Tailwind but never
   loaded (so `font-quote` silently renders Georgia today). Clean the dead declarations or load
   what is meant to be live; audit preload of the two hero faces.
3. **About bundle weight.** `subBranches.generated.json` (128KB) stays (it exists to keep
   `colonize()` off the main thread) but counts against the About mobile budget; the mobile
   timeline tree should not import desktop-only ornament modules (verify with a bundle check).
4. **Studio DPR.** If/when D1 brings studio to mobile: cap `dpr` and add a capability tier to
   `webgl.ts` (currently a bare boolean).

## 6. Screenshot review loop (the workflow Daniel reviews by)

Today only 2 of 16 `qa/*.mjs` probes write PNGs, none multi-viewport, and there is no shared
launcher; every probe duplicates launch/viewport/goto. Build once:

- **`qa/lib.mjs`**: factor the proven primitives out of the existing probes: puppeteer-core launch
  (external CHROME path), setViewport, the autoplay-cancel Shift gesture, reduced-motion toggle,
  and the honest ready-gate (poll for >= 4 `blob:` bitmaps like `perf-about.mjs:47-53`; never a
  wall-clock sleep, the suite's own repeated lesson).
- **`qa/capture-matrix.mjs`**: for each public route, capture the 7-viewport matrix below to
  `qa/shots/<date>/<route>/<viewport>.png`, full-page plus per-section crops for About. This is
  the artifact set Daniel reviews each round.

| # | Viewport | DPR | Role |
|---|---|---|---|
| 1 | 375x667 | 2 | iPhone SE, the floor |
| 2 | 390x844 | 3 | iPhone 14; matches existing `qa/mobile-hero.mjs` precedent, keeps history comparable |
| 3 | 430x932 | 3 | Pro Max; catches "phone tops out at 390" assumptions |
| 4 | 768x1024 | 2 | iPad portrait, the ambiguous tier, checked per page |
| 5 | 1024x768 | 2 | iPad landscape, sits exactly on `lg`; boundary check |
| 6 | 1440x900 | 1 | Desktop control; zero-regression bar (the width the site was designed on) |
| 7 | 1920x1080 | 1 | Wide sanity; `--measure-canvas` ceiling check |

Capture phones/iPads at real DPR (hairline borders behave differently at DPR 2/3 than in a DPR-1
simulator). Additionally exercise one live portrait-to-landscape rotation on the timeline and (if
in scope) studio, since both hold scroll/camera state that static shots cannot catch breaking.
Extend the numeric probes (`hero-clip`, `project-media`, `divider`, `wall`) to run at widths 2, 4,
5 as well as their current desktop widths; they already accept W/H args since round 11.

## 7. Invariants the refactor must not break

- Year-label gutter law (`YEAR_LABEL_OFFSET + YEAR_LABEL_W <= OFFSET_X`, tested). Desktop
  constants stay desktop-only; the mobile tree gets its own layout values, never mutates these.
- Mark-size band (~1.4x) and mark-stroke == `SPINE_W` decoupling (tested).
- Founder arms meet at one point on `trunkX` (tested + `qa/founder-parenthesis.mjs`); see the
  coupling landmine in 3a.
- `subBranches` drift guard: the seed/params are frozen; a mobile tree reuses the polylines or
  ships its own generated file, never edits params.
- `qa/mobile-hero.mjs` stays green (12 heroes, <2% crop at 390x844); it is the seed of the new
  capture loop.
- KUKA licensed-crop pin (count exactly 1, by src, tested).
- Procedural asserts are flaky ~1 in 3: run vitest 3-5x before quoting green. Confirm the
  `SplashPage.test.ts` contamination noted in round 11 is cleared before trusting a baseline.
- One writer per worktree; check for live teammate sessions before spawning builders.

## 8. Work packages (for the build team)

Phases are sequential; packages inside a phase can run in parallel with distinct file ownership.

**Phase 0 — harness first (so every later package is reviewable)**
- WP0 `qa/lib.mjs` + `qa/capture-matrix.mjs` + baseline capture of the CURRENT site across the
  matrix. Daniel reviews the baseline; that review finalizes D2/D3. (~1 day)

**Phase 1 — the core overhaul**
- WP1 CrossPathsTimeline mobile tree (dual tree per 3a) + founders-coupling fix + its tests.
  (~2-4 days, the critical path; single owner, owns `CrossPathsTimeline.tsx` + `AboutPage.tsx`)
- WP2 Responsive images: variant generation + `srcset` + lazy-load audit. (~1 day, touches asset
  pipeline + img tags only)
- WP3 Splash + Engine verification pass at the matrix; engine-diagram `max-md` annotation
  stacking where needed; touch-target measurements. (~1-2 days)

**Phase 2 — polish + hardening**
- WP4 About mobile-stack polish (typography rhythm, plate spacing at 375-430). (~0.5-1 day)
- WP5 Font cleanup + preload audit; `/shape` `/sculpt` desktop-gate cards. (~0.5 day)
- WP6 Extend numeric QA probes to mobile widths; rotation-state check. (~0.5-1 day)

**Phase 3 — only if D1 says yes**
- WP7 Studio mobile recompose: stage+price first, controls drawer, static-still default with 3D
  tap-through, `webgl.ts` tiering, DPR cap. (~3-5 days)

Every phase ends with a capture-matrix run and a Daniel screenshot review before the next starts.

## 9. Decisions — RESOLVED 2026-07-18

- **D1 — Studio on mobile: NO, keep desktop-only.** The studio stays a desktop instrument; on
  phones it keeps the existing stack-and-scroll fallback. **WP7 and Phase 3 are cut.** `webgl.ts`
  mobile tiering / DPR cap are no longer needed for this overhaul.
- **D2 — Splash hero at phone widths: DECIDE FROM BASELINE.** Capture the current hero at
  375/390/430 in Phase 0; Daniel rules keep-overlay vs stack-below from the screenshots. No
  pre-commitment.
- **D3 — Mobile timeline spine: DECIDE FROM TWO MOCKUPS.** WP1's first pass renders BOTH the
  center-spine/alternating-cards and left-rail/full-width-cards forms; Daniel picks from real
  renders before either is finished.
- **D4 — Effort: PHASE 0 ONLY, THEN REASSESS.** Build WP0 (harness + baseline captures, ~1 day)
  first. Daniel reviews the baseline, then commits to Phase 1. Phases 1-2 are NOT yet green-lit.

**Immediate next action:** WP0 only. Everything in Phase 1+ waits on the baseline review.
