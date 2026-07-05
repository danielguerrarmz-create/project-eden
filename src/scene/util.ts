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
  radiusScale = 1,
): THREE.Matrix4 {
  const s = new THREE.Vector3(...start);
  const e = new THREE.Vector3(...end);
  const dir = new THREE.Vector3().subVectors(e, s);
  const len = dir.length() || 1e-6;
  scratch.position.copy(s).add(e).multiplyScalar(0.5);
  scratch.quaternion.setFromUnitVectors(UP, dir.clone().normalize());
  scratch.scale.set(radiusScale, len, radiusScale);
  scratch.updateMatrix();
  return scratch.matrix.clone();
}

/** Heat colour ramp: 0 (cool sparse) -> 1 (hot dense). Green -> amber -> red. */
export function heatColor(t: number): THREE.Color {
  const c = new THREE.Color();
  // hue 130° (green) down to 0° (red) as density rises.
  c.setHSL((130 - 130 * Math.min(1, Math.max(0, t))) / 360, 0.7, 0.5);
  return c;
}

/** Foliage green varying slightly with density for a less flat canopy. */
export function leafColor(t: number): THREE.Color {
  const c = new THREE.Color();
  c.setHSL((95 + 25 * t) / 360, 0.55, 0.28 + 0.12 * (1 - t));
  return c;
}
