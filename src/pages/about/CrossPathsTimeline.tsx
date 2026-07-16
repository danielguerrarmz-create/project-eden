/**
 * CrossPathsTimeline.tsx — how Clay and Daniel crossed paths, drawn as a node graph.
 *
 * This is the built form of the 2026-07-14 geometry rulings (prototype:
 * docs/2026-07-14-geometry-proposals/index.html; holder:
 * docs/2026-07-14-ornament-and-logo-proposals/holder-a-calyx-v2.svg). It keeps the v2 node-graph
 * bones (one spine, short branches, piecewise time axis, plate tiers, packSide, one colour) and
 * replaces the two ends and the connective ornament:
 *
 * THE BEGINNING IS A TWIST-FUSE (redline 2). There is no spine above the junction. Two strands of
 * equal weight come in from off-frame at the top, cross once over-under, and the spine is BORN at
 * the fuse (at 2021). Neither strand reads as "the main one"; the single line is their child.
 *
 * THE FINALE IS AN UNRAVEL INTO THE MARK (redline 1). The old woven bower is retired. The spine
 * leans off its axis over its last stretch, reaches the attach point on the far flank of one Oculus
 * circle, and then WINDS: the last 2*pi*r units of the line carry constant curvature w/r, so at w=1
 * the tail has closed into an exact circle of radius r, tangent to the spine, sitting in its slot in
 * the mark. Arc length is conserved at every w (it is a real unravelling played backwards, not a
 * morph). The mark's stroke equals the spine's weight (k = SPINE_W / 2.8 = 2.679), so the mark is
 * the largest single object at the bottom of the piece. Under it: the "bower" wordmark. Nothing else.
 *
 * THE HOLDER IS A CALYX (holder A v2 strengthened). Every plate is borne by a pedicel + a filled
 * receptacle cup + five sepals, the outer pair climbing the plate's sides. Sepal lengths scale with
 * plate height (clamped), so the showcase tier fills out and the floor tier stays modest. The old
 * leaf ornament is gone.
 *
 * ONE COLOUR (INK_SEPIA — re-keyed from INK_BLUE on 2026-07-16; see the constant). TIME IS
 * PIECEWISE (2021 to 2023 compressed, then open). Unchanged.
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useReducedMotion } from '../../ui/useReducedMotion';
import { line as d3line, curveCatmullRom } from 'd3-shape';
import { CENTERS as MARK_CENTERS } from '../../ui/OculusMark';
import { clamp01, lerp } from './growth';
import { useAutoplayVideo } from './useAutoplayVideo';
import { leafSprite, flowerSprite, type PlantPath } from '../../engine/botanical';
import { requestGarland } from '../../engine/gongbi/painter';
import type { GarlandOrgan, GarlandStation } from '../../engine/gongbi/garland';

/**
 * The practice's ink: a warm sepia/timber, drawn from the splash hero's own structure.
 *
 * This REPLACED the old INK_BLUE (#3E7CA8) on 2026-07-16. The rationale is the hero: it is warm gold
 * Austin light, timber, green foliage and wisteria purple, and blue appears nowhere in it — so
 * the About page's one colour was the one colour the practice does not actually own. Nothing
 * blue survives on this page.
 *
 * Structure (the spine, branches, the mark, holders, rules) takes INK_SEPIA. SMALL TEXT takes
 * INK_SEPIA_TEXT, exactly as small blue text used to take #2F607F: INK_SEPIA measures 4.70:1 on
 * bare vellum — which passes AA — but the selected list row lays an 8% INK_SEPIA tint under its
 * own sepia glyphs, and on THAT ground it drops to 4.28:1 and fails. The variant is not a
 * second colour; it is the same colour at reading weight. See the contrast test in
 * CrossPathsTimeline.test.ts, which pins both ratios against the real composited grounds.
 *
 * Pigment (Clay's genome palette) is permitted on the BOTANICAL SPECIMENS only — the founder
 * specimens, the discipline frontispieces, and the spine garland's organs. Never on structure,
 * and never to colour-code by person.
 */
export const INK_SEPIA = '#8A6A4A';

/** INK_SEPIA at reading weight: AA on vellum AND on the selected row's tinted ground. */
export const INK_SEPIA_TEXT = '#6F5439';

/** The vellum ground (tailwind `paperVellum`), literal here because SVG halos need a real value. */
export const VELLUM = '#FBF9F3';

/**
 * The checkable ceiling on how many stroked paths may be visible at once: the spine, plus at most
 * two branch pedicels mid-unfurl. This is a QA contract (screenshot and count), not something the
 * code enforces; the reveal gating below keeps the count low.
 */
export const MAX_CONCURRENT_STRANDS = 3;

type Side = 'left' | 'right';
type PlateTier = 'floor' | 'standard' | 'hero' | 'showcase';

/** One picture on a plate: a still, or a looping video (webm + mp4 + poster). */
interface Plate {
  /** Public path to the image, or the POSTER still for a video. */
  src: string;
  alt: string;
  /** Renders and photos crop with 'cover'; figures, logos, UI and line drawings use 'contain'
   *  so nothing with baked-in text ever gets cropped. */
  fit?: 'cover' | 'contain';
  /** Present when this plate is really a looping video. */
  video?: { webm: string; mp4: string; rate?: number };
  /** No picture yet: draws an honest empty plate instead of inventing one. */
  pending?: boolean;
}

/** One node on the spine. clusterIndex 0 is the lead (hero or showcase); later indices stack below
 *  it as standard siblings sharing the same branch point. */
interface Node {
  tier: PlateTier;
  media: Plate;
}

/** A cluster: one branch point on the spine (a fork) with one or more stacked plate nodes. */
interface Cluster {
  id: string;
  /** True event year → the spine anchor this cluster's branch(es) fork from. */
  year: number;
  side: Side;
  /** ONE-line hint, from the allowed set only. The specifics live in "The Work" list below. */
  hint: string;
  nodes: Node[];
  /** Optional extra downward nudge for the plate stack only (the branch anchor stays on the true
   *  year). Used where a plate would otherwise crowd the merge; safe only where the lane has slack. */
  dy?: number;
}

const A = '/assets/projects';

/* --------------------------------- geometry ------------------------------- */

const W = 1200;
const CX = 600;
const MAX_YEAR = 2026;
const SPINE_W = 7.5;

/** Piecewise time axis: 2021 to 2023 compressed, 2023 to 2026 open. Unchanged from v1. */
const Y_2021 = 150;
const Y_2023 = 750;
const SLOPE_EARLY = 300; // units per year, 2021 to 2023
const SLOPE_LATE = 760; // units per year, 2023 to 2026
/** The spine runs plumb to here (2026); below it, the line leans off-axis and winds into the mark. */
export const CONVERGE_Y = Y_2023 + (MAX_YEAR - 2023) * SLOPE_LATE; // 3030

export const yearToY = (y: number) =>
  y <= 2023 ? Y_2021 + (y - 2021) * SLOPE_EARLY : Y_2023 + (y - 2023) * SLOPE_LATE;

/** An obstacle a year label must stay clear of: one plate and the branch that carries it.
 *  `computeBranches()` already returns exactly this shape, so the rule below scores the REAL
 *  layout rather than a parallel model of it. */
export interface LabelObstacle {
  side: Side;
  rect: { x: number; y: number; w: number; h: number };
  pts: Array<{ x: number; y: number }>;
}

/** The label's glyph box on side `dir` at tick-y `ty`. The box sits ABOVE the tick
 *  (YEAR_LABEL_CLEAR), which is why a label and its own tick can share an x and not collide. */
export function yearLabelBox(dir: number, ty: number) {
  const x0 = dir === 1 ? CX + YEAR_LABEL_OFFSET : CX - YEAR_LABEL_OFFSET - YEAR_LABEL_W;
  // Glyph box measured live: top = ty - 51, height 40, for baseline ty - YEAR_LABEL_CLEAR.
  return { x0, x1: x0 + YEAR_LABEL_W, y0: ty - YEAR_LABEL_CLEAR - 31, y1: ty - YEAR_LABEL_CLEAR + 9 };
}

/** Clearance from the label box to a rect: 0 or less means they overlap. */
function boxGapToRect(b: ReturnType<typeof yearLabelBox>, r: LabelObstacle['rect']): number {
  const dx = Math.max(r.x - b.x1, b.x0 - (r.x + r.w), 0);
  const dy = Math.max(r.y - b.y1, b.y0 - (r.y + r.h), 0);
  return dx === 0 && dy === 0 ? -1 : Math.hypot(dx, dy);
}

/** Clearance from the label box to a stroked polyline, accounting for the stroke's own width. */
function boxGapToPoly(b: ReturnType<typeof yearLabelBox>, pts: LabelObstacle['pts'], sw: number): number {
  let best = Infinity;
  for (const p of pts) {
    const dx = p.x < b.x0 ? b.x0 - p.x : p.x > b.x1 ? p.x - b.x1 : 0;
    const dy = p.y < b.y0 ? b.y0 - p.y : p.y > b.y1 ? p.y - b.y1 : 0;
    best = Math.min(best, Math.hypot(dx, dy) - sw / 2);
  }
  return best;
}

/** How much room a year label has on one side: the tightest clearance to anything on that side. */
export function yearLabelClearance(obstacles: readonly LabelObstacle[], y: number, side: Side): number {
  const box = yearLabelBox(side === 'right' ? 1 : -1, yearToY(y));
  let best = Infinity;
  for (const o of obstacles) {
    if (o.side !== side) continue;
    best = Math.min(best, boxGapToRect(box, o.rect), boxGapToPoly(box, o.pts, BRANCH_W));
  }
  return best;
}

/**
 * Which side of the spine a year label sits on: THE SIDE WITH MORE ROOM, measured against the
 * laid-out plates and branches. Ties (and an empty layout) default right.
 *
 * This used to flip "opposite the nearest cluster within 0.15 of a year", reading the AUTHORED
 * cluster years. That model and the page disagreed, because `packSide` moves plates: a cluster
 * authored at 2022.6 has its plates packed down into 2023's label band, and a rule that only
 * looks at same-year clusters cannot see it. It sent 2023's label right, into the medical
 * cluster's branch, and 2025's left, into dougherty's — both measured live on 2026-07-16.
 *
 * The concept is unchanged (the label steps aside to stay clear); it now derives "clear" from
 * where the plates and branches ACTUALLY are, which is the only model that cannot drift from
 * the drawing. See the contract test, which asserts the chosen side against the real layout.
 */
export function yearLabelSide(obstacles: readonly LabelObstacle[], y: number): Side {
  const right = yearLabelClearance(obstacles, y, 'right');
  const left = yearLabelClearance(obstacles, y, 'left');
  return left > right ? 'left' : 'right';
}

/* ----------------------------- the twist-fuse ----------------------------- */

/**
 * THE BEGINNING (redline 2). No spine above the junction. Two equal strands come in from off-frame,
 * run parallel to the spine (a cubic that is already vertical when it touches, so the fuse has no
 * kink), then in the last stretch cross once over-under and lay up into the spine. The junction is
 * at 2021: the spine is born there and nowhere above it.
 */
