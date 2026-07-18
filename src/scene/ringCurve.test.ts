import { describe, expect, it } from 'vitest';
import { ellipseArcPoint } from './ringCurve';
import type { Vec3 } from '../engine/types';

const planRadius = (p: Vec3, a: number, b: number) => Math.hypot(p[0] / a, p[2] / b);

describe('ellipse arc sampling for curved ring members', () => {
  // Two points on a circle (planA = planB) 90 degrees apart.
  const A = 2;
  const B = 2;
  const start: Vec3 = [A, 1.5, 0];
  const end: Vec3 = [0, 1.5, B];

  it('returns the endpoints exactly at t=0 and t=1', () => {
    const s = ellipseArcPoint(start, end, 0, A, B);
    const e = ellipseArcPoint(start, end, 1, A, B);
    expect(s[0]).toBeCloseTo(start[0], 6);
    expect(s[2]).toBeCloseTo(start[2], 6);
    expect(e[0]).toBeCloseTo(end[0], 6);
    expect(e[2]).toBeCloseTo(end[2], 6);
  });

  it('bows the midpoint OUTWARD past the straight chord', () => {
    const mid = ellipseArcPoint(start, end, 0.5, A, B);
    const chordMid: Vec3 = [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2, (start[2] + end[2]) / 2];
    // On a true circle the arc midpoint sits on the circle (radius ~1 in plan
    // space); the chord midpoint is inside it.
    expect(planRadius(mid, A, B)).toBeGreaterThan(planRadius(chordMid, A, B));
    expect(planRadius(mid, A, B)).toBeCloseTo(1, 3);
  });

  it('interpolates height linearly along the chord', () => {
    const low: Vec3 = [A, 1.0, 0];
    const high: Vec3 = [0, 2.0, B];
    expect(ellipseArcPoint(low, high, 0.5, A, B)[1]).toBeCloseTo(1.5, 6);
  });

  it('respects an elliptical (non-circular) plan', () => {
    const a = 3;
    const b = 1.5;
    const s: Vec3 = [a, 1, 0];
    const e: Vec3 = [0, 1, b];
    const mid = ellipseArcPoint(s, e, 0.5, a, b);
    // The bowed midpoint sits on the ellipse boundary in plan space.
    expect(planRadius(mid, a, b)).toBeCloseTo(1, 3);
  });

  it('degenerates gracefully when the endpoints nearly coincide', () => {
    const p: Vec3 = [1.2, 0.8, 0.4];
    const q: Vec3 = [1.2001, 0.8, 0.4001];
    const mid = ellipseArcPoint(p, q, 0.5, A, B);
    expect(Number.isFinite(mid[0])).toBe(true);
    expect(Number.isFinite(mid[2])).toBe(true);
  });
});
