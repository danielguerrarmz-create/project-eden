# Handoff: timed hero, floating nav, About page, simplification (round 2)

Date: 2026-07-07 · Branch: `V3` · Not committed · Follows the same-day
`2026-07-07-hero-nav-intro-copy-overhaul.md`.

Second review round from Daniel (7 notes).

## What

1. **First-paint "whole page" flash.** Root cause is Vite's dev-only FOUC (CSS is
   JS-injected in dev); the production build links CSS render-blocking (`dist/index.html`
   has `<link rel=stylesheet>` in head), so it does not ship. Also hardened: `BowerIntro`
   now decides `active` synchronously in the `useState` initializer, so the veil paints on
   the first frame instead of after a `useEffect` (no one-frame gap).
2. **Logo->structure is now TIMED, not scrolled.** `HeroReveal` was a 210vh scroll-scrub;
   it is now `AutoHero`, a single viewport-height stage that auto-plays the reveal off
   `requestAnimationFrame` (`REVEAL_MS = 3400`, easeInOutCubic). It starts once the intro
   veil lifts (new `INTRO_DONE_EVENT` dispatched by `BowerIntro`) or immediately if the
   intro already played this tab. Page is ~1.8k px shorter as a result.
   **Intro trimmed 0.5s** (done 4300 -> 3800ms).
3. **Nav.** Rebuilt `SplashHeader`: no background rectangle (floating titles, high-contrast
   `inkBlack`), left-origin **underline-grow on hover/focus**, **"the studio" -> "engine"**,
   new **"about"** link, tagline vertically centered with the wordmark (`items-center`).
   Still `position: fixed` (frozen). New `#/about` route -> `AboutPage` (empty placeholder).
4. **Hero copy placement.** Copy is a slim bottom band (soft upward vellum gradient): the
   headline "Grow a living _Eden_ in your garden." sits directly above the chartreuse
   section with the mission line below, leaving the upper frame for the structure. Headline
   sized down from the giant H1 clamp so it reads as a band, not a wall.
7. **Simplification pass.** Removed the decorative section eyebrows Daniel flagged as
   "random titles" ("always becoming, never finished" caption + eyebrow, "what the engine
   actually does", "the commission, start to finish", "contributing to its garden…",
   "start here", "what is real and what is a rule of thumb"). Trimmed the giant engine
   paragraph and the redundant second climbing paragraph; tightened the coda + close copy.

## Why

Daniel's round-2 review: timed transition reads more clearly than scroll; floating nav +
less chrome per the makingsoftware.com / 333southwabash.com references; "value simplicity
for the sake of disseminating complexity."

## Verify

- `npm run test` = 75/75 · `npm run build` = clean · console clean on localhost:5333.
- Eyes-verified: timed reveal completes without scrolling; floating nav (no rectangle,
  engine/about) legible over vellum + chartreuse; copy band at hero bottom; #/about page;
  simplified sections. Screenshots in session scratchpad.

## Left / open

- **"engine" nav -> `#/studio`** (the configurator). Kept it a relabel of the old "the
  studio" link. If Daniel meant it to point at the `#/engine` walkthrough instead, it is a
  one-line change in `SplashHeader`.
- Floating nav can transiently overlap a section heading when that heading scrolls under
  the top edge (the accepted tradeoff of no background bar). Add section `scroll-mt` /
  top padding if it bothers.
- Deeper simplification (note 7) is a first pass; a full editorial cut against the two
  reference sites is a good focused follow-up (Sai / Shikamaru).
- Hero image/video pipeline (note 5): recommendation given separately; not built.
- Commit + push V3.

## Files

index.html · src/routing.ts · src/Root.tsx · src/pages/AboutPage.tsx (new) ·
src/pages/splash/SplashHeader.tsx · src/pages/splash/HeroReveal.tsx ·
src/pages/splash/BowerIntro.tsx · src/pages/SplashPage.tsx ·
src/pages/splash/SeasonalBecomingDiagram.tsx · tests (HeroReveal, SplashPage)
