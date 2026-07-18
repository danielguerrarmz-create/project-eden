# 2026-07-17 — The scale figure billboards: the test was stale, not the code

**Branch `engine-draw`**, worktree `restless-egg/engine-session`. **Nothing pushed. `main`
untouched.**

Gates: **`npx tsc --noEmit` = 0 · `npx vitest run` 474/474 GREEN · `npm run build` clean.**
Bundle: `three` **1058.37 kB**, unchanged.

## The question

5 tests were red in `entryBearing.test.ts`. Uncommitted work had retargeted the scale figure
from 150° to 110° and made it billboard, without updating the test. Two ways to get green and
only one of them right: **is the new behaviour an improvement someone was mid-way through, or
an abandoned experiment?**

## Verdict: the new behaviour is right. The test was stale. Test updated.

It is not an abandoned experiment, and the evidence is not vibes:

- **It is geometrically incompatible with the old test's premise.** The 150° target existed to
  dodge one thing: at ~90° off, a flat 9 cm extrusion goes edge-on and reads as a black
  fencepost. A plane that turns to face the camera every frame **cannot present its edge**.
  The degenerate angle stops existing, so the band that existed to dodge it stops meaning
  anything, and the placement is free to be chosen on composition instead. **The old test was
  asserting a constraint whose reason had been deleted.**
- **`ScaleFigure.tsx:126-144` argues it explicitly**, and answers the obvious objection: the
  spec's "no face turned to the lens" survives by construction, because the silhouette is
  left-right symmetric and has no face, so its front and back are the same shape. There is
  nothing to turn away.
- **It carries empirical failure analysis nobody writes for an experiment they abandoned**: v1
  merged the legs into a slab (Easter Island head); v2 had anatomically correct legs whose
  10 cm gap is a **one-pixel hairline at the ~200 px the figure actually renders**, reading as
  a hooded pillar (Grim Reaper). Hence cues deliberately exaggerated past anatomy.
- **`GRAPHITE` `#3a382f` → `#87826f`** with a rig-specific reason: the spec's colour was
  authored against the house rig (ambient 0.8), and this Canvas runs 0.32 so the lattice's
  shadow can read dark. Under it the old value bottomed out into a pure black void — a hole in
  the frame, which is exactly what the spec's "NOT pure black or it reads as a cutout" existed
  to prevent. Same mistake the soil beds made under the same rig.

Also changed and also right: the standoff, `plan + 0.9` → **`plan + 0.25`**. The figure's only
job is to let a viewer read 2.5 m off the pavilion, and a viewer does that by **comparing two
heights**. Two objects metres apart in depth cannot be compared: at +0.9 the figure stood
beyond the gravel, a lone thing on a lawn near a building, which says nothing about either. At
the threshold the eye reads it against the nearest leg directly.

**Nothing of Daniel's was reverted.** Only the test moved.

## What the test now says

16 tests, up from 15. Rewritten to pin the new rule, in the test's own words. No assertion was
deleted to get green — the one that had to go was **inverted and kept**:

- `stands INSIDE the old edge-on band, deliberately, because the figure billboards` — was
  `> 45` (keep clear of 90°), now `< 45`. **The inversion is the point.** It is asserted rather
  than dropped because the placement and the billboarding are **coupled, and the coupling is
  invisible from either file alone**: remove `ScaleFigure`'s `useFrame` and 110° silently
  becomes a bug, since the figure would then sit 20° off edge-on and the turntable would walk
  it straight through. **That test failing is the question "did you just un-billboard the
  figure?"**
- `takes the side with more clearance from the nearest leg` — candidates are now 110/250.
- The three `figurePositionM` tests: the apron test's premise **inverted** (was "stands clear
  of the apron", now "stands ON the gravel, at the threshold, not out on the lawn") and now
  pins both bounds that make it a threshold: outside the plan (can never stand inside the
  structure), inside the apron's outer edge (gravel still reads as ground past it).
- Added: `honours an explicit standoff`, so the threshold is tunable without editing the test.

