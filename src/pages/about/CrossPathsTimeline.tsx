/**
 * CrossPathsTimeline.tsx — how Clay and Daniel crossed paths, drawn as a node graph.
 *
 * v2 (2026-07-13). This is a composition rework of v1 (see docs/2026-07-13-timeline-design-spec-v1.md
 * for the seam fix and piecewise axis, both KEPT). The v2 spec is
 * docs/2026-07-13-timeline-v2-composition-spec.md. What changed, and why:
 *
 * ONE SPINE, SHORT BRANCHES. v1 drew a trunk plus seven long parallel tributaries, so the linework
 * covered more area than the pictures. v2 is a node-based graph: there is exactly ONE long line
 * (the spine), and every event is a SHORT branch edge off it to a picture plate. Nodes are plates
 * and named events; edges are the curves; the graph has one long edge and many short ones.
 * Checkable rule: at any scroll position you should see at most the spine plus a couple of branch
 * edges mid-unfurl — MAX_CONCURRENT_STRANDS = 3. If a screenshot ever shows more than three
 * distinct stroked paths, the composition has regressed to v1's web-of-lines.
 *
 * TWO LINEAGES MERGE INTO THE SPINE AT 2021. Where v1 had a single faint companion, v2 has two
 * symmetric, named pre-2021 whispers (Clay from the left, Daniel from the right). Both terminate at
 * the SAME sampled spine coordinate at UT Austin 2021, running parallel to the spine before they
 * meet, so the join reads as one grown line, not two lines colliding. This is the "ends meet" fix.
 *
 * IMAGES DOMINATE. Four plate tiers, with a hard floor (nothing smaller than the old "Architecture
 * Practice" card). Multi-image events are VERTICAL CLUSTERS: siblings stack straight down one lane
 * with a fixed gap, never fanned or overlapping, each with its own short branch back to the shared
 * spine point.
 *
 * ONE COLOUR (INK_BLUE). No colour coding by person. Difference is weight and opacity only.
 *
 * TIME IS PIECEWISE. The axis starts at 2021; 2021 to 2023 is compressed (300 u/yr) against the
 * open later years (760 u/yr). Unchanged from v1.
 *
 * THE FINALE IS A WOVEN BOWER (round 3, seed retired). At WEAVE_START_Y the spine forks into two
 * arms that weave over and under each other and rejoin, framing the wordmark lockup (the Oculus
 * mark + "bower" in the header's mono face). See "THE WEAVE" below.
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useReducedMotion } from '../../ui/useReducedMotion';
import { line as d3line, curveCatmullRom } from 'd3-shape';
import { CENTERS as MARK_CENTERS } from '../../ui/OculusMark';
import { clamp01, gompertz, lerp } from './growth';
import { useAutoplayVideo } from './useAutoplayVideo';

/** The practice's blue. There is no second colour in this drawing, on purpose. */
export const INK_BLUE = '#3E7CA8';

/**
 * The checkable ceiling on how many stroked paths may be visible at once: the spine, plus at most
 * two branch edges mid-unfurl. This is a QA contract (screenshot and count), not something the code
 * enforces; the reveal gating below keeps the count low by only drawing a branch as its own plate
 * unfurls.
 */
export const MAX_CONCURRENT_STRANDS = 3;

type Side = 'left' | 'right';
type Lineage = 'clay' | 'daniel';
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
   *  year). Used where a plate would otherwise sit over the 2021 merge whispers; safe only where the
   *  lane has slack below. */
  dy?: number;
}

const A = '/assets/projects';

/* --------------------------------- geometry ------------------------------- */

const W = 1200;
const CX = 600;
const MAX_YEAR = 2026;

/** Piecewise time axis: 2021 to 2023 compressed, 2023 to 2026 open. Unchanged from v1. */
const Y_2021 = 150;
const Y_2023 = 750;
const SLOPE_EARLY = 300; // units per year, 2021 to 2023
const SLOPE_LATE = 760; // units per year, 2023 to 2026
const CONVERGE_Y = Y_2023 + (MAX_YEAR - 2023) * SLOPE_LATE; // 3030

const yearToY = (y: number) =>
  y <= 2023 ? Y_2021 + (y - 2021) * SLOPE_EARLY : Y_2023 + (y - 2023) * SLOPE_LATE;
const yToYear = (Y: number) =>
  Y <= Y_2023 ? 2021 + (Y - Y_2021) / SLOPE_EARLY : 2023 + (Y - Y_2023) / SLOPE_LATE;

/**
 * Which side of the spine a year label sits on: OPPOSITE the nearest cluster within 0.15 of a
 * year (so the heavy numerals structurally clear that cluster's plates), defaulting right when no
 * cluster is near. Pure and exported so the flip rule is unit-testable against CLUSTERS.
 */