export const CONV_JUNCTION_Y = Y_2021; // 150 — the fuse; the spine is born here
const CONV_TOP_Y = -50; // strand tops, above the frame (cut by frame)
const CONV_TWIST = 110; // height of the over-under lay above the junction
const CONV_GATE_Y = CONV_JUNCTION_Y - CONV_TWIST; // 40 — where the wishbone hands off to the twist
const CONV_AMP = 240; // how far off-axis each strand starts
const CONV_OFF = 7.5; // half the lay separation through the twist
/** Root-2 strand weight: each strand is substantial, so neither reads as subordinate. */
const CONV_WEIGHT = 5.3;

/** One convergence strand for side `dir` (-1 left, +1 right): wishbone in from off-frame, then a
 *  single over-under crossing that closes onto the spine axis at the junction. */
export function convArmPts(dir: number): Array<{ x: number; y: number }> {
  const pts: Array<{ x: number; y: number }> = [];
  const N = 90;
  // Cubic h with h(0)=0, h'(0)=0.6, h(1)=1, h'(1)=0: enters at ~26 degrees off vertical and is
  // already exactly parallel to the spine at the gate, so the lay-up has no kink.
  const a = -1.4;
  const b = 1.8;
  const c = 0.6;
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    const y = lerp(CONV_TOP_Y, CONV_GATE_Y, u);
    const h = a * u * u * u + b * u * u + c * u;
    pts.push({ x: CX + dir * (CONV_AMP - CONV_OFF) * (1 - h) + dir * CONV_OFF, y });
  }
  const M = 48;
  for (let i = 1; i <= M; i++) {
    const t = i / M;
    const y = lerp(CONV_GATE_Y, CONV_JUNCTION_Y, t);
    // cos runs +1 -> -1 (the crossing at t=0.5) while the envelope closes to zero at the junction,
    // so both strands arrive exactly on the spine axis (x=CX) and become the single line.
    pts.push({ x: CX + dir * CONV_OFF * Math.cos(Math.PI * t) * (1 - t * t), y });
  }
  return pts;
}

/* --------------------------- the unravel finale --------------------------- */

/**
 * THE FINALE (redline 1). The line winds itself into the Bower mark. Variant A: the mark is centred,
 * the spine leans to reach the attach point on the far flank of circle 0. The mark's scale is not a
 * free choice: its stroke is 2.8 at a 100-unit box, and 2.8 * MARK_K = SPINE_W, so the line becomes
 * mark linework with no change in weight. That pins the mark at 90 * MARK_K = 241px wide.
 */
const MARK_STROKE = 2.8;
export const MARK_K = SPINE_W / MARK_STROKE; // 2.6786
export const MARK_R = 30 * MARK_K; // 80.36 — world radius of one mark circle
const LEAN_SPAN = 620; // descent the spine spends easing off-axis to the attach point
const MARK_CENTER_X = CX; // variant A: the mark stays on the axis
const MARK_CENTER_Y = CONVERGE_Y + LEAN_SPAN; // 3650 — the mark's centre
const WORDMARK_GAP = 92; // from the mark's bottom edge to the wordmark baseline
const WORDMARK_FONT = 54;

/* THE POST-PIN UNRAVEL + DESCENT (Task 4). Once the mark is fully wound (the PIN, the "first full
 * bower frame"), scrolling on plays a MIRRORED unravel — NOT a rewind of the wind-up. The seven
 * satellites retract, and the tail opens from the closed circle into a single downward ray that
 * curls the OPPOSITE rotational way from the ravel (tailPtsMirror reflects the ravel tail across the
 * mark circle's own vertical axis x=C.x: circle 0 maps to itself so there is no pop at the pin, but
 * the handedness flips and the ray pays out on the mark's OTHER flank). That ray then keeps flowing
 * down and sweeps toward the PAGE centre, exiting the bottom of the frame, where it hands the one
 * line off to the founders' roots below (AboutPage's SeamBridge + FounderRoots). The whole About
 * page still reads as one continuous ink line: spine -> mark -> mirrored unravel -> founders -> work,
 * with the unravel a mirrored continuation rather than the wind-up retraced. */
const TAIL_LEN = 2 * Math.PI * MARK_R; // the winding tail's arc length (~505); the unwound ray's length
const RAY_END_Y = MARK_CENTER_Y + TAIL_LEN; // where the fully-unwound downward ray ends (P.y + L)
const DESC_DROP = 420; // the sweep below the ray that carries the line to page-centre and out the bottom
const DESC_BOTTOM_Y = RAY_END_Y + DESC_DROP; // the exit point's world Y (the frame's bottom at track end)
const H = DESC_BOTTOM_Y + 80; // total drawing height (now runs past the mark, down through the descent)

/** The fraction of the track that reaches the PIN (mark fully formed). The wind keeps its original
 *  travel; the unravel + descent are the remaining scroll, added below it. 720vh wind + 360vh past. */
const PIN_FRAC = 720 / 1080;

/** The finale wind begins when the mark has risen to this fraction of the way down the frame, and
 *  completes at the pin (mark centred). Kept below 1 so the whole ravel is watched INSIDE the frame,
 *  never above it. */
const WIND_ENTER = 0.82;

/** Autoplay-on-entry timing. A lead-in lets the entry narration settle, then a slow, CONSTANT-speed
 *  descent runs from the top of the timeline to the finale (linear, never accelerating — it holds the
 *  gentle opening pace the whole way down so the timeline stays readable); a strong gesture
 *  fast-forwards to the reveal. */
const AUTOPLAY_LEAD_IN_MS = 2500;
/** Longer than the old 12000 because the descent is now LINEAR (constant velocity) rather than
 *  ease-in-out: an eased 12s peaked ~2x its average speed mid-descent, which read as "speeding up".
 *  A linear 24s holds the slow beginning pace the whole way, so it never accelerates and stays
 *  observable. Tune by watching #/about; must never feel like it accelerates. */
const AUTOPLAY_MS = 24000;
const AUTOPLAY_FF_MS = 650;

/** Resolve the mark + variant A into world geometry: the attach point P on circle 0's far (right)
 *  flank (phi=0), the spine's heading there (psi0, straight down), and the RAVEL wind direction
 *  (sigma). The wound mark is the ORIGINAL bower logo, unchanged. The post-pin UNRAVEL is a MIRROR of
 *  this ravel (see tailPtsMirror) — a different downward curl — not a flip of the ravel itself. */
export function solveMark() {
  const k = MARK_K;
  const r = MARK_R;
  const [c0x, c0y] = MARK_CENTERS[0]; // [65, 50]
  const C = { x: MARK_CENTER_X + (c0x - 50) * k, y: MARK_CENTER_Y + (c0y - 50) * k };
  const P = { x: C.x + r, y: C.y }; // phi = 0: the right flank
  const psi0 = Math.PI / 2; // heading straight down at P
  return { k, r, C, P, psi0, sigma: 1 };
}

/**
 * THE MECHANISM. The last L = 2*pi*r units of the line carry constant curvature w/r.
 *   w = 0  -> a straight ray from P: the spine, continuing.
 *   w = 1  -> total turn 2*pi: a closed circle of radius r, tangent to the spine at P, centred on C.
 * Arc length is exactly L at every w (midpoint-rule integration closes to ~0.01px at w=1), so this
 * is a real unravelling, not a morph between two shapes.
 */
export function tailPts(w: number, N = 420): Array<{ x: number; y: number }> {
  const g = solveMark();
  const L = 2 * Math.PI * g.r;
  const ds = L / N;
  const kappa = w / g.r;
  const pts = [{ x: g.P.x, y: g.P.y }];
  let x = g.P.x;
  let y = g.P.y;
  let psi = g.psi0;
  for (let i = 0; i < N; i++) {
    const mid = psi + g.sigma * kappa * (ds / 2);
    x += Math.cos(mid) * ds;
    y += Math.sin(mid) * ds;
    psi += g.sigma * kappa * ds;
    pts.push({ x, y });
  }
  return pts;
}

/**
 * The mirror of the ravel tail: reflect it across the mark circle's own vertical axis (x = C.x). At
 * w=1 circle 0 maps onto itself; at w=0 it is the downward ray on the OPPOSITE flank (x = 2*C.x-P.x).
 * Only x flips (mirror shares the ravel's y). This is the fully-mirrored end state; the actual
 * unravel MORPHS to it (tailPtsUnravel) so the top stays attached to the lean the whole way.
 */
export function tailPtsMirror(w: number, N = 420): Array<{ x: number; y: number }> {
  const cx = solveMark().C.x;
  return tailPts(w, N).map((p) => ({ x: 2 * cx - p.x, y: p.y }));
}

/**
 * THE UNRAVEL TAIL (continuous, mirrored — not a rewind). A per-point morph between the ravel tail
 * and its mirror, with the mirror amount tied to how OPEN the tail is (m = 1 - w). Because a tail
 * that both starts at P and is circle 0 at the pin is FORCED to curl left (it is the ravel), you
 * cannot keep the top fixed at P AND flip the curl AND keep circle 0 — so instead the top slides
 * continuously P -> P' as it opens, and the render arrives the lean exactly there each frame.
 *   w = 1 (pin) -> m=0: exactly the ravel circle 0. Identical to the wound mark and the pre-pin line
 *                  (no pop). Top at P.
 *   w -> 0      -> m->1: the mirrored downward ray on the opposite flank. Top at P', bottom at the
 *                  mirror ray end = the descent's start (mirrorRayEndX). It curls the OPPOSITE way as
 *                  it pays out — a true mirror, not the wind-up retraced.
 * Only x morphs (mirror shares the ravel's y), so the line stays a clean downward-flowing curve; at
 * m=0.5 it passes through the mark's own vertical axis, reading as "unwind to straight, then curl the
 * other way". Continuity is structural: the lean is pointed at pts[0] and the descent starts at the
 * w=0 bottom, so spine -> lean -> tail -> descent is one stroke at every w.
 */
export function tailPtsUnravel(w: number, N = 420): Array<{ x: number; y: number }> {
  const a = tailPts(w, N);
  const b = tailPtsMirror(w, N);
  const m = 1 - clamp01(w);
  return a.map((p, i) => ({ x: lerp(p.x, b[i].x, m), y: p.y }));
}

/** How far the descending root wanders off its drift, and over how many soft waves. Daniel's redlines
 *  want this root to read as DRAWN and alive (organic S-curves), not a stiff mechanical lean. */
const LEAN_MEANDER_AMP = 40;
const LEAN_MEANDER_WAVES = 2.25;

/**
 * The spine above the attach point: plumb on the axis, then an organic, gently MEANDERING descent
 * onto an attach point at (targetX, P.y). It leaves the axis at (CX, CONVERGE_Y) vertically and
 * arrives at (targetX, P.y) on a vertical tangent, so it hands off to the plumb spine above and to
 * the winding tail below with no kink; the wander in between is what makes it look drawn by hand.
 *
 * `targetX` is a parameter (not hard-wired to P) so the RENDER can point the lean at the tail's
 * CURRENT top every frame. During the ravel that top is P (the original right-flank attach); through
 * the unravel it slides P -> P' as the tail morphs to its mirror. Arriving the lean exactly at the
 * tail's top is what guarantees the spine -> lean -> tail chain is ONE continuous stroke at every
 * scroll position (no gap where the line meets the mark).
 */