## The turntable budget CHANGED, and the old number was wrong when it was written

Recomputed against the real functions, not by hand (`TURNTABLE_PERIOD_S = 26` → **13.846 °/s**;
the turntable only ever increases azimuth; the figure's bearing is fixed at bake):

| | near side (`az0 + T`) | far side (`az0 − T`) | **worst case** |
|---|---|---|---|
| **Old: 150°, flat** | edge-on at **4.33 s** | behind the dome at **2.17 s** | **~2.2 s** |
| **New: 110°, billboarded** | monolith at **7.94 s** | behind the dome at **5.06 s** | **~5.1 s** |

**Daniel: the number to film against is ~5 s, not ~4 s.** The budget more than doubled.

**The old ~4.3 s was optimistic in the unsafe direction.** It only considered the near side.
`entryBearingDeg` returns `camAz ± TARGET` and the feet decide which, so a take could just as
easily land on the far side, where the old figure hit the 180° occluded case in **2.17 s** —
inside the 2-3 s of turntable the previous handoff called safe. Corrected in
`2026-07-17-draw-visual-impact.md`.

**The decay does NOT "evaporate".** `ScaleFigure`'s comment claims the band constraint and the
decay both do. The band does; **the decay does not.** Billboarding kills the edge-on failure,
but off→0 (looming monolith) and off→180 (behind the dome, leg through it) both survive and the
turntable still walks toward one of them. It bought a longer runway, not immunity. The comment
overstates by one word and the table above is the real number.

## Risk found, NOT fixed, needs Daniel

**The 0.25 m standoff may collide with a pointy-corner foot.** At `plan + 0.9` the old comment
could say the figure "stands outside the footprint and cannot hit a leg" with 0.9 m of margin.
At `plan + 0.25` that margin is 25 cm — and `2026-07-17-redlining-direction.md` records an open
bug: **"Pointy-corner feet stand outside the faired plan."** A foot outside
`max(planA, planB)` is a foot the figure can now stand in. The clearance tie-break only picks
the better of two fixed candidates; it cannot guarantee clearance, and with the angle taken
rather than searched there is no third option to fall back to.

Not fixed, because fixing it means either touching the placement rule (Daniel's call, and it
may never bite if feet stay inside the faired plan) or fixing the pointy-corner bug itself
(out of scope). **Watch for the figure clipping a leg on takes with a cornered plan.**

## Judgement call you should know about: I committed the three uncommitted files

The brief for the earlier pricing pass said to leave `entryBearing.ts`, `ScaleFigure.tsx` and
`PlacedScaleFigure.tsx` alone. They are in this commit anyway, deliberately:

**HEAD had `TARGET_OFF_DEG = 150` and `standoffM = 0.9`.** Committing only the test would have
produced a commit whose tree is the OLD source plus a test asserting the NEW rule — **red on a
clean checkout**, which is strictly worse than the red we started with and defeats the point of
the task. The behaviour and its pin are one change and cannot be split across commits.

Reversible, local, unpushed: `git reset --hard HEAD~1` if Daniel disagrees. **I reverted
nothing** — the working-tree content of all three files is committed byte-for-byte as found.

## Verify

- `npx vitest run` **474/474 green**, tree fully green for the first time this session.
- Budget numbers computed by driving the real `entryBearingDeg`/`angleDeltaDeg` over a swept
  clock, not derived by hand. Both tie-break sides forced explicitly via foot placement.
- **NOT verified live in a browser.** No browser tooling reachable from this context. Nothing
  here changes runtime behaviour — **the source is byte-identical to what was already in the
  tree**; only the test and docs moved. The figure's on-camera appearance is exactly what it
  was before this commit, verified or not.

## Files

- `src/pages/draw/entryBearing.test.ts` — rewritten to the new rule. 16 tests.
- `src/pages/draw/entryBearing.ts` · `ScaleFigure.tsx` · `PlacedScaleFigure.tsx` — committed
  as found, unmodified by me.
- `docs/handoffs/2026-07-17-draw-visual-impact.md` — budget corrected, gotcha updated.
