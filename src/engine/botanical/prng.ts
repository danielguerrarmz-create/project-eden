/**
 * prng.ts — deterministic, seedable pseudo-random source for the botanical
 * generator. The engine forbids `Math.random` in render paths (every silhouette
 * this repo draws is reproducible), so all variation flows through here.
 *
 * `xmur3` hashes a string/number seed to a 32-bit state; `mulberry32` turns that
 * state into a fast, well-distributed uniform stream. Same seed -> same stream,
 * on every machine, forever. This mirrors the intent of nonflowers' single
 * seeded `Prng` source, but with a modern, tiny, self-contained implementation
 * (no global `Math.random` monkey-patch).
 */

/** xmur3 string hash -> a function that yields successive 32-bit seed integers. */
export function xmur3(str: string): () => number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}

/** mulberry32 uniform generator from a 32-bit state. Returns floats in [0, 1). */
export function mulberry32(a: number): () => number {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A named seed: a string or a number, both hashed identically. */
export type Seed = string | number;

/**
 * A small, deterministic random helper with the convenience methods the
 * generator needs. Construct once per plant from a seed; draw values in a fixed
 * order and the plant is fully reproducible.
 */
export class Rng {
  private next01: () => number;

  constructor(seed: Seed) {
    const seedFn = xmur3(String(seed));
    this.next01 = mulberry32(seedFn());
  }

  /** Uniform float in [0, 1). */
  next(): number {
    return this.next01();
  }

  /** Uniform float in [min, max). */
  range(min: number, max: number): number {
    return min + (max - min) * this.next01();
  }

  /** Uniform integer in [min, max] inclusive. */
  int(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }

  /** True with probability `p` (clamped to [0, 1]). */
  chance(p: number): boolean {
    return this.next01() < p;
  }

  /** Uniformly pick one element of a non-empty array. */
  pick<T>(items: readonly T[]): T {
    return items[Math.floor(this.next01() * items.length)];
  }

  /** Approx. standard-normal deviate (mean 0, sd 1) via two uniforms (Box-Muller). */
  gauss(): number {
    const u = Math.max(1e-9, this.next01());
    const v = this.next01();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  /** Fork a child Rng with an independent, still-deterministic stream. */
  fork(tag: string): Rng {
    return new Rng(`${tag}:${Math.floor(this.next01() * 0xffffffff)}`);
  }
}
