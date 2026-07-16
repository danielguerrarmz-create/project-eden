import { describe, expect, it } from 'vitest';
import { candidateSeeds, matRect, measureBounds, measurePlant, passesGate, scorePlant } from './quality';

/** Build a w×h RGBA buffer filled by a per-pixel painter. */
function raster(
  w: number,
  h: number,
  paint: (x: number, y: number) => [number, number, number, number],
): Uint8ClampedArray {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const [r, g, b, a] = paint(x, y);
      const i = (y * w + x) * 4;
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = a;
    }
  }
  return data;
}

describe('measurePlant', () => {
  it('reports zero everywhere for a fully transparent layer', () => {
    const stats = measurePlant(raster(64, 64, () => [0, 0, 0, 0]), 64, 64);
    expect(stats).toEqual({ coverage: 0, ink: 0, chroma: 0 });
  });

  it('separates ink from pale wash by luminance', () => {
    // Left half: dark opaque stem ink. Right half: near-white wash. All visible.
    const stats = measurePlant(
      raster(64, 64, (x) => (x < 32 ? [40, 45, 30, 255] : [245, 240, 235, 255])),
      64,
      64,
    );
    expect(stats.coverage).toBeCloseTo(1, 5);
    expect(stats.ink).toBeGreaterThan(0.45);
    expect(stats.ink).toBeLessThan(0.55);
  });

  it('measures chroma only over visible pixels', () => {
    // A quarter of the layer is saturated violet, the rest fully transparent —
    // chroma must be the violet's own spread, not diluted by empty paper.
    const stats = measurePlant(
      raster(64, 64, (x, y) => (x < 32 && y < 32 ? [150, 80, 200, 255] : [0, 0, 0, 0])),
      64,
      64,
    );
    expect(stats.coverage).toBeCloseTo(0.25, 2);
    expect(stats.chroma).toBeCloseTo(120 / 255, 2);
  });
});

describe('passesGate / scorePlant', () => {
  it('rejects a ghost (the washed-out failure mode: wash without ink) and accepts a healthy plant', () => {
    // The ghost keeps pale wash pixels (coverage looks alive) but has lost its dark
    // strokes — ink is the discriminator. Values from the 2026-07-16 lab bench.
    const ghost = { coverage: 0.04, ink: 0.001, chroma: 0.02 };
    const healthy = { coverage: 0.042, ink: 0.016, chroma: 0.111 };
    expect(passesGate(ghost)).toBe(false);
    expect(passesGate(healthy)).toBe(true);
    expect(scorePlant(healthy)).toBeGreaterThan(scorePlant(ghost));
  });

  it('does not gate on chroma — all-white blossoms are legitimate gongbi', () => {
    expect(passesGate({ coverage: 0.1, ink: 0.01, chroma: 0 })).toBe(true);
  });
});

describe('measureBounds / matRect', () => {
  it('finds the exact box of the visible pixels and returns null for empty layers', () => {
    const data = raster(64, 64, (x, y) => (x >= 10 && x <= 20 && y >= 30 && y <= 50 ? [50, 50, 50, 255] : [0, 0, 0, 0]));
    expect(measureBounds(data, 64, 64)).toEqual({ xmin: 10, ymin: 30, xmax: 20, ymax: 50 });
    expect(measureBounds(raster(8, 8, () => [0, 0, 0, 0]), 8, 8)).toBeNull();
  });

  it('mats a plant into a padded, base-anchored square inside the canvas', () => {
    // A 11×21 plant: long side 21, pad 8% ≈ 2, side 25; base-anchored means the
    // rect bottom sits `pad` below the plant's lowest pixel.
    const { sx, sy, side } = matRect({ xmin: 10, ymin: 30, xmax: 20, ymax: 50 }, 64);
    expect(side).toBe(25); // long side 21 + 2×pad(2)
    expect(sy).toBe(27); // ymax(50) + pad(2) − side(25): base-anchored
    expect(sx).toBeGreaterThanOrEqual(0);
    expect(sx + side).toBeLessThanOrEqual(64);
  });

  it('never exceeds the canvas for a plant that already fills it', () => {
    const { sx, sy, side } = matRect({ xmin: 0, ymin: 0, xmax: 1199, ymax: 1199 }, 1200);
    expect({ sx, sy, side }).toEqual({ sx: 0, sy: 0, side: 1200 });
  });
});

describe('candidateSeeds', () => {
  it('is deterministic, base-first, and reads as numbered takes', () => {
    expect(candidateSeeds('bower/eden')).toEqual([
      'bower/eden',
      'bower/eden/2',
      'bower/eden/3',
      'bower/eden/4',
      'bower/eden/5',
      'bower/eden/6',
    ]);
    expect(candidateSeeds('x', 2)).toEqual(['x', 'x/2']);
  });
});
