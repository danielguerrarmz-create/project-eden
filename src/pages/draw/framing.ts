/**
 * framing.ts — where the camera has to stand for the object to fill the frame.
 *
 * WHY THIS IS NOT A BOUNDING-SPHERE FIT. The obvious zoom-to-fit puts a sphere
 * round the object and solves d = R / sin(fov/2). That is wrong here, and wrong
 * in the expensive direction: a canopy is FLAT and WIDE (about 5 m across, 2.5 m
 * tall) inside a frame that is itself wide (16:9). Its bounding sphere is driven
 * by the plan diagonal, so a sphere fit reserves as much vertical room as
 * horizontal, and pushes the camera BACK to make space for emptiness. Measured
 * on the real page: the sphere fit wanted ~11.6 m for an object the camera was
 * already looking at from 9 m and still only filling a quarter of the frame.
 *
 * So fit the real thing: project the object's own points against the actual
 * anisotropic frustum and solve for the smallest distance that keeps every one
 * of them inside BOTH the horizontal and the vertical field of view.
 *
 * WHY POINTS AND NOT THE BOUNDING BOX EITHER. The first version of this fitted
 * the box's eight corners, which is the same mistake one step smaller. An Eden
 * is a DOME: it is empty at every corner of its own bounding box. Measured on
 * the baked lattice, the binding constraint was the bottom-near box corner, a
 * patch of thin air two metres from the nearest strut, and the fit reserved a
 * third of the frame for it: the lattice sat at 55% of frame height while the
 * box it was solving for sat at 93%. Feed it the nodes themselves and the
 * constraint becomes a real piece of timber.
 *
 * All of this is pure: no THREE, no camera, no React. That is deliberate. The
 * whole point is that it can be tested against numbers rather than judged from
 * a screenshot, because the screenshot only tells you the answer for one object
 * at one viewport.
 */
import type { Vec3 } from '../../engine/types';

export interface Box {
  min: Vec3;
  max: Vec3;
}

/** Camera state a framing move resolves to. */
export type Framing =
  /** An exact pose. Used for the opening shot, which is authored, not derived. */
  | { kind: 'pose'; position: Vec3; target: Vec3 }
  /** Fit these points, keeping whatever direction the camera already looks from. */
  | { kind: 'fit'; points: readonly Vec3[]; margin: number };

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];

export function normalise(v: Vec3): Vec3 {
  const l = Math.hypot(v[0], v[1], v[2]);
  if (l < 1e-9) return [0, 0, 1];
  return [v[0] / l, v[1] / l, v[2] / l];
}

export function boxOfPoints(points: readonly Vec3[]): Box {
  if (points.length === 0) return { min: [-1, 0, -1], max: [1, 1, 1] };
  const min: [number, number, number] = [Infinity, Infinity, Infinity];
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  for (const p of points) {
    for (let i = 0; i < 3; i++) {
      if (p[i] < min[i]) min[i] = p[i];
      if (p[i] > max[i]) max[i] = p[i];
    }
  }
  return { min, max };
}

export function boxCentre(b: Box): Vec3 {
  return [(b.min[0] + b.max[0]) / 2, (b.min[1] + b.max[1]) / 2, (b.min[2] + b.max[2]) / 2];
}

export function boxCorners(b: Box): Vec3[] {
  const out: Vec3[] = [];
  for (const x of [b.min[0], b.max[0]])
    for (const y of [b.min[1], b.max[1]])
      for (const z of [b.min[2], b.max[2]]) out.push([x, y, z]);
  return out;
}

/**
 * The smallest distance along `dir` from `target` at which every one of
 * `points` is still inside the frustum.
 *
 * `dir` points from the target TOWARD the camera (so the camera looks along
 * -dir). `margin` > 1 leaves air around the object: 1.06 means the object stops
 * about 6% short of the frame edge on whichever axis binds.
 */
export function fitDistanceM(
  points: readonly Vec3[],
  target: Vec3,
  dir: Vec3,
  vFovRad: number,
  aspect: number,
  margin = 1.06,
): number {
  const f = normalise(dir);
  // Right and up for a camera at target + f*d looking back along -f. Degenerate
  // only if you look straight down the world Y, which the polar clamp forbids.
  let r = cross([0, 1, 0], f);
  r = Math.hypot(r[0], r[1], r[2]) < 1e-6 ? [1, 0, 0] : normalise(r);
  const u = normalise(cross(f, r));

  const tanV = Math.tan(vFovRad / 2) / margin;
  const tanH = tanV * aspect;

  let d = 0;
  for (const point of points) {
    const p = sub(point, target);
    // Depth of this point in front of a camera placed at distance d is
    // d - dot(p, f); it is inside the frustum when |dot(p, r)| <= tanH * depth
    // and |dot(p, u)| <= tanV * depth. Solve each for d and take the worst.
    const along = dot(p, f);
    d = Math.max(d, along + Math.abs(dot(p, r)) / tanH, along + Math.abs(dot(p, u)) / tanV);
  }
  return d;
}

