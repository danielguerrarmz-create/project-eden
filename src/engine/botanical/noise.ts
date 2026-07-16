/**
 * noise.ts — seeded Perlin gradient noise + fBm, the organic-wander source.
 *
 * nonflowers drives every bend, taper and edge wobble through a p5-style Perlin
 * `noise(x,y,z)` with 4 octaves and 0.5 amplitude falloff. We port the same idea
 * to a classic 2D Perlin whose permutation table is shuffled by our seeded `Rng`,
 * so the field is deterministic per seed (no reliance on a global noiseSeed). One
 * dimension is enough for spine bend (pass a fixed y); 2D is available for
 * per-plant field variation.
 */
import { Rng } from './prng';

const fade = (t: number): number => t * t * t * (t * (t * 6 - 15) + 10);
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

function grad(hash: number, x: number, y: number): number {
  // 8 gradient directions, classic Perlin selector.
  const h = hash & 7;
  const u = h < 4 ? x : y;
  const v = h < 4 ? y : x;
  return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
}

/** A seeded 2D Perlin field with an fBm helper. Deterministic for a given seed. */
export class Noise {
  private perm: Int32Array;

  constructor(rng: Rng) {
    const p = new Int32Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    // Fisher-Yates shuffle driven by the seeded Rng.
    for (let i = 255; i > 0; i--) {
      const j = rng.int(0, i);
      const t = p[i];
      p[i] = p[j];
      p[j] = t;
    }
    this.perm = new Int32Array(512);
    for (let i = 0; i < 512; i++) this.perm[i] = p[i & 255];
  }

  /** Perlin value at (x, y), in roughly [-1, 1]. */
  noise2(x: number, y = 0): number {
    const xi = Math.floor(x) & 255;
    const yi = Math.floor(y) & 255;
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);
    const u = fade(xf);
    const v = fade(yf);
    const p = this.perm;
    const aa = p[p[xi] + yi];
    const ab = p[p[xi] + yi + 1];
    const ba = p[p[xi + 1] + yi];
    const bb = p[p[xi + 1] + yi + 1];
    const x1 = lerp(grad(aa, xf, yf), grad(ba, xf - 1, yf), u);
    const x2 = lerp(grad(ab, xf, yf - 1), grad(bb, xf - 1, yf - 1), u);
    return lerp(x1, x2, v);
  }

  /**
   * Fractional Brownian motion: `octaves` layers of noise at doubling frequency
   * and halving amplitude, normalized to about [-1, 1]. Matches nonflowers'
   * 4-octave / 0.5-falloff character.
   */
  fbm(x: number, y = 0, octaves = 4): number {
    let sum = 0;
    let amp = 1;
    let freq = 1;
    let norm = 0;
    for (let o = 0; o < octaves; o++) {
      sum += amp * this.noise2(x * freq, y * freq);
      norm += amp;
      amp *= 0.5;
      freq *= 2;
    }
    return sum / norm;
  }

  /** fBm remapped to [0, 1]. Convenient for widths/chances. */
  fbm01(x: number, y = 0, octaves = 4): number {
    return this.fbm(x, y, octaves) * 0.5 + 0.5;
  }
}
