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
 * NOTHING HOLDS THE PROJECTS (2026-07-16, round 2). The plates used to be BORNE: each forked off the
 * spine on an ornate branch that arrived under it, where a calyx cupped it from below. Daniel:
 * "We had initially tried to have the flowers or the leaves actually holding the projects within the
 * timeline. Scratch that." They now stand ALONGSIDE the line at their year, and their entrance is a
 * fade rather than a bloom. See the decoupling note further down for the full list of what went and
 * the two classes of collision that went with it.
 *
 * THE ORNAMENT READS THE LAYOUT; THE LAYOUT NEVER READS THE ORNAMENT. This direction is the whole
 * lesson of round 1, and it is load-bearing. The old branches were STRUCTURE — they carried plates,
 * so every one of them could collide with a plate, a label, or another branch, and a growing pile of
 * rules existed to arbitrate that. The sub-branches that replace them (see SubBranches) are ORNAMENT:
 * they carry nothing, they grow into whatever negative space the plates leave, and if ornament and
 * layout ever disagree the ornament loses by construction, because it is computed downstream of a
 * layout that cannot see it.
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
import { requestGarland } from '../../engine/gongbi/painter';
import { PAGE_SPECIES } from './species';
import {
  CARD_LINE,
  dashProps,
  growAt,
  ORGAN_DISC_R,
  organAt,
  polyLen,
  UNFURL_SPAN,
} from './reveal';
import type { GarlandOrgan, GarlandStation, GarlandVine } from '../../engine/gongbi/garland';
import { colonize, branches, seededRandom, type Vec2, type Branch } from './spaceColonization';

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
 * The checkable ceiling on how many stroked STRUCTURAL paths may be visible at once: the spine plus
 * its two convergence arms. This is a QA contract (screenshot and count), not something the code
 * enforces. It counts structure only — the ornamental sub-branches are deliberately not strands.
 */
export const MAX_CONCURRENT_STRANDS = 3;

type Side = 'left' | 'right';
type PlateTier = 'floor' | 'standard' | 'hero' | 'showcase';

/** One picture on a plate: a still, or a looping video (webm + mp4 + poster). */
interface Plate {
  /** Public path to the image, or the POSTER still for a video. */
  src: string;
  /**
   * Intrinsic aspect ratio (width / height), MEASURED from the file — never guessed, and never the
   * shape you wish it were. The plate's box is derived from THIS (see TIER), which is the whole
   * point: an image is never asked to fit a box, the box is built to fit the image.
   *
   * Measured 2026-07-16 by loading every asset and reading naturalWidth/naturalHeight; the twelve
   * that also appear in projects.ts agreed with its authored ratios exactly, and a test pins that
   * they keep agreeing. If an asset is swapped, re-measure.
   */
  ratio: number;
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
}

const A = '/assets/projects';
/** The timeline's own photographs — the five Daniel shot/supplied for the page itself (orientation,
 *  studio, DAC pin-up, Resia pitch, graduation) rather than for a project. They live apart from
 *  `/assets/projects` because they are not a project's documentation; they are the page's narrative. */
const T = '/assets/about/timeline';

/* --------------------------------- geometry ------------------------------- */

/** The drawing's world width. Exported because the founders' parenthesis below has to convert this
 *  drawing's world units into CSS px to match its line weight to the spine's — see TIMELINE_W's use
 *  in FounderParenthesis. */
export const TIMELINE_W = 1200;
const W = TIMELINE_W;
const CX = 600;
const MAX_YEAR = 2026;
/** The spine's stroke, in WORLD units — not CSS px. What it renders at depends on the frame's
 *  scale, which is why the parenthesis measures rather than copies the number. */
export const SPINE_W = 7.5;

/** Piecewise time axis: 2021 to 2023 compressed, 2023 to 2026 open. Unchanged from v1. */
const Y_2021 = 150;
const Y_2023 = 750;
const SLOPE_EARLY = 300; // units per year, 2021 to 2023
/**
 * Units per year, 2023 to 2026. Raised 760 -> 975 on 2026-07-16 (round 3) to buy the lane the room
 * Daniel asked for: "add more white space in between project images... it gets really convoluted."
 *
 * This is the honest lever. `spreadSide` shares out whatever slack the lane HAS, so the only way to
 * widen every gap at once is to make the lane longer — and the late stretch is where the projects
 * actually are (nine of the thirteen clusters are 2023 or later). At 760 the even gap came out 88
 * (right) and 107 (left); at 975 it is ~180 on both, which is also what gives the sub-branches a gap
 * worth colonizing. The drawing is taller and the scroll is longer; the track is already 1080vh.
 */
const SLOPE_LATE = 975;
/** The spine runs plumb to here (2026); below it, the line leans off-axis and winds into the mark. */
export const CONVERGE_Y = Y_2023 + (MAX_YEAR - 2023) * SLOPE_LATE; // 3030

/** The years the drawing ticks and labels. Was written out at three separate call sites (the
 *  garland's station bands, the year rail's render, and now the sub-branch obstacles); a fourth
 *  copy is how a year quietly gets ornamented but never labelled. */
export const YEAR_TICKS: readonly number[] = [2021, 2022, 2023, 2024, 2025, 2026];

/**
 * THE AXIS, as authored. Since 2026-07-16 (round 8) this is NOT where the year labels go — see
 * `yearLabelYs`. It still places the spine's own geometry (the converge point, the garland's
 * station bands) and it is the fallback for a year that has no work on it.
 */
export const yearToY = (y: number) =>
  y <= 2023 ? Y_2021 + (y - 2021) * SLOPE_EARLY : Y_2023 + (y - 2023) * SLOPE_LATE;

/**
 * WHERE THE YEAR LABELS ACTUALLY GO: beside the work they name.
 *
 * RULED 2026-07-16 (round 8), Daniel. `spreadSide` shares out the lane's slack evenly, so a plate's
 * y stopped meaning its date the moment it landed — a 2023 project can sit beside the "2024" label.
 * The axis therefore stops being METRIC and becomes a SEQUENCE: same order, honest adjacency, no
 * claim about interval. Nobody measures the pixel distance between two years; everybody reads which
 * project a year is next to, and **a label beside the wrong project is a factual error a reader
 * catches**.
 *
 * The rule: a year sits at the TOP of the first plate of that year, so it marks where that year's
 * work begins — across BOTH sides, because the label names the year, not a lane.
 *
 * Two things this has to guarantee, and they are why it is not a one-liner:
 *
 *  - A YEAR WITH NO WORK KEEPS ITS AXIS POSITION: there is no plate to sit beside, so `yearToY` is
 *    the only honest answer left. Falling back is not a special case; it is the same rule reading an
 *    empty set. (This used to say "2026 has no clusters at all" and named it as the example. Round 9
 *    gave 2026 the graduation photograph, so 2026 now follows its plate like every other year. The
 *    branch is still live and still correct — no year currently exercises it, and the moment one is
 *    added between the ticks it will.)
 *  - THE ORDER IS ENFORCED, not hoped for, AND SO IS THE GAP. `spreadSide` lays each side
 *    independently, so the per-year minimum across both sides is neither monotonic nor spaced:
 *    measured, the first plate of 2021 lands at y=450 and the first of 2022 at y=457, and a label's
 *    glyph box is 40 units tall — the two years would print on top of each other. Following the
 *    plates cannot mean landing on another label. `YEAR_LABEL_MIN_GAP` is the floor.
 *
 *    The cost is real and it is the right way round: a year that gets pushed down sits a little
 *    below its first plate instead of level with its top. It is still beside that year's work (a
 *    plate is 200+ units tall), which is the thing the ruling is about — and the alternative is two
 *    numerals in the same place, which is not a date at all.
 */
/** The least room two year labels may have between them: the glyph box (40) plus air. Below this
 *  the numerals overlap and neither year is legible. */
const YEAR_LABEL_MIN_GAP = 52;

