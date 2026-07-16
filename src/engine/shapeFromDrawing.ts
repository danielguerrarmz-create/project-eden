/**
 * shapeFromDrawing.ts — hand the drawing to the generator.
 *
 * The one adapter between "what somebody sculpted" and "what the engine
 * builds". Before it existed, drawing set a footprint number and nothing else:
 * the generator spread feet evenly around an ellipse and raised its own
 * analytic dome, so your lines were decoration on top of a generic object. This
 * makes them the input they looked like.
 *
 *   feet    -> the bearings you drew (deduped once snapped to the net)
 *   plan    -> the hull your lines enclose, ray-cast per bearing
 *   height  -> the sculpted surface, lifts and all
 *   holes   -> excavations, which the generator removes members for
 *
 * Pure. The generator still owns all the geometry; this only answers its
 * questions from the drawing instead of from the grammar.
 */
import {
  footprintHull,
  hullRadiusAtM,
  isHole,
  planCentre,
  surfaceHeight,
  type SurfaceInput,
} from './surface';
import { bearingDeg } from './fromDrawing';
import type { ShapeField } from './geometry';

/**
 * Build the ShapeField for a drawing.
 *
 * NOTE the coordinate hop: the drawing works in plan metres about the drawn
 * centroid, while the generator builds about the world origin. Everything here
 * is re-centred so the two agree — a canopy built about the wrong centre would
 * root its feet in the right pattern in the wrong place, which is the sort of
 * bug that looks like "the engine ignored me" all over again.
 */
/**
 * Angular half-width used to FAIR the plan. See below for why this exists.
 */
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
 */
export function fairedRadius(hull: ReturnType<typeof footprintHull>, centre: { x: number; y: number }) {
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

export function shapeFromDrawing(input: SurfaceInput): ShapeField {
  const { arcs } = input;
  if (arcs.length < 2) return {};

  const centre = planCentre(arcs);
  const toWorld = (x: number, z: number) => ({ x: x + centre.x, y: z + centre.y });
  const hull = footprintHull(arcs);

  const footBearingsDeg = arcs
    .flatMap((a) => [a.a, a.b])
    .map((p) => bearingDeg(centre, p));

  return {
    footBearingsDeg,

    planRadiusAtM: fairedRadius(hull, centre),

    heightAtM: (x, z) => surfaceHeight(input, toWorld(x, z)),

    isHoleAt: (x, z) => isHole(input, toWorld(x, z)),
  };
}
