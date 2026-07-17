import { describe, it, expect } from 'vitest';
import type { Vec3 } from '../../engine/types';
import {
  boxOfPoints,
  boxCentre,
  boxCorners,
  fitCamera,
  fitDistanceM,
  normalise,
  type Box,
} from './framing';

/**
 * Project a box's corners from a camera at `target + dir*d` and report the
 * worst fraction of the half-frame any corner reaches. 1.0 means "exactly
 * touching the frame edge", >1 means "off screen".
 *
 * This is the honest test of a fit: not "is the number close to one I guessed"
 * but "does the object actually land inside the picture". Written independently
 * of fitDistanceM's own algebra so it can disagree with it.
 */
function worstFrameFraction(
  points: readonly Vec3[],
  target: Vec3,
  dir: Vec3,
  d: number,
  vFovRad: number,
  aspect: number,
): { h: number; v: number } {
  const f = normalise(dir);
  const rx = normalise([f[2], 0, -f[0]]); // horizontal right, perpendicular to f
  const u: Vec3 = normalise([
    f[1] * rx[2] - f[2] * rx[1],
    f[2] * rx[0] - f[0] * rx[2],
    f[0] * rx[1] - f[1] * rx[0],
  ]);
  const eye: Vec3 = [target[0] + f[0] * d, target[1] + f[1] * d, target[2] + f[2] * d];
  const tanV = Math.tan(vFovRad / 2);
  const tanH = tanV * aspect;
  let h = 0;
  let v = 0;
  for (const c of points) {
    const p: Vec3 = [c[0] - eye[0], c[1] - eye[1], c[2] - eye[2]];
    const depth = -(p[0] * f[0] + p[1] * f[1] + p[2] * f[2]);
    if (depth <= 1e-6) return { h: Infinity, v: Infinity }; // behind the camera
    const sx = Math.abs(p[0] * rx[0] + p[1] * rx[1] + p[2] * rx[2]) / (tanH * depth);
    const sy = Math.abs(p[0] * u[0] + p[1] * u[1] + p[2] * u[2]) / (tanV * depth);
    h = Math.max(h, sx);
    v = Math.max(v, sy);
  }
  return { h, v };
}

const V_FOV = (42 * Math.PI) / 180;
const ASPECT = 1414 / 790; // the real #/draw canvas at 1440x900

describe('boxOfPoints', () => {
  it('bounds every point it is given', () => {
    const pts: Vec3[] = [
      [1, 2, 3],
      [-4, 0, 2],
      [0, 5, -1],
    ];
    const b = boxOfPoints(pts);
    expect(b.min).toEqual([-4, 0, -1]);
    expect(b.max).toEqual([1, 5, 3]);
    // Probe guard: eight corners, or the loop above measured nothing.
    expect(boxCorners(b)).toHaveLength(8);
  });

  it('centres a box on its own middle', () => {
    expect(boxCentre({ min: [-2, 0, -2], max: [2, 4, 2] })).toEqual([0, 2, 0]);
  });
});