export function yearLabelYs(
  laid: ReadonlyArray<{ year: number; plates: ReadonlyArray<{ y: number }> }>,
  years: readonly number[] = YEAR_TICKS,
): Map<number, number> {
  const out = new Map<number, number>();
  let floor = -Infinity;
  for (const y of years) {
    const tops = laid
      .filter((c) => Math.floor(c.year) === y)
      .flatMap((c) => c.plates.map((p) => p.y));
    // A year with work sits at the first plate of that work; a year without keeps the axis.
    const at = tops.length ? Math.min(...tops) : yearToY(y);
    // ...and never above, or on top of, the year before it.
    const clamped = Math.max(at, floor);
    out.set(y, clamped);
    floor = clamped + YEAR_LABEL_MIN_GAP;
  }
  return out;
}

/** An obstacle a year label must stay clear of: a plate. `computePlates()` returns exactly this
 *  shape, so the rule below scores the REAL layout rather than a parallel model of it.
 *
 *  This used to carry the plate's BRANCH polyline too, and the branch was by far the harder obstacle:
 *  it swept the whole gutter, and a label's vellum halo could cut it in half. The branches are gone
 *  (see the decoupling note below) and that entire class of collision went with them. */
export interface LabelObstacle {
  side: Side;
  rect: { x: number; y: number; w: number; h: number };
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

/** How much room a year label has on one side: the tightest clearance to anything on that side. */
export function yearLabelClearance(obstacles: readonly LabelObstacle[], ty: number, side: Side): number {
  const box = yearLabelBox(side === 'right' ? 1 : -1, ty);
  let best = Infinity;
  for (const o of obstacles) {
    if (o.side !== side) continue;
    best = Math.min(best, boxGapToRect(box, o.rect));
  }
  return best;
}

/**
 * Which side of the spine a year label sits on: THE SIDE WITH MORE ROOM, measured against the
 * laid-out plates. Ties (and an empty layout) default right.
 *
 * This used to flip "opposite the nearest cluster within 0.15 of a year", reading the AUTHORED
 * cluster years. That model and the page disagreed, because `packSide` moves plates: a cluster
 * authored at 2022.6 has its plates packed down into 2023's label band, and a rule that only
 * looks at same-year clusters cannot see it.
 *
 * The concept is unchanged (the label steps aside to stay clear); it derives "clear" from where the
 * plates ACTUALLY are, which is the only model that cannot drift from the drawing. See the contract
 * test, which asserts the chosen side against the real layout.
 */
export function yearLabelSide(obstacles: readonly LabelObstacle[], ty: number): Side {
  const right = yearLabelClearance(obstacles, ty, 'right');
  const left = yearLabelClearance(obstacles, ty, 'left');
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

/**
 * WHERE THE ONE LINE LEAVES THIS DRAWING, as a fraction of the drawing's height — so the founders'
 * parenthesis below can start exactly where the descent stops, instead of guessing.
 *
 * It is NOT 1. The drawing runs 80 world units PAST the exit (see `H`), so in reduced motion — where
 * the SVG is static and full-height — the line ends ~85 CSS px above the SVG's bottom edge. A trunk
 * that starts at the top of the founders' wrapper therefore starts 85px below the line it is
 * supposed to continue, and the page shows a floating stub over a gap. (It did.)
 *
 * In MOTION this fraction is not needed and must not be used: the SVG is a sticky viewport-height
 * frame with a panning camera, the exit sits on the frame's bottom edge at the end of the track, and
 * a sticky box bottoms out at its track's bottom — so the exit lands exactly on the wrapper's top in
 * page coordinates, and stays there however far you scroll on. See FounderParenthesis.
 */
export const DESCENT_EXIT_FRAC = DESC_BOTTOM_Y / H;

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

/* ------------------- decoupled: what used to live here -------------------- */

/*
 * DELETED 2026-07-16 (round 2), when Daniel decoupled the projects from the timeline: "We had
 * initially tried to have the flowers or the leaves actually holding the projects within the
 * timeline. Scratch that." Everything below existed only so that a BRANCH could CARRY a PLATE, and a
 * plate that is not carried needs none of it:
 *
 *   SEPAL_DEFS / sepalLen / CALYX_LEAF_PROFILES / calyxSprig / sprigPathStyle / SprigOrgan
 *       — the holder: the three-sepal calyx, and the generated botanical that replaced it, which
 *         cupped each plate from below at its inner-bottom corner.
 *   branchAttachY / branchPts / branchPath / BRANCH_WAVE_AMP / BRANCH_WAVE_WAVES / BRANCH_W
 *       — the ornate root from the spine to that corner, and the enveloped sine wander that made it
 *         read as drawn rather than stamped.
 *   computeBranches
 *       — the no-overlap contract over those branches. Now `computePlates`, which the year labels
 *         still need: a plate is still an obstacle, it just isn't hanging off anything.
 *   unfurl / easeUnfurl
 *       — the bloom-opening entrance, and the "weird initial distortion" Daniel called out with it.
 *
 * TWO WHOLE CLASSES OF PROBLEM LEFT WITH THEM, which is the point rather than a side effect: a branch
 * can no longer cross a plate or another branch, and a year label can no longer be cut in half by a
 * branch passing behind it. The 2025 label collision that round 1 fought to a draw and then flagged
 * for Daniel as a composition call is simply gone — there is no branch at 2025 to cross.
 *
 * The page still has branches; they are ORNAMENT now, not structure (see SubBranches). They carry
 * nothing, so nothing can collide with them: when ornament and layout disagree, the ornament loses by
 * construction. That inversion is the lesson of round 1 — letting ornament dictate layout is what
 * produced every collision it then needed rules to solve.
 *
 * Recover any of it from git: `git show fa87d33 -- src/pages/about/CrossPathsTimeline.tsx`.
 */

/**
 * Plate tiers. The FLOOR is a reference only (nothing is built at it); the smallest plate actually
 * drawn is STANDARD. Images dominate.
 *
 * A TIER IS AN AREA BUDGET, NOT A BOX (2026-07-16, round 3). Daniel: "Some of the timeline images
 * are not displayed properly. For example the one testing the Plentify prototype has white spaces on
 * the left and right side. I want you to scale to fit the image properly so it shows in full without
 * getting rid of the context."
 *
 * These used to be literal `{ w, h }` boxes at 3:2, and EVERY plate was forced into its tier's shape:
 * `fit:'contain'` letterboxed the image inside the box against a white rect (Plentify's compression
 * test is 976x975 — square — in a 320x213 box, hence his white bars), and `fit:'cover'` sliced the
 * image to fill (which is the fix he explicitly ruled out: "without getting rid of the context").
 * Same disease as the detail hero's old 505x557 portrait box, in a different organ.
 *
 * So the box is now DERIVED from the plate's own measured ratio, and the tier only says how much
 * PAPER that plate is worth: `plateBox` gives every plate in a tier the same area at its own shape.
 * A square and a 16:9 in the same tier read as equally important, which a fixed box cannot do — it
 * makes one of them small or crops it. The w/h below are kept as the reference box the area is taken
 * from (they are the old values, so 3:2 plates are sized exactly as before and nothing that already
 * looked right moved).
 */
const TIER: Record<PlateTier, { w: number; h: number }> = {
  floor: { w: 240, h: 150 }, // reference size only — the hard minimum, never instantiated
  standard: { w: 264, h: 176 },
  hero: { w: 320, h: 213 },
  // The biggest tier. It read "reserved for the two bookends: ut-austin and the NYC door" while the
  // ut-austin slot was still a dashed IMAGE TO COME. Round 9 went to cash that reservation in with
  // the 2021 orientation call and added the 2026 graduation to close the drawing.
  // THREE nodes claim it now: orientation, the NYC door, graduation — but orientation is HELD on
  // `pending` awaiting a privacy ruling, so only two of the three are currently drawn as pictures.
  // The door kept this tier from when it WAS the last plate; it no longer is. TODO(Daniel): drop the
  // door to `hero` so the showcase tier means "the bookends" again, or keep it big on its own merit?
  // Not guessed here. (Resolve alongside the orientation ruling — they are the same question about
  // what the tier is FOR.)
  showcase: { w: 400, h: 267 },
};

/**
 * A plate's real box: its tier's AREA, at the image's own ratio. Pure and exported for the contract
 * test, which is the one that matters here — every plate's box ratio equals its image's ratio, so
 * nothing is ever letterboxed or cropped again.
 */
export function plateBox(tier: PlateTier, ratio: number): { w: number; h: number } {
  const area = TIER[tier].w * TIER[tier].h;
  return { w: Math.sqrt(area * ratio), h: Math.sqrt(area / ratio) };
}

/** The fixed perpendicular gap from the spine to a plate's near (inner) edge. */
export const OFFSET_X = 110;
/** Minimum vertical gap between two stacked siblings in one cluster (their bounding boxes never
 *  come closer than this — the no-overlap contract). */
const CLUSTER_GAP_Y = 40;
/** The plate lane. It starts below the fuse (so the twist-fuse reads clean before the first project)
 *  and ends above the converge point (so the last plate never crowds the spine's lean into the mark).
 *  `spreadSide` shares whatever is left between the clusters. */
const LANE_TOP = CONV_JUNCTION_Y + 120;
const LANE_BOTTOM = CONVERGE_Y - 160;
/* CROSS_GAP (the minimum clearance between two clusters in one lane) was deleted with `packSide` on
 * 2026-07-16. It was the floor a year-anchored layout collided against; an evenly spread lane has no
 * floor to hit, because the gap is what is left over rather than what is fought for. */

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

/** The foliage reveal line sits at 52% of the frame; a plate opens as it rises past it.
 *  Re-exported from about/reveal.ts, which is where the page's ONE motion lives — the founders and
 *  the coda read the same line against the viewport. Two definitions that agree today are two
 *  definitions that disagree later. */

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
    /**
     * THE FIRST PLATE, and half of the page's bracket. Daniel: "put this image as our FIRST, our
     * school orientation." It is a UT orientation Zoom grid — forty-odd strangers in forty-odd
     * boxes, hook-'em hands, nobody having met anybody. The page opens on the paths NOT crossed
     * yet and closes on the two of them graduating (see `graduation` at the foot of this list),
     * which is the same bracket the copy makes with "Bower is new." / "The obsession is real, and
     * it is old." The showcase tier was already reserved for exactly this (see TIER) — the bookend
     * it names as "ut-austin" had been waiting for an asset since the tier was written.
     *
     * HELD — TODO(Daniel): this slot is deliberately `pending` and its asset is deliberately NOT in
     * the repo. It is waiting on a privacy ruling, and round 10 did not ship past it.
     *
     * The photograph shows ~40 identifiable UT students, each with their NAME printed under their
     * face. **This repo is PUBLIC** (`danielguerrarmz-create/project-eden`), so committing the file
     * to any branch publishes it — the line is `git push`, not the merge.
     *
     * Round 9 downscaled the source 828 -> 640 as the mitigation and recorded here that the names
     * were then "illegible". Round 10 re-measured that claim instead of inheriting it, by cropping
     * the caption strip out of both files and upscaling 6x nearest (what a determined viewer
     * actually does). It is OVERSTATED: at 828 the names read outright; at 640 they are badly
     * degraded but a few remain partially guessable. "Harder" is not "illegible".
     *
     * And legibility is close to a red herring, which is the part worth carrying forward: with every
     * name perfectly unreadable this is still ~40 identifiable FACES on a company's public About
     * page without their consent. The face is the personal data; the name only compounds it. So the
     * mitigation was aimed at the lesser half of the problem, and "the full-res original is not in
     * the repo" protects the wrong artifact — the 640 file is the one that gets served.
     *
     * To reinstate once ruled: restore the `showcase` node below (ratio 1.5725, measured), and
     * `git add public/assets/about/timeline/2021-orientation-zoom.webp`. One line plus one add.
     *
     *   { tier: 'showcase', media: { src: `${T}/2021-orientation-zoom.webp`, ratio: 1.5725,
     *     alt: 'A UT Austin orientation call in 2021: a grid of some forty new students in their
     *           own boxes, hook-’em hands raised, none of them having met yet' } }
     *
     * THE FIRST PLATE, and half of the page's bracket — which is why it is held rather than dropped.
     * Daniel: "put this image as our FIRST, our school orientation." The page opens on the paths NOT
     * crossed yet and closes on the two of them graduating (see `graduation` at the foot of this
     * list), the same bracket the copy makes with "Bower is new." / "The obsession is real, and it
     * is old." Losing it costs the opening of the arc, so it wants a ruling, not a quiet deletion.
     */
    id: 'origin-2021',
    year: 2021.1,
    side: 'right',
    hint: '',
    nodes: [
      {
        tier: 'showcase',
        media: { src: '', ratio: 1.5725, alt: 'The 2021 orientation photograph, pending a privacy ruling', pending: true },
      },
    ],
  },
  {
    // The studio, before the first project: the two of them at one desk at night, one rendering,
    // one watching over his shoulder. Daniel called it "one of our beginning placeholder images".
    // Which founder is which is NOT asserted here — the filename says both names and does not say
    // who sits where, and this page has already misattributed a founder once (see the TEAM/ledger
    // note in CLAUDE.md). "The two cofounders" is what the picture actually supports.
    id: 'early-2022',
    year: 2022.0,
    side: 'left',
    hint: '',
    nodes: [
      {
        tier: 'standard',
        media: {
          src: `${T}/studio-desks.webp`,
          ratio: 1.5009,
          alt: 'The two cofounders at a shared architecture-studio desk late at night, one at the monitor mid-render, the other standing behind it, the desk buried in drawings and drink cups',
        },
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
          ratio: 1.2795,
          alt: 'The origami-inspired cardboard wedge prototype, a low-cost wound-prevention device, staged for photography',
        },
      },
      {
        tier: 'standard',
        media: {
          src: `${A}/11-wound-care-kenya/wound-care-kenya-in-hospital-device-test.webp`,
          ratio: 1.2125,
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
          ratio: 0.5637,
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
          ratio: 1.7778,
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
          ratio: 1.2344,
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
          ratio: 1.001,
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
          ratio: 1.7778,
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
          ratio: 1.7937,
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
          ratio: 1.3389,
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
          ratio: 1.8397,
          alt: 'The Resia landing page, a one-stop remodeling solution to generate, estimate, contract, and manage a renovation',
        },
      },
      {
        // Daniel: "next to Resia." Clay presenting the pitch — and this one IS named, because three
        // things agree: the ledger has Resia as `by: 'clay'`, Daniel's own filename said `clay`, and
        // only one person is in frame. The deck on the screen reads "Resi.AI", not "Resia"; the alt
        // says what the slide says rather than quietly correcting the ledger's name onto it.
        tier: 'standard',
        media: {
          src: `${T}/resia-pitch.webp`,
          ratio: 0.75,
          alt: 'Clay Seifert presenting the Resia startup pitch deck, its title slide reading “Resi.AI — Removing the Waste from Home Renovation”',
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
          ratio: 1.7778,
          alt: 'The catenary arch entrances of the Dougherty Arts Center, the Austin skyline behind',
        },
      },
      {
        tier: 'standard',
        media: {
          src: `${A}/05-dougherty/dougherty-arts-center-physical-model-cardboard-catenary.webp`,
          ratio: 1.4997,
          alt: 'The cardboard physical model of the Dougherty Arts Center, its white catenary arches standing in the round',
        },
      },
      {
        // Daniel: "around our DAC project." The pin-up wall itself — the sheets (A002–A014, all
        // stamped DAC) and both physical models in one frame, with the two of them standing either
        // end of it. It earns its place beside the render and the model because it is the only plate
        // that shows the WORK as it was actually presented: on a wall, defended in a room.
        tier: 'standard',
        media: {
          src: `${T}/dac-pinup.webp`,
          ratio: 1.3333,
          alt: 'The Dougherty Arts Center pin-up: a studio wall of DAC drawing sheets and renders with both cardboard models on stands, the two cofounders standing at either end',
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
          ratio: 1.9375,
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
          ratio: 1.597,
          alt: 'A Rogers Partners door elevation drawing, an arched double door with ironwork tracery, dimensioned',
          fit: 'contain',
        },
      },
      {
        tier: 'standard',
        media: {
          src: `${A}/16-rogers-partners-nyc/rogers-partners-nyc-office-desk-selfie.webp`,
          ratio: 1.7778,
          alt: 'Daniel at his dual-monitor desk in the Rogers Partners office in New York',
        },
      },
    ],
  },
  {
    /**
     * THE LAST PLATE, and the other half of the bracket. Daniel: "put this image as our LAST, we
     * just graduated." Orientation (2021, `origin-2021`) opens on strangers who have not met; this
     * closes on them graduating. Both bookends are `showcase` and both sit RIGHT, so they rhyme
     * across the length of the drawing — which is also what balances the lanes at 7 clusters a side.
     *
     * THIS IS THE FIRST CLUSTER 2026 HAS EVER HAD, and it changes a documented invariant: the
     * `yearLabelYs` note used to say 2026 has no work to sit beside, so its label fell back to the
     * axis. Now the 2026 label follows this plate like every other year follows its first plate.
     * The fallback is still live and still correct — it is just no longer 2026 that exercises it.
     *
     * FOUR people are in the frame, not two, and only the two cofounders are Bower's. The alt says
     * "four graduates" and names nobody: naming them would mean identifying two people who are not
     * part of this company on the company's own About page.
     */
    id: 'graduation',
    year: 2026.0,
    side: 'right',
    hint: '',
    nodes: [
      {
        tier: 'showcase',
        media: {
          src: `${T}/2026-graduation.webp`,
          ratio: 0.75,
          alt: 'Four graduates in Texas stoles at the 2026 UT Austin commencement, arms around each other in the packed stadium, fireworks over the jumbotron behind them',
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
export const GARLAND_SEED = 'bower/spine-2';
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
  years: readonly number[] = YEAR_TICKS,
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

/* ---------------------- the sub-branches (the ornament) ------------------- */

/**
 * THE SUB-BRANCH ENGINE (2026-07-16, round 2). Daniel:
 *
 *   "Now I would like you to make sub-branches to the main timeline. There's a main vertical
 *    timeline that goes from start to finish and then there are leaves and flowers popping out of
 *    the main one. I would like for you to actually create branches that continue and take up the
 *    empty white space that the project images don't fill. These branches will have their own
 *    leaves and flowers... I'd like for you to actually create an engine or an algorithm that
 *    creates the flowers and makes them grow as the timeline continues."
 *
 * THIS DOES NOT REVERSE THE DECOUPLING, and the difference is the whole design. The branches that
 * were deleted were STRUCTURE: they carried the plates, the layout depended on where they went, and
 * `packSide` plus a pile of clearance rules existed to stop them colliding with the things they were
 * holding. These are ORNAMENT: they carry nothing, and they are computed from a layout that is
 * already final. If a branch and a plate ever disagree, the branch loses — not by a rule, but
 * because the plate was placed before `colonize` was called and cannot hear the answer.
 *
 * The growth is space colonization (Runions et al. 2007; see spaceColonization.ts for why that
 * algorithm and not a hand-tuned layout). The short version: attractor points are scattered ONLY in
 * the negative space, and growth is pulled toward them and consumes them as it arrives. Filling the
 * whitespace and avoiding the plates are therefore the same mechanism, not two systems fighting —
 * a plate has no attractors on it, so nothing grows there. There is no collision test in any of this.
 *
 * NOTE on the copy column: the title and the two questions are NOT obstacles here. They render in a
 * sibling flex column OUTSIDE this SVG (see the component's JSX), so they occupy no world-space at
 * all. Modelling them as a rect would carve a hole in the ornament for something that isn't there.
 */

/** The sub-branches' commission. Shares the spine garland's species deliberately — one plant. */
const SUB_SEED = 'bower/spine-2';
/** The colonization parameters. See spaceColonization.ts for what each one means; these are tuned
 *  against the real layout, and the ratios matter more than the values:
 *   - `influence` must exceed the widest attractor-free band a source has to reach across, or growth
 *     never starts. The year-label gutter is the binding one.
 *   - `kill` below ~2*segment makes growth overshoot an attractor and curl back on itself. */
const SUB_SEGMENT = 9;
const SUB_INFLUENCE = 130;
const SUB_KILL = 26;
const SUB_WOBBLE = 0.34;
/** How coarse the attractor scatter is. This is the ornament's density dial: smaller = more, and
 *  the cost is quadratic-ish in the colonize loop, so it is not free. */
const SUB_ATTRACTOR_STEP = 52;
/** Keep attractors (and so growth) off the spine's own band, which the SpineGarland already dresses,
 *  and off the drawn line itself. */
const SUB_SPINE_CLEAR = 30;
/** Breathing room around a plate or a numeral. The ornament grows up to this and stops.
 *  Exported because it is also the honest bound on how far a branch can stray INTO a plate when a
 *  straight segment clips a corner — the contract test measures against this rather than against a
 *  copy of the number. See "THE CONTRACT" in CrossPathsTimeline.test.ts. */
export const SUB_PLATE_PAD = 18;
/** The sub-branch stroke. Thin against SPINE_W (7.5): these read as growth OFF the main line,
 *  never as a second spine competing with it. */
const SUB_BRANCH_W = 2.2;
/** The hint line's claimed band: 12px mono, and it overhangs its plate on the outer side. */
const HINT_H = 22;
const HINT_W = 90;
/** Organ scale, below the spine garland's 1.5 — foliage out on a thin twig should not outweigh the
 *  foliage on the trunk. */
const SUB_ORGAN_SCALE = 0.95;

interface WRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const padRect = (r: WRect, p: number): WRect => ({ x: r.x - p, y: r.y - p, w: r.w + 2 * p, h: r.h + 2 * p });
const inRect = (p: Vec2, r: WRect) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;

/**
 * Everything the ornament must not grow into, in world units: every project plate, and every year
 * label that is actually drawn (only the chosen side of each year carries one). This IS the layout —
 * it is read, never written, which is the invariant the whole decoupling rests on.
 */
export function subBranchObstacles(): WRect[] {
  const plates = computePlates();
  const out: WRect[] = [];
  for (const p of plates) {
    out.push(padRect(p.rect, SUB_PLATE_PAD));
    // The HINT line rides just above its cluster's lead plate, in 12px mono at 45% ink. It is the
    // one obstacle here that is neither a plate nor a numeral, and it is easy to miss precisely
    // because it has no box of its own — measured live, foliage grew straight through "LLO: DREAM
    // MACHINE" and "NYC: ROGERS PARTNERS" and left them unreadable. Claim the band it sits in.
    if (p.plateIndex === 0) {
      out.push(
        padRect({ x: p.rect.x - HINT_W, y: p.rect.y - HINT_H - 10, w: p.rect.w + HINT_W * 2, h: HINT_H }, 6),
      );
    }
  }
  // The labels' REAL positions — they follow the plates now, so an obstacle computed off the axis
  // would reserve empty paper and leave the actual numerals open to be grown through.
  for (const [, ty] of yearLabelPositions()) {
    const side = yearLabelSide(plates, ty);
    const b = yearLabelBox(side === 'right' ? 1 : -1, ty);
    out.push(padRect({ x: b.x0, y: b.y0, w: b.x1 - b.x0, h: b.y1 - b.y0 }, SUB_PLATE_PAD));
  }
  return out;
}

/**
 * The attractors: a jittered scatter over the drawing's plumb run, minus everything occupied.
 *
 * "MAKES THEM GROW AS THE TIMELINE CONTINUES" is this function's density ramp, and it is an
 * INTERPRETATION of Daniel's phrase that he has not seen yet. Read as: the ornament's own density
 * carries the growth metaphor — sparse at 2021, increasingly lush toward 2026 — so the drawing gets
 * visibly more alive as the practice does. It could instead mean animating the growth on scroll;
 * that is deliberately NOT built (it is a much bigger commitment, and the wrong one to guess at).
 * Show him this, then ask. See the handoff.
 *
 * The scatter is jittered rather than gridded because a grid colonizes into a lattice: growth finds
 * evenly-spaced attractors and lays down evenly-spaced branches that read as a mesh, not a plant.
 */
export function subBranchAttractors(rand: () => number, obstacles: readonly WRect[] = subBranchObstacles()): Vec2[] {
  const out: Vec2[] = [];
  const top = CONV_JUNCTION_Y;
  const bottom = CONVERGE_Y;
  for (let y = top; y < bottom; y += SUB_ATTRACTOR_STEP) {
    for (let x = 0; x < W; x += SUB_ATTRACTOR_STEP) {
      const p = { x: x + rand() * SUB_ATTRACTOR_STEP, y: y + rand() * SUB_ATTRACTOR_STEP };
      if (p.x < 0 || p.x > W || p.y > bottom) continue;
      // The density ramp: 2021 keeps roughly a quarter of its candidates, 2026 keeps all of them.
      const t = clamp01((p.y - top) / (bottom - top));
      if (rand() > lerp(0.18, 0.92, t)) continue;
      // Off the spine's own band — the SpineGarland already dresses that, and growth started there
      // would just crowd the drawn line.
      if (Math.abs(p.x - CX) < SUB_SPINE_CLEAR) continue;
      if (obstacles.some((r) => inRect(p, r))) continue;
      out.push(p);
    }
  }
  return out;
}

/** Where the sub-branches leave the spine. Regularly spaced down the plumb run; a source with no
 *  attractors within `influence` simply never grows, which is what makes the density ramp above
 *  produce sparse branching at the top without needing a second rule to say so. */
export function subBranchSources(): Vec2[] {
  const out: Vec2[] = [];
  const step = 130;
  for (let y = CONV_JUNCTION_Y + step; y < CONVERGE_Y; y += step) {
    out.push({ x: CX, y });
  }
  return out;
}

/** The grown sub-branches, with their hierarchy, in world space. Deterministic under SUB_SEED. */
export function subBranchPolylines(): Branch[] {
  const rand = seededRandom(`${SUB_SEED}/colonize`);
  const nodes = colonize({
    attractors: subBranchAttractors(seededRandom(`${SUB_SEED}/scatter`)),
    sources: subBranchSources(),
    segment: SUB_SEGMENT,
    influence: SUB_INFLUENCE,
    kill: SUB_KILL,
    wobble: SUB_WOBBLE,
    rand,
    maxNodes: 3000,
  });
  return branches(nodes);
}

/** The sub-branch canvas: the whole plumb run, full width. Unlike the spine's narrow strip this has
 *  to cover everywhere growth can reach, which is everywhere the plates are not. */
export const SUB_BOX = { x: 0, y: CONV_JUNCTION_Y, w: W, h: CONVERGE_Y - CONV_JUNCTION_Y };

/**
 * The organs on the sub-branches, as vines for the garland composer, in STRIP-local px.
 *
 * One request, one canvas, one genome — see GarlandOpts.vines for why this is batched rather than a
 * request per branch (short version: per-branch requests either grow a different species per branch,
 * or restart the same rng and stamp identical organs on every one).
 *
 * `tube: false`, exactly like the spine's graft: the STEMS are drawn in SVG in INK_SEPIA (structure
 * is one colour — see CLAUDE.md), and the composer contributes only pigment foliage. A vine whose
 * tube was painted by the composer would put the genome's own branchColor on the page as structure,
 * which is the one thing the colour law forbids.
 */
/**
 * ORGANS GROW ON TWIGS, NOT ON THE TRUNK (2026-07-16, round 3). Daniel: "Currently the leaves and
 * flowers are immediately on the branch, although realistic, are lacking and they lack more depth
 * and texture that I feel like sub-branches would give it a lot of strength."
 *
 * He is right and it was nearly free: space colonization already grows a hierarchy, and the organs
 * were simply being hung on every tier of it including the trunk. `branches()` now reports each run's
 * `order`, so a run only carries foliage once it is at least `SUB_ORGAN_MIN_ORDER` deep. The trunk
 * runs bare out of the spine, forks, and only the twigs bloom — which is what reads as depth, because
 * it is the structure a real branch has.
 */
const SUB_ORGAN_MIN_ORDER = 1;

export function subBranchVines(runs: readonly Branch[]): GarlandVine[] {
  const rand = seededRandom(`${SUB_SEED}/organs`);
  const ORGANS: GarlandOrgan[] = ['leaf', 'bloom', 'leaf', 'bud', 'leaf', 'leaf', 'bloom'];
  let n = 0;
  const vines: GarlandVine[] = [];
  for (const b of runs) {
    const path = b.pts.map((p) => [p.x - SUB_BOX.x, p.y - SUB_BOX.y] as [number, number]);
    if (b.order < SUB_ORGAN_MIN_ORDER) {
      // The trunk is drawn (its stem is in the SVG) but carries nothing. A vine with no stations
      // paints nothing at all, which is exactly right — and it keeps the vine list aligned 1:1 with
      // the runs, so the caller does not have to reason about which ones were dropped.
      vines.push({ path, stations: [] });
      continue;
    }
    // Length in world units decides how much a twig can carry: a two-segment twig gets one organ, a
    // long arc gets several. Deeper orders carry MORE per unit length — the outermost growth is the
    // youngest and the busiest, which is the other half of what makes a plant read as a plant.
    let length = 0;
    for (let i = 1; i < b.pts.length; i++) {
      length += Math.hypot(b.pts[i].x - b.pts[i - 1].x, b.pts[i].y - b.pts[i - 1].y);
    }
    const per = b.order >= 3 ? 52 : b.order === 2 ? 64 : 84;
    const count = Math.max(1, Math.round(length / per));
    const stations: GarlandStation[] = [];
    for (let i = 0; i < count; i++) {
      const t = clamp01(0.25 + (0.75 * (i + rand())) / count);
      stations.push({ t, organ: ORGANS[n % ORGANS.length] });
      n += 1;
    }
    vines.push({ path, stations });
  }
  return vines;
}

/** A branch's stroke, thinning with order: the trunk carries the weight and a twig is a hair. This
 *  taper is what lets the eye read trunk -> branch -> twig at a glance, and it is why the organs
 *  sitting only on the twigs reads as depth rather than as randomness. */
export function subBranchWidth(order: number): number {
  return Math.max(0.9, SUB_BRANCH_W * Math.pow(0.72, order));
}

/** How far behind its parent a branch waits before it starts drawing, in world units of card-line
 *  travel, per order. Trunk -> branch -> twig, in that order, rather than a tree that fades in
 *  uniformly (which is just a fade). Tuned by looking. This one is the timeline's own: the founders'
 *  arms have no botanical order to stagger by. */
const SUB_GROW_ORDER_LAG = 55;

/** One organ's reveal disc: where it sits, and which branch's growth it waits on. */
interface OrganMark {
  x: number;
  y: number;
  branch: number;
  t: number;
}

/** Every station's world position, resolved once. Pure, and it reads the SAME vine list the painter
 *  is given, so a disc cannot drift from the organ it uncovers. */
function subOrganMarks(runs: readonly Branch[]): OrganMark[] {
  const out: OrganMark[] = [];
  subBranchVines(runs).forEach((vine, bi) => {
    const pts = vine.path;
    for (const s of vine.stations) {
      // The painter's own index arithmetic (see paintGarland's station loop), so the disc lands on
      // the organ rather than near it. It resamples at 4px first; over a 9px-segment polyline the
      // difference is under a segment and far under SUB_ORGAN_R.
      const idx = Math.max(1, Math.min(pts.length - 1, Math.round(s.t * (pts.length - 1))));
      out.push({ x: pts[idx][0] + SUB_BOX.x, y: pts[idx][1] + SUB_BOX.y, branch: bi, t: s.t });
    }
  });
  return out;
}

/**
 * The sub-branches: sepia stems drawn in SVG, with the gongbi organs painted once off-thread and
 * hung over them. Ornament only — nothing on this page reads its geometry back.
 *
 * THEY GROW (2026-07-16, round 4). Daniel: "I think it would be very beautiful if... we could
 * actually see the plants and the branches being assembled as it is coming down. Currently
 * everything will appear all at once and it's already existing there, which feels cheap and it
 * doesn't feel like the growing that our projects have done. It kind of fades in or generates
 * alongside our projects and BOTH OF THOSE EMISSIONS SHOULD MATCH EACH OTHER."
 *
 * THE SYNC IS THE REQUIREMENT, and it is what chooses the mechanism. The plates fade on
 * `clamp01((cardLineY - y - 10) / UNFURL_SPAN)` — the camera's own card line, sweeping down the
 * drawing. So the branches reveal on the SAME LINE, with the same span and the same linear ramp,
 * evaluated at their own y. A plate arriving and the branch beside it growing are then not two
 * animations that agree; they are one expression read at two places, and they cannot drift.
 *
 * (An entry-triggered IntersectionObserver was the other candidate and it is the wrong one HERE:
 * the plates are scroll-driven, so an observer would make the branch a DIFFERENT event from the
 * plate beside it, which is the one thing the note rules out. Nor is this the expensive kind of
 * scroll-scrubbing: the camera already re-renders every frame and the plates already do exactly
 * this, so it costs nothing new. Nothing about PAINTING is deferred — the bitmap is still painted
 * once on mount.)
 *
 * THIS DOES NOT REGRESS "fade, don't grow". That rule governs the PLATES, whose objection was a
 * layout-affecting transform distorting the image (`unfurl`'s scale(0.92, 0.64)). A stroke revealing
 * along its own path distorts nothing: the geometry is final before the first frame, and only how
 * much of it is inked changes.
 */
function SubBranches({ reduced, cardLineY }: { reduced: boolean; cardLineY: number }) {
  const runs = useMemo(() => subBranchPolylines(), []);
  const lens = useMemo(() => runs.map((b) => polyLen(b.pts)), [runs]);
  const marks = useMemo(() => subOrganMarks(runs), [runs]);
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    requestGarland({
      // ONLY THE SPECIES ROLLS. SUB_SEED still seeds the colonization, the scatter and the
      // stations, so the structure and every growth station are identical on every load — that is
      // the half of the note that says "specific spots". This is the other half: which leaf and
      // which flower grow on those spots. See about/species.ts.
      seed: PAGE_SPECIES,
      voice: 'pigment',
      width: SUB_BOX.w,
      height: SUB_BOX.h,
      vines: subBranchVines(runs),
      scale: SUB_ORGAN_SCALE,
      tube: false, // the stems are drawn below, in sepia; the composer only brings foliage.
    })
      .then((painted) => {
        if (live) setUrl(painted);
      })
      .catch((err: unknown) => {
        // The stems still draw: a failed garland costs the page its flowers, not its drawing. But a
        // broken painting room must never look like a design choice.
        console.error('gongbi sub-branch garland failed:', err);
      });
    // NOTHING TO REVOKE. The object URL belongs to the painter's session cache and is shared by
    // every caller of this garland — revoking it here would hand the next mount a dead URL and the
    // ornament would silently vanish. See requestGarland.
    return () => {
      live = false;
    };
  }, [runs]);

  // THE SAME expression the plates fade on, read at each branch's ROOT — so a branch starts growing
  // exactly when the card line reaches where it leaves its parent, on the plates' own line, span and
  // ramp. The order lag is what keeps the traversal botanical: a twig cannot draw before the branch
  // carrying it.
  const growOf = (b: Branch) =>
    reduced ? 1 : growAt(cardLineY, b.pts[0].y, UNFURL_SPAN, b.order * SUB_GROW_ORDER_LAG);
  const grows = runs.map(growOf);

  /*
   * THE ORGANS' REVEAL — a disc per station, each waiting on ITS OWN BRANCH's draw.
   *
   * The composer paints every organ of a garland into ONE bitmap (one canvas, one genome — see
   * GarlandOpts.vines), so there is no per-organ element to fade and the reveal has to be a mask.
   *
   * The first cut made that mask a soft horizontal WIPE trailing the card line — one rect, cheap,
   * and wrong. It assumed foliage sits below the root it grows from. Space colonization grows in
   * every direction: MEASURED, 195 of 332 organs sit ABOVE their own branch's root, by up to 278
   * world units. So the wipe uncovered blossoms whose twig had not been drawn yet, and the page
   * showed flowers floating on bare paper. No lag value fixes that — a lag big enough to cover 278
   * units detaches the foliage from the growth entirely.
   *
   * A disc per station keyed to its branch's `grow` cannot have that bug by construction: the organ
   * is uncovered by the same number that inks the twig under it. 332 discs, resolved once; only
   * their opacity moves.
   */
  return (
    <g pointerEvents="none">
      <defs>
        {/* Soft-edged, so an organ blooms out of the paper instead of arriving inside a circle. */}
        <radialGradient id="sub-organ-disc">
          <stop offset="0.45" stopColor="#fff" />
          <stop offset="1" stopColor="#000" />
        </radialGradient>
        <mask id="sub-organ-mask" maskUnits="userSpaceOnUse" x={SUB_BOX.x} y={SUB_BOX.y} width={SUB_BOX.w} height={SUB_BOX.h}>
          {marks.map((m, i) => {
            // The twig reaches the station at grow == t; the organ opens a beat after that.
            const o = organAt(grows[m.branch], m.t);
            if (o <= 0.001) return null;
            return (
              <circle key={i} cx={m.x} cy={m.y} r={ORGAN_DISC_R} fill="url(#sub-organ-disc)" opacity={o} />
            );
          })}
        </mask>
      </defs>
      {runs.map((b, i) => {
        const grow = grows[i];
        if (grow <= 0.001) return null;
        return (
          <path
            key={i}
            d={lineGen(b.pts) ?? ''}
            fill="none"
            stroke={INK_SEPIA}
            strokeOpacity={0.62}
            strokeWidth={subBranchWidth(b.order)}
            strokeLinecap="round"
            strokeLinejoin="round"
            // Root-first pts (see Branch.pts) mean the dash pays out root -> tip: the branch grows
            // OUT of its parent rather than materialising along its whole length.
            {...dashProps(lens[i], grow)}
          />
        );
      })}
      {url && (
        <image
          href={url}
          mask={reduced ? undefined : 'url(#sub-organ-mask)'}
          x={SUB_BOX.x}
          y={SUB_BOX.y}
          width={SUB_BOX.w}
          height={SUB_BOX.h}
          style={{ transition: reduced ? undefined : 'opacity 900ms ease-out' }}
        />
      )}
    </g>
  );
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
    requestGarland({
      // THE SPECIES VARIES PER LOAD; the stations do not. GARLAND_SEED still pins WHERE the
      // foliage sits (garlandStations is seeded off it) — only which plant grows there is rolled.
      // See about/species.ts.
      seed: PAGE_SPECIES,
      voice: 'pigment',
      width: GARLAND_BOX.w,
      height: GARLAND_BOX.h,
      path: garlandPath(),
      stations: garlandStations(),
      scale: GARLAND_SCALE,
      tube: false, // Daniel's spine is the stem; the composer only brings foliage.
    })
      .then((painted) => {
        if (live) setUrl(painted);
      })
      .catch((err: unknown) => {
        // A failed garland must leave the page intact — the spine is the load-bearing thing and
        // it is drawn in SVG — but a broken painting room must not look like a design choice.
        console.error('gongbi spine garland failed:', err);
      });
    // NOTHING TO REVOKE. The object URL belongs to the painter's session cache and is shared by
    // every caller of this garland — revoking it here would hand the next mount a dead URL and the
    // ornament would silently vanish. See requestGarland.
    return () => {
      live = false;
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
  /** The AUTHORED year. Kept through the layout because the year labels follow the plates now
   *  (see yearLabelYs) and need to know which year a laid-out plate belongs to. */
  year: number;
  side: Side;
  dir: number;
  hint: string;
  spineX: number;
  anchorY: number;
  /** The plates' near edge on this side: the lane the projects stand in, beside the spine. */
  edgeX: number;
  plates: Array<{ x: number; y: number; w: number; h: number; media: Plate }>;
}

/**
 * Spread one side's clusters EVENLY down its lane. Pure and deterministic (exported for tests).
 *
 * THE PLATES NO LONGER SIT AT THEIR TRUE YEAR (2026-07-16, round 3), and that is a licence Daniel
 * gave explicitly: "I would go ahead and add more white space in between project images. At some
 * point it gets really convoluted and difficult to read. I think just spreading them more evenly all
 * throughout, even if it distorts our accuracy when it comes to the timeline, is fine as long as it
 * is displayed better."
 *
 * This replaces `packSide`, which anchored each cluster on its true year and only pushed it down when
 * it collided with the one above. That model produced exactly the complaint, and it measured: on the
 * left lane the gaps ran 48, 48, 48, 333, 48, 40, 48 — five at the hard minimum and one void of 333.
 * The lane had 1133 units of slack in it; the year axis just happened to dump all of it in one place,
 * because the projects are not evenly distributed in TIME (three left clusters sit inside 2023.0 to
 * 2023.55, and their plates are 200-350 tall each).
 *
 * So the axis stops deciding where plates go. What survives is ORDER — clusters are laid out in year
 * sequence, which is the part that makes it a timeline at all — and the year labels still sit at their
 * true `yearToY`. What is given up is the metric claim that a plate's y means its date. That is the
 * distortion he authorised, and it buys roughly 3x the breathing room in the crowded stretches, plus
 * the negative space the sub-branches then colonize (which is the same lever, not a second one).
 *
 * The gap is DERIVED, not a constant: whatever slack the lane has left after the stacks, shared out
 * evenly — including above the first cluster and below the last, so a lane reads as evenly set rather
 * than top-aligned with a hole at the bottom.
 */
export function spreadSide(
  items: Array<{ id: string; heights: number[] }>,
  laneTop: number,
  laneBottom: number,
  gapWithinCluster: number,
): Map<string, number> {
  const stackHeight = (heights: number[]) =>
    heights.reduce((s, h) => s + h, 0) + Math.max(0, heights.length - 1) * gapWithinCluster;
  const sum = items.reduce((s, it) => s + stackHeight(it.heights), 0);
  // n + 1 gaps: one above each cluster, and one below the last.
  const gap = (laneBottom - laneTop - sum) / (items.length + 1);
  const tops = new Map<string, number>();
  let y = laneTop + gap;
  for (const it of items) {
    tops.set(it.id, y);
    y += stackHeight(it.heights) + gap;
  }
  return tops;
}

function layoutClusters(spine: Strand): LaidCluster[] {
  const tops = new Map<string, number>();
  (['left', 'right'] as Side[]).forEach((side) => {
    const items = CLUSTERS.filter((c) => c.side === side)
      // Sorted by YEAR, then spread evenly: the sequence is the year's, the spacing is not. The
      // heights are the DERIVED ones, not the tier's reference box — that is what a plate actually
      // occupies now that the box comes from the image (see plateBox).
      .sort((a, b) => a.year - b.year)
      .map((c) => ({
        id: c.id,
        heights: c.nodes.map((n) => plateBox(n.tier, n.media.ratio).h),
      }));
    spreadSide(items, LANE_TOP, LANE_BOTTOM, CLUSTER_GAP_Y).forEach((v, k) => tops.set(k, v));
  });

  return CLUSTERS.map((c) => {
    const anchorY = yearToY(c.year);
    const spineX = atY(spine, anchorY).x;
    const dir = c.side === 'left' ? -1 : 1;
    const edgeX = spineX + dir * OFFSET_X; // the plates' near edge: the lane beside the spine
    let y = tops.get(c.id)!;
    const plates = c.nodes.map((n) => {
      const { w, h } = plateBox(n.tier, n.media.ratio);
      const x = dir === 1 ? edgeX : edgeX - w;
      const box = { x, y, w, h, media: n.media };
      y += h + CLUSTER_GAP_Y;
      return box;
    });
    return { id: c.id, year: c.year, side: c.side, dir, hint: c.hint, spineX, anchorY, edgeX, plates };
  });
}

/**
 * THE LAID-OUT PLATES — every plate resolved to its rect and its side.
 *
 * This is the page's layout, and it is the INPUT to everything ornamental: the year labels dodge it,
 * and the sub-branch engine grows into the space it leaves. Nothing here reads the ornament back, and
 * that direction is deliberate and load-bearing (see the decoupling note above).
 *
 * Was `computeBranches`, which also sampled each branch's polyline for a no-overlap contract; the
 * branches are gone and the contract with them.
 */
/**
 * WHERE THE YEAR LABELS ARE, resolved off the real layout — the counterpart to `computePlates()`.
 *
 * One entry point on purpose. The labels' positions are needed in three places (the render, the
 * sub-branches' no-go rects, and the tests), and three call sites re-deriving them is how one of
 * them quietly keeps using the old axis while the page uses the new one.
 */
export function yearLabelPositions(): Map<number, number> {
  return yearLabelYs(layoutClusters(sample('spine', spinePts())));
}

export function computePlates(): Array<{
  clusterId: string;
  plateIndex: number;
  side: Side;
  rect: { x: number; y: number; w: number; h: number };
}> {
  const spine = sample('spine', spinePts());
  const laid = layoutClusters(spine);
  const out: Array<{
    clusterId: string;
    plateIndex: number;
    side: Side;
    rect: { x: number; y: number; w: number; h: number };
  }> = [];
  laid.forEach((c) =>
    c.plates.forEach((pl, i) =>
      out.push({
        clusterId: c.id,
        plateIndex: i,
        side: c.side,
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
  /** What the year labels must dodge: every plate, as actually laid out. The layout is static, so
   *  this is computed once per mount, not per scroll frame. */
  const labelObstacles = useMemo(() => computePlates(), []);
  /** Where the year labels sit: beside the work they name (see yearLabelYs). Static layout, so it is
   *  resolved once per mount rather than per camera frame. */
  const labelYs = useMemo(() => yearLabelYs(laid), [laid]);

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
    /* `-mt-8` CANCELS the 2rem of `main`'s pt-[calc(var(--header-h)+2rem)], and it is a bug fix, not
       a spacing tweak (2026-07-16, round 4).

       Daniel: "when the 'we've been chasing it for five years' positions itself on its right-left
       placements, it actually glitches out because there's already an existing 'we've been chasing it
       for five years' that is slightly not aligned to the brother one."

       Measured: the intro's flying title landed at y=262.2 while the persistent title sat at y=230.2
       — dx 0, dw 0, dy EXACTLY 32. The 32 is this padding. The sticky child below pins at
       `top-[var(--header-h)]`, but the track started 2rem BELOW that pin point, so at scrollY=0 the
       column sat unpinned 32px low, and the moment anything scrolled (the autoplay starts on mount,
       behind the veil) the sticky engaged and the whole copy column jumped up by 2rem. The intro had
       measured the title before that, so it flew to a position the title had already left.

       Starting the track AT the pin point means the sticky is engaged from scrollY=0 and the title
       never moves. The two titles then agree by construction rather than by two measurements racing a
       scroll — and the copy column stops popping when the camera starts, which was the same bug
       wearing its everyday clothes. */
    <div
      ref={trackRef}
      data-timeline-track
      className={reduced ? 'relative' : 'relative -mt-8'}
      style={{ height: reduced ? 'auto' : '1080vh' }}
    >
      {/* `data-timeline-frame` is the founders' parenthesis's handle on this row. It needs the row's
          bottom edge to find where the descent's exit lands on the page — see FounderParenthesis's
          `padBelow`, and note that this row's own bottom padding is what puts the exit above the
          track's bottom rather than on it. */}
      <div
        data-timeline-frame
        className={
          reduced
            ? 'flex flex-col gap-12'
            : // THE LIFT LIVES ON THE ROW, NOT ON ONE COLUMN (2026-07-16, round 4). `items-stretch`
              // is what makes this work: padding here shrinks BOTH columns, so the words and the
              // mark move together. See the copy column below, `pinCamY`, and qa/hero-lockup.mjs.
              'sticky top-[var(--header-h)] flex h-[calc(100svh-var(--header-h))] flex-col gap-8 py-4 lg:flex-row lg:items-stretch lg:gap-12 lg:pb-[calc(var(--header-h)+3.25rem)] xl:gap-16'
        }
      >
        {/* THE HERO LOCKUP'S HEIGHT — round 2, corrected in round 4.
            Round 2, Daniel: "the entire thing should be lifted up slightly to be on centre on my
            screen." Arithmetic, not taste: this column is `justify-center` inside a box that starts
            BELOW the fixed header, so it centred on that band's middle — exactly `--header-h / 2`
            below the middle of the SCREEN. Measured then at 1440x900: centre 492 vs screen centre
            450. The correction buys back `--header-h` plus an optical nudge, doubled because
            `justify-center` splits padding, and written against the token because SplashHeader
            re-measures --header-h at runtime.

            ROUND 4: THE PADDING MOVED TO THE ROW, and that is the actual fix, not a tidy-up. Round 2
            put it on this column ALONE, which lifted the words and left the mark where it was —
            Daniel, round 4: "The text 'we've been chasing it for five years' is now on center,
            perfectly aligned, but the bower is still slightly below." Measured at the pin: the words
            at 432, the mark at 492, 60px adrift. The mark sits at the SVG frame's centre, and
            padding on this column moves only this column's CONTENT — the frame never heard about it.

            The `pinCamY` comment had ASSERTED the thing round 2 broke — "the mark's centre is at the
            frame's vertical centre, which is where the left text block is centred too, so the mark
            and the words compose as one still." On the ROW, `items-stretch` shrinks both columns, so
            the frame's centre and this column's centre move as one and that sentence is true again.

            WHY 3.25rem AND NOT ROUND 2's 2.25: the lift is pb/2, and moving the padding from the
            column to the row changes what it acts on, so the same value is no longer the same nudge
            — at 2.25rem the words came to rest 10px proud of the screen centre, not the 18 they had
            been. But 18 is the position Daniel called "perfectly aligned", so it is a FIXED POINT,
            not a leftover: the mark had to come up to the words, not the words down to the mark.
            +1rem of padding buys the missing 8px (measured 2.25 -> 10 proud, 2.75 -> 14, 3.25 -> 18).
            Both halves are pinned by qa/hero-lockup.mjs, which drives a real scroll to the pin. */}
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

            {/* THE SUB-BRANCHES. Sepia stems grown into the drawing's negative space by space
                colonization, carrying their own gongbi foliage. Ornament: it reads the plate layout
                and never feeds back into it. Painted BEFORE the clusters, so that if the ornament and
                a project ever do disagree, the project is simply drawn on top — the paint order is
                the last expression of "the branch loses". */}
            <SubBranches reduced={reduced} cardLineY={cardLineY} />

            {/* THE GARLAND. Clay's gongbi organs grown along the spine's own polyline, in full
                pigment. Painted after the spine so foliage sits ON the line, and before the
                clusters so a plate stays on top of it. */}
            <SpineGarland reduced={reduced} />

            {/* Every cluster: its plates, standing alongside the line at their year. */}
            {laid.map((c) => (
              <ClusterGroup key={c.id} cluster={c} cardLineY={cardLineY} reduced={reduced} />
            ))}

            {/* Year labels: heavy, painted AFTER the clusters (numerals never blocked), with a vellum
                halo (paint-order stroke) so they stay legible over any adjacent-year plate. The side
                flip (yearLabelSide, unit-tested) puts each label on whichever side the laid-out
                plates and branches actually leave room on. */}
            {YEAR_TICKS.map((y) => {
              // Beside the work it names, not at its metric position. See yearLabelYs.
              const ty = labelYs.get(y) ?? yearToY(y);
              const vis = reduced ? 1 : clamp01((camY + viewH + 40 - ty) / 60) * clamp01((ty - camY + 120) / 80);
              if (vis <= 0.01) return null;
              const drawSide = yearLabelSide(labelObstacles, ty);
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

            {/* THE DATUM Daniel named, made measurable. Round 4: "the center of the middle circle
                and the bower is exactly at the middle point between the top of that 'we've been
                chasing it' and the bottom of the reshape that we can make."

                The Oculus is eight circles ringing (50,50), and the lens they overlap into at that
                centre is his "middle circle" — so its centre is exactly (MARK_CENTER_X,
                MARK_CENTER_Y), the ring's own centre. There is no element there to measure, and the
                spec is geometric, so this zero-radius, unstroked point is one: it draws nothing and
                lets qa/hero-lockup.mjs read the datum's real screen position instead of inferring it
                from the mark's bounding box (which is NOT the same point, and is what "not the mark's
                bbox" in his spec rules out). */}
            <circle data-mark-center cx={MARK_CENTER_X} cy={MARK_CENTER_Y} r={0} fill="none" stroke="none" />

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
              {/* WHERE THE ONE LINE LEAVES THIS DRAWING, as a zero-radius datum on the exact point
                  `descD` ends on. The founders' parenthesis below has to start precisely here or the
                  page shows a floating stub over a gap — which it did — and this lets
                  qa/founder-parenthesis.mjs measure the join instead of recomputing it from
                  constants and agreeing with itself. Draws nothing. */}
              <circle data-descent-exit cx={pageCenterVX} cy={DESC_BOTTOM_Y} r={0} fill="none" stroke="none" />
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
  // `meet`, ALWAYS, and it costs nothing: the box IS the image's ratio (see plateBox), so meet and
  // slice resolve to the same pixels and neither letterboxes nor crops. `meet` is the honest one to
  // ask for — it can only ever fail safe, by showing the whole picture.
  //
  // `fit` no longer chooses between them (a box built to the image has nothing to fit); it now only
  // says whether the plate wants a white ground under it, which paper figures and line drawings do
  // where photographs do not. The clipPath is gone with the crop it existed to make.
  return (
    <g>
      {plate.fit === 'contain' && <rect x={x} y={y} width={w} height={h} fill="#fff" />}
      {plate.video ? (
        <VineVideo plate={plate} x={x} y={y} w={w} h={h} reduced={reduced} />
      ) : (
        <image href={plate.src} x={x} y={y} width={w} height={h} preserveAspectRatio="xMidYMid meet">
          <title>{plate.alt}</title>
        </image>
      )}
      <rect x={x} y={y} width={w} height={h} fill="none" stroke={INK_SEPIA} strokeOpacity={0.25} strokeWidth={1} />
    </g>
  );
}

/**
 * One cluster: its plates, standing ALONGSIDE the timeline at their year.
 *
 * DECOUPLED 2026-07-16 (Daniel: "We had initially tried to have the flowers or the leaves actually
 * holding the projects within the timeline. Scratch that."). A plate is no longer BORNE by anything:
 * the branch that forked off the spine to carry it, the calyx that cupped it from below, and the node
 * dot that marked the fork are all gone. The spine and its ornament are the drawing; the projects keep
 * pace beside it. Nothing in the layout depends on the ornament any more, and the ornament reads the
 * layout rather than producing it — see SubBranches.
 *
 * THE ENTRANCE IS A FADE, NOT A GROWTH (Daniel: "Right now it expands from the bottom up. I like for
 * it to fade in better so the entire thing is already there and doesn't have that weird initial
 * distortion"). The plate is laid out at full size from the first frame and only its opacity moves.
 * The old `unfurl()` WAS the distortion he was describing: it opened every plate from
 * `scale(0.92, 0.64)` about the branch junction, which squashed the image to 64% of its height and
 * then stretched it back — on landscape photographs, in a page whose whole complaint this round was
 * pictures at the wrong aspect.
 */
function ClusterGroup({ cluster, cardLineY, reduced }: { cluster: LaidCluster; cardLineY: number; reduced: boolean }) {
  const { dir, plates, hint } = cluster;

  return (
    <g>
      {plates.map((pl, i) => {
        // Composite opacity ONLY: no scale, no rotate, no pivot, no clip. Reduced motion is fully
        // present from the start, as before.
        const opacity = reduced ? 1 : growAt(cardLineY, pl.y, UNFURL_SPAN);
        if (opacity <= 0.001) return null;

        return (
          <g key={i} style={{ opacity }}>
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
        );
      })}
    </g>
  );
}
