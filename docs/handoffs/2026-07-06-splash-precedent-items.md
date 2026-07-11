# Handoff: splash precedent items (1, 2, 3, 9)

Date: 2026-07-06
Author: Edward
Repo: living-eden (app at ~/restless-egg/app), branch main, built on ba68832

## What

Built items 1, 2, 3 and 9 from `docs/brand/2026-07-06-splash-brand-execution-plan.md`
(section 4), extending the shipped splash landing per `app/docs/SPLASH-PAGE-SPEC.md`.
No new tokens, fonts, colors, or diagram primitives; everything reuses the Eden
documentation language already in `tailwind.config.js` and `src/pages/engine/*`.

**Item 1, noun stack + chrome unification.**
- `src/data/config.ts` gains three named constants: `ENGINE_NAME = 'the engine'`
  (lowercase generic, the engine's proper noun is an open Daniel/Clay call; every
  chrome reference reads it so the rename is one line), and `CTA_PRIMARY_EVALUATOR
  = 'See how the engine works'` / `CTA_PRIMARY_BUYER = 'Shape your Eden'` (both
  written now, swap is one line after Jul 17; not swapped).
- The wordmark is unified to lowercase `bower` with the sprout glyph across the
  splash header and the engine-page header, replacing the uppercase `BOWER` mono
  treatment. The sprout glyph was extracted from the studio Navbar into a shared
  `src/ui/Sprout.tsx` (size prop) and a `src/ui/BowerMark.tsx` wordmark; the Navbar
  now imports the shared glyph (zero visual change to the studio).
- The splash header nav teaches the noun stack in quiet mono: `Eden (the pavilion)`
  → `#/`, `the engine` (ENGINE_NAME) → `#/engine`, `the studio` → `#/studio`.
- The one filled CTA reads from `CTA_PRIMARY_EVALUATOR` on both the hero and the
  close, so the post-deadline swap is one constant.

**Item 2, commission ritual.** New splash section `3b` between the "prices itself"
(vellum) and "habitat" (yellow) sections, on `bg-fieldBlue` (navy ink) so the field
rhythm alternates cleanly with no adjacent repeat (blue, chartreuse, vellum, blue,
yellow, vellum). Numbered 1 to 5, hairline register, mono numerals, one line each.
Step 3 carries the live component count and an annotation strip carries `~N
components · ~M wks`, both read from the store's default `outputs.components.totalCount`
and `outputs.buildPlan.leadTimeWeeks`, the same source of truth the commission sheet
uses (nothing hardcoded). The ritual is restated compact as one mono line in the
close (process shown twice at increasing resolution, per the precedent rule).

**Item 3, "what stays the same" strip.** Inside section 4 (yellow), before the
ecology facts row, in mono/hairline register: WHAT STAYS THE SAME (your garden ·
your soil · your planting scheme and your garden designer) and WHAT AN EDEN ADDS
(a computed armature for it to climb). One legal fact line, phrased as a fact about
the height class and reading the PD cap live off `GRAMMAR.pdHeightCapM`: "under
2.5 m: permitted development in the UK, no planning application." No certification,
margin, or insurer claims anywhere.

**Item 9, aperture leader clip.** `SiteEnvelopeDiagram` widened its viewBox from
`0 0 190 200` to `-14 0 220 200`. The drawing content still lives in the original
`0..190` band; the horizontal padding contains the aperture `LeaderCallout` label on
whichever side the aperture opens, so "APERTURE" no longer clips to "APERTU" at any
width. Same component renders on the splash section 3 and the engine page, so both
are fixed; the padded frame is breakpoint-proof because SVG `preserveAspectRatio`
scales the whole viewBox to fit, it never clips once the label is inside the box.

## Why

The precedent study (`docs/brand/2026-07-06-precedent-study-auar-american-housing.md`,
conclusions C2/C4/C5/C6/C9) found the splash was missing: a taught noun stack
(C2), a numbered commission ritual shown twice (C4), a "what stays the same"
objection-handling move (C5), and the one cheap legal risk-subtraction fact (C6).
These four items close those gaps without touching the studio's substance.

## Verify

- `npm test` (vitest run): 62 passed, 11 files (was 46 / 8). New/extended:
  `src/data/config.test.ts` (ENGINE_NAME + CTA constants + no-dash), `src/pages/
  splash/copy.test.ts` (ritual/stays copy is dash-clean, ritual carries the live
  count, figures come from the engine not hardcoded), `src/pages/SplashPage.test.ts`
  (+ noun stack, ritual live figures, objection strip; existing dash + durationless
  + Eden/Bower assertions still green).
- `npm run build` (tsc --noEmit + vite build): green.
- Dev server already running on http://localhost:5333/ (Daniel's session, strictPort);
  returns 200. I did NOT start a second server.
- Static + SSR verification only. The test suite renders both pages to string via
  `react-dom/server` and asserts the new copy + live numbers + no em/en dashes, but
  a real-browser eyes-on pass (header wrap at small widths, ritual rhythm on
  fieldBlue, the widened envelope diagram centering, the stays strip on yellow) has
  NOT been done here. That visual pass is the next step, per the brief.

## Left / flagged

- **The splash base was uncommitted in the working tree at ba68832.** The prior
  session built the splash landing (`SplashPage.tsx`, `src/pages/splash/*`,
  `typeScale.ts`, the `#/studio` routing move, `SPLASH-PAGE-SPEC.md`) but never
  committed it; those files were untracked/modified when I started. My four items
  edit some of those untracked files (`SplashPage.tsx`, `SplashHero.tsx`), so the
  base and my work are inseparable at the file level and a partial build-green
  commit is not possible. This work therefore lands as one coherent green commit
  that also introduces the base into history. If Daniel wanted the base committed
  separately with its own message, this can be reset locally (nothing is pushed).
- **ENGINE_NAME is still the generic "the engine"** pending the Daniel/Clay naming
  call. When it lands, change the one constant (and, if the noun should also carry
  into the CTA, `CTA_PRIMARY_EVALUATOR`).
- CTA swap for the buyer audience is deferred to post-Jul-17; both labels exist.
- Not pushed. Awaiting Daniel's push approval.

## Files

New (mine): `src/ui/Sprout.tsx`, `src/ui/BowerMark.tsx`, `src/pages/splash/copy.ts`,
`src/pages/splash/copy.test.ts`, `src/data/config.test.ts`, this handoff.
Modified (mine): `src/data/config.ts` (ENGINE_NAME + CTA constants), `src/pages/
splash/SplashHero.tsx` (BowerMark + noun-stack nav + CTA constant), `src/pages/
SplashPage.tsx` (ritual section, stays-the-same strip, compact recap, CTA constant),
`src/pages/EnginePage.tsx` (BowerMark header + ENGINE_NAME), `src/pages/engine/
SiteEnvelopeDiagram.tsx` (viewBox padding), `src/ui/Navbar.tsx` (import shared
Sprout), `src/pages/SplashPage.test.ts` (new assertions).
Base (prior session, uncommitted, folded into the same commit): `src/pages/
SplashPage.tsx` assembly, `src/pages/splash/{SplashHero,HeroCanopyMark,
SeasonalBecomingDiagram,RegisterInterest}.tsx`, `src/pages/typeScale.ts`,
`src/Root.tsx`, `src/routing.ts`, `index.html`, `src/pages/engine/{EngineSection,
GrowthPhasesDiagram,StrutFieldDiagram}.tsx`, `docs/SPLASH-PAGE-SPEC.md`.