export function spineLeanPtsTo(targetX: number): Array<{ x: number; y: number }> {
  const g = solveMark();
  const dx = targetX - CX;
  const y0 = g.P.y - LEAN_SPAN; // = CONVERGE_Y
  const pts = [{ x: CX, y: y0 }];
  // Base drift is a smoothstep (leaves the axis and reaches the target with zero horizontal slope).
  // The meander is a sine enveloped by sin^2(pi*u), whose value AND slope vanish at both ends, so the
  // wander dies exactly at the plumb spine and at the target: the handoffs stay tangent-clean.
  for (let i = 1; i <= 200; i++) {
    const u = i / 200;
    const s = u * u * (3 - 2 * u);
    const env = Math.sin(Math.PI * u);
    const meander = LEAN_MEANDER_AMP * Math.sin(2 * Math.PI * LEAN_MEANDER_WAVES * u) * env * env;
    pts.push({ x: CX + dx * s + meander, y: lerp(y0, g.P.y, u) });
  }
  return pts;
}

/* -------------------------------- the calyx ------------------------------- */

/**
 * Holder A, the ORIGINAL (light) calyx: a fine pedicel lifts the plate from underneath, and three
 * slim sepals fan out below the plate's inner-bottom corner. NOT the strengthened v2 cup. `phi` is
 * the SVG's angle (180 straight down, 225 toward the spine, 135 under the plate); the deviation from
 * straight down is `phi - 180`. Each length scales with plate height, clamped, so the floor tier
 * stays modest and only the showcase tier fills out.
 */
export const SEPAL_DEFS: ReadonlyArray<{
  phi: number;
  lenCoef: number;
  lenLo: number;
  lenHi: number;
}> = [
  { phi: 225, lenCoef: 0.45, lenLo: 60, lenHi: 150 }, // toward the spine
  { phi: 180, lenCoef: 0.28, lenLo: 45, lenHi: 110 }, // straight down
  { phi: 135, lenCoef: 0.36, lenLo: 55, lenHi: 130 }, // under the plate
];

/** A sepal's length: proportional to plate height, clamped so the floor tier stays modest and the
 *  showcase tier fills out. Pure and exported for the scaling test. */
export function sepalLen(def: { lenCoef: number; lenLo: number; lenHi: number }, h: number): number {
  return clamp(def.lenCoef * h, def.lenLo, def.lenHi);
}

/* ------------------------------- the branch ------------------------------- */

/**
 * THE BRANCH (redline 2). An ornate root from the spine to a plate. It leaves the spine on a near-
 * horizontal tangent (a big interior angle), then sweeps down the gutter column beside the plate and
 * arrives UNDER it, at the plate's inner-bottom corner, where the three-sepal calyx cups the plate
 * from below. Because it stays inside the gutter column (never at the plate's x-range except at that
 * one corner) it never crosses an image; because attach points are ordered down each side's lane,
 * branches never cross one another. Pure + exported so the no-overlap contract is unit-tested against
 * the real layout (see computeBranches).
 */
export function branchAttachY(_anchorY: number, plateY: number, plateH: number): number {
  return plateY + plateH; // the inner-bottom corner: the branch arrives under the plate
}

/** The ornate branch sampled to a polyline. x runs monotonically across the gap (so the tendril
 *  never leaves its column, hence never crosses a plate or the spine); y is a smoothstep drift from
 *  the anchor to the attach, plus an enveloped sine wander for the drawn-by-hand curl. This is the
 *  single source of truth: the render splines through these points, and the contract test checks
 *  them, so what is drawn is exactly what is proven not to overlap. */
export function branchPts(
  spineX: number,
  anchorY: number,
  edgeX: number,
  attachY: number,
  N = 48,
): Array<{ x: number; y: number }> {
  const dx = edgeX - spineX;
  // A stable per-branch seed (no per-render randomness) so each tendril bulges a little differently
  // and the set reads as hand-drawn rather than stamped. Amplitude and first-bulge direction vary;
  // the shape is still confined to the gap column and enveloped at both ends, so the contract holds.
  const seed = Math.sin(anchorY * 12.9898 + attachY * 78.233);
  const amp = BRANCH_WAVE_AMP * (0.75 + 0.5 * Math.abs(seed));
  const bulge = seed >= 0 ? 1 : -1;
  const waves = BRANCH_WAVE_WAVES + (Math.abs(seed) > 0.5 ? 0.5 : 0);
  const pts: Array<{ x: number; y: number }> = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const s = t * t * (3 - 2 * t); // smoothstep: horizontal tangent at both ends
    const env = Math.sin(Math.PI * t);
    const wander = amp * bulge * Math.sin(2 * Math.PI * waves * t) * env * env;
    pts.push({ x: spineX + dx * t, y: lerp(anchorY, attachY, s) + wander });
  }
  return pts;
}

/** The branch as a smooth path: a Catmull-Rom spline through the ornate sample points, so the tendril
 *  reads as one continuous drawn line. */
function branchPath(spineX: number, anchorY: number, edgeX: number, attachY: number): string {
  return lineGen(branchPts(spineX, anchorY, edgeX, attachY)) ?? '';
}

/* ------------------------- the holder (a botanical) ----------------------- */

/** One placed organ of the holder sprig: an SVG transform + the generator's paths. */
export type SprigOrgan = { transform: string; paths: readonly PlantPath[] };

/** Leaf profile per SEPAL_DEFS axis (toward-spine / straight-down / under-plate). */
const CALYX_LEAF_PROFILES = ['lanceolate', 'ovate', 'lanceolate'] as const;

/**
 * THE HOLDER, a generated botanical (replaces the schematic three-sepal calyx). A small real plant
 * cups each plate from below: three generated LEAVES fan DOWN the same SEPAL_DEFS axes from the
 * plate's inner-bottom corner (one toward the spine, one straight down, one under the plate), plus a
 * small barely-open BUD at the corner. It reuses the sepal axis skeleton and the height-scaled length
 * law (sepalLen), each length still capped by the room actually below (maxLen), so the ornament stays
 * in the gutter under the plate EXACTLY like the sepals did: the leaf tips never reach the plate
 * beneath and never cross an image. Deterministic per plate via `seed`; one colour (INK_SEPIA).
 * `tipY` is the lowest point reached (for the gutter-containment contract test).
 */
export function calyxSprig(
  cornerX: number,
  cornerY: number,
  dir: number,
  h: number,
  maxLen: number,
  seed: string,
): { organs: SprigOrgan[]; tipY: number } {
  const organs: SprigOrgan[] = [];
  let tipY = cornerY;
  SEPAL_DEFS.forEach((def, ai) => {
    const dev = ((def.phi - 180) * Math.PI) / 180; // deviation from straight down
    // Kept clearly SHORTER than the full sepal envelope so the holder stays small + delicate.
    const len = Math.min(sepalLen(def, h), maxLen) * 0.82;
    const ux = -dir * Math.sin(dev); // axis: down, splayed with the plate's side
    const uy = Math.cos(dev);
    const rot = (Math.atan2(ux, -uy) * 180) / Math.PI; // rotate the up-growing leaf onto the axis
    const sprite = leafSprite(`${seed}:leaf:${ai}`, {
      profile: CALYX_LEAF_PROFILES[ai],
      veins: ai === 0 ? 1 : 0,
      length: len,
      halfWidth: Math.max(0.12 * len, 5),
    });
    organs.push({
      transform: `translate(${cornerX.toFixed(2)} ${cornerY.toFixed(2)}) rotate(${rot.toFixed(2)})`,
      paths: sprite.paths,
    });
    tipY = Math.max(tipY, cornerY + len * uy); // the blade tip is the lowest point on this axis
  });
  // A small bud at the corner, splaying DOWN into the gutter (rotate 180 so the rosette faces down).
  // Short and barely open, so it stays delicate at the base and never fills the gutter.
  const budLen = Math.min(20, 0.32 * maxLen);
  const bud = flowerSprite(`${seed}:bud`, {
    petals: 5,
    length: budLen,
    width: Math.max(4, 0.3 * budLen),
    profile: 'ovate',
    open: 0.45,
  });
  organs.push({
    transform: `translate(${cornerX.toFixed(2)} ${(cornerY + 2).toFixed(2)}) rotate(180)`,
    paths: bud.paths,
  });
  tipY = Math.max(tipY, cornerY + 2 + budLen);
  return { organs, tipY };
}

/** Per-role render style for a holder organ, in the timeline's delicate calyx register. */
export function sprigPathStyle(p: PlantPath): {
  fill: string;
  fillOpacity: number;
  stroke: string;
  strokeOpacity: number;
  strokeWidth: number;
} {
  const isBlade = p.role === 'leaf' || p.role === 'petal';
  return {
    fill: p.fill === 'none' || p.role === 'vein' ? 'none' : INK_SEPIA,
    fillOpacity: p.role === 'center' ? 0.5 : 0.05,
    stroke: INK_SEPIA,
    strokeOpacity: 0.55,
    strokeWidth: isBlade ? 1 : 0.8,
  };
}

/** Plate tiers. The FLOOR is a reference only (nothing is built at it); the smallest plate actually
 *  drawn is STANDARD. Images dominate. */
const TIER: Record<PlateTier, { w: number; h: number }> = {
  floor: { w: 240, h: 150 }, // reference size only — the hard minimum, never instantiated
  standard: { w: 264, h: 176 },
  hero: { w: 320, h: 213 },
  showcase: { w: 400, h: 267 }, // reserved for the two bookends: ut-austin and the NYC door
};

/** The fixed perpendicular gap from the spine to a plate's near (inner) edge. */
export const OFFSET_X = 110;
/** The branch is an ORNATE root, not a stiff arc: it leaves the spine on a near-horizontal tangent (a
 *  big interior angle), then sweeps down the gutter beside the plate and arrives under it, wandering
 *  gently so it reads as drawn and alive. The wander is a sine enveloped to vanish (value + slope) at
 *  both ends, so the horizontal departure and the no-overlap invariant are preserved. Amplitude is
 *  kept in scale with the narrow gutter; the big sweeping loops in Daniel's redlines belong to the
 *  founder stems, which have open room. */
const BRANCH_WAVE_AMP = 18;
const BRANCH_WAVE_WAVES = 1.15;
/** How heavy the roots read. Substantial, in the spine's register, so they look like roots and not
 *  wires (Daniel: "match the line weight of the spine"), while staying legible in the tight gap. */
const BRANCH_W = 5;
/** Minimum vertical gap between two stacked siblings in one cluster (their bounding boxes never
 *  come closer than this — the no-overlap contract). */
const CLUSTER_GAP_Y = 40;
/** Minimum vertical gap between two DIFFERENT clusters sharing a side's lane, so dense years do not
 *  collide even though the branch anchors stay on the true year. */
const CROSS_GAP = 48;

/** Year-label treatment: heavy, larger, and never occluded. The side each label sits on is chosen
 *  from the data (opposite whichever cluster shares that year). */
