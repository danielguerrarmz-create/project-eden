# 2026-07-17 — Handles on the skin, and push/pull gets its name back

**Branch `engine-draw`**, worktree `restless-egg/engine-session`. **Nothing pushed. `main`
untouched.**

Gates: **`npx tsc --noEmit` = 0 · `npx vitest run` 495/495 · `npm run build` clean.**
Bundle: `three` **1058.37 kB, unchanged** — no new import. The app chunk grew 372.3 → 373.3 kB.

## What was wrong

`DrawStage.tsx:79`, `EditHalo`: a flat ring pinned at `y = 0.03` for BOTH tools, while the thing
being sculpted floated metres overhead. `plan()` throws the height away, which is right for the
model (the engine is a height field over a plan, and the gesture is "here, this big") but left
the handle with no idea the mesh existed. Daniel: *"the user will have a hard time telling where
it is at."*

## What shipped

1. **Everything lands on the skin.** `drape.ts` (new, pure, 22 tests): sample a curve in plan,
   ask `surfaceHeight` per station, get a curve lying on the surface. Rhino's
   Pull/Project-curve-to-surface, and the engine already exported the only function it needed.
2. **The excavate ring drapes** and **breaks where the skin is gone**.
3. **The push/pull node rides the lip** and previews.
4. **`lift` → `pushpull`**, all the way down: `Edit.kind` in the engine, `Tool`, every constant,
   the toolbar, the tests.
5. **Preview before commit** via `previewHeightM`.

## The rename is the feature, and the engine had to change too

The tool has been bidirectional since it was written and **nobody could tell**: `PUSH_LIMIT_M`
(was `LIFT_MIN_M`) `= -1.2` has been clamping negative amounts the whole time, `commitGesture`
gates on `Math.abs`, and `surface.ts` does `h += amountM * (1-u²)²`. Drag down the screen today
and the surface goes down.

**It was even TESTED.** `surface.test.ts` already had *"never drives the surface below ground"*
feeding `amountM: -99`. The capability was not missing. It was **unnamed and unshown**: the tool
said `lift`, the hint said "pull up", and the handle lay on the floor where no displacement could
be read against anything.

**`Edit.kind` was renamed in the ENGINE too, deliberately.** Leaving the engine saying `lift`
while the UI says push/pull would recreate this morning's `fixedTotalGBP` bug exactly: an
identifier that says `lift` regenerates copy that says lift, and the capability goes back into
hiding no matter what the panel is edited to say. **Checked first: `Edit.kind` is NOT
serialized** — `exportProject` only carries `drawing.spines` and `outline` — so no saved artifact
changes format. That was the one thing that could have made this a bad idea.

Constants are named for the direction they bound (`PUSH_LIMIT_M` / `PULL_LIMIT_M`) rather than
`MIN`/`MAX`, so the bidirectionality is undeniable at the point of definition.

## Judgement calls

- **The preview asks the engine, it does not imitate it.** `previewHeightM` appends the pending
  edit to a COPY of the real input and calls the real `surfaceHeight`. So the node inherits the
  falloff, the summing of overlapping edits, and **the planning cap** for free: a pull that will
  be clamped at `pdHeightCapM` previews clamped. The old node drew `amount` above the ground and
  would happily promise a building the grammar refuses to make, with the user finding out on
  release. One test pins the cap, one pins that it does not mutate its input (which would commit
  the gesture on every pointer move).
- **The node draws through the skin (`depthTest={false}`), only while a gesture is in flight.**
  A PUSH drives it below the surface, where the skin would hide it — and an invisible preview of
  the direction nobody knew existed is worse than no preview. Rhino's gumball draws through the
  model for the same reason.
- **Off the plan is NOT a break.** `surfaceHeight` returns 0 there, which is the lawn, and the
  lawn is a real surface. A ring that runs off the eave and lies down on the grass is telling the
  truth. Only `isHole` breaks the ring, because only there is the surface absent while the field
  still answers confidently. **A ring floating across a hole is worse than a ring on the floor:**
  the floor version is merely unhelpful, the hole version is authoritative and wrong.
- **TubeGeometry, not a line.** WebGL line width is 1 px on most platforms and this is a hero
  shot. `ArchRibbon` already builds its ribbon this way, so it is the house pattern and costs no
  import; drei's fat-line would have cost bundle we do not have.
- **Went light on the gumball**, per the brief: a ring and a node, no axes, no rings-per-axis, no
  hover state. Redlining may absorb push/pull entirely and delete the handle. **The projection
  survives that** — a redline is a stroke on the mesh from a camera and needs this identical
  operation on day one, which is why `drape.ts` is a tested module and the handle is 20 lines.

## The perf worry was real but measured, not guessed

`surfaceHeight` rebuilds the whole canopy context per call — a convex hull plus a faired-radius
closure — so a 48-station ring is 48 hulls. That sounds bad. **Benchmarked: 0.143 ms per ring,
~3 us per sample = 0.9% of a 60 fps frame.** Fine even per-frame, and the caller memoizes per
gesture anyway (the push/pull ring computes once; only the excavate ring recomputes, at pointer
rate, because its radius is what the drag is authoring). **No optimisation needed and none
added.** If station count ever goes up an order of magnitude, hoist the context rather than
sampling harder — noted in `drape.ts`.

## Verify

- **495/495**, up from 474: `drape.ts` +22, `gesture`/`surface` +2 (the bidirectionality receipts).
- The wrap case is tested explicitly and is the one that looks almost right when wrong: a gap
  straddling station 0 must be ONE run. Treating the ring as a linear array reports two runs and
  puts a seam at station 0, a place with no relationship to the hole that caused it.
- **NOT verified live in a browser.** No browser tooling reachable from this context. The pure
  layer is pinned hard by tests, but **this change is visual by definition and the rendering is
  the part tests cannot see.** Specifically unverified: whether the draped ring reads cleanly
  against the skin at `RING_PROUD_M = 0.03` (z-fighting was reasoned about, not observed), how
  the break looks at a hole edge, and whether the node reads correctly through the surface on a
  push. **Someone should drive one push, one pull and one excavate at 1440x900 before this is
  filmed.**

## Left / open

- **`docs/handoffs/2026-07-17-redlining-direction.md` is UNTRACKED** and its line 67 documented
  the AI boundary as `{ kind: 'lift'|'hole', ... }`. I corrected that one line to `pushpull`
  since it describes code I renamed and it is the doc the next phase is built from, but **the
  file is not in this commit** (not mine to add).
- The push/pull radius is still fixed at 1.5 m. That is deliberate (the gesture is "push this",
  not "set a radius") but it is the obvious next question a user asks.
- There is no handle at rest, only during a gesture — no hover state. Consistent with what was
  there before, and going further is the elaborate gumball the brief warned off.

## Files

- `src/pages/draw/drape.ts` + `.test.ts` — **NEW.** The projection. 22 tests. Reused by redlining.
- `src/pages/draw/DrawStage.tsx` — `EditHalo` → `DrapedRing`; the preview node; `Tool`.
- `src/pages/draw/gesture.ts` + `.test.ts` — the rename, direction-named limits.
- `src/engine/surface.ts` — `Edit.kind: 'pushpull' | 'hole'`.
- `src/engine/surface.test.ts` · `drawnGeometry.test.ts` — rename + the push receipt.
- `src/pages/DrawPage.tsx` — toolbar reads **push/pull**, "press on it and drag up or down".
