/**
 * surface.ts — the soft thing between drawing and building.
 *
 * WHY THIS EXISTS. Two arcs used to bake straight into a manufacturable
 * gridshell, which meant the interesting part — making — lasted about four
 * seconds. Baking is the LAST move, not the second. Between the first line and
 * the cut list there has to be something you can keep working: a surface that
 * appears from the lines, swells between them, and takes more lines, lifts and
 * holes without ever once asking for a number.
 *
 * THE MODEL. Every arc is a tent over its own chord: height follows the arch
 * along the chord and falls off to either side. The surface is those tents
 * BLENDED, not unioned — a p-norm (not a max) so that where two arcs are near
 * each other the surface swells above both instead of creasing along the seam.
 * That swell is the whole point: it is what makes two lines read as one vault
 * rather than two ribs, and it is why you can draw a third line and watch the
 * thing grow toward it.
 *
 * Then edits, in the same language: a LIFT is a smooth bump added to the field,
 * a HOLE is a region removed from it. Both are 2D gestures — a point and a
 * radius — evaluated over a 3D surface. That hybrid is deliberate: people can
 * reason about "here, this big" on a picture, and cannot reason about a
 * trivariate control lattice.
 *
 * Everything here is a pure height field over the plan: f(x,y) -> height, plus
 * a mask. No three.js, no React. The mesh is somebody else's problem.
 */
import { GRAMMAR } from '../data/config';
import { convexHull, type Pt, type Spine } from './fromDrawing';

/** One sculpt edit. Both are "a place and a size" — nothing to type. */
export interface Edit {
  kind: 'lift' | 'hole';
  at: Pt;
  radiusM: number;
  /** Lift only: metres added at the centre. Holes don't need one. */
  amountM?: number;
}

export interface SurfaceInput {
  arcs: Spine[];
  edits: Edit[];
}

/** Rise of a drawn arc — shared with the drawn ribbon so they agree exactly. */
export function arcRiseM(span: number): number {
  return Math.min(GRAMMAR.pdHeightCapM, Math.max(1.2, span * 0.42));
}

/**
 * How far to either side of its chord an arc's tent reaches. Scales with span
 * so a long arc makes a broad vault and a short one makes a tight hoop.
 */
export function arcReachM(span: number): number {
  return Math.max(0.9, span * 0.5);
}

/**
 * Where p sits relative to one arc: the arc's own height at the nearest
 * station along its chord, and how far off the chord p is.
 *
 * `ribHeight` is the height of the ARC ITSELF there — not a decayed version of
 * it. That distinction is the whole model: the skin interpolates the ribs, so
 * on a rib it equals the rib.
 */
export function nearestOnArc(arc: Spine, p: Pt): { ribHeight: number; distM: number } {
  const dx = arc.b.x - arc.a.x;
  const dy = arc.b.y - arc.a.y;
  const span = Math.hypot(dx, dy);
  if (span < 1e-6) return { ribHeight: 0, distM: Math.hypot(p.x - arc.a.x, p.y - arc.a.y) };

  const t = ((p.x - arc.a.x) * dx + (p.y - arc.a.y) * dy) / (span * span);
  const tc = Math.min(1, Math.max(0, t));
  const cx = arc.a.x + dx * tc;
  const cy = arc.a.y + dy * tc;

  // sin^0.82 springs at the feet and flattens at the crown — reads as built
  // rather than as a plotted parabola. Identical to the drawn ribbon's curve.
  const ribHeight = Math.sin(tc * Math.PI) ** 0.82 * arcRiseM(span);
  return { ribHeight, distM: Math.hypot(p.x - cx, p.y - cy) };
}

/** Kept for the tent's original meaning: rib height decayed by the skirt. */
export function tentHeight(arc: Spine, p: Pt): number {
  const { ribHeight, distM } = nearestOnArc(arc, p);
  const span = Math.hypot(arc.b.x - arc.a.x, arc.b.y - arc.a.y);
  const reach = arcReachM(span);
  if (distM >= reach) return 0;
  const u = distM / reach;
  return ribHeight * (1 - u * u) ** 1.4;
}

/** The plan the drawing claims: the hull through the feet of every arc. */
export function footprintHull(arcs: Spine[]): Pt[] {
  return convexHull(arcs.flatMap((a) => [a.a, a.b]));
}

/**
 * Distance from p to the inside of a convex hull. Positive inside, negative
 * outside, in metres. Degenerate hulls (< 3 points) fall back to the distance
 * from the segment/point itself, negated, so a single line still behaves.
 */
export function insideHullM(hull: Pt[], p: Pt): number {
  if (hull.length < 3) {
    if (hull.length === 0) return -Infinity;
    let best = Infinity;
    for (const q of hull) best = Math.min(best, Math.hypot(p.x - q.x, p.y - q.y));
    return -best;
  }
  let best = Infinity;
  for (let i = 0; i < hull.length; i++) {
    const a = hull[i];
    const b = hull[(i + 1) % hull.length];
    const ex = b.x - a.x;
    const ey = b.y - a.y;
    const len = Math.hypot(ex, ey) || 1e-9;
    // Left of every edge = inside, for a CCW hull. Signed distance to the line.
    const s = ((p.x - a.x) * ey - (p.y - a.y) * ex) / len;
    best = Math.min(best, -s);
  }
  return best;
}