const YEAR_LABEL_FONT = 30;
/**
 * Spine to the label's INNER edge. This is a gutter budget, not a taste value, and it is the
 * constant that decides whether a year label can touch a photograph.
 *
 * The gutter between the spine and a plate's near edge is OFFSET_X (110). A year label is
 * YEAR_LABEL_W wide. At the old 56 the label reached 56+78 = 134 from the spine — 24 units INTO
 * the plate lane — so at every year that had a plate on the label's side (2021/2022/2023/2024/
 * 2025), the numerals sat on the photograph and the label's vellum halo punched a hole through
 * the branch running underneath. It was not a 2021 problem and it was not the twist-fuse: it was
 * arithmetic, and it fired on whichever years happened to have a plate packed into the band.
 *
 * At 24 the label reaches 102 and lives entirely inside the gutter, clearing every plate on every
 * side by 8 units. It also lines the label's inner edge up with YEAR_TICK_INNER, so the numeral
 * and its tick now read as one lockup. The label sits ABOVE its tick (YEAR_LABEL_CLEAR), so the
 * two never share a y band despite sharing an x.
 */
export const YEAR_LABEL_OFFSET = 24;
/** Measured glyph width of a four-digit year at YEAR_LABEL_FONT/700 (live getBBox, 2026-07-16).
 *  Exported so the gutter contract can be asserted rather than eyeballed. */
export const YEAR_LABEL_W = 78;
const YEAR_TICK_INNER = 24; // spine to tick inner end
const YEAR_TICK_LEN = 22;
const YEAR_LABEL_CLEAR = 20; // label baseline sits this far above the tick

/** The foliage reveal line sits at 52% of the frame; a plate opens as it rises past it. */
const CARD_LINE = 0.52;
/** How much scroll travel a plate takes to unfurl. */
const UNFURL_SPAN = 175;
/** The structural reveal front sits BELOW the fold, so whatever is inside the frame is fully drawn
 *  and the spine runs through the bottom edge at every scroll position. */
const DRAW_AHEAD = 0.35;
/** The spine is top-clipped this far above the top edge, so it never shows a top terminus in frame. */
const TOP_CLIP = 60;

const lineGen = d3line<{ x: number; y: number }>()
  .x((d) => d.x)
  .y((d) => d.y)
  .curve(curveCatmullRom.alpha(0.5));

/** A plain M/L polyline, for the densely-sampled winding tail where a spline's overshoot would fight
 *  the exact circle. */
const poly = (pts: Array<{ x: number; y: number }>) =>
  pts.map((p, i) => (i ? 'L' : 'M') + p.x.toFixed(2) + ' ' + p.y.toFixed(2)).join(' ');

/* ------------------------------ strand sampling --------------------------- */

/** A sampled strand: its path string, plus per-point y, x and normalised arc-length fraction, so we
 *  can reveal only the middle segment between two Y lines. Monotonic in y. */
interface Strand {
  id: string;
  d: string;
  ys: number[];
  xs: number[];
  fracs: number[];
}

function sample(id: string, pts: Array<{ x: number; y: number }>): Strand {
  const ys = pts.map((p) => p.y);
  const xs = pts.map((p) => p.x);
  const cum: number[] = [0];
  for (let i = 1; i < pts.length; i++) {
    const dx = pts[i].x - pts[i - 1].x;
    const dy = pts[i].y - pts[i - 1].y;
    cum.push(cum[i - 1] + Math.hypot(dx, dy));
  }
  const total = cum[cum.length - 1] || 1;
  const fracs = cum.map((c) => c / total);
  return { id, d: lineGen(pts) ?? '', ys, xs, fracs };
}

/** Interpolate the strand at world Y (binary search over the ascending y array). */
function atY(s: Strand, Y: number): { x: number; frac: number } {
  const { ys, xs, fracs } = s;
  const n = ys.length;
  if (Y <= ys[0]) return { x: xs[0], frac: 0 };
  if (Y >= ys[n - 1]) return { x: xs[n - 1], frac: 1 };
  let lo = 0;
  let hi = n - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (ys[mid] <= Y) lo = mid;
    else hi = mid;
  }
  const t = (Y - ys[lo]) / (ys[hi] - ys[lo] || 1);
  return { x: lerp(xs[lo], xs[hi], t), frac: lerp(fracs[lo], fracs[hi], t) };
}

/** A gentle slow-out settle (cubic ease-out): reads as a leaf opening, not a UI pop. */
const easeUnfurl = (u: number) => 1 - Math.pow(1 - clamp01(u), 3);

/** Symmetric ease-in-out (cubic): weight at both ends. Used by the post-pin camera pan and the
 *  unravel so neither snaps. (The autoplay effect keeps its own local copy for the entry descent.) */
const easeInOutCubic = (t: number) => {
  const c = clamp01(t);
  return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2;
};

/* --------------------------------- the graph ------------------------------ */

/**
 * The content graph, node by node. `nodes[0]` is the lead (hero, or showcase for the two bookends);
 * later nodes stack below as standard siblings. The clusters are agnostic to the winding finale and
 * twist-fuse beginning — this list is content only, and the geometry above holds it whatever it is.
 */
export const CLUSTERS: Cluster[] = [
  {
    // Near the fuse: an honest empty plate for a 2021 moment, image to come. Alternates side with the
    // 2022 placeholder below; both are held by the same calyx as every real plate.
    id: 'origin-2021',
    year: 2021.1,
    side: 'right',
    hint: '',
    nodes: [
      {
        tier: 'standard',
        media: { src: '', alt: 'A 2021 beginning, image to come', pending: true },
      },
    ],
  },
  {
    // Before the 2022 medical device: an honest empty plate for a 2022 moment, image to come.
    id: 'early-2022',
    year: 2022.0,
    side: 'left',
    hint: '',
    nodes: [
      {
        tier: 'standard',
        media: { src: '', alt: 'A 2022 moment, image to come', pending: true },
      },
    ],
  },
  {
    id: 'medical',
    year: 2022.6,
    side: 'right',
    hint: '',
    nodes: [
      {
        tier: 'hero',
        media: {
          src: `${A}/11-wound-care-kenya/wound-care-kenya-staged-cardboard-wedge-prototype.webp`,
          alt: 'The origami-inspired cardboard wedge prototype, a low-cost wound-prevention device, staged for photography',
        },
      },
      {
        tier: 'standard',
        media: {
          src: `${A}/11-wound-care-kenya/wound-care-kenya-in-hospital-device-test.webp`,
          alt: 'The device tested in hospital at Moi Teaching Hospital, Kenya',
        },
      },
    ],
  },
  {
    id: 'testfit',
    year: 2023.0,
    side: 'left',
    hint: '',
    nodes: [
      {
        tier: 'hero',
        media: {
          src: `${A}/15-testfit/testfit-backlit-logo-sign-late-night.webp`,
          alt: 'The backlit TestFit logo sign on an office wall at 12:56 in the morning, the late nights of a startup',
        },
      },
    ],
  },
  {
    id: 'together',
    year: 2023.4,
    side: 'left',
    hint: '',
    nodes: [
      {
        tier: 'hero',
        media: {
          src: `${A}/01-synergy/synergy-cosmos-growth-loop-poster.webp`,
          alt: 'The Plentify building growing from bare structure to fully planted',
          video: {
            webm: `${A}/01-synergy/synergy-cosmos-growth-loop.webm`,
            mp4: `${A}/01-synergy/synergy-cosmos-growth-loop.mp4`,
            rate: 0.72,
          },
        },
      },
    ],
  },
  {
    id: 'research',
    year: 2023.55,
    side: 'left',
    hint: 'Research Paper',
    nodes: [
      {
        tier: 'hero',
        media: {
          src: `${A}/08-synthetic-vision/synthetic-vision-patch-probe-saliency-heatmaps.webp`,
          alt: 'Saliency heatmaps over architectural fragments, warm colour marking each geometric primitive the model reads',
          fit: 'contain',
        },
      },
    ],
  },
  {
    id: 'making',
    year: 2024.0,
    side: 'right',
    hint: '',
    nodes: [
      {
        tier: 'hero',
        media: {
          src: `${A}/01-synergy/synergy-cosmos-compression-test.webp`,
          alt: 'A Plentify sample under compression on the MTS Insight testing machine, tested +30% stronger than hempcrete',
          fit: 'contain',
        },
      },
    ],
  },
  {
    id: 'robotics',
    year: 2024.2,
    side: 'right',
    hint: '',
    nodes: [
      {
        // The KUKA robot (Daniel's freshly-shot loop) leads the robotics moment; Clay's Texas robot
        // is its companion below. Both are the mains of the "Robots as Instruments" project.
        tier: 'hero',
        media: {
          src: `${A}/06-kuka-robotics/kuka-robotics-robot-loop-poster.webp`,
          alt: 'A KUKA robot arm sanding an aluminium sheet, tooling an ornamented surface',
          video: {
            webm: `${A}/06-kuka-robotics/kuka-robotics-robot-loop.webm`,
            mp4: `${A}/06-kuka-robotics/kuka-robotics-robot-loop.mp4`,
            rate: 1,
          },
        },
      },
      {
        tier: 'standard',
        media: {
          src: `${A}/13-texas-robotics/texas-robotics-robot-device-loop-poster.webp`,
          alt: 'A Texas Robotics mock-up robot device in motion',
          video: {
            webm: `${A}/13-texas-robotics/texas-robotics-robot-device-loop.webm`,
            mp4: `${A}/13-texas-robotics/texas-robotics-robot-device-loop.mp4`,
            rate: 0.85,
          },
        },
      },
    ],
  },
  {
    id: 'llo',
    year: 2024.5,
    side: 'right',
    hint: 'LLO: Dream Machine',
    nodes: [
      {
        tier: 'hero',
        media: {
          src: `${A}/14-large-language-object/large-language-object-lamp.webp`,
          alt: 'The Large Language Object, a plywood articulated desk lamp on a wooden base with pulleys and a control box',
        },
      },
    ],
  },
  {
    id: 'resia',
    year: 2024.5,
    side: 'left',
    hint: 'Resia: AI-Remodel Software',
    nodes: [
      {
        tier: 'hero',
        media: {
          src: `${A}/12-resia/resia-product-screenshot-1.webp`,
          alt: 'The Resia landing page, a one-stop remodeling solution to generate, estimate, contract, and manage a renovation',
        },
      },
    ],
  },
  {
    id: 'dougherty',
    year: 2024.6,
    side: 'left',
    hint: '',
    nodes: [
      {
        tier: 'hero',
        media: {
          src: `${A}/05-dougherty/dougherty-arts-center-catenary-entrance-skyline-money-shot.webp`,
          alt: 'The catenary arch entrances of the Dougherty Arts Center, the Austin skyline behind',
        },
      },
      {
        tier: 'standard',
        media: {
          src: `${A}/05-dougherty/dougherty-arts-center-physical-model-cardboard-catenary.webp`,
          alt: 'The cardboard physical model of the Dougherty Arts Center, its white catenary arches standing in the round',
        },
      },
    ],
  },
  {
    id: 'factory',
    year: 2025.3,
    side: 'left',
    hint: '',
    nodes: [
      {
        tier: 'hero',
        media: {
          src: `${A}/10-robotic-factory/robotic-factory-section-assembly-poster.webp`,
          alt: 'The robotic factory long section assembling itself, vaulted halls, chimneys and planted terraces building up in sequence',
          video: {
            webm: `${A}/10-robotic-factory/robotic-factory-section-assembly-loop.webm`,
            mp4: `${A}/10-robotic-factory/robotic-factory-section-assembly-loop.mp4`,
            rate: 0.85,
          },
        },
      },
    ],
  },
  {
    id: 'newyork',
    year: 2025.0,
    side: 'right',
    hint: 'NYC: Rogers Partners',
    nodes: [
      {
        tier: 'showcase',
        media: {
          src: `${A}/16-rogers-partners-nyc/rogers-partners-nyc-door-elevation-drawing.webp`,
          alt: 'A Rogers Partners door elevation drawing, an arched double door with ironwork tracery, dimensioned',
          fit: 'contain',
        },
      },
      {
        tier: 'standard',
        media: {
          src: `${A}/16-rogers-partners-nyc/rogers-partners-nyc-office-desk-selfie.webp`,
          alt: 'Daniel at his dual-monitor desk in the Rogers Partners office in New York',
        },
      },
    ],
  },
];

