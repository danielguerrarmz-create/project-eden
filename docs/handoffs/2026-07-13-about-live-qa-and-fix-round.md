# 2026-07-13 — About page: live QA + fix round on top of round 3

## What

Round 3 (woven bower finale, ornamental leaves, heavy year labels, founder panel, project
hierarchy, autoplay) was live-QA'd in Chrome for the first time, then a fix round landed and was
re-verified live. This handoff covers the QA findings and the fixes; the round-3 build itself is
documented in `2026-07-13-about-round3-weave-merge-autoplay.md`.

Fixes in this round:

- **Year labels can no longer be occluded.** They were painted before the clusters, so plates
  drew over them (live QA caught 2023's right edge under the kenya plate and 2025's left edge
  under the dougherty plate). They now paint AFTER the clusters, with a vellum halo
  (`paint-order: stroke`, `#FBF9F3` at 8px) so the numerals stay legible even directly over an
  image edge, and opacity raised 55% → 70%.
- **The flip rule is a tested pure function.** The inline side-flip logic became exported
  `yearLabelSide(clusters, y)` (CrossPathsTimeline.tsx), with 4 new unit tests including one
  that asserts the invariant against the real CLUSTERS data. 128 → 132 tests.
- **2026 joined the year system.** The finale's year was an 11px whisper inside the wordmark
  lockup; it is now the same heavy 30px/700 treatment as every other year, with its tick, just
  above the weave fork. The tiny lockup label is gone.
- **Autoplay also cancels on pointerdown** (a scrollbar grab fires no wheel/touch/key), so a
  drag never fights the programmatic scroll.
- **Founder framing tightened again:** spacers 38svh → 24svh after Daniel flagged the frame as
  still airy.
- **Stale seed comments rewritten** (file header + `spinePts` docstring still described the
  retired seed/SEED_A).

## Why

Daniel's redlines: timestamps must be heavy and never blocked by images or roots; the finale
must read as roots woven into the wordmark (no egg, no teardrop); the founder block was framed
too loose. Gojo's static pass added the coverage gap and the stale comments.

## Verified

- Gates: `tsc --noEmit` 0 errors; `vitest run` 132/132; `vite build` clean.
- Live (Chrome, localhost:5333/#/about, 1920x876): elementFromPoint sweep across 15 scroll
  positions reports **zero** year-label occlusions (was 7 hits before the fix). Autoplay engages
  at the track pin, cruises 14s, hands control back at the bottom; a synthetic wheel event
  cancels it instantly. All three timeline videos + project videos playing (muted, loop,
  playsInline). All renamed assets return 200. No console errors.
- The "NYC fork crosses the spine" suspicion from the first pass was curve congestion, not a
  geometry bug — branch control points are all on the plate's side by construction.

## Left for Daniel

1. **Payoff line wording** — "Everything above, grown into one place." (TODO in code).
2. **Weave rejoin shape** — the arms close to a point with a terminal dot below the wordmark;
   from some crops it can read teardrop-adjacent. TODO at the site offers an open-tuck
   alternative if you want it gone.
3. **Frame purity vs tightness** — at 24svh the payoff line's tail can share a frame edge with
   the founders. Only the old 100svh spacers fully prevented that; tight framing won this round.
4. **"What we learned" vs "Lessons learned"** heading, bio fact confirmations (Rick Wright /
   TestFit years, Clay's Resia verb, Rogers Partners dates, "Dream Machine" naming), Robotic
   Factory placeholder copy, Texas Robotics year in the merged project.
5. **Orphan assets** (~1.08MB, unreferenced, deletion candidates): synergy-cosmos-
   {biocore-axon, building-elevation, eidetic-aerial, living-walls}.webp and
   testfit-clay-desk-recording-setup.webp.

## Files

- `src/pages/about/CrossPathsTimeline.tsx` — label paint order + halo, `yearLabelSide`,
  2026 label, pointerdown cancel, comment fixes, TODO(Daniel) at the rejoin.
- `src/pages/about/CrossPathsTimeline.test.ts` — 4 new flip-rule tests.
- `src/pages/AboutPage.tsx` — 24svh spacers.
- `CLAUDE.md` — open-task list updated.
- (Round 3 files themselves are listed in the round-3 handoff.)