describe('fitDistanceM', () => {
  it('puts a symmetric cube exactly at the frame edge with no margin', () => {
    // A 2x2x2 cube at the origin, seen down +Z through a 90 deg vertical fov at
    // aspect 1: the near face is at z=1, and a corner at x=1 needs tan(45)*depth
    // >= 1, so depth >= 1 and the camera sits at 2. Closed form, no tolerance
    // games: this pins the algebra itself.
    const box: Box = { min: [-1, -1, -1], max: [1, 1, 1] };
    const d = fitDistanceM(boxCorners(box), [0, 0, 0], [0, 0, 1], Math.PI / 2, 1, 1);
    expect(d).toBeCloseTo(2, 10);
  });

  it('actually lands the object inside the picture', () => {
    // The claim a fit makes is not about a number, it is about the render.
    const box: Box = { min: [-2.6, 0, -2.2], max: [2.6, 2.5, 2.2] };
    const target = boxCentre(box);
    const dir = normalise([5.6, 2.6, 6.6]);
    const d = fitDistanceM(boxCorners(box), target, dir, V_FOV, ASPECT, 1.06);
    const { h, v } = worstFrameFraction(boxCorners(box), target, dir, d, V_FOV, ASPECT);
    expect(h).toBeLessThanOrEqual(1);
    expect(v).toBeLessThanOrEqual(1);
  });

  it('fills one axis to the margin and no further', () => {
    // A fit that lands the object inside the frame is easy: stand a mile away.
    // The point is that it is TIGHT, so one axis must be pressed right up
    // against the margin. Without this, the previous test passes at any
    // distance and the whole feature can silently do nothing.
    const box: Box = { min: [-2.6, 0, -2.2], max: [2.6, 2.5, 2.2] };
    const target = boxCentre(box);
    const dir = normalise([5.6, 2.6, 6.6]);
    const margin = 1.06;
    const d = fitDistanceM(boxCorners(box), target, dir, V_FOV, ASPECT, margin);
    const { h, v } = worstFrameFraction(boxCorners(box), target, dir, d, V_FOV, ASPECT);
    expect(Math.max(h, v)).toBeCloseTo(1 / margin, 6);
  });

  it('comes CLOSER for a flat wide canopy than a bounding sphere would', () => {
    // The reason this module exists. A sphere fit reserves as much vertical
    // room as horizontal; the canopy has almost no vertical extent, so the
    // sphere spends the frame on air. Pin the improvement, not the prose.
    const box: Box = { min: [-2.6, 0, -2.2], max: [2.6, 2.5, 2.2] };
    const target = boxCentre(box);
    const dir = normalise([5.6, 2.6, 6.6]);
    const d = fitDistanceM(boxCorners(box), target, dir, V_FOV, ASPECT, 1.06);

    const corners = boxCorners(box);
    const radius = Math.max(
      ...corners.map((c) => Math.hypot(c[0] - target[0], c[1] - target[1], c[2] - target[2])),
    );
    const sphereD = (radius / Math.sin(V_FOV / 2)) * 1.06;
    expect(d).toBeLessThan(sphereD);
  });

  it('backs off for a taller object and closes in for a flatter one', () => {
    const target: Vec3 = [0, 1, 0];
    const dir = normalise([5.6, 2.6, 6.6]);
    const flat = fitDistanceM(boxCorners({ min: [-2.6, 0, -2.2], max: [2.6, 0.4, 2.2] }), target, dir, V_FOV, ASPECT);
    const tall = fitDistanceM(boxCorners({ min: [-2.6, 0, -2.2], max: [2.6, 5.0, 2.2] }), target, dir, V_FOV, ASPECT);
    expect(tall).toBeGreaterThan(flat);
  });

  it('needs less distance as the frame gets wider, for a width-bound object', () => {
    const box: Box = { min: [-3, 0, -0.4], max: [3, 0.6, 0.4] };
    const target = boxCentre(box);
    const dir: Vec3 = [0, 0, 1];
    const narrow = fitDistanceM(boxCorners(box), target, dir, V_FOV, 1.0);
    const wide = fitDistanceM(boxCorners(box), target, dir, V_FOV, 2.0);
    expect(wide).toBeLessThan(narrow);
  });

  it('is indifferent to which way round the object is drawn', () => {
    // Feet can be drawn in any order, so the box must not depend on the sign of
    // the gesture that made it.
    const a = fitDistanceM(boxCorners({ min: [-2, 0, -2], max: [2, 2, 2] }), [0, 1, 0], [1, 0.5, 1], V_FOV, ASPECT);
    const b = fitDistanceM(boxCorners({ min: [-2, 0, -2], max: [2, 2, 2] }), [0, 1, 0], [-1, 0.5, -1], V_FOV, ASPECT);
    expect(a).toBeCloseTo(b, 9);
  });

  it('leaves more air the bigger the margin', () => {
    const box: Box = { min: [-2, 0, -2], max: [2, 2.5, 2] };
    const target = boxCentre(box);
    const dir = normalise([1, 0.5, 1]);
    const tight = fitDistanceM(boxCorners(box), target, dir, V_FOV, ASPECT, 1.0);
    const airy = fitDistanceM(boxCorners(box), target, dir, V_FOV, ASPECT, 1.3);
    expect(airy).toBeGreaterThan(tight);
  });
});

