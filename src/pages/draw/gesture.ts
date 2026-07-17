/**
 * gesture.ts — what a pointer gesture MEANS. Pure, so it can be tested.
 *
 * This lives outside `DrawStage` for the same reason `framing.ts` and
 * `priceCopy.ts` do: the suite runs in a bare node environment with no DOM
 * (see `vitest.config.ts`), so anything inside a component that pulls in R3F
 * is untestable. The rules that decide whether a gesture becomes a hole are
 * exactly the rules worth pinning, so they live here and `DrawStage` only
 * routes events into them.
 *
 * TWO RULES, AND THEY ARE THE WHOLE SCHEME:
 *
 *   WHO OWNS THE POINTER   left button, space not held -> the tool.
 *                          Anything else -> the camera, untouched.
 *   WHEN A GESTURE COUNTS  every tool needs a real drag. A click is a click.
 *
 * The second rule is not fussiness. `excavate` used to floor its radius at
 * MIN_HOLE_RADIUS_M and commit unconditionally, so a bare click — the most
 * innocent thing a person can do to a 3D view, and the thing everyone does
 * first to see if something is selectable — punched a 0.35 m window in the
 * canopy. The floor was there to keep a hole visible; it doubled as a rule
 * that said "no gesture at all means the minimum gesture".
 */
import type { Pt, Spine } from '../../engine/fromDrawing';
import type { Edit } from '../../engine/surface';
import type { Tool } from './DrawStage';

/** A tap isn't a line. */
export const MIN_ARC_DRAG_M = 0.9;
/**
 * The smallest hole worth opening, and now also the smallest drag that opens
 * one. Below this a hole is too small to read on the skin and (see the
 * session-2 handoff) may not remove a single member at bake, so committing one
 * costs the user a window and buys them nothing.
 */
export const MIN_HOLE_RADIUS_M = 0.35;
/** ~8 px of pull. Enough that a shaky click cannot raise the roof. */
export const MIN_LIFT_AMOUNT_M = 0.05;
/** A lift's footprint. Fixed: the gesture is "lift this", not "set a radius". */
export const LIFT_RADIUS_M = 1.5;

/** Screen pixels to metres of lift. Up the screen raises. */
export const LIFT_M_PER_PX = 0.006;
export const LIFT_MIN_M = -1.2;
export const LIFT_MAX_M = 1.6;

/**
 * Which mouse button, and is space down?
 *
 * The camera is the default owner of the pointer and the tool is the
 * exception, not the other way round. Right-drag is Rhino's orbit and space
 * is the trackpad's, where there is no right-button habit and two-finger drag
 * is already a `wheel` event spoken for by zoom.
 */
export function toolClaimsPointer({
  button,
  spaceHeld,
  enabled,
}: {
  /** `PointerEvent.button`. 0 is left. */
  button: number;
  spaceHeld: boolean;
  /** False once baked: orbiting a cut list shouldn't scribble on it. */
  enabled: boolean;
}): boolean {
  return enabled && button === 0 && !spaceHeld;
}

/** Screen drag to lift height, clamped to what the canopy can take. */
export function liftAmountM(dyPx: number): number {
  return Math.max(LIFT_MIN_M, Math.min(LIFT_MAX_M, dyPx * LIFT_M_PER_PX));
}

/** The radius a hole gesture is currently asking for. Honest: no floor. */
export function holeRadiusM(a: Pt, b: Pt): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export type Commit =
  | { kind: 'arc'; spine: Spine }
  | { kind: 'edit'; edit: Edit }
  | null;

/**
 * The end of a gesture. `null` means it was not a gesture: no state changes,
 * nothing is committed, and the user is exactly where they were.
 */
export function commitGesture({
  tool,
  from,
  to,
  amountM,
}: {
  tool: Tool;
  from: Pt | null;
  to: Pt | null;
  /** Lift only: metres, signed. */
  amountM: number;
}): Commit {
  if (!from || !to) return null;

  if (tool === 'draw') {
    const drag = Math.hypot(to.x - from.x, to.y - from.y);
    return drag > MIN_ARC_DRAG_M ? { kind: 'arc', spine: { a: from, b: to } } : null;
  }

  if (tool === 'lift') {
    return Math.abs(amountM) > MIN_LIFT_AMOUNT_M
      ? { kind: 'edit', edit: { kind: 'lift', at: from, radiusM: LIFT_RADIUS_M, amountM } }
      : null;
  }

  const r = holeRadiusM(from, to);
  return r >= MIN_HOLE_RADIUS_M ? { kind: 'edit', edit: { kind: 'hole', at: from, radiusM: r } } : null;
}
