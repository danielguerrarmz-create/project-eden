# Handoff — About overhaul, four-hat audit execution, studio single-page (2026-07-12)

Session range: `0dce1ed..3a0f022` (9 commits, merged fast-forward to `main` and pushed).

## What

**Clay's real work, folded into the projects (`about/projects.ts`, `AboutPage.tsx`)**
- Extracted figures + text from Clay's PDFs (PyMuPDF + PIL, cropped to `.webp`) and added
  **flowerfield** (2022, biophilic ecodistrict) plus two paper-projects: **AAG 2025 Synthetic
  Vision** and **ACADIA 2025 Patterns Across Languages**. Papers are projects, not a separate
  research section, the same way Search by Assembly already was.
- New `ProjectPaper` shape carries venue + authors + a **downloadable PDF** ("Read the paper");
  `fit: 'cover' | 'contain'` so paper figures letterbox instead of cropping.
- Projects renumbered into **interest-journey order**, not date order:
  01 flowerfield → 02 Synergy → 03 Dougherty → 04 Kuka → 05 Synthetic Vision →
  06 Patterns Across Languages → 07 Search by Assembly (CAADRIA).

**Four-hat audit, executed** (the audit itself is candid internal material and lives in the PRIVATE `bower-docs` repo, not here)
- Audit pressure-tested the flow as Restless Egg / generalist investor / founder-peer / luxury
  buyer. Headline finding: the site was serving four readers who want opposite things.
- Fixes shipped with **zero new pages** (explicit constraint: minimal, simple but rich):
  wedge sentence + moat coda + "doors" close on the splash, a credibility strip on About
  (papers → Resia → **Drafted AI** (Clay's SF startup) → Forsite OPS automation → architecture →
  Plentify → robotics), hero CTAs, and the `engine` → `studio` nav mislabel fixed.

**About page: two full-height portions + the crossing-paths timeline (`CrossPathsTimeline.tsx`, new)**
- Portion one: founders, with **short** bios. Portion two: the projects, in interest order.
- New animated timeline: six coloured strands (UT Austin, startups, research, studio work,
  operations, the engine) drawn as **d3 `curveNatural` splines**, positioned on a **real time
  axis** (2020→2025), weaving into an "invisible" dashed **Bower main line** with a
  **connection dot** at the merge, then a bold Bower arrow.
- Draws chronologically: first strand first, each joining in on its real start year. Own
  IntersectionObserver gate; CSS `@keyframes` on `stroke-dashoffset` (framer's `pathLength`
  jumped instantly). Reduced-motion renders the finished state.
- Cut: the "what we both chase" band, the projects counter, the capability strip.

**Studio: one page, no scrolling, decluttered for non-designers (`App.tsx` + `ui/*`)**
- Single viewport app shell (`lg:h-screen lg:overflow-hidden`, 3-col `[320px_1fr_300px]`).
  It reads like software (Rhino, Fuser, Flora), never a scrolling page.
- Stripped the overload: removed the engine-strategy chip, dimensions chip, grammar notes, the
  species codenames (TENDRIL/TWINING), the `(config.ts)` leak, the "logged to console" leak, and
  the `docs/FABRICATION.md` reference.
- Sliders now speak plain language: footprint = "how much ground it covers", height = "how tall
  it stands", lattice = "how open the weave is", opening = "which way it faces the sun".
- Header is now `Make it yours.` / "Pick a plant, shape the canopy, watch it grow."

**Splash seam fix (`HeroReveal.tsx`)**
- The "strange horizontal line across the splash" was not in the render: the CopyColumn's
  legibility scrim was bottom-anchored, so its gradient hard-started full-width at y≈262. Moved
  the scrim out to a full-bleed sibling of `<HeroStill/>`. Seam gone.

**Repo hygiene**
- `package.json` name → `project-eden` (matches the GitHub repo).
- Merged `about-and-four-hat-overhaul` into `main` fast-forward (`3a0f022`), pushed.
- Retired `integrate/manufacturing-engine` → renamed `stale/integrate-manufacturing-engine`
  (local + remote, matching the `stale/front-end` / `stale/v3` convention); old `integrate/` ref
  deleted on origin.

## Why

- The About page was placeholder copy with blank frames; Clay's papers and flowerfield are the
  actual credibility (ML + peer review), and the audit said investors read *credibility*, not
  claims. Folding papers into projects keeps one spine instead of a research annex nobody clicks.
- The four hats exposed that "more engine" (investors) and "less machinery" (luxury buyer) pull
  opposite ways. The resolution was framing, not new surface area.
- The studio was reading as a designer's control panel. Non-designers need fewer decisions and
  no jargon; the utility survives the strip.
- The timeline answers "how did you two get here" in one graphic instead of two paragraphs.

## Verify

- `npm run test` → **124/124 pass** (re-run at handoff time). `tsc` clean at `3a0f022`.
- Splash seam verified by eye on `#/` (scrim now full-bleed, no line).
- Timeline animation verified by forcing `strokeDashoffset=1` on the blue strand and watching it
  disappear, proving the pathLength draw is live (an earlier `getComputedStyle` check was
  misreading pathLength-normalised offsets and gave a false negative).
- **Not verified:** the studio single-page shell on narrow/mobile viewports (the `lg:h-screen`
  lock is desktop-only by design, but mobile behaviour was not exercised this session).
- **Not verified / not true yet:** the timeline's non-project **dates are my estimates**
  (see Left).

## Left / next

- **Daniel:** confirm the **real dates** for the timeline threads. Currently estimated in
  `CrossPathsTimeline.tsx` → `STRANDS[].start`: UT Austin 2020, Resia/Drafted 2021,
  Archipedia + papers 2023, Forsite OPS 2024, the engine 2024. One-line edit each.
- **Daniel:** the `~/restless-egg` → `~/project-eden` **folder rename is still blocked** (live
  file lock; `package.json` already matches). Note `~/restless-egg` is referenced by the backup
  Scheduled Task and several memory notes, so a reference sweep should follow the rename.
- **Daniel:** `CONTACT_EMAIL` in `src/data/config.ts` is still his utexas address; swap to a
  Bower inbox before this goes to anyone.
- Optional: graduate Resia / Forsite OPS to full image tiles once screenshots exist.
- Optional: the studio's Ecology panel (habitat / pollinator cells / rainwater / flowering)
  survived the declutter; cut it if it still reads as overload.
- The merged `about-and-four-hat-overhaul` local branch is redundant and can be deleted.
- Note: `restless-egg/docs/` is the working copy of the PRIVATE `bower-docs` repo. THIS repo is
  PUBLIC: never commit audits, stress tests, accelerator drafts, or reviews of Clay's work here.

## Files

- **New:** `src/pages/about/CrossPathsTimeline.tsx`
- **About:** `src/pages/AboutPage.tsx`, `src/pages/about/projects.ts`
- **Studio:** `src/App.tsx`, `src/ui/ParamSlider.tsx`, `src/ui/PricePanel.tsx`,
  `src/ui/CommissionSheet.tsx`, `src/ui/ReserveCTA.tsx`, `src/ui/Navbar.tsx`
- **Splash:** `src/pages/splash/HeroReveal.tsx`, `src/pages/SplashPage.tsx`,
  `src/pages/splash/SplashHeader.tsx`, `src/pages/splash/HowItWorks.tsx`
- **Other:** `src/index.css` (`@keyframes cptl-draw`), `src/data/config.ts`, `package.json`
  (name + `d3-shape`), tests: `SplashPage.test.ts`, `HeroReveal.test.ts`
- **Assets:** `public/assets/about/**` (flowerfield renders, paper figures, two paper PDFs)