/* ------------------------------ strand builders --------------------------- */

/**
 * The spine: one straight line born at the twist-fuse (2021) and running plumb down its axis to
 * 2026, where the lean into the mark begins. There is nothing above the junction.
 */
export function spinePts(): Array<{ x: number; y: number }> {
  const pts: Array<{ x: number; y: number }> = [];
  const N = 120;
  for (let i = 0; i <= N; i++) {
    pts.push({ x: CX, y: lerp(CONV_JUNCTION_Y, CONVERGE_Y, i / N) });
  }
  return pts;
}

/* ----------------------------- the spine garland -------------------------- */

/**
 * THE GARLAND (2026-07-16). Clay's gongbi growth composer, grafted onto Daniel's spine.
 *
 * The composer in engine/gongbi/garland.ts grows a plant along an ARBITRARY polyline — that is
 * its whole point — so it is fed `spinePts()`, THIS page's own geometry. His organs, Daniel's
 * line. The composer's own vine is switched off (`tube: false`): the spine stays the drawn SVG
 * line it has always been, at SPINE_W, and the garland contributes leaves and blossom clusters
 * along it and nothing else. This is ornament ON structure, not a replacement for it.
 *
 * Pigment, not ink: the botanicals are the one place on the page where the genome's own palette
 * is allowed (see INK_SEPIA). The structure underneath stays one colour.
 *
 * The strip is a narrow band centred on the spine and drawn 1:1 in world units. It covers only
 * the plumb run (junction → converge); the lean and the winding tail are re-solved every scroll
 * frame, and a raster cannot follow them.
 */
/**
 * The garland's commission. PINNED to take 2 after a seed sweep on 2026-07-16 (six takes grown
 * onto the real spine and compared side by side) — and the seed is the difference between
 * ornament and a stain, so this is a design review, not a constant:
 *   bower/spine    — the genome aims its organs with a random 3D rotation, and this take lands
 *                    its leaves EDGE-ON: they render as curled grey-green slivers that read as
 *                    a smudge on the line. Rejected.
 *   bower/spine-2  — PINNED. A broad sage leaf with a legible midrib arching off the spine, and
 *                    a small pink blossom below. Reads as botany on structure.
 *   bower/spine-5  — a BLUE bell flower. The page just retired blue; pigment on a botanical is
 *                    not a licence to walk it back in. Rejected.
 * Re-curate with the seed sweep, not by eye on one take.
 */
const GARLAND_SEED = 'bower/spine-2';
/** Half-width of the garland strip in world units: how far an organ may reach off the spine.
 *  Kept inside the gutter (OFFSET_X = 110) so foliage can never touch a plate — and comfortably
 *  wider than the organs actually reach (measured 63 at GARLAND_SCALE), because an organ that
 *  runs off the strip is CLIPPED, and a clipped leaf reads as a broken drawing rather than as
 *  restraint. At 64 the foliage was cut flat against the strip edge. */
export const GARLAND_REACH = 90;
/**
 * Organ scale. NOT 1:1 — the genome's organ sizes are tuned for a whole plant composed on a
 * 1200px canvas, and dropped onto the spine at that scale they measure ~12px: specks. Measured
 * on 2026-07-16 (paintGarland into the real strip, counting visible pixels):
 *   0.62 → reach 26 from the spine, coverage 0.003. Invisible.
 *   1.5  → reach 63,  coverage 0.013. Foliage that reads at the spine's weight.
 *   3+   → reach 64+, clipped by the strip.
 * 1.5 puts the leaves at roughly eight times the spine's width — ornament ON the structure,
 * which is Sai's weight budget, rather than a second plant competing with it.
 */
const GARLAND_SCALE = 1.5;
/** A station must clear this much y from a branch anchor, so foliage never fouls a fork or the
 *  node dot drawn there. */
const GARLAND_ANCHOR_CLEAR = 46;
/** ...and this much from a year tick, so foliage never crowds a numeral. */
const GARLAND_TICK_CLEAR = 40;

/**
 * Where the garland's organs may grow: the y bands of the spine that the DRAWING itself leaves
 * free. Every branch anchor (a fork, plus its node dot) and every year tick claims a band; the
 * garland takes what is left. Pure and exported — the contract test asserts that no station
 * lands on a fork or a numeral, which is the whole reason the placement is computed rather
 * than sprinkled at even intervals.
 *
 * Returns stations in path-fraction space (0 = the fuse, 1 = the converge point), because that
 * is the coordinate the composer walks.
 */
export function garlandStations(
  clusters: ReadonlyArray<{ year: number }> = CLUSTERS,
  years: readonly number[] = [2021, 2022, 2023, 2024, 2025, 2026],
): GarlandStation[] {
  const busy: Array<[number, number]> = [];
  for (const c of clusters) {
    const y = yearToY(c.year);
    busy.push([y - GARLAND_ANCHOR_CLEAR, y + GARLAND_ANCHOR_CLEAR]);
  }
  for (const y of years) {
    const ty = yearToY(y);
    // The tick sits at ty and the numeral rides above it; claim both.
    busy.push([ty - GARLAND_TICK_CLEAR - YEAR_LABEL_CLEAR, ty + GARLAND_TICK_CLEAR]);
  }
  busy.sort((a, b) => a[0] - b[0]);

  // Merge the claimed bands, then walk the gaps between them.
  const merged: Array<[number, number]> = [];
  for (const b of busy) {
    const last = merged[merged.length - 1];
    if (last && b[0] <= last[1]) last[1] = Math.max(last[1], b[1]);
    else merged.push([b[0], b[1]]);
  }

  const span = CONVERGE_Y - CONV_JUNCTION_Y;
  const stations: GarlandStation[] = [];
  let cursor = CONV_JUNCTION_Y;
  const ORGANS: GarlandOrgan[] = ['leaf', 'bloom', 'leaf', 'bud', 'leaf', 'bloom'];
  let n = 0;
  const place = (from: number, to: number) => {
    // One organ per ~150 units of free run, centred in its share of the gap, so foliage is
    // spaced by the drawing's own rhythm rather than by a fixed count.
    const room = to - from;
    if (room < 90) return;
    const count = Math.max(1, Math.floor(room / 150));
    for (let i = 0; i < count; i++) {
      const y = from + (room * (i + 0.5)) / count;
      stations.push({ t: (y - CONV_JUNCTION_Y) / span, organ: ORGANS[n % ORGANS.length] });
      n += 1;
    }
  };
  for (const [b0, b1] of merged) {
    if (b0 > cursor) place(cursor, Math.min(b0, CONVERGE_Y));
    cursor = Math.max(cursor, b1);
    if (cursor >= CONVERGE_Y) break;
  }
  if (cursor < CONVERGE_Y) place(cursor, CONVERGE_Y);
  return stations.filter((s) => s.t >= 0 && s.t <= 1);
}

/** The garland strip's world-space box: a band hugging the spine over its plumb run. */
export const GARLAND_BOX = {
  x: CX - GARLAND_REACH,
  y: CONV_JUNCTION_Y,
  w: GARLAND_REACH * 2,
  h: CONVERGE_Y - CONV_JUNCTION_Y,
};

/** The spine's polyline in STRIP-local pixels (the composer paints into its own canvas). */
export function garlandPath(): Array<[number, number]> {
  return spinePts().map((p) => [p.x - GARLAND_BOX.x, p.y - GARLAND_BOX.y] as [number, number]);
}

/**
 * The garland, painted once off-thread and hung on the spine as an <image>. It is deliberately
 * NOT part of the scroll-reveal choreography: the reveal gates the STRUCTURE (the spine draws
 * itself as you descend), and a raster cannot be dash-offset. It fades in when it arrives.
 */
