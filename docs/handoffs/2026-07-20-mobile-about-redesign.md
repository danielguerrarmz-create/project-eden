# Mobile About redesign — shipped LIVE — 2026-07-20

Live on `main` → www.bowerbuild.org (`origin/main` at `c1db091`, code; this handoff commit follows).
Design-of-record: `docs/design/2026-07-20-mobile-about-redesign.md` (Sai's spec). Follows the same-day
Phase-1 mobile overhaul (`2026-07-20-mobile-phase1.md`) and the hamburger nav.

## What
A full redesign of the mobile (`< lg`) About timeline, replacing the Phase-1 left-rail stack. Daniel
directed it; Sai specced it; Daniel signed off the direction + two calls (tap-to-lightbox: yes;
multi-image years: primary + chips); Edward built it.

- **Center-spine is now the only mobile layout** (rail retired). A single central sepia spine,
  plates alternating left/right by `packSide`, bracketed by the twist glyph (top) and the Oculus
  mark + wordmark lockup (finale).
- **Intro title lands CENTERED on mobile.** `AboutIntro` now reads the target `h1`'s own
  `text-align` and threads it onto the flown narration copy (`lg:text-left` restores desktop), so it
  settles centred with no centre→left mid-flight snap (the glitch the file's comments warn about).
- **Questions-first, then growth.** Title + both questions appear in the page's existing `revealed`
  fade (unconditional). The twist glyph + spine grow-in fires once ~450ms after `revealed` (a held
  beat, not wait-for-scroll); from there every year node / card / finale reveals once as it scrolls
  into view via IntersectionObserver (`viewport.once`) — deliberately NOT a scroll-scrubbed camera
  and NOT a hand-rolled scroll listener (every prior mobile-timeline bug here came from extra clocks).
  Reduced motion renders everything at rest, no observers.
- **Small spine-hugging specimens.** Plates shrank from Phase-1's `w-full`-in-a-half-column stretch
  (~155–193px, the actual "too large" cause) to `clamp(80px,22vw,96px)`, ratio-true (FIT_FRAME, no
  crop), hugging the spine-side edge so they sprout off the line. Multi-image years show a primary
  plate + a tight chip row (`clamp(38px,11vw,46px)`). Rhythm `my-9` cards / `my-8` year nodes.
- **Timeline plates tap → the shared Lightbox.** Every plate/chip is a real `<button>` (hit area
  floored at 44px even when the visual is smaller; `aria-label` per image). Reuses the gallery's
  `Lightbox` (hoisted/exported from `AboutPage`) with `morph=false` — a shared `shot-${src}`
  `layoutId` across two live elements is the documented `AnimatePresence`/`layoutId` deadlock, so the
  timeline viewer fades in instead of morphing. Gallery lightbox unchanged (`morph` defaults true).
- **Projects gallery ("The Work") reframed**, not miniaturized: hero + supporting row get a restrained
  mounted-plate frame (hairline `INK_SEPIA` rule + paperVellum mat) and hairline dividers between
  chips, for register consistency with the quieter timeline above. Case-study images stay full-size
  (they're the tap-to-lightbox payoff).

## Why
The Phase-1 rail was legible but static and, per Daniel, the plates read "way too large" — diagnosed
as a stretch bug (half-column `w-full`), not resolution. He wanted the desktop's authored feel adapted
to a phone: centred title, questions first then the timeline "grows," a center spine, and specimens
small enough to glance ("enough to tell that's a robot / a growing building") but tappable for detail.

## Verify (done)
- `npm run typecheck` clean · `npm run test` 824 green ×3 (826 − 2 retired variant tests) ·
  `npm run build` clean.
- `qa/mobile-hero` 0 cropped · desktop 1440 timeline byte-identical (redesign is `lg`-gated) ·
  choreography reveals all 19 timeline images on a normal scroll, 0 stuck · 19 tap targets, 0 under 44px.
- Reveal staging captured: `qa/shots/2026-07-20-redesign/reveal-390/reveal-390.gif` (+ frames;
  `f020.png` = title landed + both questions + timeline still empty = the questions-first beat).
- Live bundle hash `index-DtCraoIG.js` matches the reviewed local build (code reviewed = code live).

## Left / open (none blocking)
- Plate/chip sizes and chips-vs-drop were shipped as Sai's recommendation, tuned on 375/390/430
  captures. Daniel said ship; any further nudge (size/rhythm, or dropping non-primary images) is a
  one-number tweak in `MobileTimeline.tsx`.
- **Phase 2 (from the mobile-overhaul plan), still not started:** dead-font declaration cleanup +
  preload audit; `/shape` `/sculpt` desktop-gate cards; extend the numeric QA probes to mobile widths
  + a portrait↔landscape rotation-state check.

## Process notes
- All mobile work (Phase 1 + hamburger + this redesign) was based on **live `origin/main`**, NOT the
  local `about-round-10` branch (52 commits behind; carries an unrelated `/lab/seeds` dev-rig WIP,
  left untouched). Done in worktree `../mobile-overhaul` on `mobile/responsive-overhaul` (pushed);
  `main` fast-forwarded to its tip each time. External host auto-deploys on push to `main`, ~1–2 min.

## Files (redesign, 840575b..c1db091)
`src/pages/about/MobileTimeline.tsx` (the tree, +415/−194), `src/pages/about/AboutIntro.tsx`
(textAlign threading), `src/pages/AboutPage.tsx` (Lightbox export + `morph`, mobile stack, gallery
framing), `src/pages/about/CrossPathsTimeline.tsx` (minor), `src/pages/about/MobileTimeline.test.ts`,
`docs/design/2026-07-20-mobile-about-redesign.md` (Sai's spec).