/** How far in from the hull edge the skin has come fully down to the lawn. */
const EDGE_MARGIN_M = 0.35;

/**
 * The surface height at p — a VAULT over the plan your lines claim.
 *
 * Three parts:
 *   1. Shepard interpolation of the ribs' heights (inverse-square weights). On
 *      a rib the weight blows up and the skin equals that rib exactly; between
 *      ribs it's their weighted average, so the skin sags in the spans.
 *   2. The FOOTPRINT is the hull through the feet, and the skin drops to the
 *      lawn at that boundary.
 *   3. Everything outside is simply lawn.
 *
 * Two earlier versions were wrong in instructive ways. A p-norm blend of tents
 * lifted the surface ABOVE every arc and buried the lines you drew inside a
 * mound — you made a mark and it vanished. Decaying from each rib instead fixed
 * that but spread the skin metres past your feet, so the thing read as a sand
 * dune and claimed 54 m² when you'd drawn a 15 m² pavilion. Anchoring the skirt
 * to the hull instead of to the ribs is what makes it read as a canopy: it
 * stands on the feet you drew, and the area it reports is the area the engine
 * will price, because both are that same hull.
 */
export function surfaceHeight(input: SurfaceInput, p: Pt): number {
  let h = 0;
  if (input.arcs.length > 0) {
    let wsum = 0;
    let hw = 0;
    for (const arc of input.arcs) {
      const { ribHeight, distM } = nearestOnArc(arc, p);
      const w = 1 / (distM * distM + 1e-4);
      wsum += w;
      hw += w * ribHeight;
    }
    const shepard = wsum > 0 ? hw / wsum : 0;

    const hull = footprintHull(input.arcs);
    const inside = insideHullM(hull, p);
    // Off the plan entirely: lawn. Near the edge: easing down onto it.
    const edge = Math.max(0, Math.min(1, inside / EDGE_MARGIN_M));
    h = shepard * edge * edge * (3 - 2 * edge); // smoothstep, no crease at the eave
  }

  // Lifts: a smooth bump. Excavation is a mask, not a dent — see isHole.
  for (const e of input.edits) {
    if (e.kind !== 'lift') continue;
    const d = Math.hypot(p.x - e.at.x, p.y - e.at.y);
    if (d >= e.radiusM) continue;
    const u = d / e.radiusM;
    h += (e.amountM ?? 0) * (1 - u * u) ** 2;
  }

  // The planning cap is a real wall, not a suggestion: above it this stops
  // being a delivery and starts being an application.
  return Math.min(GRAMMAR.pdHeightCapM, Math.max(0, h));
}

/** Is p excavated away? Holes are removed, not dented — you see through them. */
export function isHole(input: SurfaceInput, p: Pt): boolean {
  for (const e of input.edits) {
    if (e.kind !== 'hole') continue;
    if (Math.hypot(p.x - e.at.x, p.y - e.at.y) < e.radiusM) return true;
  }
  return false;
}

/** Plan extent the surface occupies: the feet, plus a hair for the eave. */
export function surfaceBounds(input: SurfaceInput): {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
} {
  if (input.arcs.length === 0) return { minX: -1, maxX: 1, minY: -1, maxY: 1 };
  const pad = 0.25;
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const arc of input.arcs) {
    for (const p of [arc.a, arc.b]) {
      minX = Math.min(minX, p.x - pad);
      maxX = Math.max(maxX, p.x + pad);
      minY = Math.min(minY, p.y - pad);
      maxY = Math.max(maxY, p.y + pad);
    }
  }
  return { minX, maxX, minY, maxY };
}

/** Highest point on the surface — what the readout calls "tall". */
export function surfacePeakM(input: SurfaceInput, samples = 48): number {
  const b = surfaceBounds(input);
  let peak = 0;
  for (let i = 0; i <= samples; i++) {
    for (let j = 0; j <= samples; j++) {
      const p = {
        x: b.minX + ((b.maxX - b.minX) * i) / samples,
        y: b.minY + ((b.maxY - b.minY) * j) / samples,
      };
      if (isHole(input, p)) continue;
      const h = surfaceHeight(input, p);
      if (h > peak) peak = h;
    }
  }
  return peak;
}

/**
 * Ground area the surface actually covers (holes removed), by sampling.
 * This is what the drawing "encloses", and what the engine prices — so it has
 * to account for what you excavated, or the number lies about the object.
 */
export function surfaceAreaM2(input: SurfaceInput, samples = 64): number {
  if (input.arcs.length === 0) return 0;
  const b = surfaceBounds(input);
  const cellW = (b.maxX - b.minX) / samples;
  const cellH = (b.maxY - b.minY) / samples;
  const cell = cellW * cellH;
  let area = 0;
  for (let i = 0; i < samples; i++) {
    for (let j = 0; j < samples; j++) {
      const p = { x: b.minX + cellW * (i + 0.5), y: b.minY + cellH * (j + 0.5) };
      if (isHole(input, p)) continue;
      if (surfaceHeight(input, p) > 0.08) area += cell;
    }
  }
  return area;
}