function SpineGarland({ reduced }: { reduced: boolean }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    let objectUrl: string | null = null;
    requestGarland({
      seed: GARLAND_SEED,
      voice: 'pigment',
      width: GARLAND_BOX.w,
      height: GARLAND_BOX.h,
      path: garlandPath(),
      stations: garlandStations(),
      scale: GARLAND_SCALE,
      tube: false, // Daniel's spine is the stem; the composer only brings foliage.
    })
      .then(async (bitmap) => {
        // The worker hands back an ImageBitmap; SVG <image> needs a URL, so draw it once to a
        // canvas and keep the blob. Bitmaps are cached in painter.ts, so a remount is cheap.
        const c = document.createElement('canvas');
        c.width = bitmap.width;
        c.height = bitmap.height;
        c.getContext('2d')?.drawImage(bitmap, 0, 0);
        const blob = await new Promise<Blob | null>((r) => c.toBlob(r, 'image/png'));
        if (!blob || !live) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch((err: unknown) => {
        // A failed garland must leave the page intact — the spine is the load-bearing thing and
        // it is drawn in SVG — but a broken painting room must not look like a design choice.
        console.error('gongbi spine garland failed:', err);
      });
    return () => {
      live = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, []);

  if (!url) return null;
  return (
    <image
      href={url}
      x={GARLAND_BOX.x}
      y={GARLAND_BOX.y}
      width={GARLAND_BOX.w}
      height={GARLAND_BOX.h}
      style={{
        opacity: url ? 1 : 0,
        transition: reduced ? undefined : 'opacity 900ms ease-out',
        pointerEvents: 'none',
      }}
    />
  );
}

/* ------------------------------- the layout ------------------------------- */

/** Per-cluster layout result: the shared branch anchor on the spine, and each plate's box. */
interface LaidCluster {
  id: string;
  side: Side;
  dir: number;
  hint: string;
  spineX: number;
  anchorY: number;
  /** The plates' near edge on this side (where every branch attaches). */
  edgeX: number;
  plates: Array<{ x: number; y: number; w: number; h: number; media: Plate; attachY: number }>;
}

/**
 * Pack one side's clusters down its offset lane so no two bounding boxes overlap. Pure and
 * deterministic (exported for tests): a cluster sits centred on its true anchor year unless that
 * would collide with the previous cluster on this side, in which case it is pushed just far enough
 * down to clear it by CROSS_GAP. The branch anchor itself always stays on the true year.
 */
export function packSide(
  items: Array<{ id: string; anchorY: number; heights: number[] }>,
  gap: number,
  crossGap: number,
): Map<string, number> {
  const stackHeight = (heights: number[]) =>
    heights.reduce((s, h) => s + h, 0) + Math.max(0, heights.length - 1) * gap;
  const tops = new Map<string, number>();
  let laneBottom = -Infinity;
  for (const it of items) {
    const firstH = it.heights[0] ?? 0;
    const desiredTop = it.anchorY - firstH / 2; // centre the lead node on the true year
    const top = Math.max(desiredTop, laneBottom + crossGap);
    tops.set(it.id, top);
    laneBottom = top + stackHeight(it.heights);
  }
  return tops;
}

function layoutClusters(spine: Strand): LaidCluster[] {
  const tops = new Map<string, number>();
  (['left', 'right'] as Side[]).forEach((side) => {
    const items = CLUSTERS.filter((c) => c.side === side)
      .map((c) => ({ id: c.id, anchorY: yearToY(c.year), heights: c.nodes.map((n) => TIER[n.tier].h) }))
      .sort((a, b) => a.anchorY - b.anchorY);
    packSide(items, CLUSTER_GAP_Y, CROSS_GAP).forEach((v, k) => tops.set(k, v));
  });

  return CLUSTERS.map((c) => {
    const anchorY = yearToY(c.year);
    const spineX = atY(spine, anchorY).x;
    const dir = c.side === 'left' ? -1 : 1;
    const edgeX = spineX + dir * OFFSET_X; // the plates' near edge, where the branch attaches
    let y = tops.get(c.id)! + (c.dy ?? 0);
    const plates = c.nodes.map((n) => {
      const { w, h } = TIER[n.tier];
      const x = dir === 1 ? edgeX : edgeX - w;
      const attachY = branchAttachY(anchorY, y, h);
      const box = { x, y, w, h, media: n.media, attachY };
      y += h + CLUSTER_GAP_Y;
      return box;
    });
    return { id: c.id, side: c.side, dir, hint: c.hint, spineX, anchorY, edgeX, plates };
  });
}

/** Every branch resolved to its sampled polyline and its target plate rect, for the no-overlap
 *  contract test. A branch touches its own plate only at the attach point; it must not intersect any
 *  other plate, and no two branches from DIFFERENT clusters may cross. */
export function computeBranches(): Array<{
  clusterId: string;
  plateIndex: number;
  side: Side;
  pts: Array<{ x: number; y: number }>;
  rect: { x: number; y: number; w: number; h: number };
}> {
  const spine = sample('spine', spinePts());
  const laid = layoutClusters(spine);
  const out: Array<{
    clusterId: string;
    plateIndex: number;
    side: Side;
    pts: Array<{ x: number; y: number }>;
    rect: { x: number; y: number; w: number; h: number };
  }> = [];
  laid.forEach((c) =>
    c.plates.forEach((pl, i) =>
      out.push({
        clusterId: c.id,
        plateIndex: i,
        side: c.side,
        pts: branchPts(c.spineX, c.anchorY, c.edgeX, pl.attachY),
        rect: { x: pl.x, y: pl.y, w: pl.w, h: pl.h },
      }),
    ),
  );
  return out;
}

/* ------------------------------- the graphic ------------------------------ */

function useFrameAspect(ref: React.RefObject<HTMLElement>): number {
  const [aspect, setAspect] = useState(16 / 9);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) setAspect(width / height);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return aspect;
}

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);

