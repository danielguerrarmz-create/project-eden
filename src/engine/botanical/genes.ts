/**
 * genes.ts — the "genome": a plain, serializable species descriptor plus the
 * randomizer that derives one from a seed.
 *
 * This is the 2D-vector adaptation of nonflowers' `genParams` / `PAR` system.
 * nonflowers stores shape as closures baked with `Noise`; we keep the genome a
 * flat data object (numbers + named profile enums) so a genome round-trips to
 * JSON and is trivially reproducible. Profile enums are resolved to width
 * functions inside the generator (see profiles.ts).
 */
import { Rng, type Seed } from './prng';

/** Named leaf/petal width profiles along the blade parameter t in [0, 1]. */
export type BladeProfile = 'lanceolate' | 'ovate' | 'cordate' | 'linear' | 'obovate';

/** How a stalk carries children/leaves. */
export type Genome = {
  /** Human-facing label (preset name, or "wild" for a randomized genome). */
  readonly name: string;

  // --- main structure ---
  /** Main stalks springing from the base. */
  readonly stemCount: number;
  /** Base stalk length (svg units). */
  readonly stemLength: number;
  /** Base stalk half-width at the ground. */
  readonly stemWidth: number;
  /** Baseline stalk lean amplitude (radians of accumulated bend). */
  readonly stemBend: number;

  // --- branching ---
  /** Recursive fork depth. 0 = a single unbranched stalk. */
  readonly branchDepth: number;
  /** Children forked at a branch point. */
  readonly branchFork: number;
  /** Half-spread of a fork (radians). */
  readonly branchAngle: number;
  /** Child length as a fraction of its parent. */
  readonly branchLengthRatio: number;

  // --- leaves ---
  /** Probability a node grows a leaf. */
  readonly leafChance: number;
  readonly leafLength: number;
  readonly leafWidth: number;
  readonly leafProfile: BladeProfile;
  /** Lateral vein pairs drawn inside the blade (0 = midrib only). */
  readonly leafVeins: number;
  /** Attach angle off the stalk tangent (radians). */
  readonly leafAngle: number;

  // --- flowers ---
  /** Probability a terminal tip flowers (vs. a terminal leaf/bud). */
  readonly flowerChance: number;
  readonly flowerPetals: number;
  readonly flowerLength: number;
  readonly flowerWidth: number;
  readonly flowerProfile: BladeProfile;
  /** 0 = tight bud, 1 = fully open. Governs petal splay + curl. */
  readonly flowerOpen: number;

  // --- organic character ---
  /** Perlin bend amplitude added to every spine (radians per step). */
  readonly wobble: number;
  /** Perlin sampling frequency along a spine. */
  readonly noiseScale: number;
};

