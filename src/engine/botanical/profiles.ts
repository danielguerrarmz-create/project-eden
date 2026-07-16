/**
 * profiles.ts — resolve a named `BladeProfile` to a half-width function w(t),
 * t in [0, 1] from blade base (0) to tip (1), returning a multiplier in ~[0, 1].
 *
 * nonflowers bakes leaf/petal silhouette as `leafShape`/`flowerShape` closures
 * built from `pow(sin(PI*x), k)` and Perlin masks; these are the same family of
 * profiles, named and pinned so a genome stays a plain data object.
 */
import type { BladeProfile } from './genes';

const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1.2 ? 1.2 : x);

const FNS: Record<BladeProfile, (t: number) => number> = {
  // Narrow, widest below the middle, drawn to a fine point. The classic leaf.
  lanceolate: (t) => clamp01(Math.pow(Math.sin(Math.PI * t), 0.85) * (1 - 0.22 * t)),
  // Egg-shaped: broad near the base, tapering to the tip.
  ovate: (t) => clamp01(Math.pow(Math.sin(Math.PI * t), 0.6) * (1.15 - 0.55 * t)),
  // Heart-ish: broadest low with a rounded shoulder.
  cordate: (t) => clamp01(Math.pow(Math.sin(Math.PI * Math.pow(t, 0.8)), 0.55)),
  // Grass blade: nearly constant width, soft taper at both ends.
  linear: (t) => clamp01(Math.pow(Math.sin(Math.PI * t), 0.28)),
  // Spoon-shaped petal: broadest near the tip.
  obovate: (t) => clamp01(Math.pow(Math.sin(Math.PI * t), 0.6) * (0.65 + 0.6 * t)),
};

export function bladeProfile(profile: BladeProfile): (t: number) => number {
  return FNS[profile];
}
