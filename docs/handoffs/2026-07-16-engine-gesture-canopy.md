# 2026-07-16 (later) — The arcs are the gesture: the engine raises its own canopy

Follow-on from `2026-07-16-engine-draw-and-sculpt.md` (read that first for the full arc).
This session settled and built that handoff's item 1 — THE SURFACE MODEL WAS WRONG.

**Branch `engine-draw`**, worktree `restless-egg/engine-session`. Nothing pushed. `main` untouched.
Gates: **`npx tsc --noEmit` = 0 · `npx vitest run` = 387/387 (was 384; none deleted) · `npm run build` clean.**

## What

**Daniel settled the design fork: (b) — the drawn arcs are the GESTURE, not the ribs.**
Asked with a before render (the tent) against the studio Eden; he picked (b) over (a,
ribs-literal) and over a hybrid.

- `surface.ts` no longer Shepard-interpolates the drawn ribs. It raises the ENGINE'S OWN
  canopy over the drawn plan: feet, plan (faired hull) and crown height from your lines;
  eave and cap from the same rules the built thing obeys. The eave stays up between the
  legs and dives only at the drawn feet.
- The rule is SHARED, not copied: `geometry.ts` now exports `capProfile`, `eaveHeightAtM`,
  `footPullAt`, and both the parametric generator and the soft surface call them. One rule,
  two resolutions — bake stays a resolution, not a jump-cut.
- `fairedRadius` moved to `surface.ts` (re-exported from `shapeFromDrawing.ts`): the skin,
  the preview mesh and the baked net now share one boundary. `insideHullM` deleted (dead).
- **The drawn arcs set the rise.** `arcRiseM` moved to `fromDrawing.ts`; `readDrawing`
  derives `riseM` from the longest line (held to headroom/cap, and it SAYS so). The soft
  HUD "tall", the baked params and the export now agree.
- **The feet nudge stopped lying.** It said "so it rooted 4" while the shape path rooted
  all 6 drawn contacts (the engine obeys drawn bearings since `439b369`; the nudge predated
  that). Now: a `read` nudge counts the contacts it actually roots, plus an `offered` nudge
  carrying the grammar's opinion. Tests updated to pin the drawn path, not the parametric one.
- Drawn ribbons GHOST once the canopy stands (`DrawStage`) — a solid ribbon buried in the
  skin poked through in random tips and read as debris.
- Boundary epsilon in `surfaceHeight`: the preview mesh puts its last ring exactly at r=1
  and float noise flipped boundary vertices between eave and lawn — the edge rendered as a
  row of torn teeth. Found in a render, invisible to the suite.

## Why (b)

It is what the engine's own geometry says an Eden is. The ribs-literal model dove the whole
boundary to the lawn (a rib is at zero near its own foot; the hull edges run between feet)
and produced a tent — it threw away the eave and the open sides. The header comment in
`surface.ts` records the dead model so nobody rebuilds it.

## Verify

```bash
cd C:\Users\danie\restless-egg\engine-session
npm run dev -- --port 5344        # NOT 5333
npx tsc --noEmit && npx vitest run && npm run build
```

Open http://localhost:5344/#/draw, drag two CROSSING lines: the soft thing is a canopy
(eave up between feet, dives at feet, ghost ribbons). Excavate a small hole: a clean
window. Bake: verified live — 4 feet where drawn, lifted eave, open front, £18,800, and
the nudge panel says "each rooted where you drew it".

Renders from the session (before/after): the "before" tent and the baked "after" Eden were
sent to Daniel in chat; teeth/debris intermediate states are described above.

## Left

- **Excavate radius blows up** if the pointer crosses off the surface mid-drag (plan-space
  jump → a hole that eats the whole canopy). Pre-existing; worse now the surface is
  prominent. Candidate: clamp the radius or ignore off-surface moves.
- **Lift gesture is lost** if pointer-up lands off the surface (R3F pointerup never reaches
  the mesh; refs stay armed until the next pointerdown). Pre-existing. Candidate: window
  pointerup listener.
- **A pointy-corner foot stands outside the faired plan** (fairing pulls corners in, the
  skin's touchdown lands short of the foot pad, and the ribbon leans outside the skin).
  Same at bake (ground nodes sit at the faired radius). Candidate AI nudge: "that far foot
  pulls the plan out to a point; the fair plan stops short of it — move it in or accept it".
- **A hole smaller than a bay** opens a window in the soft skin but may remove no member at
  bake. Honesty gap candidate: warn, or floor the hole radius at the bay size.
- Items 2–4 of the previous handoff are untouched and still open: **EC5 / ring-fairing**
  (`engine-piecesolid-wip`, needs Clay/Daniel), **ring-count bug** (~25% denser than the
  slider claims; needs approval, price delta unmeasured), **import-drawing UI**, **Year 3
  foliage**, **site step parked**.

## Files

- `src/engine/surface.ts` — the canopy model (header documents the dead ribs model); fairedRadius; boundary epsilon
- `src/engine/geometry.ts` — exports `capProfile` / `eaveHeightAtM` / `footPullAt`; internals delegate to them
- `src/engine/fromDrawing.ts` — `arcRiseM` lives here; riseM from the drawn arcs + rise nudges; honest feet nudges
- `src/engine/shapeFromDrawing.ts` — re-exports `fairedRadius`; adapter otherwise unchanged
- `src/engine/surface.test.ts` — canopy assertions (crown, eave-up, dive-at-foot, aperture lift, shared boundary)
- `src/engine/fromDrawing.test.ts` — drawn-path feet claims; offered grammar opinion
- `src/pages/draw/DrawStage.tsx` — ribbons ghost once the canopy stands
- `src/pages/DrawPage.tsx` — stale DEMO SCOPE header replaced with the settled model
