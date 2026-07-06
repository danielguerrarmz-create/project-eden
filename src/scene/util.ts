/**
 * util.ts — small three.js helpers shared by the scene + overlays.
 * No engine logic here; purely turns engine data into transforms.
 */
import * as THREE from 'three';

// (Member solids + connector steel are built in Folly.tsx / connectors.ts
// from the engine's cut planes — see FABRICATION.md §1a.)

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