export function CrossPathsTimeline({
  title,
  questions,
}: {
  title: ReactNode;
  questions: Array<{ label: string; text: string }>;
}) {
  const reduced = useReducedMotion();
  const trackRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const [p, setP] = useState(0); // 0 to 1, the SMOOTHED camera progress
  const aspect = useFrameAspect(frameRef);
  // Page-centre expressed in the frame's viewBox-x (see the descD comment). The frame sits in the
  // right column, so its axis (CX=600) is NOT the page centre; this measures the gap so the finale's
  // descending line can exit exactly above the founders' node below.
  const [pageCenterVX, setPageCenterVX] = useState(305);
  useEffect(() => {
    const measure = () => {
      const f = frameRef.current;
      const main = f?.closest('main');
      if (!f || !main) return;
      const fr = f.getBoundingClientRect();
      if (fr.width <= 0) return;
      const mr = main.getBoundingClientRect();
      const cs = getComputedStyle(main);
      const padL = parseFloat(cs.paddingLeft) || 0;
      const padR = parseFloat(cs.paddingRight) || 0;
      const contentCenter = mr.left + padL + (mr.width - padL - padR) / 2;
      setPageCenterVX(((contentCenter - fr.left) / fr.width) * W);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);
  // Persists across effect re-runs (StrictMode double-invoke, a reduced-motion media change) so the
  // entry autoplay fires AT MOST ONCE per page load and can never snap the finished descent back up.
  const autoplayedRef = useRef(false);

  // Scroll smoothing without a dependency: raw progress read from the track, camera driven by a
  // lerped value so it has weight and no jitter. The rAF idles once caught up.
  useEffect(() => {
    if (reduced) return;
    const el = trackRef.current;
    if (!el) return;
    let raf = 0;
    let running = false;
    let target = 0;
    let current = 0;

    const readTarget = () => {
      const r = el.getBoundingClientRect();
      const travel = r.height - window.innerHeight;
      target = travel <= 0 ? 0 : clamp01(-r.top / travel);
    };
    const tick = () => {
      current += (target - current) * 0.1;
      if (Math.abs(target - current) < 0.0005) {
        current = target;
        running = false;
        setP(current);
        return;
      }
      setP(current);
      raf = requestAnimationFrame(tick);
    };
    const kick = () => {
      readTarget();
      if (!running) {
        running = true;
        raf = requestAnimationFrame(tick);
      }
    };

    readTarget();
    current = target;
    setP(current);
    window.addEventListener('scroll', kick, { passive: true });
    window.addEventListener('resize', kick);
    return () => {
      window.removeEventListener('scroll', kick);
      window.removeEventListener('resize', kick);
      cancelAnimationFrame(raf);
    };
  }, [reduced]);

  // AUTOPLAY ON ENTRY. Exactly once per page load, after a lead-in that lets the entry narration
  // settle, the page auto-scrolls SMOOTHLY (rAF-eased, not stepped) from the top of the timeline all
  // the way down to the finale, where the mark winds up and composes. This drives the REAL scroll
  // position, so the scroll-driven camera above follows for free: one continuous cinematic descent.
  // Control is handed to the user exactly at the reveal (the pin, p=1). A strong gesture never traps
  // the user: mid-descent it FAST-FORWARDS to the reveal; before the descent begins it cancels it
  // outright. Reduced motion skips the whole thing and lands directly in the controllable state.
  useEffect(() => {
    if (reduced) return;
    const el = trackRef.current;
    if (!el) return;

    let raf = 0;
    let phase: 'idle' | 'playing' | 'done' = 'idle';
    let startTs = 0;
    let startY = 0;
    let endY = 0;
    let duration = AUTOPLAY_MS;

    const playInputs = ['wheel', 'touchstart', 'keydown', 'pointerdown'] as const;
    const detachPlayInputs = () => playInputs.forEach((e) => window.removeEventListener(e, onGesture));
    const detachEarlyInputs = () => playInputs.forEach((e) => window.removeEventListener(e, onEarly));

    const finish = () => {
      phase = 'done';
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      detachPlayInputs();
    };
    const frame = (ts: number) => {
      if (phase !== 'playing') return;
      if (!startTs) startTs = ts;
      const t = clamp01((ts - startTs) / duration);
      // LINEAR: constant scroll velocity, so the descent never accelerates (Daniel: "it should not
      // increase in speed"). The old easeInOut sped up through the middle; this holds one slow pace.
      window.scrollTo(0, Math.round(lerp(startY, endY, t)));
      if (t >= 1) return finish();
      raf = requestAnimationFrame(frame);
    };
    // Mid-descent: a strong gesture fast-forwards to the reveal from wherever it is now, so the user
    // reaches the controllable state quickly rather than being yanked or frozen mid-timeline.
    const onGesture = () => {
      if (phase !== 'playing') return;
      startY = window.scrollY;
      startTs = 0;
      duration = AUTOPLAY_FF_MS;
      detachPlayInputs(); // one gesture is enough; let the fast-forward run to the reveal
    };
    // Before the descent even begins: the user took control, so honour it and skip the set-piece.
    const onEarly = () => {
      if (phase !== 'idle') return;
      phase = 'done';
      autoplayedRef.current = true; // taken over: no later instance may start a descent either
      window.clearTimeout(leadIn);
      detachEarlyInputs();
    };

    const begin = () => {
      if (phase !== 'idle' || autoplayedRef.current) return;
      autoplayedRef.current = true;
      detachEarlyInputs();
      const rect = el.getBoundingClientRect();
      const travel = rect.height - window.innerHeight;
      if (travel <= 0) {
        phase = 'done';
        return;
      }
      // Snap to the very top of the timeline so the descent always starts from the beginning, even if
      // the narration ran a touch long, then ease down to the pin.
      startY = window.scrollY + rect.top;
      // Land the entry descent at the PIN (the full bower frame), not the end of the track: the
      // post-pin unravel + descent is the user's to drive by scrolling on.
      endY = startY + travel * PIN_FRAC;
      window.scrollTo(0, Math.round(startY));
      phase = 'playing';
      playInputs.forEach((e) =>
        window.addEventListener(e, onGesture, e === 'keydown' ? undefined : { passive: true }),
      );
      raf = requestAnimationFrame(frame);
    };

    playInputs.forEach((e) =>
      window.addEventListener(e, onEarly, e === 'keydown' ? undefined : { passive: true }),
    );
    const leadIn = window.setTimeout(begin, AUTOPLAY_LEAD_IN_MS);
    return () => {
      window.clearTimeout(leadIn);
      detachEarlyInputs();
      finish();
    };
  }, [reduced]);

  // The spine, sampled once. Everything else anchors onto it.
  const spine = useMemo(() => sample('spine', spinePts()), []);
  const laid = useMemo(() => layoutClusters(spine), [spine]);
  /** What the year labels must dodge: every plate and every branch, as actually laid out.
   *  The layout is static, so this is computed once per mount, not per scroll frame. */
  const labelObstacles = useMemo(() => computeBranches(), []);

  // The two convergence strands (the twist-fuse). Sampled for a smooth over-under lay-up; drawn
  // solid because they ARE the structure, not a whisper. The viewBox pan clips their off-frame tops.
  const conv = useMemo(
    () => ({ left: sample('conv-clay', convArmPts(-1)), right: sample('conv-daniel', convArmPts(1)) }),
    [],
  );
  const viewH = clamp(W / aspect, 480, H);
  // THE PIN. At full progress (p=1, the end of the track) the camera sits so the mark's centre is at
  // the frame's vertical centre, which is where the left text block is centred too, so the mark and
  // the words compose as one still. The natural un-sticky past the track then carries that still up
  // and out as the user scrolls on. (Reduced motion shows the whole drawing at once instead.)
  const pinCamY = Math.max(MARK_CENTER_Y - viewH / 2, 0);
  // TWO PHASES along the track. p in [0, PIN_FRAC]: the wind into the mark (camera 0 -> pin), exactly
  // as before, just remapped onto the first two-thirds of the (now longer) track. p past PIN_FRAC:
  // the unravel + descent — the camera HOLDS on the pin while the mark opens (so the user watches it
  // ravel out in place), then follows the descending line down and out the bottom of the frame.
  const p1 = clamp01(p / PIN_FRAC); // wind-phase progress (0..1), preserving the original pacing
  const q = clamp01((p - PIN_FRAC) / (1 - PIN_FRAC)); // unravel-phase progress (0..1)
  const camYEnd = Math.max(DESC_BOTTOM_Y - viewH, pinCamY); // exit lands at the frame's bottom edge
  const camY = reduced
    ? 0
    : p <= PIN_FRAC
      ? lerp(0, pinCamY, p1)
      : lerp(pinCamY, camYEnd, easeInOutCubic(clamp01((q - 0.4) / 0.6)));
  const frontY = camY + viewH * (1 + DRAW_AHEAD);
  const topY = camY - TOP_CLIP;
  const cardLineY = reduced ? H : camY + viewH * CARD_LINE;

  const viewBox = reduced ? `0 0 ${W} ${H}` : `0 ${camY} ${W} ${viewH}`;

  /** The middle-segment reveal for the spine: draw only from the top clip to the draw-ahead front,
   *  so both terminals sit off-frame and the line runs edge to edge. */
  const revealProps = (s: Strand) => {
    if (reduced) return { strokeDasharray: undefined, strokeDashoffset: undefined, hidden: false };
    const fTop = atY(s, topY).frac;
    const fBot = atY(s, frontY).frac;
    const len = fBot - fTop;
    if (len <= 0.0005) return { strokeDasharray: '0 1', strokeDashoffset: 0, hidden: true };
    return { strokeDasharray: `${len} 1`, strokeDashoffset: -fTop, hidden: false };
  };

  // THE FINALE WIND. Timed off the CAMERA so the whole ravel plays while the mark is well inside the
  // frame: it starts when the mark has risen to WIND_ENTER of the way down and completes exactly at
  // the pin, with the mark centred. The user watches the line wind itself up, never a pre-assembled
  // mark sliding in from below.
  const windStartCamY = MARK_CENTER_Y - WIND_ENTER * viewH;
  // Wind phase: driven by the camera as before. Unravel phase: play the wind backwards over the first
  // 40% of q (so the mark is fully open BEFORE the camera starts descending past it), then hold at 0.
  const windW = reduced
    ? 1
    : p <= PIN_FRAC
      ? clamp01((camY - windStartCamY) / (pinCamY - windStartCamY || 1))
      : 1 - easeInOutCubic(clamp01(q / 0.4));
  const g = useMemo(() => solveMark(), []);
  // The RAVEL (wind, p <= PIN_FRAC) uses the original right-flank tail; the UNRAVEL (post-pin) uses
  // the morphing tail so it opens with the OPPOSITE curl rather than retracing the wind-up. Both are
  // the identical circle 0 at windW=1, so the swap at the pin is seamless (no pop).
  const unraveling = !reduced && p > PIN_FRAC;
  const tail = useMemo(
    () => (unraveling ? tailPtsUnravel(windW) : tailPts(windW)),
    [windW, unraveling],
  );
  // CONTINUITY GUARANTEE: point the lean at the tail's CURRENT top point every frame. Pre-pin that is
  // P (the original right-flank ravel lean); through the unravel it slides P -> P' as the tail morphs
  // to its mirror, and the lean follows, so the plumb spine -> lean -> tail is one unbroken stroke and
  // the line never detaches from the mark. (This is the fix for the circled gap: the tail top used to
  // jump to P' while the lean stayed at P.)
  const leanPts = useMemo(() => spineLeanPtsTo(tail[0].x), [tail]);
  // Where the mirrored unwound ray ends: the opposite flank of circle 0 (reflection of P across C.x).
  // At windW=0 the morph is fully mirrored, so the tail's bottom lands exactly here — the descent's
  // start — closing the spine -> mark -> descent -> founders line with no gap at the bottom either.
  const mirrorRayEndX = 2 * g.C.x - g.P.x;
  // The wordmark fades IN with the wind, and back OUT as the unravel begins: it belongs to the held
  // pin, not to the line flowing on past it (and it clears the descending line's path).
  const wordmarkOpacity = reduced ? 1 : clamp01((windW - 0.86) / 0.14) * (1 - clamp01((q - 0.05) / 0.25));
  // Where the PAGE centre falls in the frame's viewBox-x. The mark/spine sit on the frame-column axis
  // (CX=600), but the founders below are centred on the PAGE; the descending line sweeps from the mark
  // to this x so it exits directly above the founders' node. Measured (see the effect) so the seam is
  // pixel-accurate at any width; the ~305 default is a sane pre-measurement estimate.
  const descD = reduced
    ? // static: from the attach point on the mark, straight down and over to page-centre, exiting.
      `M ${g.P.x.toFixed(2)} ${g.P.y.toFixed(2)} C ${g.P.x.toFixed(2)} ${(g.P.y + (DESC_BOTTOM_Y - g.P.y) * 0.5).toFixed(2)}, ${pageCenterVX.toFixed(2)} ${(DESC_BOTTOM_Y - (DESC_BOTTOM_Y - g.P.y) * 0.5).toFixed(2)}, ${pageCenterVX.toFixed(2)} ${DESC_BOTTOM_Y.toFixed(2)}`
    : // animated: continues the MIRRORED unwound ray (which ends at RAY_END_Y on the mark's opposite
      // flank, x = mirrorRayEndX) straight down, then sweeps over to page centre. The exit (page
      // centre, DESC_BOTTOM_Y) is unchanged; only the start flank mirrors with the unravel.
      `M ${mirrorRayEndX.toFixed(2)} ${RAY_END_Y.toFixed(2)} C ${mirrorRayEndX.toFixed(2)} ${(RAY_END_Y + DESC_DROP * 0.5).toFixed(2)}, ${pageCenterVX.toFixed(2)} ${(DESC_BOTTOM_Y - DESC_DROP * 0.5).toFixed(2)}, ${pageCenterVX.toFixed(2)} ${DESC_BOTTOM_Y.toFixed(2)}`;

  return (
    <div ref={trackRef} className="relative" style={{ height: reduced ? 'auto' : '1080vh' }}>
      <div
        className={
          reduced
            ? 'flex flex-col gap-12'
            : 'sticky top-[var(--header-h)] flex h-[calc(100svh-var(--header-h))] flex-col gap-8 py-4 lg:flex-row lg:items-stretch lg:gap-12 xl:gap-16'
        }
      >
        <div className="flex shrink-0 flex-col justify-center gap-10 lg:w-[clamp(19rem,26vw,24rem)]">
          {title}
          <dl className="flex flex-col gap-8">
            {questions.map((q, i) => {
              const at = reduced ? 1 : clamp01((p1 - (i === 0 ? 0.04 : 0.42)) / 0.12);
              return (
                <div
                  key={q.label}
                  style={{
                    opacity: at,
                    transform: `translateY(${(1 - at) * 14}px)`,
                    transition: 'opacity 500ms ease-out, transform 500ms ease-out',
                  }}
                >
                  <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-inkBlack/40">
                    {q.label}
                  </dt>
                  <dd className="mt-2.5 font-serifDisplay text-[clamp(1.15rem,1.55vw,1.5rem)] leading-[1.35] text-inkBlack">
                    {q.text}
                  </dd>
                </div>
              );
            })}
          </dl>
        </div>

        <div ref={frameRef} className="min-h-0 min-w-0 flex-1">
          <svg
            viewBox={viewBox}
            preserveAspectRatio="xMidYMid meet"
            className="h-full w-full"
            role="img"
            aria-label="A timeline from 2021 to 2026 that travels downward as you scroll. At the top, two strands, Clay and Daniel, come in from off the frame and twist together into one line: the spine is born where they fuse in 2021. Each later event branches off the spine to a picture held in a small calyx: a medical device, startups, buildings grown in place, computational design research, fabrication, robotics, a lamp, and a year in New York. At the end the line leans off its axis and winds itself up into the Bower mark, with the wordmark, Bower, beneath it."
          >
            {/* THE TWIST-FUSE. Two equal strands cross once over-under and become the spine at 2021.
                The right strand is painted last through the crossing (a vellum halo opens the gap
                that makes the over-under legible), so it reads as one lay-up, not a flat X. */}
            <g style={{ pointerEvents: 'none' }}>
              <path
                d={conv.left.d}
                fill="none"
                stroke={INK_SEPIA}
                strokeWidth={CONV_WEIGHT}
                strokeLinecap="butt"
                strokeLinejoin="round"
              />
              <path
                d={conv.right.d}
                fill="none"
                stroke={VELLUM}
                strokeWidth={CONV_WEIGHT + 6}
                strokeLinecap="butt"
              />
              <path
                d={conv.right.d}
                fill="none"
                stroke={INK_SEPIA}
                strokeWidth={CONV_WEIGHT}
                strokeLinecap="butt"
                strokeLinejoin="round"
              />
            </g>

            {/* THE SPINE. The only long line: heavy, full opacity, born at the fuse and running edge
                to edge to 2026. */}
            {(() => {
              const r = revealProps(spine);
              return (
                <path
                  d={spine.d}
                  fill="none"
                  stroke={INK_SEPIA}
                  strokeWidth={SPINE_W}
                  strokeLinecap="round"
                  pathLength={1}
                  strokeDasharray={r.strokeDasharray}
                  strokeDashoffset={r.strokeDashoffset}
                  opacity={r.hidden ? 0 : 1}
                />
              );
            })()}

            {/* THE GARLAND. Clay's gongbi organs grown along the spine's own polyline, in full
                pigment. Painted after the spine so foliage sits ON the line, and before the
                clusters so a plate's calyx and its branch stay on top of it. */}
            <SpineGarland reduced={reduced} />

            {/* Every cluster: a pedicel off the spine to one or more plates, each cupped by a calyx. */}
            {laid.map((c) => (
              <ClusterGroup key={c.id} cluster={c} cardLineY={cardLineY} reduced={reduced} />
            ))}

            {/* Year labels: heavy, painted AFTER the clusters (numerals never blocked), with a vellum
                halo (paint-order stroke) so they stay legible over any adjacent-year plate. The side
                flip (yearLabelSide, unit-tested) puts each label on whichever side the laid-out
                plates and branches actually leave room on. */}
            {[2021, 2022, 2023, 2024, 2025, 2026].map((y) => {
              const ty = yearToY(y);
              const vis = reduced ? 1 : clamp01((camY + viewH + 40 - ty) / 60) * clamp01((ty - camY + 120) / 80);
              if (vis <= 0.01) return null;
              const drawSide = yearLabelSide(labelObstacles, y);
              const dir = drawSide === 'right' ? 1 : -1;
              return (
                <g key={y} opacity={vis}>
                  <line
                    x1={CX + dir * YEAR_TICK_INNER}
                    y1={ty}
                    x2={CX + dir * (YEAR_TICK_INNER + YEAR_TICK_LEN)}
                    y2={ty}
                    stroke="currentColor"
                    className="text-inkBlack"
                    strokeWidth={2}
                    opacity={0.32}
                  />
                  <text
                    x={CX + dir * YEAR_LABEL_OFFSET}
                    y={ty - YEAR_LABEL_CLEAR}
                    textAnchor={dir === 1 ? 'start' : 'end'}
                    className="fill-inkBlack/70 font-mono"
                    style={{
                      fontSize: YEAR_LABEL_FONT,
                      fontWeight: 700,
                      letterSpacing: '0.05em',
                      fontVariantNumeric: 'tabular-nums',
                      paintOrder: 'stroke',
                      stroke: VELLUM,
                      strokeWidth: 8,
                      strokeLinejoin: 'round',
                      strokeLinecap: 'round',
                    }}
                  >
                    {y}
                  </text>
                </g>
              );
            })}

            {/* THE UNRAVEL. The other seven circles bloom outward from the wound one as the tail
                closes; circle 0 is NOT drawn here because the winding tail below IS circle 0. */}
            {MARK_CENTERS.map(([mx, my], j) => {
              if (j === 0) return null;
              const n = MARK_CENTERS.length;
              const ring = Math.min(Math.abs(j), n - Math.abs(j));
              const s = 0.58 + (ring - 1) * 0.06;
              const o = clamp01((windW - s) / 0.16);
              if (o <= 0.001) return null;
              return (
                <circle
                  key={j}
                  cx={MARK_CENTER_X + (mx - 50) * g.k}
                  cy={MARK_CENTER_Y + (my - 50) * g.k}
                  r={g.r}
                  fill="none"
                  stroke={INK_SEPIA}
                  strokeWidth={MARK_STROKE * g.k}
                  strokeLinecap="round"
                  opacity={o}
                />
              );
            })}

            {/* THE LINE INTO THE MARK: the plumb spine hands off to the organic meandering lean, and
                the lean hands off to the winding tail. All at the spine's weight, which is also the
                mark's stroke (MARK_STROKE * k = SPINE_W), so the one root reads as a single heavy line
                that ravels itself into the mark with no change in weight. */}
            <g>
              <path
                d={poly(leanPts)}
                fill="none"
                stroke={INK_SEPIA}
                strokeWidth={SPINE_W}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d={poly(tail)}
                fill="none"
                stroke={INK_SEPIA}
                strokeWidth={SPINE_W}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* THE UNRAVEL EXIT (Task 4). Below the unwound ray, the one line keeps flowing down and
                  sweeps to the page centre, exiting the bottom of the frame to hand off to the
                  founders' roots. It sits below the frame during the wind (the camera only reveals it
                  as it descends past the pin), so it is safe to draw always. */}
              <path
                d={descD}
                fill="none"
                stroke={INK_SEPIA}
                strokeWidth={SPINE_W}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={reduced ? 1 : clamp01((0.08 - windW) / 0.08)}
              />
            </g>

            {/* The wordmark, under the mark, once the ring has closed. Nothing else at the end. */}
            <text
              x={MARK_CENTER_X}
              y={MARK_CENTER_Y + 45 * g.k + WORDMARK_GAP}
              textAnchor="middle"
              className="font-mono lowercase"
              style={{
                fontSize: WORDMARK_FONT,
                fontWeight: 600,
                letterSpacing: '0.1em',
                fill: INK_SEPIA,
                opacity: wordmarkOpacity,
              }}
            >
              bower
            </text>
          </svg>
        </div>
      </div>
    </div>
  );
}

