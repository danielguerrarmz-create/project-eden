# Prompt for the next session (Fable 5)

Copy everything below the line into the new session.

---

We are continuing work on the **Eden engine** for Bower. You are picking this up from a
previous session (Claude Opus 4.8) — you have none of its context, so **start by reading the
handoff**:

```
C:\Users\danie\restless-egg\engine-session\docs\handoffs\2026-07-16-engine-draw-and-sculpt.md
```

Read that file first, in full, before touching anything. Also read `CLAUDE.md` in the repo
root. Everything below is orientation, not a substitute for the handoff.

## Where you are

- Worktree: `C:\Users\danie\restless-egg\engine-session`
- **Branch: `engine-draw`** ← check this out; it is the engine assessment/exploration branch
- Do **not** touch `main`. Do **not** push. Commit locally.
- Another session concurrently owns the About page in `C:\Users\danie\restless-egg\app`.
  **One worktree per agent** — do not run `git stash`/`checkout`/`reset` against a tree
  someone else is using. This cost the previous session real time.

Branches, deliberately separated:

| branch | what it is |
|---|---|
| `engine-draw` | **your branch.** The drawing/sculpt flow + the engine obeying drawings. 384 tests. |
| `engine-geometry` | Safe, shippable geometry fixes only (spider-disc hubs, overlay normals, HUD honesty). 277 tests. Mergeable as-is. |
| `engine-piecesolid-wip` | Clay's ring-fairing port, **parked pending an engineering decision** (EC5). Do not merge without Daniel. |
| `origin/manufacturable-component-model` | Clay's older paused arc. Prior art; skim before re-solving anything. |

## Setup

```bash
cd C:\Users\danie\restless-egg\engine-session
git checkout engine-draw
npm install
npm run dev -- --port 5344     # port 5344, NOT 5333 — 5333 belongs to another session
```

Open http://localhost:5344/#/draw and **drag two lines across the lawn**, then hit `bake it`.
That is the whole product idea in ten seconds. `#/studio` is the old parametric configurator —
untouched, still works, and it is the safe fallback.

Gates before you call anything done: **`npx tsc --noEmit` = 0 · `npx vitest run` = 384/384 (never
fewer) · `npm run build` clean.**

## The thesis, in Daniel's words

The studio's four sliders make it *"another Grasshopper copy where you simply change the
parameters and move the sliders and let that be the design factors."* It has to be something an
**artist or a non-designer** can create with, where **AI implies or makes adjustments** for
them. The build **must not bake immediately** — two arcs interpolate a surface you keep
sculpting, lifting, excavating, and **bake is the last move**.

So: you draw badly on purpose, and the engine reads intent and says out loud what it decided.
An engine that silently snaps your line to its bounds is a slider in a costume.

## Your first task

**The surface model is wrong, and the handoff explains exactly how.** The engine now faithfully
obeys the drawing — but it is obeying a bad surface: it reads as a **tent with steep walls**
instead of a canopy with an eave and open sides. Cause: `surfaceHeight` (`src/engine/surface.ts`)
interpolates the drawn ribs, but the hull edges run **between feet**, and a rib is at zero near
its own foot — so the boundary dives to the lawn all the way round.

The rule you want **already exists in the engine**: `eaveHeightM` + `footPull` in
`src/engine/geometry.ts` — the eave stays *up* between the legs and dives only at them.

**There is an open design fork that only Daniel can settle. Ask him before building:**
- (a) the drawn arcs **are** the ribs (what is built now), or
- (b) the arcs are the **gesture**, and the engine raises its own canopy from them — feet and
  plan from the lines, eave and cap from its own rules.

The previous session's recommendation was **(b)**, because it is what the engine's own geometry
says an Eden is.

## The one rule that matters most here

**Look at the render. Do not reason about geometry from source alone.**

The previous session got the surface wrong **twice**, and a green test suite caught neither —
one screenshot caught both. It also asserted two things confidently that turned out to be
**false** (that struts overshoot their joints; that the sculpt solver was dead). Both cost
hours. Daniel is architecturally trained and will see things the code will not tell you: show
him a before/after render, not a description of one.

Related traps, all real, all documented in the handoff's Gotchas section:
- Chrome screenshots of WebGL come back **blank** when the tab is unfocused, and an unfocused
  tab throttles rAF so live readouts look dead. Click to focus before judging any 3D.
- A failing test is information. The previous session's subagent **deleted** a failing
  buildability test to go green — and that test was the single most valuable finding of the day.
  Never do that.

## Working style (Daniel's standing preferences)

- **Report once, at the end.** No narration of subtasks or background work. Go quiet, then
  deliver one cohesive report with questions batched.
- Keep output short and lead with the outcome. Quick bullets over prose walls.
- No em/en dashes as punctuation in prose.
- Delegate to the Axon fleet (`~/.claude/agents/`) rather than generic subagents — but see the
  worktree warning above.
- Every drastic change gets a handoff doc at `docs/handoffs/YYYY-MM-DD-*.md` (What/Why/Verify/
  Left/Files).

## Also open (lower priority — the handoff has detail)

1. **EC5 compliance** — Clay's ring-fairing works but moves the fabrication standard and reveals
   ~35% of struts are sub-millable. An engineering call for Clay/Daniel, not a rendering call.
2. **Ring-count bug** — bays are ~25% denser than the `lattice` slider claims. Two lines, but it
   moves the price. Needs Daniel's approval; delta never measured.
3. Import drawings (the reader exists and is tested; only UI missing); Year 3 foliage reads as
   faceted green rocks; the site step is parked scaffold, not deleted.
