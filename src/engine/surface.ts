/**
 * surface.ts — the soft thing between drawing and building.
 *
 * WHY THIS EXISTS. Two arcs used to bake straight into a manufacturable
 * gridshell, which meant the interesting part — making — lasted about four
 * seconds. Baking is the LAST move, not the second. Between the first line and
 * the cut list there has to be something you can keep working: a surface that
 * appears from the lines and takes more lines, lifts and holes without ever
 * once asking for a number.
 *
 * THE MODEL: the arcs are the GESTURE, not the ribs. Your lines answer the
 * questions only you can answer — where it lands (the feet), how much ground
 * it claims (the plan), how high it goes (the tallest line). The engine then
 * raises ITS OWN canopy over that plan, with the same rules the built thing
 * obeys (geometry.ts): the eave stays UP between the legs and lifts toward
 * the opening; the surface dives to the lawn only AT the feet. One rule, two
 * resolutions — the soft skin and the baked lattice are the same surface, so
 * bake is a resolution rather than a jump-cut.
 *
 * An earlier model treated the drawn arcs as literal ribs and interpolated
 * them (Shepard). It was faithful and it was wrong: a rib is at zero near its
 * own foot, and the hull edges run BETWEEN feet, so the boundary dove to the
 * lawn all the way round and the thing read as a tent with steep walls. It
 * threw away the eave and the open sides — the two things that make an Eden
 * an Eden — and only a render caught it.
 *
 * Then edits, in the same language: a LIFT is a smooth bump added to the
 * field, a HOLE is a region removed from it. Both are 2D gestures — a point
 * and a radius — evaluated over a 3D surface. That hybrid is deliberate:
 * people can reason about "here, this big" on a picture, and cannot reason
 * about a trivariate control lattice.
 *
 * Everything here is a pure height field over the plan: f(x,y) -> height,
 * plus a mask. No three.js, no React. The mesh is somebody else's problem.
 */
import { GRAMMAR } from '../data/config';
import {
  apertureFromFeet,
  arcRiseM,
  bearingDeg,
  convexHull,
  type Pt,
  type Spine,
} from './fromDrawing';
import { capProfile, eaveHeightAtM, footPullAt } from './geometry';

export { arcRiseM };

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

/**
 * How far to either side of its chord a drawn arc's ribbon-tent reaches.
 * Scales with span so a long arc reads broad and a short one reads tight.
 */
export function arcReachM(span: number): number {
  return Math.max(0.9, span * 0.5);
}

/**
 * Where p sits relative to one arc: the arc's own height at the nearest
 * station along its chord, and how far off the chord p is.
 *
 * This describes the DRAWN LINE itself (the ribbon you see standing on the
 * lawn), not the canopy — under the gesture model the skin no longer
 * interpolates the arcs, but the arcs still render, and their curve and the
 * ribbon's must be one function.
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

/** One arc as a tent over its own chord: its height decayed by the skirt. */
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
 * Centre of the plan — the placement the net is built about.
 */
export function planCentre(arcs: Spine[]): Pt {
  const pts = arcs.flatMap((a) => [a.a, a.b]);
  if (pts.length === 0) return { x: 0, y: 0 };
  let x = 0;
  let y = 0;
  for (const p of pts) {
    x += p.x;
    y += p.y;
  }
  return { x: x / pts.length, y: y / pts.length };
}

/**
 * Distance from `centre` out to the hull boundary along a compass bearing.
 *
 * This is what lets the net FILL THE DRAWN PLAN instead of an ellipse the
 * grammar invented. The engine's polar net asks "how far out does the canopy
 * go at this bearing" — for a drawn design the answer is "as far as your lines
 * did", and that is this function.
 */
export function hullRadiusAtM(hull: Pt[], centre: Pt, bearingRad: number): number {
  if (hull.length < 3) return 0;
  // Engine bearing convention: 0 = north = +y, 90 = east = +x.
  const dx = Math.sin(bearingRad);
  const dy = Math.cos(bearingRad);
  let best = Infinity;
  for (let i = 0; i < hull.length; i++) {
    const a = hull[i];
    const b = hull[(i + 1) % hull.length];
    const ex = b.x - a.x;
    const ey = b.y - a.y;
    // Solve centre + t*d = a + u*e for t, with 0<=u<=1.
    const den = dx * ey - dy * ex;
    if (Math.abs(den) < 1e-12) continue;
    const t = ((a.x - centre.x) * ey - (a.y - centre.y) * ex) / den;
    const u = ((a.x - centre.x) * dy - (a.y - centre.y) * dx) / den;
    if (t > 1e-9 && u >= -1e-9 && u <= 1 + 1e-9) best = Math.min(best, t);
  }
  return Number.isFinite(best) ? best : 0;
}

/** Angular half-width / tap count used to FAIR the plan. See fairedRadius. */
const FAIRING_RAD = 0.42;
const FAIRING_TAPS = 9;