/* --------------------------- plates and clusters -------------------------- */

/** One inline video plate, drawn in SVG via a foreignObject so an HTML <video> can play in the
 *  panning viewBox. Reduced motion gets the poster still instead. */
function VineVideo({ plate, x, y, w, h, reduced }: { plate: Plate; x: number; y: number; w: number; h: number; reduced: boolean }) {
  const { ref, start } = useAutoplayVideo(plate.video?.rate ?? 1);
  const clip = `cptl-v-${plate.src.replace(/[^a-z0-9]/gi, '')}`;
  if (reduced) {
    return (
      <>
        <clipPath id={clip}>
          <rect x={x} y={y} width={w} height={h} />
        </clipPath>
        <image href={plate.src} x={x} y={y} width={w} height={h} preserveAspectRatio="xMidYMid slice" clipPath={`url(#${clip})`}>
          <title>{plate.alt}</title>
        </image>
      </>
    );
  }
  return (
    <foreignObject x={x} y={y} width={w} height={h}>
      <video
        ref={ref}
        autoPlay
        loop
        muted
        playsInline
        poster={plate.src}
        aria-label={plate.alt}
        onLoadedData={start}
        onCanPlay={start}
        style={{ width: '100%', height: '100%', display: 'block', objectFit: plate.fit === 'contain' ? 'contain' : 'cover', background: plate.fit === 'contain' ? '#fff' : undefined }}
      >
        {plate.video?.webm && <source src={plate.video.webm} type="video/webm" />}
        <source src={plate.video?.mp4} type="video/mp4" />
      </video>
    </foreignObject>
  );
}

/** One plate: a still image (clipped, cover or contain) or a video, with a hairline border. */
function PlateMedia({ plate, x, y, w, h, reduced }: { plate: Plate; x: number; y: number; w: number; h: number; reduced: boolean }) {
  const clip = `cptl-c-${plate.src.replace(/[^a-z0-9]/gi, '')}-${Math.round(x)}-${Math.round(y)}`;
  if (plate.pending) {
    return (
      <g>
        <rect x={x} y={y} width={w} height={h} fill={INK_SEPIA} fillOpacity={0.04} stroke={INK_SEPIA} strokeOpacity={0.3} strokeWidth={1} strokeDasharray="6 6" />
        <text x={x + w / 2} y={y + h / 2 + 4} textAnchor="middle" className="fill-inkBlack/35 font-mono" style={{ fontSize: 11, letterSpacing: '0.18em' }}>
          IMAGE TO COME
        </text>
      </g>
    );
  }
  const contain = plate.fit === 'contain';
  return (
    <g>
      {contain && <rect x={x} y={y} width={w} height={h} fill="#fff" />}
      {plate.video ? (
        <VineVideo plate={plate} x={x} y={y} w={w} h={h} reduced={reduced} />
      ) : (
        <>
          <clipPath id={clip}>
            <rect x={x} y={y} width={w} height={h} />
          </clipPath>
          <image href={plate.src} x={x} y={y} width={w} height={h} preserveAspectRatio={contain ? 'xMidYMid meet' : 'xMidYMid slice'} clipPath={`url(#${clip})`}>
            <title>{plate.alt}</title>
          </image>
        </>
      )}
      <rect x={x} y={y} width={w} height={h} fill="none" stroke={INK_SEPIA} strokeOpacity={0.25} strokeWidth={1} />
    </g>
  );
}

/**
 * The unfurl transform for a plate: opens from a lightly furled, foreshortened state to upright,
 * scaling about a pivot at the branch junction so it reads as a bloom opening. Rotation is a whisper
 * (2 degrees on the way in only, resting upright).
 */
function unfurl(u: number, pivotX: number, pivotY: number) {
  const e = easeUnfurl(u);
  const sx = lerp(0.92, 1, e);
  const sy = lerp(0.64, 1, e);
  const rot = lerp(-2, 0, e);
  return {
    transform: `translate(${pivotX} ${pivotY}) rotate(${rot}) scale(${sx} ${sy}) translate(${-pivotX} ${-pivotY})`,
    opacity: e,
  };
}

/**
 * One cluster: the dot on the spine, then for each plate a pedicel forking from that shared spine
 * point to the plate, a calyx cupping the plate's base (drawn behind, so its sepal tips frame the
 * plate), and the plate unfurling on top. The lead plate (index 0) carries the hint title.
 */
function ClusterGroup({ cluster, cardLineY, reduced }: { cluster: LaidCluster; cardLineY: number; reduced: boolean }) {
  const { dir, spineX, anchorY, edgeX, plates, hint } = cluster;
  const uStem = reduced ? 1 : clamp01((cardLineY - anchorY) / (UNFURL_SPAN * 0.4));

  // The holder botanical is generated ONCE per plate (deterministic off cluster id + node index),
  // memoized so the scroll animation (which re-renders every frame) never regenerates it.
  const sprigs = useMemo(
    () =>
      plates.map((pl, i) => {
        // Length is capped by the room actually below this plate (the next stacked sibling, or a
        // generous default when it is the lowest), so the sprig never reaches the plate beneath it.
        const spaceBelow = i + 1 < plates.length ? plates[i + 1].y - pl.attachY : 240;
        const maxLen = Math.max(20, spaceBelow - 12);
        return calyxSprig(edgeX, pl.attachY, dir, pl.h, maxLen, `${cluster.id}:${i}`);
      }),
    [plates, edgeX, dir, cluster.id],
  );

  return (
    <g>
      <circle cx={spineX} cy={anchorY} r={4.5} fill={INK_SEPIA} opacity={uStem > 0 ? 1 : 0} />

      {plates.map((pl, i) => {
        const branchD = branchPath(spineX, anchorY, edgeX, pl.attachY);
        const sprig = sprigs[i];
        // The holder buds in as the last beat of the branch's growth, right before the plate unfurls.
        const calyxOpacity = reduced ? 1 : clamp01((uStem - 0.7) / 0.3);

        const u = reduced ? 1 : clamp01((cardLineY - pl.y - 10) / UNFURL_SPAN);
        const pivotX = dir === 1 ? pl.x : pl.x + pl.w; // inner corner nearest the spine
        const pivotY = pl.y + pl.h;
        const t = unfurl(u, pivotX, pivotY);
        if (t.opacity <= 0.001 && uStem <= 0.001) return null;

        return (
          <g key={i}>
            <path
              d={branchD}
              fill="none"
              stroke={INK_SEPIA}
              strokeOpacity={0.7}
              strokeWidth={BRANCH_W}
              strokeLinecap="round"
              strokeLinejoin="round"
              pathLength={1}
              strokeDasharray={1}
              strokeDashoffset={reduced ? 0 : 1 - uStem}
            />
            {/* The holder: a small generated botanical (src/engine/botanical) cupping the plate from
                below, where the branch arrives under it. Real leaves fan down the calyx axes plus a
                delicate bud at the corner; height-scaled and gutter-capped like the sepals it replaced. */}
            {calyxOpacity > 0.001 && (
              <g style={{ opacity: calyxOpacity }} pointerEvents="none">
                {sprig.organs.map((org, oi) => (
                  <g key={oi} transform={org.transform}>
                    {org.paths.map((p, pi) => (
                      <path
                        key={pi}
                        d={p.d}
                        {...sprigPathStyle(p)}
                        strokeLinejoin="round"
                        strokeLinecap="round"
                      />
                    ))}
                  </g>
                ))}
              </g>
            )}
            {t.opacity > 0.001 && (
              <g style={{ opacity: t.opacity }} transform={t.transform}>
                {i === 0 && hint && (
                  <text
                    x={dir === 1 ? pl.x : pl.x + pl.w}
                    y={pl.y - 10}
                    textAnchor={dir === 1 ? 'start' : 'end'}
                    className="fill-inkBlack/45 font-mono"
                    style={{ fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase' }}
                  >
                    {hint}
                  </text>
                )}
                <PlateMedia plate={pl.media} x={pl.x} y={pl.y} w={pl.w} h={pl.h} reduced={reduced} />
              </g>
            )}
          </g>
        );
      })}
    </g>
  );
}