describe('fitting the object, not the air around it', () => {
  /** A dome: a ground ring and a cap, i.e. empty at every corner of its box. */
  const dome = (radius = 2.4, rise = 2.47): Vec3[] => {
    const pts: Vec3[] = [];
    for (let ring = 0; ring <= 6; ring++) {
      const t = ring / 6;
      const r = radius * Math.cos((t * Math.PI) / 2);
      const y = rise * Math.sin((t * Math.PI) / 2);
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2;
        pts.push([Math.cos(a) * r, y, Math.sin(a) * r]);
      }
    }
    return pts;
  };

  it('comes closer for a dome than for the box that contains it', () => {
    // The bug this replaced: fitting the eight corners of the bounding box made
    // the BOTTOM-NEAR CORNER binding, a piece of thin air the dome never
    // reaches. Measured on the real page, that cost a third of the frame.
    const pts = dome();
    const target = boxCentre(boxOfPoints(pts));
    const dir = normalise([5.6, 2.6, 6.6]);
    const onPoints = fitDistanceM(pts, target, dir, V_FOV, ASPECT, 1.06);
    const onBox = fitDistanceM(boxCorners(boxOfPoints(pts)), target, dir, V_FOV, ASPECT, 1.06);
    expect(onPoints).toBeLessThan(onBox);
    // And by a margin worth the work, not by a rounding error.
    expect(onBox / onPoints).toBeGreaterThan(1.15);
  });

  it('still keeps every strut of the dome on screen', () => {
    const pts = dome();
    const target = boxCentre(boxOfPoints(pts));
    const dir = normalise([5.6, 2.6, 6.6]);
    const d = fitDistanceM(pts, target, dir, V_FOV, ASPECT, 1.06);
    const { h, v } = worstFrameFraction(pts, target, dir, d, V_FOV, ASPECT);
    expect(h).toBeLessThanOrEqual(1);
    expect(v).toBeLessThanOrEqual(1);
    expect(Math.max(h, v)).toBeCloseTo(1 / 1.06, 6); // tight, not merely safe
  });

  it('ignores a point cloud it was handed nothing of', () => {
    // A drawing with no surface must not throw or return NaN; the page leans on
    // this on the frame after "start over".
    expect(Number.isFinite(fitDistanceM([], [0, 1, 0], [1, 0.5, 1], V_FOV, ASPECT))).toBe(true);
  });
});

describe('fitCamera centres the PICTURE, not the box', () => {
  const dome = (radius = 2.4, rise = 2.47): Vec3[] => {
    const pts: Vec3[] = [];
    for (let ring = 0; ring <= 6; ring++) {
      const t = ring / 6;
      const r = radius * Math.cos((t * Math.PI) / 2);
      const y = rise * Math.sin((t * Math.PI) / 2);
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2;
        pts.push([Math.cos(a) * r, y, Math.sin(a) * r]);
      }
    }
    return pts;
  };

  /** Signed projected extents, in half-frames. */
  function extents(pts: readonly Vec3[], target: Vec3, dir: Vec3, d: number, aspect: number) {
    const f = normalise(dir);
    const rx = normalise([f[2], 0, -f[0]]);
    const u: Vec3 = normalise([
      f[1] * rx[2] - f[2] * rx[1],
      f[2] * rx[0] - f[0] * rx[2],
      f[0] * rx[1] - f[1] * rx[0],
    ]);
    const eye: Vec3 = [target[0] + f[0] * d, target[1] + f[1] * d, target[2] + f[2] * d];
    const tanV = Math.tan(V_FOV / 2);
    const tanH = tanV * aspect;
    let loX = Infinity, hiX = -Infinity, loY = Infinity, hiY = -Infinity;
    for (const c of pts) {
      const p: Vec3 = [c[0] - eye[0], c[1] - eye[1], c[2] - eye[2]];
      const depth = -(p[0] * f[0] + p[1] * f[1] + p[2] * f[2]);
      const sx = (p[0] * rx[0] + p[1] * rx[1] + p[2] * rx[2]) / (tanH * depth);
      const sy = (p[0] * u[0] + p[1] * u[1] + p[2] * u[2]) / (tanV * depth);
      loX = Math.min(loX, sx); hiX = Math.max(hiX, sx);
      loY = Math.min(loY, sy); hiY = Math.max(hiY, sy);
    }
    return { loX, hiX, loY, hiY };
  }

  it('leaves the same air above the object as below it', () => {
    // The complaint, as a number: aiming at the box centre left 26.5% of the
    // frame empty above the lattice and 3.2% below.
    const pts = dome();
    const dir = normalise([5.6, 2.6, 6.6]);
    const { target, distance } = fitCamera(pts, dir, V_FOV, ASPECT, 1.08);
    const e = extents(pts, target, dir, distance, ASPECT);
    const above = 1 - e.hiY;
    const below = 1 + e.loY;
    expect(Math.abs(above - below)).toBeLessThan(0.02);
  });

  it('centres it left to right too', () => {
    const pts = dome();
    const dir = normalise([5.6, 2.6, 6.6]);
    const { target, distance } = fitCamera(pts, dir, V_FOV, ASPECT, 1.08);
    const e = extents(pts, target, dir, distance, ASPECT);
    expect(Math.abs((e.loX + e.hiX) / 2)).toBeLessThan(0.02);
  });

  it('is still tight: one axis reaches the margin', () => {
    // Centring must not be bought by backing away.
    const pts = dome();
    const dir = normalise([5.6, 2.6, 6.6]);
    const margin = 1.08;
    const { target, distance } = fitCamera(pts, dir, V_FOV, ASPECT, margin);
    const { h, v } = worstFrameFraction(pts, target, dir, distance, V_FOV, ASPECT);
    expect(Math.max(h, v)).toBeCloseTo(1 / margin, 2);
    expect(Math.max(h, v)).toBeLessThanOrEqual(1);
  });

  it('centres an object that is nowhere near the origin', () => {
    // A drawn canopy sits where you drew it, which is never the origin.
    const pts = dome().map((p): Vec3 => [p[0] - 1.8, p[1], p[2] - 1.4]);
    const dir = normalise([5.6, 2.6, 6.6]);
    const { target, distance } = fitCamera(pts, dir, V_FOV, ASPECT, 1.08);
    const e = extents(pts, target, dir, distance, ASPECT);
    expect(Math.abs((e.loY + e.hiY) / 2)).toBeLessThan(0.02);
    expect(Math.abs((e.loX + e.hiX) / 2)).toBeLessThan(0.02);
  });

  it('survives an empty cloud without returning NaN', () => {
    const { target, distance } = fitCamera([], normalise([1, 0.5, 1]), V_FOV, ASPECT);
    expect(target.every(Number.isFinite)).toBe(true);
    expect(Number.isFinite(distance)).toBe(true);
  });
});

