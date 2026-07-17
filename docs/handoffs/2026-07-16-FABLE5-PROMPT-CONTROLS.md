# Handover prompt — Fable 5 session 3: make the draw controls intuitive

Paste everything below this line into the next Fable 5 session as its opening message.

---

We are continuing work on the Eden engine for Bower. You are picking this up from a
previous Fable 5 session — you have none of its context, so start by reading the handoffs,
in this order, in full, before touching anything:

1. `C:\Users\danie\restless-egg\engine-session\docs\handoffs\2026-07-16-engine-session-2-handoff.md` (current state of the world)
2. `C:\Users\danie\restless-egg\engine-session\docs\handoffs\2026-07-16-engine-gesture-canopy.md` (the surface model, settled)
3. `CLAUDE.md` in the repo root

Everything below is orientation, not a substitute for those.

## Where you are

- Worktree: `C:\Users\danie\restless-egg\engine-session`
- Branch: `engine-draw` — should already be checked out at `7dc60f3` or later, tree clean.
- Do not touch `main`. Do not push. Commit locally.
- Another session may own the About page in `C:\Users\danie\restless-egg\app`. One
  worktree per agent — never run git stash/checkout/reset against a tree someone else is
  using. Ownership boundaries are listed at the end of the session-2 handoff; respect them.

Setup:

```
cd C:\Users\danie\restless-egg\engine-session
git status                      # expect engine-draw, clean
npm install
npm run dev -- --port 5344      # port 5344, NOT 5333 — 5333 belongs to another session
```

Open http://localhost:5344/#/draw and drag two crossing lines across the lawn. The engine
raises a canopy from your gesture (that model was settled by Daniel on 2026-07-16 as
option (b): the arcs are the gesture, not the ribs). Hit bake it and it becomes the real
kit with a price. `#/studio` is the untouched parametric fallback.

Gates before you call anything done: `npx tsc --noEmit` = 0 · `npx vitest run` = **387/387,
never fewer** · `npm run build` clean.

## Your task: the controls

The surface model is now right; the CONTROLS are not. Think of a real person with a mouse
or a trackpad, in a browser, meeting this page cold: they will drag to look around, click
things expecting selection, and expect a wrong line to be fixable. Today the tool fights
all three instincts. Work through these, worst first:

1. **Orbit vs draw is broken.** Left-drag on the lawn ALWAYS draws (in draw mode). The only
   way to orbit is to start the drag on the vellum background outside the lawn circle,
   which no user will ever discover — the previous session drew an accidental third line
   trying to look at the object. Trackpad users are worse off: scroll/pinch zoom works
   (OrbitControls), but rotate needs the left-drag that drawing steals. Decide how looking
   and making share the pointer. This is a genuine product fork — put the options to Daniel
   with AskUserQuestion BEFORE building the full scheme. Candidate directions to weigh,
   not a prescription: right-drag / two-finger-drag always orbits; left-drag draws only on
   the lawn and orbits elsewhere; or orbit is the default and drawing is an explicitly
   armed mode with visible state. Whatever wins must feel obvious on BOTH mouse and
   trackpad, and the current "it depends where the drag started" behaviour must die.
2. **Selection and repair.** The drawing is append-only: undo is a stack pop, so fixing the
   first line means losing everything after it. A person expects to click an arc to select
   it, delete just it, and probably drag a foot dot to move it (the whole engine re-runs
   from `arcs`/`edits` state, so arbitrary edits are cheap — `DrawPage` holds plain arrays).
   Keep it minimal and gestural — this product's language is "a point and a radius", not an
   inspector panel — but a wrong line must be repairable in one obvious move.
3. **Gesture robustness (known bugs, documented in the session-2 handoff, Left item 1):**
   - Excavate radius blows up if the drag crosses off the surface mid-drag (plan-space
     jump → one gesture eats the whole canopy). Clamp it or ignore off-surface moves.
   - A lift is LOST if pointer-up lands off the surface (R3F pointerup never reaches the
     mesh; refs stay armed). A window-level pointerup listener is the likely fix.
   - An ESC (or any cancel affordance) for a stroke in flight does not exist.
