/**
 * site.ts — the step BEFORE the drawing: where does this thing even go?
 *
 * The studio used to open on four sliders, which quietly assumes the hard part
 * is the object. It isn't. The hard part is that a garden is a real place with
 * a house on it, a fence, a tree you are not allowed to kill, and a council
 * that cares how close to the boundary you build. So the flow opens on a map:
 * pick your property, and the engine tells you what it found and where it
 * thinks this can land.
 *
 * DEMO SCOPE — this is deliberately not a GIS. The parcels below are authored,
 * not surveyed: a handful of plausible Austin lots in local metres, enough to
 * make the interaction real and the reasoning legible. Every number the UI
 * shows is COMPUTED from these polygons (area, setbacks, placement, clearance)
 * rather than typed in, so when a real parcel service lands the shape of the
 * code does not change — only where `AUSTIN_PARCELS` comes from.
 *
 * Pure. No React. Local metric plan coords: +x east, +y north, origin = lot SW.
 */
import type { Pt } from './fromDrawing';

export interface Parcel {
  id: string;
  /** What a listing would call it — flavour, and it makes the demo legible. */
  address: string;
  neighbourhood: string;
  /** Lot boundary, closed implicitly. */
  lot: Pt[];
  /** House footprint — the thing you cannot build on. */
  house: Pt[];
  /** Trees: protected in Austin above 19" diameter; the engine keeps clear. */
  trees: { at: Pt; canopyRadiusM: number; protected: boolean }[];
}

/** Austin rear-setback rule of thumb used for the demo (ft -> m, 10ft). */
export const REAR_SETBACK_M = 3.05;
/** Side setback (5ft). */
export const SIDE_SETBACK_M = 1.52;
/** Clear space we insist on around the canopy so you can walk round it. */
export const WALKAROUND_M = 0.6;

/**
 * Three authored Austin lots. Shapes differ on purpose so the analysis has
 * something to actually say: a deep classic lot, a wide shallow one where the
 * rear setback bites, and one dominated by a protected pecan.
 */
export const AUSTIN_PARCELS: Parcel[] = [
  {
    id: 'bouldin',
    address: '1408 Newton St',
    neighbourhood: 'Bouldin Creek',
    lot: [
      { x: 0, y: 0 },
      { x: 15.2, y: 0 },
      { x: 15.2, y: 41.1 },
      { x: 0, y: 41.1 },
    ],
    house: [
      { x: 2.4, y: 4.5 },
      { x: 12.8, y: 4.5 },
      { x: 12.8, y: 20.2 },
      { x: 2.4, y: 20.2 },
    ],
    trees: [{ at: { x: 12.1, y: 33.4 }, canopyRadiusM: 3.2, protected: true }],
  },
  {
    id: 'cherrywood',
    address: '3105 E 16th St',
    neighbourhood: 'Cherrywood',
    lot: [
      { x: 0, y: 0 },
      { x: 22.9, y: 0 },
      { x: 22.9, y: 27.4 },
      { x: 0, y: 27.4 },
    ],
    house: [
      { x: 3.0, y: 3.6 },
      { x: 19.5, y: 3.6 },
      { x: 19.5, y: 16.8 },
      { x: 3.0, y: 16.8 },
    ],
    trees: [],
  },
  {
    id: 'travis-heights',
    address: '905 Christopher St',
    neighbourhood: 'Travis Heights',
    lot: [
      { x: 0, y: 0 },
      { x: 18.3, y: 0 },
      { x: 18.3, y: 36.6 },
      { x: 0, y: 36.6 },
    ],
    house: [
      { x: 2.7, y: 5.0 },
      { x: 15.2, y: 5.0 },
      { x: 15.2, y: 19.8 },
      { x: 2.7, y: 19.8 },
    ],
    trees: [
      { at: { x: 6.0, y: 29.0 }, canopyRadiusM: 5.4, protected: true },
      { at: { x: 16.5, y: 24.0 }, canopyRadiusM: 2.1, protected: false },
    ],
  },
];

function bounds(pts: Pt[]) {
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  };
}