/**
 * Where to stand AND where to look: the distance that fits `points`, and the
 * target that centres them in the frame.
 *
 * WHY THE TARGET IS NOT THE OBJECT'S CENTRE. Aiming at the middle of the
 * object's bounding box centres the BOX, not the PICTURE of the object. Under
 * perspective, the near half of a canopy projects much larger than the far
 * half, so a dome aimed at its own centre sits low: measured on the real page,
 * 26.5% of the frame was empty vellum above the lattice and 3.2% below it,
 * which is the "sits low with dead vellum above" complaint restated in numbers.
 *
 * So solve for it. Project, measure how far off-centre the object actually
 * lands, and slide the target to cancel that. Moving the target moves the whole
 * frustum, which changes the fit, so iterate: it converges in two or three
 * passes because each correction is smaller than the last.
 */
export function fitCamera(
  points: readonly Vec3[],
  dir: Vec3,
  vFovRad: number,
  aspect: number,
  margin = 1.06,
  passes = 4,
): { target: Vec3; distance: number } {
  const f = normalise(dir);
  let r = cross([0, 1, 0], f);
  r = Math.hypot(r[0], r[1], r[2]) < 1e-6 ? [1, 0, 0] : normalise(r);
  const u = normalise(cross(f, r));
  const tanV = Math.tan(vFovRad / 2);
  const tanH = tanV * aspect;

  let target = boxCentre(boxOfPoints(points));
  let distance = fitDistanceM(points, target, dir, vFovRad, aspect, margin);
  if (points.length === 0) return { target, distance };

  for (let pass = 0; pass < passes; pass++) {
    let loX = Infinity, hiX = -Infinity, loY = Infinity, hiY = -Infinity;
    for (const point of points) {
      const p = sub(point, target);
      const depth = distance - dot(p, f);
      if (depth < 1e-3) continue;
      const sx = dot(p, r) / (tanH * depth);
      const sy = dot(p, u) / (tanV * depth);
      if (sx < loX) loX = sx;
      if (sx > hiX) hiX = sx;
      if (sy < loY) loY = sy;
      if (sy > hiY) hiY = sy;
    }
    if (!Number.isFinite(loX)) break;
    // How far the object's projected middle sits from the frame's middle, in
    // half-frames. Cancel it by sliding the target the other way: a point's
    // projection moves by -t when the whole frustum moves by t.
    const offX = (loX + hiX) / 2;
    const offY = (loY + hiY) / 2;
    if (Math.abs(offX) < 1e-3 && Math.abs(offY) < 1e-3) break;

    // Correct along WORLD up and the camera's horizontal right, not along the
    // camera's tilted up. Both are then independent (r is horizontal, so it
    // cannot disturb the vertical centring) and, more importantly, the target
    // stays on the object's own vertical axis. The turntable orbits the target:
    // let the target drift off that axis and the object swings across the frame
    // as it turns instead of rotating in place.
    const kx = offX * tanH * distance;
    const ky = (offY * tanV * distance) / (Math.abs(u[1]) < 1e-3 ? 1 : u[1]);
    target = [target[0] + r[0] * kx, target[1] + ky, target[2] + r[2] * kx];
    distance = fitDistanceM(points, target, dir, vFovRad, aspect, margin);
  }
  return { target, distance };
}

/**
 * A point cloud for the soft skin, which unlike the baked kit has no nodes to
 * borrow. Sampled on the plan grid and dropped where the surface is a hole, so
 * an excavated canopy is framed on what is left rather than on what it was.
 */
export function surfaceSamples(
  bounds: { minX: number; maxX: number; minY: number; maxY: number },
  heightAt: (p: { x: number; y: number }) => number,
  isHoleAt: (p: { x: number; y: number }) => boolean,
  steps = 18,
): Vec3[] {
  const out: Vec3[] = [];
  for (let i = 0; i <= steps; i++) {
    for (let j = 0; j <= steps; j++) {
      const p = {
        x: bounds.minX + ((bounds.maxX - bounds.minX) * i) / steps,
        y: bounds.minY + ((bounds.maxY - bounds.minY) * j) / steps,
      };
      if (isHoleAt(p)) continue;
      const h = heightAt(p);
      // Off the faired plan the surface reads as zero. Those samples are lawn,
      // not canopy, and framing on them would frame the drawing's bounding box
      // instead of the thing standing in it.
      if (h <= 0.01) continue;
      out.push([p.x, h, p.y]);
      out.push([p.x, 0, p.y]); // the ground under it: feet are part of the object
    }
  }
  return out;
}
