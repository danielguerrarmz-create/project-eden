# Handoff — the Ascent: an About page you climb

**Date:** 2026-07-16 (same day as, and superseding, the hanging-scroll draft handoff)
**Branch:** `about-v2-nonflowers`. Nothing committed — Clay directed the design; Daniel has not reviewed.
**Route:** **`#/about/ascent`** · previous drafts intact (`#/about` shipped page untouched, `#/about/scroll` kept for comparison).

---

## What

The About page as one upward journey, per Clay's direction ("what if we scrolled upwards?").
You land at the ROOTS — title, the two questions, a blossom branch rooted on the page's
floor, and the affordance line "grown, not built — start at the roots ↑" — and climb
through the story to the pigment crown at the summit, under the header's wordmark.
Total climb ≈ 6 viewports (5406px @1440×900).

**Mechanics — the chat-log pattern.** The scroller is a `flex-col-reverse` container, so
DOM order stays reading order (screen readers / tab order / tests see a normal page), the
browser pins the initial scroll to the bottom natively, and `overscroll-contain` stops
mobile pull-to-refresh from firing on the final swipe. **Escape hatch:** `ASCENT = false`
in `AscentPage.tsx` renders the identical DOM as a normal downward page. Sections are met
from below, so in-section stacks are also `col-reverse` (2021 lowest, kickers met first).

**The One Stem** (`src/pages/ascent/OneStem.tsx`) replaces the timeline: the six-entry
dated ledger (2021→2026, all facts sourced) hangs off a single **ink-voice vine** grown up
the left rail by the new **garland composer**. The vine's path is derived from the
measured entry positions — growth follows the typography. Root bud at 2021; leaves and
blossom clusters at the years; repaints on resize (64px height buckets).

**The garland composer** (`src/engine/gongbi/garland.ts`) — growth along arbitrary
geometry: the vendor's tubify rails + graded-quad shading over OUR polyline, and the
vendor's actual `leaf()`/`stem()` organs aimed with `grot()` per woody()'s own flower
recipe. Voices: `pigment` (genome palette) and `ink` (everything in ramps of #3E7CA8 —
`inkTune()` applies the same override to whole plants via the new `GenerateOptions.tune`
hook). Runs through the same worker pool/cache as commissions. NOTE: upstream's stem
shader multiplies HUE by noise (walks blue into green); the composer's tube pins hue and
lets noise modulate sat/value only — pedicels use the tube too, for the same reason.

**Work index + sheet** (`WorkIndex.tsx`): the twelve projects as a compact grouped index
on the climb; each row opens a ProjectSheet overlay (plate anatomy reused from the scroll
draft; plain fade, deliberately NO layoutId/AnimatePresence — see the deadlock warning in
CLAUDE.md). Founders carry **ink-voice** specimens. Pigment appears exactly TWICE: the
roots' hero branch and the summit crown.

**Vendor API additions** (no algorithm changes; see its README): `FloraInstance.stem/leaf`
exposed, `grot` + arg interfaces exported, `GenerateOptions.tune` genome transform.

## Verify

- Gates green: typecheck 0 · vitest 303/303 · build clean.
- Live (headless Chromium 1440×900): landing pins to the roots (scrollTop 0 in the
  reversed container), all 4 plant commissions + vine paint (~15s cold), climb shot at
  every viewport, project sheet opens/closes, zero console errors.
- Climb order verified visually: kicker → 2021 … 2026 → coda; "everything above grows
  into one place: Eden" now literally points at the summit.

## Left (open)

1. **Daniel sign-off**: this replaces his timeline on the draft and amends the one-colour
   rule (pigment as two scarce events). Flagged, not merged.
2. **Taste pass**: vine seed (`bower/one-stem` — swap in OneStem.tsx), summit crown seed
   (current eden take is olive-quiet for a "pigment event"), founder ink specimens.
3. Mobile + Firefox/WebKit passes (column-reverse scrollTop semantics; gesture check for
   pull-to-refresh at the summit).
4. Lab has no garland preview yet — curation currently means editing the seed and looking.
5. The scroll draft (`#/about/scroll`) can be deleted once the ascent is chosen; the
   ascent imports FanPainting/paintings/plate pieces from `src/pages/scroll/`, so deletion
   means moving those shared files first.

## Files

New: `src/engine/gongbi/garland.ts`, `src/pages/ascent/{AscentPage,OneStem,WorkIndex}.tsx`.
Modified: `src/engine/gongbi/{paintCore,paintWorker,painter}.ts` (voice + garland jobs),
`src/pages/scroll/{FanPainting.tsx,paintings.ts,ScrollPage.tsx}` (voice; shared exports),
`src/vendor/nonflowers/nonflowers.ts` (API additions), `src/routing.ts`, `src/Root.tsx`.