export function yearLabelSide(clusters: ReadonlyArray<{ year: number; side: Side }>, y: number): Side {
  let near: { d: number; side: Side } | null = null;
  for (const c of clusters) {
    const d = Math.abs(c.year - y);
    if (d < 0.15 && (!near || d < near.d)) near = { d, side: c.side };
  }
  return near ? (near.side === 'right' ? 'left' : 'right') : 'right';
}

/**
 * THE WEAVE, at the end of the line (round 3). The seed is retired. Where the spine used to arrive
 * at a seed, it now FORKS into two arms that weave over and under each other and frame the wordmark,
 * the way real branches frame the doorway of a bower. It is the mirror of the 2021 lineage merge at
 * the top (two into one), run in reverse (one into two, then rejoined).
 */
const WEAVE_START_Y = CONVERGE_Y; // 3030 — where the spine forks
const WEAVE_ZONE_H = 300;
const WEAVE_END_Y = WEAVE_START_Y + WEAVE_ZONE_H; // 3330 — where the two arms rejoin
const WORDMARK_Y = lerp(WEAVE_START_Y, WEAVE_END_Y, 0.48);
const PAYOFF_Y = WEAVE_END_Y + 90;
const H = PAYOFF_Y + 60; // 3480
const WEAVE_AMPLITUDE = 88;
/** The payoff wordmark lockup: the brand mark (eight circles) + "bower" in the header's mono face. */
const ICON_R = 50;
const LOCKUP_GAP = 10;

/** Plate tiers. The FLOOR is a reference only (nothing is built at it); the smallest plate actually
 *  drawn is STANDARD, which is still larger than v1's 240x150 card. Images dominate now. */
const TIER: Record<PlateTier, { w: number; h: number }> = {
  floor: { w: 240, h: 150 }, // reference size only — the hard minimum, never instantiated
  standard: { w: 264, h: 176 },
  hero: { w: 320, h: 213 },
  showcase: { w: 400, h: 267 }, // reserved for the two bookends: ut-austin and the NYC door
};

/** The fixed perpendicular gap from the spine to a plate's inner edge. Bigger than v1's 92 to give
 *  the now-larger plates clearance: 110 + 400 (showcase) = 510 < 600 = CX, a 90px margin. */
const OFFSET_X = 110;
/** Minimum vertical gap between two stacked siblings in one cluster (their bounding boxes never
 *  come closer than this — the no-overlap contract). */
const CLUSTER_GAP_Y = 40;
/** Minimum vertical gap between two DIFFERENT clusters sharing a side's lane, so dense years do not
 *  collide even though the branch anchors stay on the true year. */
const CROSS_GAP = 48;
/** How far a branch bows outward from the spine before easing into the plate. */
const BRANCH_BOW = 26;
/** The ornamental leaf where each branch meets its plate (round 3). The last BRANCH_LEAF_LEN units
 *  of every branch become a lanceolate blade instead of a bare line; the size is FIXED, it does not
 *  scale with the plate tier, so the connective tissue keeps one calm rhythm at every destination. */
const BRANCH_LEAF_LEN = 46;
const BRANCH_LEAF_WIDTH = 20;

/** Year-label treatment (round 3): heavy, larger, and never occluded. The side each label sits on is
 *  chosen from the data (opposite whichever cluster shares that year) so it is structurally
 *  guaranteed to clear the plates. */
const YEAR_LABEL_FONT = 30;
const YEAR_LABEL_OFFSET = 56; // spine to label baseline
const YEAR_TICK_INNER = 24; // spine to tick inner end
const YEAR_TICK_LEN = 22;
const YEAR_LABEL_CLEAR = 20; // label baseline sits this far above the tick

/** The trunk carries a pre-2021 provenance run-in above the first named year. */
const TRUNK_LEAD = 1.4;
const LEAD = 0.55;

/** The foliage reveal line sits at 52% of the frame; a plate opens as it rises past it. */
const CARD_LINE = 0.52;
/** How much scroll travel a plate takes to unfurl. Wider than v1 (was 130) so the reveal is spread
 *  over more scroll and reads as a smooth settle rather than a quick pop. */
const UNFURL_SPAN = 175;
/** The structural reveal front sits BELOW the fold, so whatever is inside the frame is fully drawn
 *  and the spine runs through the bottom edge at every scroll position. Unchanged from v1. */
const DRAW_AHEAD = 0.35;
/** The spine is top-clipped this far above the top edge, so it never shows a top terminus in frame. */
const TOP_CLIP = 60;

const lineGen = d3line<{ x: number; y: number }>()
  .x((d) => d.x)
  .y((d) => d.y)
  .curve(curveCatmullRom.alpha(0.5));

/* ------------------------------ strand sampling --------------------------- */

/** A sampled strand: its path string, plus per-point y, x and normalised arc-length fraction, so we
 *  can reveal only the middle segment between two Y lines and find where a branch anchors at a given
 *  year. Monotonic in y. Unchanged from v1. */
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

/** Interpolate the strand at world Y (binary search over the ascending y array). Unchanged from v1. */
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