/** A curated set of stable species so surfaces can pull a known look by name. */
export const SPECIES_PRESETS: readonly Genome[] = [
  {
    name: 'sprig',
    stemCount: 1,
    stemLength: 170,
    stemWidth: 2.4,
    stemBend: 0.5,
    branchDepth: 1,
    branchFork: 2,
    branchAngle: 0.55,
    branchLengthRatio: 0.62,
    leafChance: 0.5,
    leafLength: 34,
    leafWidth: 10,
    leafProfile: 'lanceolate',
    leafVeins: 3,
    leafAngle: 0.95,
    flowerChance: 0.85,
    flowerPetals: 5,
    flowerLength: 22,
    flowerWidth: 9,
    flowerProfile: 'ovate',
    flowerOpen: 0.9,
    wobble: 0.06,
    noiseScale: 1.6,
  },
  {
    name: 'fern',
    // A deliberately flowerless species for variety; kept airier than before.
    stemCount: 2,
    stemLength: 190,
    stemWidth: 2.0,
    stemBend: 0.85,
    branchDepth: 1,
    branchFork: 2,
    branchAngle: 0.44,
    branchLengthRatio: 0.5,
    leafChance: 0.6,
    leafLength: 26,
    leafWidth: 7,
    leafProfile: 'linear',
    leafVeins: 1,
    leafAngle: 1.05,
    flowerChance: 0,
    flowerPetals: 0,
    flowerLength: 0,
    flowerWidth: 0,
    flowerProfile: 'linear',
    flowerOpen: 0,
    wobble: 0.05,
    noiseScale: 2.4,
  },
  {
    name: 'bloom',
    stemCount: 1,
    stemLength: 160,
    stemWidth: 2.8,
    stemBend: 0.35,
    branchDepth: 1,
    branchFork: 2,
    branchAngle: 0.58,
    branchLengthRatio: 0.55,
    leafChance: 0.34,
    leafLength: 38,
    leafWidth: 16,
    leafProfile: 'ovate',
    leafVeins: 4,
    leafAngle: 0.82,
    flowerChance: 0.95,
    flowerPetals: 6,
    flowerLength: 30,
    flowerWidth: 13,
    flowerProfile: 'obovate',
    flowerOpen: 1,
    wobble: 0.045,
    noiseScale: 1.3,
  },
  {
    name: 'reed',
    stemCount: 3,
    stemLength: 210,
    stemWidth: 1.8,
    stemBend: 0.25,
    branchDepth: 0,
    branchFork: 0,
    branchAngle: 0,
    branchLengthRatio: 0,
    leafChance: 0.42,
    leafLength: 60,
    leafWidth: 6,
    leafProfile: 'linear',
    leafVeins: 0,
    leafAngle: 0.55,
    flowerChance: 0.9,
    flowerPetals: 5,
    flowerLength: 22,
    flowerWidth: 6,
    flowerProfile: 'lanceolate',
    flowerOpen: 0.7,
    wobble: 0.035,
    noiseScale: 1.1,
  },
  {
    name: 'clover',
    // Loosened toward the sprig/reed openness so it no longer blobs: one fork
    // level, wider spread, taller stem, fewer + smaller leaves, more flowers.
    stemCount: 2,
    stemLength: 155,
    stemWidth: 2.2,
    stemBend: 0.55,
    branchDepth: 1,
    branchFork: 2,
    branchAngle: 0.66,
    branchLengthRatio: 0.6,
    leafChance: 0.36,
    leafLength: 28,
    leafWidth: 16,
    leafProfile: 'cordate',
    leafVeins: 2,
    leafAngle: 1.05,
    flowerChance: 0.8,
    flowerPetals: 7,
    flowerLength: 18,
    flowerWidth: 8,
    flowerProfile: 'ovate',
    flowerOpen: 0.85,
    wobble: 0.06,
    noiseScale: 1.8,
  },
] as const;

const PROFILES: readonly BladeProfile[] = [
  'lanceolate',
  'ovate',
  'cordate',
  'linear',
  'obovate',
];

/**
 * Derive a fully-random-but-deterministic genome from a seed. Every field is
 * drawn in a fixed order, so `genParams(seed)` is stable. This is the vector
 * analogue of nonflowers' `genParams()` phenotype randomizer.
 */
export function genParams(seed: Seed): Genome {
  const rng = new Rng(`genome:${seed}`);
  // Depth is capped at 1 fork level: depth 2 x fork 3 was the blob generator.
  const branchDepth = rng.int(0, 1);
  // Flower-forward: most wild plants flower, and flower strongly.
  const flowers = rng.chance(0.85);
  return {
    name: 'wild',
    stemCount: rng.int(1, 3),
    stemLength: rng.range(150, 220),
    stemWidth: rng.range(1.6, 3),
    stemBend: rng.range(0.2, 0.9),
    branchDepth,
    branchFork: branchDepth === 0 ? 0 : 2,
    branchAngle: rng.range(0.42, 0.68),
    branchLengthRatio: rng.range(0.5, 0.66),
    // Airier: lower leaf density so plants breathe and don't crowd.
    leafChance: rng.range(0.3, 0.55),
    leafLength: rng.range(24, 50),
    // Narrower leaves overlap less; the wide-ovate end fed the smudge.
    leafWidth: rng.range(6, 16),
    leafProfile: rng.pick(PROFILES),
    leafVeins: rng.int(0, 4),
    leafAngle: rng.range(0.6, 1.15),
    flowerChance: flowers ? rng.range(0.65, 0.95) : 0,
    flowerPetals: rng.int(4, 8),
    flowerLength: rng.range(16, 32),
    flowerWidth: rng.range(6, 13),
    flowerProfile: rng.pick(PROFILES),
    // Skew open so blooms read as flowers, not tight nubs.
    flowerOpen: rng.range(0.55, 1),
    wobble: rng.range(0.035, 0.08),
    noiseScale: rng.range(1.1, 2.6),
  };
}
