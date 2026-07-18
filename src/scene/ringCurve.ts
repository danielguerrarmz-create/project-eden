/**
 * ringCurve.ts — sample the TRUE plan ellipse a ring member is a chord of.
 *
 * The eave and crown blanks are physically curved pieces cut from sheet stock
 * (`GRAMMAR.eaveBlanksPerFootSpan`, and jointGeometry's own "faceted
 * representation of a curved piece" comment), but the renderer draws each as a
 * straight chord between adjacent nodes, so the ring reads as a polygon of
 * sticks. Bowing the intermediate cross-sections out toward the true ellipse is
 * not a stylistic invention — it corrects a render approximation toward the
 * fabrication truth the config already states (spec D4).
 *
 * The bow is derived from real plan geometry — the plan centre and the semi-axes
 * `planA`/`planB` already on `outputs.geometry` — not an invented sag fraction.
 * Both endpoints are preserved exactly (the joints do not move); only the middle
 * bulges. Pure Vec3 math, no three.js, so the "midpoint bows outward, ends stay
 * put" property is testable.
 */
import type { Vec3 } from '../engine/types';

/**
 * A point at parameter `t` (0..1) along the elliptical arc between `start` and
 * `end`, on a plan ellipse of semi-axes `planA` (x) and `planB` (z) centred at
 * the origin. Height `y` is interpolated linearly along the chord; the bow is
 * horizontal, which is where the "polygon of straight sticks" reads.
 *
 * Method: map the plan into a unit circle by dividing x by planA and z by planB;
 * in that circle the two endpoints have an angle and radius, so interpolate BOTH
 * along the shorter arc and map back. At t=0 and t=1 this returns the endpoints
 * exactly, so the mitres at the nodes are untouched.
 */
export function ellipseArcPoint(
  start: Vec3,
  end: Vec3,
  t: number,
  planA: number,
  planB: number,
): Vec3 {
  const a = Math.max(planA, 1e-6);
  const b = Math.max(planB, 1e-6);
  const sx = start[0] / a;
  const sz = start[2] / b;
  const ex = end[0] / a;
  const ez = end[2] / b;

  const angS = Math.atan2(sz, sx);
  const angE = Math.atan2(ez, ex);
  const radS = Math.hypot(sx, sz);
  const radE = Math.hypot(ex, ez);

  // Shortest signed arc from start to end.
  let d = angE - angS;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;

  const ang = angS + d * t;
  const rad = radS + (radE - radS) * t;
  const x = Math.cos(ang) * rad * a;
  const z = Math.sin(ang) * rad * b;
  const y = start[1] + (end[1] - start[1]) * t;
  return [x, y, z];
}