4. **Affordances.** The cursor never changes; nothing responds to hover; there is no hint
   that the lawn is drawable or the surface sculptable beyond one line of caption text.
   Small, quiet feedback — cursor swaps, a hover glow on arcs/feet, the in-flight ghost you
   already have — not tooltips everywhere. Match the existing restrained visual language.
5. **Camera feel.** No damping (movement stops dead), `enablePan` is false (probably right,
   reconsider deliberately), and after the first surface appears nothing frames the object.
   Consider OrbitControls damping and a gentle zoom-to-fit on the second line. Feel, not
   features.

Constraints that are settled — do not relitigate:

- The interaction language stays "draw badly on purpose, the engine reads intent and says
  what it decided". No numeric inputs, no gizmos, no inspector panels.
- The engine files (`src/engine/*`) should barely change for this work; this is a
  `DrawPage` / `DrawStage` / camera task. If you find yourself editing the geometry to fix
  a control, stop and reread the handoffs.
- `#/studio` must keep working untouched; the byte-identical test pins the engine side.

## The one rule that matters most

USE the controls, do not reason about them. Drive every change in the real browser with
real drags — mouse behaviour via claude-in-chrome, and think through the trackpad case
explicitly since you cannot simulate it (two-finger scroll maps to wheel; there is no
right-button habit; pinch is ctrl+wheel). The previous sessions' biggest failures came
from believing code over renders. For interaction work, record short GIFs
(claude-in-chrome gif_creator) or before/after screenshots and SHOW Daniel — he is
architecturally trained and judges feel by eye. Get his sign-off on the pointer scheme
before the full build, then again on the built thing.

Known browser-automation traps (all real, all documented):

- Drags issued right after a page load/reload silently do nothing (hydration). Wait, then
  gesture. Click the page to focus before judging any 3D — unfocused tabs throttle rAF and
  screenshot blank for WebGL (use zoom capture).
- A drag that starts on the lawn draws a line. Today orbiting in automation means starting
  the drag on the vellum outside the lawn circle — top corners are safe. (If you fix task 1
  properly, update this note in your handoff.)
- Vite HMR lies after files move between modules; hard-reload before debugging weirdness.
- In `DrawStage`, refs are the truth and state only mirrors for painting — React batches
  a drag's events, and reading state on pointerup reads the value from the drag's start.
  That bug bit twice; do not reintroduce it while refactoring handlers.

## Working style (Daniel's standing preferences)

- Report once, at the end. No narration of subtasks. One cohesive report, questions batched.
- Keep output short and lead with the outcome. Quick bullets over prose walls.
- No em/en dashes as punctuation in prose.
- Ask Daniel only what only Daniel can decide (the pointer scheme is exactly that); decide
  the rest yourself and say what you decided.
- Gates green before "done": tsc 0 · vitest 387+ (never fewer; a failing test is
  information, never delete one to go green) · build clean.
- Every drastic change gets a handoff doc at `docs/handoffs/YYYY-MM-DD-*.md`
  (What/Why/Verify/Left/Files), committed locally to `engine-draw`. Write the next
  session's prompt if Daniel asks for one.

## Also open (NOT this session's job — do not drift into these)

- EC5 / ring-fairing decision (`engine-piecesolid-wip` @ `736c980`) — Clay/Daniel call.
  The restored `subMillableStrutCount` test there correctly fails; never delete it.
- Ring-count bug: bays ~25% denser than the lattice slider claims; needs Daniel's approval
  and the price delta measured first.
- Pointy-corner feet stand outside the faired plan (candidate AI nudge); holes smaller
  than a bay may not remove members at bake; import-drawing UI; Year 3 foliage; site step
  stays parked.
