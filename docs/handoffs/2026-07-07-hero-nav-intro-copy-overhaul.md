# Handoff: hero copy + fixed nav + intro + loader/seam overhaul

Date: 2026-07-07 · Branch: `V3` · Not committed

Round of home-page changes from Daniel's in-depth review (8 notes). All on `V3`.

## What

1. **Killed the "growing your Eden…" flash (note 1).** `index.html`'s pre-JS
   `#root:empty::after` loader was a beige (#F6F4EE) screen with that text. It is now
   a blank vellum (#FBF9F3) field, no text, toned to the intro backdrop so there is no
   perceptible flash on load/refresh.
2. **Intro holds longer (note 2).** `BowerIntro` timeline: travel 1150→2400ms, fade
   2500→3800ms, done 3000→4300ms. The assembled "bower" lockup now dwells ~1.25s
   before it flies to the nav, so a first-time visitor registers the company.
3. **Bigger nav + tagline (note 3).** New `SplashHeader`: Oculus mark 16→26px,
   wordmark 11→17px medium, nav links 11→13px, tagline 11→12px. `BowerMark` gained
   `markSize` / `nameClass` props so the engine-page chrome is untouched.
4. **Nav frozen for the whole scroll (note 4).** The header was inside the hero and
   scrolled away after the hero unpinned. It is now a single `position: fixed`
   `SplashHeader` rendered once in `SplashPage`, with a frosted vellum backdrop
   (`bg-paperVellum/80 backdrop-blur-[6px]` + hairline border) so content passes
   under it cleanly. No hero mode renders its own header anymore (there must be
   exactly one `[data-wordmark]`, the intro's travel target).
5. **Hero copy stripped to essentials (note 5).** Removed the eyebrow
   ("Bower · living architecture for the garden"), both CTAs ("See how the engine
   works", "Register interest"), and the live stats strip (footprint/rise/price).
   New copy: a 7-word outcome headline **"Grow a living _Eden_ in your garden."** with
   **Eden** in an animated handwritten cursive (Dancing Script, `font-handwrite`), plus
   one mission line **"Rewilding gardens through architecture anyone can build."** The
   cursive Eden writes on left-to-right, scroll-driven (`EDEN_IN` threshold) in the
   scrub hero, CSS `animate-write-on` in poster/static modes.
6. (note 6 skipped by Daniel)
7. **Killed the beige/white seam (note 7).** `body` was #F6F4EE while every vellum
   surface is #FBF9F3; the two met behind the hero's transparent lower edge. Set
   `html,body` + the loader + `theme-color` to #FBF9F3, and gave the scrub-hero
   wrapper an explicit `bg-paperVellum`.

## Why

Daniel's review of the V3 branch (server booted for in-depth walkthrough). Copy
direction was his: AUAR-style outcome headline ("Easy and affordable building
on-site") + a TAHC-style mission line ("Saving the American Dream through all out
manufacturing"). "Commission a living Eden" was called corny; Eden kept but recast
as the cursive focal word.

## Verify

- `npm run test` = 75/75 green · `npm run build` = clean (tsc + vite) · console clean
  on localhost:5333.
- Eyes-verified: intro (nav bigger), hero at scroll ~950 (cursive Eden + write-on),
  hero exit under frosted nav (no collision), hero→chartreuse (no seam), register +
  footer with frozen nav. Screenshots in session scratchpad.
- Intro's longer hold is timeline-only (deterministic); worth a fresh-tab eyeball.

## Left / open for Daniel

- **Copy is a draft to approve.** Headline "Grow a living Eden in your garden." and
  mission "Rewilding gardens through architecture anyone can build." are my picks
  from his AUAR/TAHC references. Easy one-line swaps in `HeroReveal.tsx` (`HeroCopy`).
- **Cursive font is swappable.** Currently Dancing Script; Caveat / Parisienne /
  Great Vibes are alternatives (change `tailwind.config.js` `handwrite` + the
  `index.html` Google Fonts link).
- Headline stacks one word per line (huge H1 clamp + `max-w-[22ch]`). Dramatic but
  tall; widen `max-w` to reduce stacking if preferred.
- `POLLINATOR CELLS: 0` on the yellow ecology card is honest math rounding sub-1 at
  the small default habitat (not a bug). Display fix ("<1") still pending Daniel's call.
- Rendering pipeline (note 8): discussed separately, not yet built.
- Commit + push V3.

## Files

index.html · tailwind.config.js · src/ui/BowerMark.tsx ·
src/pages/splash/SplashHeader.tsx (new) · src/pages/splash/HeroReveal.tsx ·
src/pages/splash/BowerIntro.tsx · src/pages/SplashPage.tsx ·
src/pages/splash/HeroReveal.test.ts · src/pages/SplashPage.test.ts
