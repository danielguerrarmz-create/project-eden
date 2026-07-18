import { describe, it, expect } from 'vitest';
import { archPoints } from './DrawStage';
import { arcRiseM, tentHeight } from '../../engine/surface';

describe('archPoints: the curve the stroke becomes', () => {
  const a = { x: -2, y: 0 };
  const b = { x: 2, y: 0 };

  it('starts and ends ON THE GROUND — the feet are feet', () => {
    const pts = archPoints(a, b);
    expect(pts[0].y).toBeCloseTo(0, 6);
    expect(pts[pts.length - 1].y).toBeCloseTo(0, 6);
  });

  it('lands its ends exactly on the drawn points', () => {
    const pts = archPoints(a, b);
    expect(pts[0].x).toBeCloseTo(a.x, 6);
    expect(pts[0].z).toBeCloseTo(a.y, 6);
    expect(pts[pts.length - 1].x).toBeCloseTo(b.x, 6);
    expect(pts[pts.length - 1].z).toBeCloseTo(b.y, 6);
  });

  it('peaks in the middle at the arc rise', () => {
    const pts = archPoints(a, b, 32);
    expect(pts[16].y).toBeCloseTo(arcRiseM(4), 5);
    expect(Math.max(...pts.map((p) => p.y))).toBeCloseTo(pts[16].y, 5);
  });

  it('AGREES WITH THE SURFACE FIELD — the ribbon must ride its own tent', () => {
    // The drawn arc and the surface it generates are two renderings of one
    // idea. If they drift, the line you drew floats off the thing it made.
    for (const t of [0.25, 0.5, 0.75]) {
      const p = { x: a.x + (b.x - a.x) * t, y: 0 };
      const onCurve = archPoints(a, b, 1000)[Math.round(t * 1000)].y;
      expect(tentHeight({ a, b }, p)).toBeCloseTo(onCurve, 3);
    }
  });

  it('never dips below ground anywhere along the curve', () => {
    for (const pts of [archPoints(a, b), archPoints({ x: 0, y: 0 }, { x: 0.3, y: 0.2 })]) {
      for (const p of pts) expect(p.y).toBeGreaterThanOrEqual(-1e-9);
    }
  });

  it('is a real curve, not two points', () => {
    expect(archPoints(a, b, 32)).toHaveLength(33);
  });

  it('survives a degenerate zero-length stroke without NaN', () => {
    for (const p of archPoints({ x: 1, y: 1 }, { x: 1, y: 1 })) {
      expect(Number.isFinite(p.x)).toBe(true);
      expect(Number.isFinite(p.y)).toBe(true);
      expect(Number.isFinite(p.z)).toBe(true);
    }
  });
});