/**
 * The plan radius, faired.
 *
 * The raw hull is a polygon, and a polar net laid straight onto a polygon is
 * unbuildable at the corners: the radius jumps between adjacent spokes, so bays
 * next to a vertex collapse to centimetres. Those members come out SHORTER THAN
 * THEIR OWN END CUTS — the first version of this produced a piece of length
 * -0.20 m, which is the engine cheerfully quoting for a strut that cannot exist.
 *
 * So the plan is smoothed with a cosine kernel over bearing. The feet stay put
 * (a foot's own bearing still returns its own distance, near enough) but the
 * boundary between them becomes a fair curve instead of a chord with a kink.
 * That is both the buildable answer and the honest one: an Eden's plan is a
 * fair closed curve, not a polygon, and pretending otherwise would ship a
 * cut list nobody can cut.
 *
 * Lives here (not in the adapter) because the SOFT surface uses the same plan:
 * the skin, the preview mesh and the baked net must all agree on the boundary.
 */
export function fairedRadius(hull: Pt[], centre: Pt) {
  return (bearingRad: number): number => {
    let sum = 0;
    let wsum = 0;
    for (let k = -FAIRING_TAPS; k <= FAIRING_TAPS; k++) {
      const t = (k / FAIRING_TAPS) * FAIRING_RAD;
      const w = 0.5 * (1 + Math.cos((Math.PI * k) / (FAIRING_TAPS + 1)));
      const r = hullRadiusAtM(hull, centre, bearingRad + t);
      if (r > 0) {
        sum += w * r;
        wsum += w;
      }
    }
    return wsum > 0 ? sum / wsum : 0;
  };
}

const DEG = Math.PI / 180;

/** Everything the canopy needs, read once from the arcs. */
interface CanopyCtx {
  centre: Pt;
  radiusAt: (bearingRad: number) => number;
  footRad: number[];
  /** Crown height: the tallest drawn line, held to headroom and the cap. */
  H: number;
  apertureRad: number;
}

/**
 * Read the drawing's canopy: feet, plan and height from the lines; everything
 * else from the engine's own rules. Null until two lines enclose a plan —
 * one line makes no surface; a rib is not a vault.
 */
function canopyCtx(arcs: Spine[]): CanopyCtx | null {
  if (arcs.length < 2) return null;
  const centre = planCentre(arcs);
  const hull = footprintHull(arcs);
  if (hull.length < 3) return null;

  const footDeg = arcs.flatMap((a) => [a.a, a.b]).map((p) => bearingDeg(centre, p));
  const spans = arcs.map((a) => Math.hypot(a.b.x - a.a.x, a.b.y - a.a.y));
  // The tallest line sets the crown — held to the same bounds readDrawing
  // holds riseM to, so the soft thing and the baked params agree on "tall".
  const H = Math.min(
    GRAMMAR.pdHeightCapM,
    Math.max(GRAMMAR.minHeadroomM, Math.max(...spans.map(arcRiseM))),
  );

  return {
    centre,
    radiusAt: fairedRadius(hull, centre),
    footRad: footDeg.map((d) => d * DEG),
    H,
    apertureRad: apertureFromFeet(footDeg) * DEG,
  };
}

/**
 * The surface height at p — the ENGINE'S canopy over the plan your lines claim.
 *
 * Same construction as geometry.ts's analytic cap, evaluated over the drawn
 * plan: eave height at the bearing, cap profile toward the crown, foot pull
 * diving the edge to the lawn at each drawn foot. On the boundary between two
 * feet the surface stays UP — that lifted free edge IS the eave, and it is
 * the difference between a canopy and a tent.
 *
 * Outside the faired plan is lawn. The plan is the FAIRED radius — the same
 * one the preview mesh and the baked net use — not the raw hull polygon, so
 * all three agree on where the thing ends.
 */
export function surfaceHeight(input: SurfaceInput, p: Pt): number {
  const ctx = canopyCtx(input.arcs);
  if (!ctx) return 0;

  const dx = p.x - ctx.centre.x;
  const dy = p.y - ctx.centre.y;
  // Bearing convention: 0 = north = +y, 90 = east = +x.
  const thetaRad = Math.atan2(dx, dy);
  const R = ctx.radiusAt(thetaRad);
  if (R <= 1e-9) return 0;
  // The boundary tolerance is not fussiness: the preview mesh puts its last
  // ring EXACTLY at r=1, and without it float noise flips boundary vertices
  // between eave and lawn — the edge renders as a row of torn teeth.
  const rRaw = Math.hypot(dx, dy) / R;
  if (rRaw > 1 + 1e-6) return 0; // off the plan: lawn
  const r = Math.min(1, rRaw);

  const E = eaveHeightAtM(ctx.H, ctx.apertureRad, thetaRad);
  let h = E + (ctx.H - E) * capProfile(r);
  h *= 1 - footPullAt(ctx.footRad, thetaRad) * Math.pow(r, 5);

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
