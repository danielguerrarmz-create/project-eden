/**
 * util.ts — small three.js helpers shared by the scene + overlays.
 * No engine logic here; purely turns engine coordinates into transforms.
 */
import * as THREE from 'three';
import type { Vec3 } from '../engine/types';

const UP = new THREE.Vector3(0, 1, 0);

/**
 * Compose an instance matrix for a unit (radius r, height 1) cylinder so it
 * spans from `start` to `end`. Used for every timber member.
 */
export function segmentMatrix(
  start: Vec3,
  end: Vec3,
  scratch: THREE.Object3D,
): THREE.Matrix4 {
  const s = new THREE.Vector3(...start);
  const e = new THREE.Vector3(...end);
  const dir = new THREE.Vector3().subVectors(e, s);
  const len = dir.length() || 1e-6;
  scratch.position.copy(s).add(e).multiplyScalar(0.5);
  scratch.quaternion.setFromUnitVectors(UP, dir.clone().normalize());
  scratch.scale.set(1, len, 1);
  scratch.updateMatrix();
  return scratch.matrix.clone();
}

const HEAT_SPARSE = new THREE.Color('#17160F'); // inkBlack, near-invisible sparse cells
const HEAT_DENSE = new THREE.Color('#ACC13A'); // accentOlive, the one "look here" hue

/** Density ramp: sparse (inkBlack) -> dense (accentOlive). One accent hue, no glow. */
export function heatColor(t: number): THREE.Color {
  return HEAT_SPARSE.clone().lerp(HEAT_DENSE, Math.min(1, Math.max(0, t)));
}

/**
 * Foliage in the accentOlive hue family but as a MATERIAL, not flat UI paint:
 * richer and darker than the chip color, with organic variation by density.
 * hue 66..80°, sat 0.45..0.60, lightness 0.30..0.45 (denser = deeper).
 */
export function leafColor(t: number): THREE.Color {
  const c = new THREE.Color();
  const tt = Math.min(1, Math.max(0, t));
  c.setHSL((80 - 14 * tt) / 360, 0.45 + 0.15 * tt, 0.45 - 0.15 * tt);
  return c;
}