export interface SiteAnalysis {
  parcel: Parcel;
  /** The rear yard rectangle left after the house and the setbacks (plan m). */
  backyard: { minX: number; maxX: number; minY: number; maxY: number };
  backyardAreaM2: number;
  /** Where the engine thinks it goes, and how much clear radius it has there. */
  placement: Pt;
  placementRadiusM: number;
  /** Why it chose there — shown, because a silent recommendation is a demand. */
  reasons: string[];
  /** Blocked by something protected? Then say so rather than shrink silently. */
  warnings: string[];
}

/** Largest clear radius at `p`: distance to the nearest yard edge or tree canopy. */
function clearRadiusAt(
  p: Pt,
  yard: { minX: number; maxX: number; minY: number; maxY: number },
  parcel: Parcel,
): number {
  let r = Math.min(p.x - yard.minX, yard.maxX - p.x, p.y - yard.minY, yard.maxY - p.y);
  for (const t of parcel.trees) {
    const d = Math.hypot(t.at.x - p.x, t.at.y - p.y) - t.canopyRadiusM;
    r = Math.min(r, d);
  }
  return r;
}

/**
 * Analyse a parcel: carve the rear yard out of the lot, then find the point
 * with the largest clear radius by a coarse grid search (a poor man's
 * pole-of-inaccessibility — plenty for a rectangle with a few tree discs, and
 * honest about being approximate).
 */
export function analyseSite(parcel: Parcel): SiteAnalysis {
  const lotB = bounds(parcel.lot);
  const houseB = bounds(parcel.house);

  const backyard = {
    minX: lotB.minX + SIDE_SETBACK_M,
    maxX: lotB.maxX - SIDE_SETBACK_M,
    minY: houseB.maxY, // everything behind the house
    maxY: lotB.maxY - REAR_SETBACK_M,
  };

  const w = Math.max(0, backyard.maxX - backyard.minX);
  const h = Math.max(0, backyard.maxY - backyard.minY);
  const backyardAreaM2 = w * h;

  // Coarse grid search for the roomiest spot.
  let placement: Pt = { x: (backyard.minX + backyard.maxX) / 2, y: (backyard.minY + backyard.maxY) / 2 };
  let placementRadiusM = -Infinity;
  const STEPS = 40;
  for (let i = 0; i <= STEPS; i++) {
    for (let j = 0; j <= STEPS; j++) {
      const p = {
        x: backyard.minX + (w * i) / STEPS,
        y: backyard.minY + (h * j) / STEPS,
      };
      const r = clearRadiusAt(p, backyard, parcel);
      if (r > placementRadiusM) {
        placementRadiusM = r;
        placement = p;
      }
    }
  }

  const reasons: string[] = [];
  const warnings: string[] = [];

  reasons.push(
    `Rear yard is ${w.toFixed(1)} × ${h.toFixed(1)} m (${backyardAreaM2.toFixed(0)} m²) once the house, a ${SIDE_SETBACK_M.toFixed(2)} m side setback and a ${REAR_SETBACK_M.toFixed(2)} m rear setback are taken out.`,
  );
  reasons.push(
    `Roomiest spot is ${placementRadiusM.toFixed(1)} m clear in every direction, ${(placement.y - bounds(parcel.house).maxY).toFixed(1)} m behind the house.`,
  );

  const protectedTrees = parcel.trees.filter((t) => t.protected);
  if (protectedTrees.length > 0) {
    reasons.push(
      `${protectedTrees.length} protected ${protectedTrees.length === 1 ? 'tree' : 'trees'} kept clear — Austin protects anything over 19" diameter, and the canopy stays outside the drip line.`,
    );
  }

  // An Eden needs roughly a 2.2 m clear radius at the smallest footprint.
  if (placementRadiusM < 2.2) {
    warnings.push(
      `The roomiest spot is only ${placementRadiusM.toFixed(1)} m clear. The smallest Eden in the validated family needs about 2.2 m. This yard may not take one without moving something.`,
    );
  }

  return { parcel, backyard, backyardAreaM2, placement, placementRadiusM, reasons, warnings };
}

/** The largest footprint that actually fits the clear radius found on site. */
export function maxFootprintForRadius(radiusM: number): number {
  // Plan is an ellipse of aspect 1.25; radius bounds the major half-span.
  const major = Math.max(0, radiusM);
  const minor = major / 1.25;
  return Math.PI * major * minor;
}
