/**
 * growthTiming.ts — the pure timing math the in-engine plant growth runs on.
 *
 * Extracted so the "nothing blooms before its turn, everything fills by the
 * end" behaviour is testable without a GPU, the same discipline `entryBearing`
 * and `explodeShader` follow. `PlantGrowth` is this math plus three.js
 * placement; the numbers here mirror the studio's `GrowthOverlay` exactly, so
 * the two living layers grow in on the same curve.
 *
 * No three.js, no React.
 */

export function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x));
}

export function smoothstep01(x: number): number {
  const t = clamp01(x);
  return t * t * (3 - 2 * t);
}

/**
 * Deterministic per-index jitter in [0, 1). Same hash `GrowthOverlay` uses, so a
 * cell lands in the same place and grows in at the same moment in both layers.
 */
export function cellJitter(i: number, salt = 0): number {
  return (((Math.sin((i + salt) * 12.9898) * 43758.5453) % 1) + 1) % 1;
}

/**
 * When a cell starts growing in. Lower-density, higher-jitter cells lead later,
 * so the fill reads bottom-up and dense-first rather than all at once.
 */
export function leafThreshold(density01: number, jitter: number): number {
  return 0.05 + 0.5 * (1 - density01) * jitter;
}

/**
 * When a vine STATION starts growing in, by its height up the canopy. Ground
 * stations (climb01 -> 0) lead; crown stations (climb01 -> 1) come last, so the
 * living layer visibly rises up the real lattice as coverage climbs. A little
 * per-station jitter breaks each ring so it fills in naturally rather than as a
 * hard band. Max threshold = span + spread (~0.6), kept below the final stage's
 * peak coverage so the crown does reach in by year's end.
 */
export function climbThreshold(
  climb01: number,
  jitter: number,
  span = 0.5,
  spread = 0.1,
): number {
  return span * clamp01(climb01) + spread * clamp01(jitter);
}

/**
 * A cell's visible progress 0..1 given the animated coverage and its threshold.
 * 0 until coverage passes the threshold, then a smoothstep ramp over `ramp`.
 */
export function leafProgress(coverage: number, threshold: number, ramp = 0.4): number {
  return smoothstep01((coverage - threshold) / ramp);
}

/** Ease coverage one frame toward its target, frame-rate aware (dt in seconds). */
export function easeCoverage(current: number, target: number, dt: number, rate = 3.2): number {
  return current + (target - current) * Math.min(1, dt * rate);
}

/** Whether a cell carries a flower, from the species' flower density. Stable per cell. */
export function cellFlowers(i: number, flowerDensity01: number): boolean {
  return cellJitter(i, 17.3) < flowerDensity01;
}
