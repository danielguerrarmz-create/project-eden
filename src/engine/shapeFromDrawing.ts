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
  fairedRadius,
  footprintHull,
  isHole,
  planCentre,
  surfaceHeight,
  type SurfaceInput,
} from './surface';
import { bearingDeg } from './fromDrawing';
import type { ShapeField } from './geometry';

// The faired plan lives in surface.ts now — the SOFT surface is built on the
// same plan, and skin, preview mesh and baked net must agree on the boundary.
export { fairedRadius };

/**
 * Build the ShapeField for a drawing.
 *
 * NOTE the coordinate hop: the drawing works in plan metres about the drawn
 * centroid, while the generator builds about the world origin. Everything here
 * is re-centred so the two agree — a canopy built about the wrong centre would
 * root its feet in the right pattern in the wrong place, which is the sort of
 * bug that looks like "the engine ignored me" all over again.
 */

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