/** A gentle slow-out settle (cubic ease-out): reads as a leaf opening, not a UI pop. Softened from
 *  the old quintic, which shot in too fast at the start and read as an abrupt opacity pop. */
const easeUnfurl = (u: number) => 1 - Math.pow(1 - clamp01(u), 3);

/* --------------------------------- the graph ------------------------------ */

/**
 * The content graph, node by node (spec section 7). `nodes[0]` is the lead (hero, or showcase for
 * the two bookends); later nodes stack below as standard siblings.
 *
 * NODE COUNTS: most clusters ship a single hero on purpose. The 2023-2024 events fall within a few
 * compressed years, and at the new (much larger) plate sizes two-per-cluster there would either
 * overlap or force long branches; "fewer, larger images" is also part of the round-2 ask. The
 * dropped second images are not lost — they live in "The Work" list below (projects.ts). Two clusters
 * keep a genuine pair because they are vertically isolated enough to earn it: `medical` and the
 * `newyork` bookend. Promoting more to pairs later is a per-cluster, one-line change.
 */
export const CLUSTERS: Cluster[] = [
  // The 2021 merge carries NO plate. Daniel's round-2 redline: the "Architecture Practice" whisper
  // plate (the flowerfield render that used to hang here) rendered badly over the two lineage
  // whispers, so it is removed from the spine entirely. The merge now reads as just the two named
  // lineages, "Clay" and "Daniel", resolving into one line. That flowerfield image is not lost: it
  // still leads Flowerfield in "The Work" list (projects.ts).
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
    // The real material-prototyping shot, not the AI render that used to sit here: an actual
    // Plentify sample under compression on the MTS Insight machine (Daniel's round-2 note).
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
        tier: 'hero',
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
        // The cardboard physical model (round-2 add): proportion in the round, below the money shot.
        tier: 'standard',
        media: {
          src: `${A}/05-dougherty/dougherty-arts-center-physical-model-cardboard-catenary.webp`,
          alt: 'The cardboard physical model of the Dougherty Arts Center, its white catenary arches standing in the round',
        },
      },
    ],
  },
  {
    // Robotic Factory (round-2 add): its section-assembly video was living only in "The Work" list;
    // the timeline now carries it so every video appears and plays here. Left lane at 2025.3, clear
    // below Dougherty and opposite the New York showcase on the right.
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

/**
 * The two pre-2021 lineages, whispered in from the sides and merging into the spine at 2021.
 * Round-2 redline: the labels are now just the two names, "Clay" and "Daniel". The "the line comes
 * from" kicker and the "Rick Wright Architects, Dallas" firm line are gone; the merge should read as
 * the two people meeting, nothing more.
 */
const ORIGINS: Array<{ id: string; lineage: Lineage; side: Side; name: string }> = [
  { id: 'origin-clay', lineage: 'clay', side: 'left', name: 'Clay' },
  { id: 'origin-daniel', lineage: 'daniel', side: 'right', name: 'Daniel' },
];

/* ------------------------------ strand builders --------------------------- */

/**
 * The spine: one continuous line from the pre-2021 provenance to the weave fork. Essentially the
 * central axis (CX) so branches fork symmetrically off both sides, with a faint pre-2021 wander that
 * settles onto CX by 2021, then runs straight down its axis to WEAVE_START_Y.
 */
function spinePts(): Array<{ x: number; y: number }> {
  const pts: Array<{ x: number; y: number }> = [];
  const N = 170;
  const from = 2021 - TRUNK_LEAD;
  for (let i = 0; i <= N; i++) {
    const year = lerp(from, MAX_YEAR, i / N);
    const Y = yearToY(year);
    let x = CX;
    if (year < 2021) {
      const preU = clamp01((2021 - year) / TRUNK_LEAD);
      x = CX + Math.sin(preU * 2.4) * 6 * preU; // vanishes at 2021
    }
    // The spine now arrives straight down its axis at WEAVE_START_Y, where it forks into the weave
    // (no terminal bow — that was the old seed-arc echo, retired with the seed).
    pts.push({ x, y: Y });
  }
  return pts;
}

/**
 * One lineage whisper: comes in from its side and is carried into the spine by a Gompertz curve
 * steep enough that it is already running parallel to the spine (within ~15°) for the last stretch
 * before the merge — the "tangent rule" that makes the join read as one grown line. Its final point
 * is the EXACT shared spine coordinate at 2021, never a hand-placed merge point.
 */
function lineagePts(side: Side, mergeX: number): Array<{ x: number; y: number }> {
  const dir = side === 'left' ? -1 : 1;
  const x0 = CX + dir * 196;
  const startYear = 2020.2;
  const mergeYear = 2021.0;
  // The last stretch runs vertically DOWN the spine's x before the merge, so the join is a clean
  // tangent (the line is already parallel to and coincident with the spine well before its endpoint)
  // rather than two curves colliding at a point. Round-2 fix for the "merge renders badly" redline.
  const RUNIN = 46; // Y-units of vertical run-in coincident with the spine
  const mergeY = yearToY(mergeYear);
  const pts: Array<{ x: number; y: number }> = [];
  const N = 80;
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    const year = lerp(startYear - LEAD, mergeYear, u);
    const Y = yearToY(year);
    if (Y >= mergeY - RUNIN) {
      // Vertical run-in: hold x on the spine so the last segment is exactly parallel to it.
      pts.push({ x: mergeX, y: Y });
      continue;
    }
    const mu = clamp01((year - startYear) / (mergeYear - startYear));
    // p=0.42, k=11: g > 0.985 well before the run-in begins, so the curve has already flattened to
    // near-vertical by the time it hands off to the coincident run-in — no kink at the handoff.
    const g = gompertz(mu, 0.42, 11);
    pts.push({ x: lerp(x0, mergeX, g), y: Y });
  }
  pts[pts.length - 1] = { x: mergeX, y: mergeY }; // shared endpoint on the spine
  return pts;
}

