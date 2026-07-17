# 2026-07-17 — Making `#/draw` filmable: framing, turntable, on-camera copy

Session 3b. Scope was deliberately narrow: **make the existing flow filmable, do not
touch the engine.** The pointer-scheme rework (session-3 task 1) stays deferred and
untouched. Lift and excavate are out of the filmed shot, so their known bugs were left
alone deliberately.

**Branch `engine-draw`**, worktree `restless-egg/engine-session`, off `main`.
**Nothing pushed. `main` untouched.**

Gates, all green:
**`npx tsc --noEmit` = 0 · `npx vitest run` = 416/416 · `npm run build` clean.**
(Baseline was 387 at session start; +29, none deleted.)

## What

0. **The price panel stopped calling the number "fixed".** Daniel's call, 2026-07-17. It
   now reads `£17,000  INDICATIVE · PRE-QUOTE` over the unchanged BOM line. See below.
1. **Zoom-to-fit framing** (`src/pages/draw/framing.ts`, `CinematicCamera.tsx`). The camera
   glides to a distance that fills the frame when the canopy appears, again on bake, and
   back to the opening pose on "start over" so takes are repeatable. Smoothstep over 1.6 s;
   never a cut.
2. **Turntable after bake.** Slow continuous orbit, 26 s per revolution, stopping dead the
   instant a pointer lands on the canvas. `OrbitControls` gained `enableDamping` (0.07), so
   hand-turning no longer stops like a stepper motor.
3. **On-camera prose**: the four em dashes in `fromDrawing.ts` nudges are gone, rewritten
   with commas/periods/colons. Meaning and tone preserved.
4. **Caption bug** fixed: the draw tool's hint was the OPENING instruction, so with two
   lines drawn and a canopy standing the caption read "drag a line across the lawn". Now
   "another line grows it".

## Why the price label changed (task 0)

The panel read `£17,000` over `FIXED · 14.3 M² · 4 FEET · 194 PIECES · 108 NODES`.
"Fixed" is a claim of certainty, and the number cannot support it: `pricing.ts` builds the
figure line-by-line off the real BOM, so it MOVES correctly, but its own header carries the
loudest TODO in the demo, that **every unit rate in PRICING is a PLACEHOLDER until fab
quotes land**. The quotes never arrived. Meanwhile the deck says ~£100k. So the one word on
camera asserting exactness was the least defensible thing in the frame.

Now: `£17,000  INDICATIVE · PRE-QUOTE`, with the qualifier riding the figure's own baseline
rather than sitting under it, so it costs no extra line and nobody reads the number without
reading what kind of number it is. The BOM line below is untouched, because **the
decomposition is the credible part**: 194 pieces and 108 nodes are counted off the actual
kit and are true right now. It is the MAGNITUDE that is pre-quote, not the object.

**The figure did not move: £17,000 before, £17,000 after, from the identical drawing.** No
rate in `data/config.ts` was touched and `engine/pricing.ts` was not touched. Moving a rate
to make the figure look more like the deck would be reverse-engineering evidence to fit a
marketing claim, and is explicitly forbidden.

The copy lives in `src/pages/draw/priceCopy.ts` rather than inline in the JSX for one
reason: this suite runs in a bare node environment with no DOM (`vitest.config.ts`), so
copy inside `DrawPage` (which pulls in R3F) is untestable. One import buys 7 tests pinning
the sentence that carries the honesty claim, including a guard against a later edit
reaching for "guaranteed" / "final" / "quoted".

**Residual, for Daniel, not actionable by me:** the label makes the panel honest, but it
does not close the ~6x gap between £17,000 on camera and the ~£75-150k installed in the
deck. Anyone who has read the deck and then watches the film will notice. That is a
pricing/messaging question, not a HUD question.

## Why the framing is the shape it is (three wrong answers, each caught by measurement)

The complaint was "fills ~1/3 of frame, sits low, dead vellum above". Turned into numbers
with a puppeteer probe against the real page, then solved:

- **A bounding-SPHERE fit is wrong.** A canopy is flat and wide inside a 16:9 frame; its
  sphere is driven by the plan diagonal, so it reserves as much vertical room as
  horizontal and pushes the camera BACK. It wanted 11.6 m for an object already too small
  at 9 m.
- **A bounding-BOX fit is also wrong**, and this one shipped briefly. An Eden is a DOME:
  it is empty at every corner of its own box. The binding constraint was the bottom-near
  box corner, thin air two metres from the nearest strut, and it spent a third of the
  frame on it. Measured: lattice at 55% of frame height while the box it solved for sat at
  93%. **Fit the object's own points** (`geometry.nodes` when baked, a sampled point cloud
  of the skin when soft).
