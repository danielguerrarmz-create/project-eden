/**
 * toolCopy.ts — the toolbar's words, kept where they can be tested.
 *
 * Same reason `priceCopy.ts` exists, and the same shape of problem. `DrawPage`
 * pulls in R3F and three, and this suite runs in a bare node env with no DOM on
 * purpose (see vitest.config.ts), so copy that lives in that component is copy
 * nothing can pin. `Tool` is imported as a TYPE only, so it is erased at runtime
 * and this module stays pure.
 *
 * WHY THIS COPY IN PARTICULAR EARNS A MODULE. The sculpt hint is the
 * highest-leverage sentence in the product, and it was WRONG for months. It read
 * "press on it and pull up" while the tool had been bidirectional since the day
 * it was written (`gesture.ts`: PUSH_LIMIT_M = -1.2, and `surface.test.ts` was
 * already feeding amountM: -99). A hint is displayed CONTINUOUSLY while its tool
 * is selected, so it is not a toast that can be missed — it was actively telling
 * every user that half the tool did not exist. Words in place beat teaching once
 * and hoping.
 *
 * THE LABEL AND THE ID DISAGREE ON PURPOSE. Daniel ruled the tool is called
 * "sculpt" (2026-07-17); the id stays `pushpull`. That mismatch is deliberate and
 * costs nothing: `Edit.kind` is not serialized, so nothing outside this repo has
 * an opinion, and renaming the engine a second time on deadline day is churn with
 * real regression risk. "Sculpt" over "push/pull" because push/pull is Rhino's
 * and SketchUp's vocabulary and escaping that room is the whole thesis.
 */
import type { Tool } from './DrawStage';

export interface ToolCopy {
  id: Tool;
  label: string;
  hint: string;
}

export const TOOLS: ToolCopy[] = [
  // The draw hint is what you are told once the canopy is already standing, so
  // it cannot be the opening instruction. It used to be, and the caption
  // reverted to "drag a line across the lawn" with two lines drawn and a
  // canopy up: the one state where that sentence is plainly false. The two
  // sentences the opening needs are special-cased in DrawPage, by line count.
  { id: 'draw', label: 'draw', hint: 'another line grows it' },
  { id: 'pushpull', label: 'sculpt', hint: 'drag up to raise it, down to lower it' },
  { id: 'hole', label: 'excavate', hint: 'press on it and drag out a hole' },
];

/**
 * The two lines of the guidance rail, in order.
 *
 * The first line now names what LEFT-drag does too (spec F2): first-run guidance
 * has to teach both clicks, not just the orbit gesture. It stays generic ("uses
 * the tool") so it reads true across draw, sculpt and excavate. It deliberately
 * does NOT promise pan — `OrbitControls` has `enablePan={false}`, so teaching a
 * pan gesture would be an overclaim; the copy stops implying it instead of the
 * control being changed. The middot is a separator, not a dash.
 */
export const RAIL_LINES = [
  'left-drag uses the tool · right-drag, or hold space, turns it',
  'scroll to zoom',
] as const;

/**
 * The explode's sequence, named in the panel the eye is already on.
 *
 * NOT floating 3D callouts: those are the literal IKEA-manual reading and the
 * highest clutter risk on a filmed frame. The cascade itself tells the sequence
 * through TIME — this only names what you are watching.
 *
 * STATIC, not a live "ring n of N" ticker, which is a deliberate deviation from
 * the spec. A ticking counter needs a React state write per frame, and this
 * page's own rule — stated in `BakeReveal` and followed by `ExplodeReveal` —
 * is that per-frame writes go to refs, because a re-render per frame fights the
 * animation it is drawing. Here it would re-render the whole Canvas subtree for
 * a 2.2 s counter. The sentence is true for every frame of the cascade anyway.
 */
export function explodeReadout(ringCount: number): string {
  return `ground up · ${ringCount} rings · crown last`;
}