/**
 * One weave arm, sampled over a t-range. `sign` is +1 for the left arm, -1 for the right (spec
 * section 1): x = CX + sign·AMP(t)·sin(θ(t)), with AMP peaking mid-zone and θ running three
 * half-turns so the two arms cross twice. Splitting the arm at the crossing t-values and sampling
 * each range separately is what lets the render alternate which arm paints on top (the over-under
 * weave); because every sub-range is evaluated from the same formula, adjacent segments share their
 * endpoint coordinate exactly, no hand-placed joins.
 */
function weaveArmPts(sign: number, t0: number, t1: number): Array<{ x: number; y: number }> {
  const pts: Array<{ x: number; y: number }> = [];
  const N = 28;
  for (let i = 0; i <= N; i++) {
    const t = lerp(t0, t1, i / N);
    const amp = WEAVE_AMPLITUDE * Math.sin(Math.PI * t); // 0 at both ends, peaks at t=0.5
    const theta = 3 * Math.PI * t; // three half-turns → two interior crossings
    pts.push({ x: CX + sign * amp * Math.sin(theta), y: lerp(WEAVE_START_Y, WEAVE_END_Y, t) });
  }
  return pts;
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
  innerX: number;
  plates: Array<{ x: number; y: number; w: number; h: number; media: Plate }>;
}

