/**
 * directManip.ts — the PURE drag->params fitting layer for direct manipulation.
 *
 * Direct manipulation replaces the four sliders with a control cage: the user
 * drags handles in 3D and the pavilion recomputes live. The whole point is
 * escaping parametric sliders WITHOUT escaping buildability, so every gesture is
 * routed back through the SAME engine the sliders drove:
 *
 *   drag handle -> proposeFromDrag(kind, worldPoint) -> Partial<DesignParams>
 *               -> store.setParam -> runEngine -> clampParams (the grammar)
 *               -> clamped geometry -> handleAnchors() re-positions the handle.
 *
 * Handles are CONTROLLED: their positions come from the clamped design every
 * frame (handleAnchors). A drag that proposes a value outside the fabrication
 * grammar is clamped by the engine, and the handle visibly sticks at the limit.
 * The gesture cannot produce an unbuildable shape — it is literally the slider
 * path with a spatial input. Nothing here touches React or three.js.
 *
 * Param coverage: three of the four shaping params are spatial and map to a cage
 * handle. footprintM2 = radial drag on the major (X) axis; riseM = vertical drag
 * of the crown apex; apertureDeg = azimuthal drag around the eave. strutSpacingM
 * is lattice DENSITY, not a dimension you can grab, so it stays a small non-cage
 * control (see the plan doc for the path to a "grain" gesture).
 */
import { GRAMMAR } from '../data/config';
import { planDims } from './grammar';
import { surfacePoint } from './geometry';
import type { DesignParams, Vec3 } from './types';

const ASPECT = GRAMMAR.planAspect;

/** The four cage handles. Two footprint grabs (opposite ends of the major axis). */
export type HandleKind = 'footprintEast' | 'footprintWest' | 'rise' | 'aperture';

/** All draggable handle kinds, in a stable order. */
export const HANDLE_KINDS: readonly HandleKind[] = [
  'rise',
  'footprintEast',
  'footprintWest',
  'aperture',
] as const;

/** Which store param a handle drives (for setParam + the readout). */
export const HANDLE_PARAM: Record<HandleKind, keyof DesignParams> = {
  footprintEast: 'footprintM2',
  footprintWest: 'footprintM2',
  rise: 'riseM',
  aperture: 'apertureDeg',
};

/** Major semi-axis (m) of the plan ellipse — the X-extent — for a footprint. */
export function majorSemiAxisM(footprintM2: number): number {
  return planDims(footprintM2).a;
}

/**
 * Inverse of majorSemiAxisM: the footprint (m²) whose major semi-axis is `aM`.
 * planDims: a = sqrt(footprint · aspect / π)  =>  footprint = π · a² / aspect.
 */
export function footprintFromMajorAxisM(aM: number): number {
  return (Math.PI * aM * aM) / ASPECT;
}

/**
 * Aperture bearing (deg) for a plan point (x, z), in the engine's convention:
 * 0 = north = +Z, 90 = east = +X (matches geometry.ts / sunpath.ts). Only the
 * angle is used, so the drag radius is irrelevant.
 */
export function apertureFromPlanXZ(x: number, z: number): number {
  return (((Math.atan2(x, z) * 180) / Math.PI) % 360 + 360) % 360;
}

/** u-parameter (0..1 around the plan from north) for a compass bearing (deg). */
function uForBearing(bearingDeg: number): number {
  return ((((bearingDeg % 360) + 360) % 360) / 360) % 1;
}

/**
 * World anchor positions for every handle, for the CURRENT clamped design.
 * The footprint + aperture handles ride the real eave surface (surfacePoint at
 * v=0); the rise handle floats at the crown apex (0, riseM, 0).
 */
export function handleAnchors(params: DesignParams): Record<HandleKind, Vec3> {
  return {
    footprintEast: surfacePoint(params, 0.25, 0).point, // bearing 90 (+X)
    footprintWest: surfacePoint(params, 0.75, 0).point, // bearing 270 (-X)
    aperture: surfacePoint(params, uForBearing(params.apertureDeg), 0).point,
    rise: [0, params.riseM, 0],
  };
}

/**
 * Map a dragged world point for a handle to a proposed (UNCLAMPED) param patch.
 * The engine clamps it — this only proposes. Returns a single-key patch.
 */
export function proposeFromDrag(kind: HandleKind, point: Vec3): Partial<DesignParams> {
  switch (kind) {
    case 'footprintEast':
    case 'footprintWest':
      // Radial drag on the major axis: |x| is the proposed semi-axis a.
      return { footprintM2: footprintFromMajorAxisM(Math.abs(point[0])) };
    case 'rise':
      return { riseM: point[1] };
    case 'aperture':
      return { apertureDeg: apertureFromPlanXZ(point[0], point[2]) };
  }
}