describe('a fit that survives the turntable', () => {
  /** An ellipse in plan, like a real Eden: 2.6 across one way, 1.9 the other. */
  const ellipticalDome = (): Vec3[] => {
    const pts: Vec3[] = [];
    for (let ring = 0; ring <= 5; ring++) {
      const t = ring / 5;
      const k = Math.cos((t * Math.PI) / 2);
      const y = 2.47 * Math.sin((t * Math.PI) / 2);
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2;
        pts.push([Math.cos(a) * 2.6 * k, y, Math.sin(a) * 1.9 * k]);
      }
    }
    return pts;
  };

  const dirAt = (azimuthRad: number): Vec3 =>
    normalise([Math.cos(azimuthRad) * 8, 2.6, Math.sin(azimuthRad) * 8]);

  it('holds the whole object in frame all the way round', () => {
    // The turntable runs for as long as the clip does, but the fit is solved
    // for ONE direction, so a plan ellipse could present its major axis where
    // the fit measured its minor and walk out of frame mid-shot. It does not:
    // the VERTICAL constraint binds at every azimuth, and an object's vertical
    // extent barely changes as it turns. This was going to be a sweep of the
    // point cloud about its own axis until this test said the sweep bought
    // nothing. Keep the guard, skip the machinery.
    const pts = ellipticalDome();
    const { target, distance } = fitCamera(pts, dirAt(0), V_FOV, ASPECT, 1.08);
    let worst = 0;
    for (let i = 0; i < 32; i++) {
      const { h, v } = worstFrameFraction(pts, target, dirAt((i / 32) * Math.PI * 2), distance, V_FOV, ASPECT);
      worst = Math.max(worst, h, v);
    }
    expect(worst).toBeLessThanOrEqual(1);
  });

  it('keeps the target on the object own axis, so it turns in place', () => {
    // If the target drifts off the vertical axis, the turntable swings the
    // object across the frame instead of rotating it.
    const { target } = fitCamera(ellipticalDome(), dirAt(0), V_FOV, ASPECT, 1.08);
    expect(Math.hypot(target[0], target[2])).toBeLessThan(0.02);
  });
});