- **Aiming at the object's centre is wrong.** That centres the BOX, not the PICTURE: under
  perspective the near half projects larger, so the dome sat low. `fitCamera` projects,
  measures the offset, and slides the target to cancel it, iterating to convergence. The
  correction runs along WORLD up (not the camera's tilted up) so the target stays on the
  object's own vertical axis, which is what makes the turntable rotate in place instead of
  swinging the object across frame.

**A sweep was built and then deleted.** I expected the turntable to clip the lattice once
its plan ellipse turned its major axis to camera, and wrote a rotationally-invariant fit
for it. The test written to demonstrate that failure *disproved* it: the VERTICAL
constraint binds at every azimuth and an object's vertical extent barely changes as it
turns. Confirmed on the real page across a full revolution (below). The sweep bought
nothing and was removed; the guard test stays.

## Verify

Live-driven in a real Chrome (puppeteer, real mouse drags), 1440x900, at
http://localhost:5344/#/draw. Object extent measured by colour classification of the
frame, camera-independent. Fractions are of the canvas.

| | width | height | headroom | footroom | ink |
|---|---|---|---|---|---|
| canopy, before | 0.264 | 0.368 | 0.253 | 0.378 | 0.062 |
| canopy, **after** | **0.484** | **0.724** | **0.114** | **0.162** | **0.216** |
| baked, before | 0.327 | 0.491 | 0.277 | 0.232 | 0.062 |
| baked, **after** | **0.534** | **0.815** | **0.096** | **0.089** | **0.157** |

- **Motion after bake:** before, **0 pixels** changed over 2.6 s. After, ~160k.
- **Turntable stops on touch:** 339k pixels/2 s while running, **0 pixels/2 s** after a
  press on the canvas. (A press on a HUD panel does not stop it. That is correct: you
  clicked a panel, not the object.)
- **Full revolution, 14 frames over 28 s:** headroom 0.089–0.096, footroom 0.047–0.222,
  never clipped at any azimuth.
- **Price panel:** reads `£17,000  INDICATIVE · PRE-QUOTE` on one baseline (verified
  `sameLine: true` by comparing the two elements' bounding rects), over the unchanged BOM
  line `14.3 M² · 4 FEET · 194 PIECES · 108 NODES`. The word "fixed" no longer appears
  anywhere in the rendered page (`/\bfixed\b/i` over `document.body.innerText` = false).
  The panel got slightly NARROWER, since the BOM line lost its `FIXED · ` prefix: no
  height or width cost. Before/after crops taken at identical coordinates from the
  identical drawing.
- **Caption at 2 lines with the canopy up:** now "another line grows it" (was "drag a line
  across the lawn").
- **Dashes:** zero em/en dashes in any nudge the engine can emit, pinned by a test that
  walks nine drawings covering all three nudge kinds.

**Not verified:** trackpad feel (cannot simulate; two-finger drag maps to wheel). The soft
canopy reframes on every new line past the second, which is right for the shot but has not
been lived with during a long sculpting session. Lift/excavate deliberately do NOT reframe.

## Left

- Everything from the session-2 handoff's Left list is untouched and still stands
  (sculpt-gesture robustness, EC5 decision, ring-count bug).
- Session-3 task 1 (the pointer scheme: orbit vs draw) remains the biggest UX debt and is
  still deferred. The automation note stands: **a drag starting on the lawn draws a line**,
  so orbit in automation by starting on the vellum. Note the HUD panels now sit over the
  object at the new framing, so pick a clear patch (top-right is safe).
- `FRAME_MARGIN` (1.22) is the one taste dial. 1.08 filled 93% of frame height and touched
  the edges; 1.22 lands ~75-80% with an even band. Daniel's call if he wants it tighter.

## Files

- `src/pages/draw/priceCopy.ts` + `priceCopy.test.ts` — NEW. The price qualifier and the
  BOM line, extracted so a DOM-less suite can pin them. 7 tests.
- `src/pages/draw/framing.ts` — NEW. Pure fit math: `fitDistanceM`, `fitCamera`,
  `surfaceSamples`. No THREE, no React, so it is tested by numbers not screenshots.
- `src/pages/draw/framing.test.ts` — NEW. 20 tests, incl. an independent re-projection
  that can disagree with the fit's own algebra, and a tightness pin (sabotage-checked: a
  15% overshoot fails it).
- `src/pages/draw/CinematicCamera.tsx` — NEW. Tween + turntable. Not `autoRotate`: drei
  calls `update()` without a delta, making autoRotate refresh-rate dependent (26 s at
  60 Hz becomes 13 s at 120 Hz), and a filmed shot needs real seconds.
- `src/pages/DrawPage.tsx` — framing state/effects, damping, `onStart`, caption fix, price
  panel qualifier.
- `src/engine/fromDrawing.ts` — four nudge strings de-dashed.
- `src/engine/fromDrawing.test.ts` — +2: the dash rule, and a coverage guard so the dash
  test cannot pass over prose it never read.

## Gotchas earned here

- **`grep '[—–]'` matches BYTES, not characters.** `—`, `–` and `→` all start with 0xE2, so
  a bracket expression flags the arrow in `2 lines → 4 contacts` as a dash. Use perl with
  `-CSD` and `\x{2014}`. JS regex is fine (UTF-16).
- **A reference-frame diff is only a control if the camera is nailed down.** The first
  instrument diffed each frame against the empty lawn. The moment the framing move worked,
  the lawn swept across frame and counted as object: it reported 96% width for a lattice
  covering 35%. Classify by colour instead.
- **Mask the HUD in the state you shot it in.** Masking every frame with one state's HUD
  let the other state's caption count as object and reported 3% headroom for a 2 m arch.
- **Use percentiles, not min/max, for a bbox.** A few stray pixels on a chip edge defined
  the whole box.
- **Backticks inside a double-quoted bash string are evaluated by BASH, not passed
  through.** Editing this very file via `python -c "..."` from bash silently deleted every
  `code span` in the replacement text (bash ran them as commands and substituted the empty
  output), and it committed that way. The "command not found" spam was the only tell, and
  it is easy to read as harmless noise. Use the Edit/Write tools for prose containing
  backticks, or a quoted heredoc.
