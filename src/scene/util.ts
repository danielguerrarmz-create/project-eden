/**
 * util.ts — small three.js helpers shared by the scene + overlays.
 * No engine logic here; purely turns engine data into transforms.
 */
import * as THREE from 'three';
import type { Member, Vec3 } from '../engine/types';

const UP = new THREE.Vector3(0, 1, 0);

/**
 * Instance matrix for a SOLID TIMBER MEMBER: a unit box oriented by the
 * member's section frame and scaled to its real dimensions.
 *
 *   X = section width  (in the surface tangent plane, ⊥ axis)
 *   Y = member axis    (physical, milled length — the end trims are applied)
 *   Z = section depth  (the member's surface normal; timber stands on edge)
 *
 * This is what replaces "piping": what you see is the rectangular section
 * the BOM prices, stopping short of the node centre exactly where the
 * milled end does.
 */
export function memberMatrix(m: Member, widthM: number, depthM: number): THREE.Matrix4 {
  const s = new THREE.Vector3(...m.start);
  const e = new THREE.Vector3(...m.end);
  const axis = new THREE.Vector3().subVectors(e, s);
  const fullLen = axis.length() || 1e-6;
  axis.divideScalar(fullLen);

  // Milled ends: physical timber spans [start + trim, end - trim].
  const physLen = Math.max(1e-4, fullLen - m.startTrimM - m.endTrimM);
  const mid = s
    .clone()
    .addScaledVector(axis, m.startTrimM + physLen / 2);

  const depthDir = new THREE.Vector3(...m.normal); // unit, ⊥ axis (engine guarantees)
  const widthDir = new THREE.Vector3().crossVectors(axis, depthDir).normalize();

  const mat = new THREE.Matrix4();
  mat.makeBasis(
    widthDir.multiplyScalar(widthM),
    axis.clone().multiplyScalar(physLen),
    depthDir.clone().multiplyScalar(depthM),
  );
  mat.setPosition(mid);
  return mat;
}

/**
 * Instance matrix for a connector part (hub puck, screw collar): a unit
 * cylinder aligned to `dir` at `position`, scaled to Ø `diaM` × `heightM`.
 */
export function connectorMatrix(
  position: Vec3,
  dir: Vec3,
  diaM: number,
  heightM: number,
  scratch: THREE.Object3D,
): THREE.Matrix4 {
  scratch.position.set(...position);
  scratch.quaternion.setFromUnitVectors(UP, new THREE.Vector3(...dir).normalize());
  scratch.scale.set(diaM, heightM, diaM);
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