/**
 * Pack one side's clusters down its offset lane so no two bounding boxes overlap. Pure and
 * deterministic (exported for tests): given clusters in ascending anchor order with their node
 * heights, it returns the top Y of each stack. A cluster sits centred on its true anchor year unless
 * that would collide with the previous cluster on this side, in which case it is pushed just far
 * enough down to clear it by CROSS_GAP. The branch anchor itself always stays on the true year.
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
    const innerX = spineX + dir * OFFSET_X;
    let y = tops.get(c.id)! + (c.dy ?? 0);
    const plates = c.nodes.map((n) => {
      const { w, h } = TIER[n.tier];
      const x = dir === 1 ? innerX : innerX - w;
      const box = { x, y, w, h, media: n.media };
      y += h + CLUSTER_GAP_Y;
      return box;
    });
    return { id: c.id, side: c.side, dir, hint: c.hint, spineX, anchorY, innerX, plates };
  });
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

  // Scroll smoothing without a dependency: raw progress read from the track, camera driven by a
  // lerped value so it has weight and no jitter. The rAF idles once caught up. Unchanged from v1.
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

  // AUTOPLAY ON ENTRY (spec section 7). Once per page load, when the track pins to the top, drive the
  // REAL scroll position from the track's start to its end over 14s on a piecewise ease (linear reads
  // as fast-forward). This layers ON TOP of the scroll-driven camera above — the same `kick()` picks
  // up programmatic scroll for free, so there is no second camera. ANY user input (wheel, touch, key)
  // stops it instantly and hands control back exactly where it left off. Reduced motion never runs it.
  useEffect(() => {
    if (reduced) return;
    const el = trackRef.current;
    if (!el) return;

    let raf = 0;
    let running = false;
    let hasAutoplayed = false;
    let startTs = 0;
    let startY = 0;
    let endY = 0;

    const DURATION = 14000;
    const headerH =
      parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 72;
    const cubicIn = (t: number) => t * t * t;
    const cubicOut = (t: number) => 1 - Math.pow(1 - t, 3);
    // Ease in over the first 8%, cruise the middle 84%, ease out over the last 8%.
    const autoplayEase = (t: number) =>
      t < 0.08 ? cubicIn(t / 0.08) * 0.08 : t > 0.92 ? 0.92 + cubicOut((t - 0.92) / 0.08) * 0.08 : t;

    const stopAutoplay = () => {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      window.removeEventListener('wheel', onInput);
      window.removeEventListener('touchstart', onInput);
      window.removeEventListener('touchmove', onInput);
      window.removeEventListener('keydown', onInput);
      window.removeEventListener('pointerdown', onInput);
    };
    // First user input of any kind hands control back, no snap or correction — the scroll-driven
    // camera above was tracking window.scrollY the whole time, so it takes over seamlessly.
    const onInput = () => {
      if (running) stopAutoplay();
    };

    const frame = (ts: number) => {
      if (!running) return;
      if (!startTs) startTs = ts;
      const t = clamp01((ts - startTs) / DURATION);
      window.scrollTo(0, lerp(startY, endY, autoplayEase(t)));
      if (t >= 1) {
        stopAutoplay(); // bottom handoff: nothing to unlock, scroll was only driven, never disabled
        return;
      }
      raf = requestAnimationFrame(frame);
    };

    const begin = () => {
      if (hasAutoplayed) return;
      hasAutoplayed = true;
      running = true;
      startTs = 0;
      const r = el.getBoundingClientRect();
      startY = window.scrollY; // where p is ~0 (the track has just pinned)
      endY = startY + r.top + (r.height - window.innerHeight); // scrolling this far lands p = 1
      window.addEventListener('wheel', onInput, { passive: true });
      window.addEventListener('touchstart', onInput, { passive: true });
      window.addEventListener('touchmove', onInput, { passive: true });
      window.addEventListener('keydown', onInput);
      // pointerdown catches a scrollbar grab (which fires no wheel/touch/key), so a drag never
      // fights the programmatic scrollTo.
      window.addEventListener('pointerdown', onInput, { passive: true });
      raf = requestAnimationFrame(frame);
    };

    // Trigger when the track's top first reaches within ~2px of the sticky pin point (header-h).
    const onScroll = () => {
      if (hasAutoplayed) return;
      const top = el.getBoundingClientRect().top;
      if (top <= headerH + 2 && top > -window.innerHeight) begin();
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll(); // in case it is already pinned on mount
    return () => {
      window.removeEventListener('scroll', onScroll);
      stopAutoplay();
    };
  }, [reduced]);

  // The spine, sampled once. Everything else anchors onto it.
  const spine = useMemo(() => sample('spine', spinePts()), []);
  const mergeX = useMemo(() => atY(spine, yearToY(2021.0)).x, [spine]);
  const lineages = useMemo(
    () => ORIGINS.map((o) => ({ ...o, strand: sample(o.id, lineagePts(o.side, mergeX)) })),
    [mergeX],
  );
  const laid = useMemo(() => layoutClusters(spine), [spine]);

  // The weave: two arms, each split into three segments at the crossing t-values, sampled like every
  // other strand. Render order alternates L/R per segment to read as a real over-under basket weave.
  const weave = useMemo(() => {
    const bounds = [0, 1 / 3, 2 / 3, 1];
    const L: Strand[] = [];
    const R: Strand[] = [];
    for (let s = 0; s < 3; s++) {
      L.push(sample(`weave-L${s}`, weaveArmPts(1, bounds[s], bounds[s + 1])));
      R.push(sample(`weave-R${s}`, weaveArmPts(-1, bounds[s], bounds[s + 1])));
    }
    return { L, R };
  }, []);

  // The payoff wordmark uses the header's own mark: the eight Oculus circles, crisp and full colour
  // (not the faint backdrop the seed used). markScale = ICON_R/100 keeps the mark's 2:1 ratio.
  const markScale = ICON_R / 100;

  const viewH = clamp(W / aspect, 480, H);
  const camY = reduced ? 0 : lerp(0, Math.max(H - viewH, 0), p);
  const frontY = camY + viewH * (1 + DRAW_AHEAD);
  const topY = camY - TOP_CLIP;
  const cardLineY = reduced ? H : camY + viewH * CARD_LINE;

  const viewBox = reduced ? `0 0 ${W} ${H}` : `0 ${camY} ${W} ${viewH}`;

  /** The middle-segment reveal for the spine: draw only from the top clip to the draw-ahead front,
   *  so both terminals sit off-frame and the line runs edge to edge. Unchanged from v1. */
  const revealProps = (s: Strand) => {
    if (reduced) return { strokeDasharray: undefined, strokeDashoffset: undefined, hidden: false };
    const fTop = atY(s, topY).frac;
    const fBot = atY(s, frontY).frac;
    const len = fBot - fTop;
    if (len <= 0.0005) return { strokeDasharray: '0 1', strokeDashoffset: 0, hidden: true };
    return { strokeDasharray: `${len} 1`, strokeDashoffset: -fTop, hidden: false };
  };

  // The finale's reveal, re-anchored to the camera reaching the bottom. The weave blooms in as one
  // opacity fade (dash-drawing six woven segments buys nothing visible); the wordmark and payoff
  // arrive a beat later. Same window shape the seed used.
  const bottomYear = reduced ? MAX_YEAR : yToYear(cardLineY);
  const drawnAt = (fromY: number, toY: number) => clamp01((bottomYear - fromY) / Math.max(toY - fromY, 1e-4));
  const weaveOpacity = drawnAt(MAX_YEAR - 0.75, MAX_YEAR - 0.15);
  const wordmarkOpacity = drawnAt(MAX_YEAR - 0.25, MAX_YEAR);
  const payoffOpacity = wordmarkOpacity;

  // The two lineage whispers ramp 0 to 0.4 as the camera nears 2021, then fade as it passes.
  const whisperOpacity = reduced ? 0.4 : 0.4 * clamp01((yearToY(2021) + 30 - camY) / 200);

  return (
    <div ref={trackRef} className="relative" style={{ height: reduced ? 'auto' : '680vh' }}>
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
              const at = reduced ? 1 : clamp01((p - (i === 0 ? 0.04 : 0.42)) / 0.12);
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
            aria-label="A timeline from 2021 to 2026 that travels downward as you scroll. One main line runs the whole way: a practice already moving before 2021, where the two founders, Clay and Daniel, meet in 2021. Each later event branches off to a picture: a medical device, startups, buildings grown in place, computational design research, fabrication, robotics, a lamp, and a year in New York. In 2026 the line forks into two arms that weave together into a bower framing the wordmark, Bower."
          >
            {/* The two lineage whispers, merging into the spine at 2021. Faint, weight-only. */}
            {lineages.map((l) => {
              const r = revealProps(l.strand);
              const end = l.side === 'left' ? 'end' : 'start';
              const lx = l.side === 'left' ? CX - 96 : CX + 96;
              return (
                <g key={l.id} style={{ pointerEvents: 'none' }}>
                  {!r.hidden && whisperOpacity > 0.01 && (
                    <path
                      d={l.strand.d}
                      fill="none"
                      stroke={INK_BLUE}
                      strokeOpacity={whisperOpacity}
                      strokeWidth={3}
                      strokeLinecap="round"
                      pathLength={1}
                      strokeDasharray={r.strokeDasharray}
                      strokeDashoffset={r.strokeDashoffset}
                    />
                  )}
                  {whisperOpacity > 0.02 && (
                    <g opacity={whisperOpacity / 0.4}>
                      {/* Just the name now: the two lineages read as two people meeting. */}
                      <text x={lx} y={yearToY(2021) - 66} textAnchor={end} className="fill-inkBlack font-serifDisplay" style={{ fontSize: 21, fontStyle: 'italic' }}>
                        {l.name}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}

            {/* THE SPINE. The only long line: heavy, full opacity, always running edge to edge. */}
            {(() => {
              const r = revealProps(spine);
              return (
                <path d={spine.d} fill="none" stroke={INK_BLUE} strokeWidth={7.5} strokeLinecap="round" pathLength={1} strokeDasharray={r.strokeDasharray} strokeDashoffset={r.strokeDashoffset} opacity={r.hidden ? 0 : 1} />
              );
            })()}

            {/* Every cluster: a fork off the spine to one or more stacked plates. */}
            {laid.map((c) => (
              <ClusterGroup key={c.id} cluster={c} cardLineY={cardLineY} reduced={reduced} />
            ))}

            {/* Year labels: heavy, larger, and painted AFTER the clusters so the numerals always
                sit above plates and branches — Daniel's rule is that timestamps are never blocked.
                The side flip (yearLabelSide, unit-tested) still clears the same-year cluster
                structurally; the vellum halo (paint-order stroke) keeps the numerals legible even
                where an adjacent-year plate reaches into the label band. 2026 gets the same heavy
                treatment, sitting just above the weave fork. */}
            {[2021, 2022, 2023, 2024, 2025, 2026].map((y) => {
              const ty = yearToY(y);
              const vis = reduced ? 1 : clamp01((camY + viewH + 40 - ty) / 60) * clamp01((ty - camY + 120) / 80);
              if (vis <= 0.01) return null;
              const drawSide = yearLabelSide(CLUSTERS, y);
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
                  {/* Baseline sits well above the tick (YEAR_LABEL_CLEAR) so heavy numerals never
                      touch a level branch edge forking off the spine at an integer year. */}
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
                      stroke: '#FBF9F3',
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

            {/* THE WEAVE. The spine forks into two arms that weave over and under each other and
                frame the wordmark, the way branches frame the doorway of a bower. Blooms in as one
                opacity fade; the wordmark and payoff arrive a beat later. */}
            <g opacity={weaveOpacity} style={{ pointerEvents: 'none' }}>
              {/* Over-under z-order (back to front): R rides on top into crossing 1, L on top into
                  crossing 2, R on top into the rejoin — a real basket weave, not two flat crossings. */}
              {[weave.L[0], weave.R[0], weave.R[1], weave.L[1], weave.L[2], weave.R[2]].map((seg) => (
                <path key={seg.id} d={seg.d} fill="none" stroke={INK_BLUE} strokeWidth={5.5} strokeLinecap="round" />
              ))}
              {/* The gesture visibly opens (fork) and closes (rejoin), same dot language as every
                  branch anchor up the drawing. */}
              <circle cx={CX} cy={WEAVE_START_Y} r={4.5} fill={INK_BLUE} />
              {/* TODO(Daniel): the rejoin below the wordmark closes to a point with this dot, and
                  from some crops that pointed bud can read as a teardrop — the shape you asked to
                  retire. Sign off on it as the "closing the weave" gesture, or we can end the arms
                  in an open tuck (last crossing left open, no terminal dot) instead. */}
              <circle cx={CX} cy={WEAVE_END_Y} r={4.5} fill={INK_BLUE} />
              {/* One small leaf at each of the two crossings, at 0.7x — the only ornament the weave
                  gets, tying it back to the branch-connection language. */}
              {[WEAVE_START_Y + WEAVE_ZONE_H / 3, WEAVE_START_Y + (2 * WEAVE_ZONE_H) / 3].map((cy) => (
                <Leaf key={cy} base={[CX, cy - 16]} tip={[CX, cy + 16]} width={BRANCH_LEAF_WIDTH * 0.7} opacity={1} />
              ))}
            </g>

            {/* The wordmark, framed in the open space at the widest point of the weave: the header's
                own mark (eight Oculus circles, crisp and full colour) + "bower" in the header's mono
                face, both in INK_BLUE so the one-colour rule holds through the very last pixel. */}
            <g opacity={wordmarkOpacity}>
              <g transform={`translate(${CX - 57} ${WORDMARK_Y})`} stroke={INK_BLUE} strokeWidth={2.8 * markScale} fill="none" strokeLinecap="round">
                {MARK_CENTERS.map(([mx, my], i) => (
                  <circle key={i} cx={(mx - 50) * markScale} cy={(my - 50) * markScale} r={30 * markScale} />
                ))}
              </g>
              <text
                x={CX - 57 + 45 * markScale + LOCKUP_GAP}
                y={WORDMARK_Y + 11}
                textAnchor="start"
                className="font-mono lowercase"
                style={{ fontSize: 32, fontWeight: 600, letterSpacing: '0.1em', fill: INK_BLUE }}
              >
                bower
              </text>
              {/* The year moved out of the lockup: 2026 now gets the same heavy year-label
                  treatment as every other year, just above the weave fork. */}
            </g>

            {/* Payoff line. Retired the seed's "folded up and waiting" (a plan not yet happened) for a
                line that fits an already-built shelter. TODO(Daniel): sign-off on the exact wording. */}
            <text x={CX} y={PAYOFF_Y} textAnchor="middle" className="fill-inkBlack/55 font-serifDisplay" style={{ fontSize: 19, opacity: payoffOpacity }}>
              Everything above, grown into one place.
            </text>
          </svg>
        </div>
      </div>
    </div>
  );
}

/* --------------------------- plates and clusters -------------------------- */

/**
 * A small lanceolate leaf drawn along the axis from `base` (the stem side) to `tip` (the plate
 * side): a blade bulging to ±width/2 at 55% and tapering to the centerline at both ends, a straight
 * midrib, and two pairs of side veins angled toward the tip. A botanical accent, not a UI connector.
 * Used at the end of every branch edge, and (at 0.7x) at the two weave crossings.
 */
function Leaf({ base, tip, width, opacity }: { base: [number, number]; tip: [number, number]; width: number; opacity: number }) {
  const [bx, by] = base;
  const [tx, ty] = tip;
  const ax = tx - bx;
  const ay = ty - by;
  const len = Math.hypot(ax, ay) || 1;
  const ux = ax / len;
  const uy = ay / len; // axis unit
  const px = -uy;
  const py = ux; // perpendicular unit
  const peakX = bx + ax * 0.55;
  const peakY = by + ay * 0.55;
  // Control offset = width gives a quadratic bulge of width/2 at the peak (the spec's ±width/2).
  const outline =
    `M ${bx} ${by} Q ${peakX + px * width} ${peakY + py * width} ${tx} ${ty} ` +
    `Q ${peakX - px * width} ${peakY - py * width} ${bx} ${by} Z`;
  const veinLen = width * 0.45;
  const c = Math.cos(Math.PI / 6);
  const s = Math.sin(Math.PI / 6);
  const veins: string[] = [];
  for (const frac of [0.35, 0.65]) {
    const mx = bx + ax * frac;
    const my = by + ay * frac;
    // Each vein leaves the midrib tilted 30° toward the tip.
    veins.push(`M ${mx} ${my} L ${mx + (px * c + ux * s) * veinLen} ${my + (py * c + uy * s) * veinLen}`);
    veins.push(`M ${mx} ${my} L ${mx + (-px * c + ux * s) * veinLen} ${my + (-py * c + uy * s) * veinLen}`);
  }
  return (
    <g style={{ opacity }} pointerEvents="none">
      <path d={outline} fill={INK_BLUE} fillOpacity={0.04} stroke={INK_BLUE} strokeOpacity={0.5} strokeWidth={1} strokeLinejoin="round" />
      <path d={`M ${bx} ${by} L ${tx} ${ty}`} fill="none" stroke={INK_BLUE} strokeOpacity={0.5} strokeWidth={1} />
      {veins.map((d, i) => (
        <path key={i} d={d} fill="none" stroke={INK_BLUE} strokeOpacity={0.35} strokeWidth={1} strokeLinecap="round" />
      ))}
    </g>
  );
}

/** One inline video plate, drawn in SVG via a foreignObject so an HTML <video> can play in the
 *  panning viewBox. Reduced motion gets the poster still instead. Unchanged from v1. */
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

/** One plate: a still image (clipped, cover or contain) or a video, with a hairline border.
 *  Unchanged from v1. */
function PlateMedia({ plate, x, y, w, h, reduced }: { plate: Plate; x: number; y: number; w: number; h: number; reduced: boolean }) {
  const clip = `cptl-c-${plate.src.replace(/[^a-z0-9]/gi, '')}-${Math.round(x)}-${Math.round(y)}`;
  if (plate.pending) {
    return (
      <g>
        <rect x={x} y={y} width={w} height={h} fill={INK_BLUE} fillOpacity={0.04} stroke={INK_BLUE} strokeOpacity={0.3} strokeWidth={1} strokeDasharray="6 6" />
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
      <rect x={x} y={y} width={w} height={h} fill="none" stroke={INK_BLUE} strokeOpacity={0.25} strokeWidth={1} />
    </g>
  );
}

/**
 * The unfurl transform for a plate: opens from a lightly furled, foreshortened state to upright,
 * scaling about a pivot at the branch junction so it reads as a leaf opening. Rotation is held to a
 * whisper (2 degrees on the way in only, resting upright) — plates sit axis-upright, never fanned.
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
 * One cluster: the dot on the spine, then for each stacked plate a short branch edge forking from
 * that same shared spine point to the plate's inner edge, and the plate unfurling from it. The lead
 * plate (index 0) carries the hint title.
 */
function ClusterGroup({ cluster, cardLineY, reduced }: { cluster: LaidCluster; cardLineY: number; reduced: boolean }) {
  const { dir, spineX, anchorY, innerX, plates, hint } = cluster;
  const uStem = reduced ? 1 : clamp01((cardLineY - anchorY) / (UNFURL_SPAN * 0.4));

  return (
    <g>
      <circle cx={spineX} cy={anchorY} r={4.5} fill={INK_BLUE} opacity={uStem > 0 ? 1 : 0} />

      {plates.map((pl, i) => {
        // Meet the plate at the point on its inner edge NEAREST the shared spine anchor (clamped
        // within the plate). A plate straddling the anchor gets a level branch; a stacked sibling
        // below gets a short branch to its top-inner corner. Both siblings therefore fork from the
        // SAME anchor and the cluster reads as one small fork, never two branch points at different
        // heights (the NYC selfie edge used to depart the spine visibly below the door's).
        const inset = Math.min(24, pl.h * 0.16);
        const meetY = clamp(anchorY, pl.y + inset, pl.y + pl.h - inset);
        // The thin branch stroke now stops short of the plate; the last BRANCH_LEAF_LEN units are a
        // leaf blade instead of bare line, its tip touching the plate's inner edge.
        const leafBaseX = innerX - dir * BRANCH_LEAF_LEN;
        const branch = `M ${spineX} ${anchorY} C ${spineX + dir * BRANCH_BOW} ${lerp(anchorY, meetY, 0.45)}, ${leafBaseX - dir * 18} ${meetY}, ${leafBaseX} ${meetY}`;
        // The leaf buds in as the very last beat of the branch's own growth, right before the plate
        // unfurls — the branch produces the leaf, then the leaf holds the picture.
        const leafOpacity = reduced ? 1 : clamp01((uStem - 0.7) / 0.3);

        const u = reduced ? 1 : clamp01((cardLineY - pl.y - 10) / UNFURL_SPAN);
        const pivotX = dir === 1 ? pl.x : pl.x + pl.w; // inner corner nearest the spine
        const pivotY = pl.y + pl.h;
        const t = unfurl(u, pivotX, pivotY);
        if (t.opacity <= 0.001 && uStem <= 0.001) return null;

        return (
          <g key={i}>
            <path
              d={branch}
              fill="none"
              stroke={INK_BLUE}
              strokeOpacity={0.6}
              strokeWidth={3.2}
              strokeLinecap="round"
              pathLength={1}
              strokeDasharray={1}
              strokeDashoffset={reduced ? 0 : 1 - uStem}
            />
            {leafOpacity > 0.001 && (
              <Leaf base={[leafBaseX, meetY]} tip={[innerX, meetY]} width={BRANCH_LEAF_WIDTH} opacity={leafOpacity} />
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
