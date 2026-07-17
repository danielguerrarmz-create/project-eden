/**
 * drape.ts — putting a mark ON the skin instead of on the floor.
 *
 * THE BUG THIS EXISTS FOR. `EditHalo` rendered a flat ring at y = 0.03 for both
 * tools, so every handle in the sculpt phase lay on the GROUND while the thing
 * being sculpted floated metres above it. `plan()` throws the height away
 * (`{x: e.point.x, y: e.point.z}`), which is right for the model — the engine is
 * a height field over a plan, and the gesture is "here, this big" — but it left
 * the handle with no idea the mesh existed. Daniel: "the user will have a hard
 * time telling where it is at."
 *
 * WHAT THIS IS. Rhino's Pull/Project-curve-to-surface, and nothing more: sample
 * a curve in plan, ask the height field what it is at each station, and you have
 * a curve lying on the skin. The engine already exports the only function this
 * needs (`surfaceHeight`), so the whole feature is a loop.
 *
 * WHY IT IS A MODULE AND NOT SIX LINES IN THE COMPONENT. Two reasons, and the
 * second is the real one:
 *
 *   1. The suite runs in a bare node env with no DOM (see vitest.config.ts), so
 *      anything inside a component that pulls in R3F cannot be tested. Same
 *      reason `gesture.ts` and `framing.ts` live out here.
 *   2. A REDLINE IS THIS EXACT OPERATION. The redlining direction
 *      (docs/handoffs/2026-07-17-redlining-direction.md) is a stroke made on the
 *      mesh from a camera, and every stroke has to land on the surface the same
 *      way this ring does. Redlining may absorb push/pull entirely and delete
 *      the handle that motivated this file; the projection survives that,
 *      because it is what redlining needs on day one. Spend here, stay cheap on
 *      the handle.
 *
 * PERFORMANCE, MEASURED NOT GUESSED. `surfaceHeight` rebuilds the whole canopy
 * context per call (a convex hull plus a faired-radius closure), so a 48-station
 * ring is 48 hulls. Benchmarked at **0.143 ms per ring, ~3 us per sample** —
 * 0.9% of a 60 fps frame, i.e. fine even per-frame, and the caller memoizes it
 * per gesture anyway. If the station count ever goes up by an order of
 * magnitude, hoist the context instead of sampling harder.
 *
 * Pure: no THREE, no React.
 */
import { isHole, surfaceHeight, type Edit, type SurfaceInput } from '../../engine/surface';
import type { Pt } from '../../engine/fromDrawing';

/**
 * Enough to read as a curve on a 9 m object at 1440x900 without the polyline
 * showing its corners, and cheap enough not to matter (see the note above).
 */
export const RING_STATIONS = 48;

/** A plan point with the skin's height under it, in THREE's axes. */
export interface DrapedPoint {
  x: number;
  /** The height field's answer here. */
  y: number;
  /** Plan's `y` is THREE's `z`; carried so callers never redo that swap. */
  z: number;
  /**
   * False where the skin has been excavated away. There is nothing to lie on
   * there, and `surfaceHeight` will still answer — see `projectToSkin`.
   */
  onSkin: boolean;
}

/**
 * Drop one plan point onto the skin.
 *
 * THE `onSkin` FLAG IS THE WHOLE SUBTLETY. `surfaceHeight` answers for a hole
 * exactly as if the skin were still there: excavation is a MASK applied when the
 * mesh is built (`isHole`), not a dent in the field. So projecting a curve over
 * a hole gets you a confident height for a surface that is not there, and the
 * mark would sail across the void looking authoritative. That is worse than the
 * bug this file fixes: a ring on the floor is merely unhelpful, a ring floating
 * across a hole is WRONG about the thing it is drawn on.
 *
 * Off the plan the field returns 0, which is the lawn, and the lawn is a real
 * surface. A ring that runs off the eave and lies down on the grass is telling
 * the truth, so that case is deliberately NOT broken.
 */
export function projectToSkin(input: SurfaceInput, p: Pt): DrapedPoint {
  return {
    x: p.x,
    y: surfaceHeight(input, p),
    z: p.y,
    onSkin: !isHole(input, p),
  };
}

/**
 * A ring in plan, draped onto the skin.
 *
 * Bearing convention matches the rest of the codebase (0 = north = +y/+z,
 * 90 = east = +x): `GardenContext`'s beds and `figurePositionM` use the same
 * one, and a ring that disagreed would be right about height and wrong about
 * where.
 */
export function drapeRing(
  input: SurfaceInput,
  at: Pt,
  radiusM: number,
  stations: number = RING_STATIONS,
): DrapedPoint[] {
  const out: DrapedPoint[] = [];
  for (let i = 0; i < stations; i++) {
    const t = (i / stations) * Math.PI * 2;
    out.push(projectToSkin(input, { x: at.x + Math.sin(t) * radiusM, y: at.y + Math.cos(t) * radiusM }));
  }
  return out;
}

/**
 * Break a draped ring into the runs that actually have skin under them.
 *
 * The ring is CLOSED, so the runs wrap: a gap that straddles station 0 must not
 * be reported as two runs, or the mark would show a seam at an arbitrary place
 * that has nothing to do with the hole. A fully-intact ring comes back as one
 * run with its first point repeated at the end, so a caller can build a closed
 * curve without special-casing it.
 *
 * Returns [] when nothing is on skin: nothing to draw is a legitimate answer.
 */
export function skinRuns(pts: DrapedPoint[]): DrapedPoint[][] {
  const n = pts.length;
  if (n === 0) return [];
  if (pts.every((p) => !p.onSkin)) return [];
  if (pts.every((p) => p.onSkin)) return [[...pts, pts[0]]]; // closed

  // Start at the first point that OPENS a run, so the wrap resolves itself.
  let start = 0;
  for (let i = 0; i < n; i++) {
    if (pts[i].onSkin && !pts[(i - 1 + n) % n].onSkin) {
      start = i;
      break;
    }
  }

  const runs: DrapedPoint[][] = [];
  let cur: DrapedPoint[] = [];
  for (let k = 0; k < n; k++) {
    const p = pts[(start + k) % n];
    if (p.onSkin) {
      cur.push(p);
    } else if (cur.length) {
      runs.push(cur);
      cur = [];
    }
  }
  if (cur.length) runs.push(cur);
  return runs;
}

/**
 * Where the surface WILL be at `at` once this gesture commits.
 *
 * Asks the engine rather than reimplementing it: the pending edit is appended
 * to the real input and the real `surfaceHeight` answers. That is what makes it
 * a preview and not an illustration of one — it inherits the falloff, the
 * summing of overlapping edits, and (the one that matters) the planning cap, so
 * a pull that will be clamped at `pdHeightCapM` previews clamped. A handle that
 * kept climbing past the cap would be promising a building the grammar refuses
 * to make, and the user would find out only on release.
 */
export function previewHeightM(input: SurfaceInput, pending: Edit, at: Pt): number {
  return surfaceHeight({ arcs: input.arcs, edits: [...input.edits, pending] }, at);
}
