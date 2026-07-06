/**
 * vec.ts — minimal Vec3 math shared across the engine.
 * The engine stays three.js-free; these are the only vector ops it needs.
 */
import type { Vec3 } from './types';

export const vAdd = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const vSub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const vScale = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s];
export const vDot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const vCross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
export const vLen = (a: Vec3): number => Math.hypot(a[0], a[1], a[2]);
export const vNorm = (a: Vec3): Vec3 => {
  const l = vLen(a) || 1e-9;
  return [a[0] / l, a[1] / l, a[2] / l];
};
/** Component of `a` perpendicular to unit vector `n`. */
export const vPerp = (a: Vec3, n: Vec3): Vec3 => vSub(a, vScale(n, vDot(a, n)));
