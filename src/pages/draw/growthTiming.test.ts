import { describe, expect, it } from 'vitest';
import {
  cellFlowers,
  cellJitter,
  clamp01,
  climbThreshold,
  easeCoverage,
  leafProgress,
  leafThreshold,
  smoothstep01,
} from './growthTiming';

describe('growth timing math', () => {
  it('smoothstep clamps to [0,1] and eases through 0.5 at the midpoint', () => {
    expect(smoothstep01(-1)).toBe(0);
    expect(smoothstep01(2)).toBe(1);
    expect(smoothstep01(0.5)).toBeCloseTo(0.5, 5);
    // monotonic non-decreasing
    let prev = -1;
    for (let x = 0; x <= 1; x += 0.1) {
      const v = smoothstep01(x);
      expect(v).toBeGreaterThanOrEqual(prev);
      prev = v;
    }
  });

  it('a leaf shows nothing before its threshold, then ramps to full', () => {
    const th = 0.4;
    expect(leafProgress(0.0, th)).toBe(0); // coverage below threshold: invisible
    expect(leafProgress(th - 0.001, th)).toBe(0);
    expect(leafProgress(th + 0.4, th)).toBe(1); // a full ramp past threshold: complete
    expect(leafProgress(th + 0.2, th)).toBeGreaterThan(0);
    expect(leafProgress(th + 0.2, th)).toBeLessThan(1);
  });

  it('coverage eases toward its target and never overshoots in one step', () => {
    const next = easeCoverage(0, 1, 1 / 60);
    expect(next).toBeGreaterThan(0);
    expect(next).toBeLessThan(1);
    // A huge dt is clamped so a hidden-tab frame cannot leap past the target.
    expect(easeCoverage(0, 1, 999)).toBeLessThanOrEqual(1);
    // Already at target: stays put.
    expect(easeCoverage(1, 1, 1 / 60)).toBeCloseTo(1, 6);
  });

  it('thresholds sit in a sane band, denser cells leading earlier', () => {
    const dense = leafThreshold(1, 0.5);
    const sparse = leafThreshold(0, 0.5);
    expect(dense).toBeLessThan(sparse); // dense cells grow in first
    for (const d of [0, 0.5, 1]) {
      for (const j of [0, 0.5, 1]) {
        const t = leafThreshold(d, j);
        expect(t).toBeGreaterThanOrEqual(0.05);
        expect(t).toBeLessThanOrEqual(0.55);
      }
    }
  });

  it('climb thresholds rise from ground to crown and stay under peak coverage', () => {
    // Ground stations lead, crown stations come last.
    expect(climbThreshold(0, 0.5)).toBeLessThan(climbThreshold(1, 0.5));
    // Monotonic in height at a fixed jitter.
    let prev = -1;
    for (let c = 0; c <= 1; c += 0.1) {
      const t = climbThreshold(c, 0.3);
      expect(t).toBeGreaterThanOrEqual(prev);
      prev = t;
    }
    // Every threshold sits below the final stage's peak coverage (~0.86), so the
    // crown does grow in by the last year rather than staying bare.
    for (const c of [0, 0.5, 1]) {
      for (const j of [0, 0.5, 1]) {
        const t = climbThreshold(c, j);
        expect(t).toBeGreaterThanOrEqual(0);
        expect(t).toBeLessThan(0.86);
      }
    }
  });

  it('flower assignment is deterministic and scales with density', () => {
    // Same index + density is stable across calls.
    for (let i = 0; i < 20; i++) {
      expect(cellFlowers(i, 0.5)).toBe(cellFlowers(i, 0.5));
    }
    // Density 0 flowers nothing; density 1 flowers everything.
    for (let i = 0; i < 50; i++) {
      expect(cellFlowers(i, 0)).toBe(false);
      expect(cellFlowers(i, 1)).toBe(true);
    }
    // A higher density flowers at least as many cells as a lower one.
    const count = (d: number) =>
      Array.from({ length: 200 }, (_, i) => cellFlowers(i, d)).filter(Boolean).length;
    expect(count(0.7)).toBeGreaterThanOrEqual(count(0.3));
  });

  it('jitter and clamp stay in range', () => {
    for (let i = 0; i < 100; i++) {
      const j = cellJitter(i);
      expect(j).toBeGreaterThanOrEqual(0);
      expect(j).toBeLessThan(1);
    }
    expect(clamp01(5)).toBe(1);
    expect(clamp01(-5)).toBe(0);
  });
});
