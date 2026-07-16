import { describe, it, expect } from 'vitest';
import { archRiseM, archPoints } from './DrawStage';
import { GRAMMAR } from '../../data/config';

describe('archRiseM: the arch is ASSUMED from the line, never asked for', () => {
  it('grows with span', () => {
    expect(archRiseM(4)).toBeGreaterThan(archRiseM(2));
  });

  it('never exceeds the planning cap — a drawn line cannot need permission', () => {
    for (const span of [1, 4, 8, 40, 400]) {
      expect(archRiseM(span)).toBeLessThanOrEqual(GRAMMAR.pdHeightCapM + 1e-9);
    }
  });

  it('never collapses to a lollipop on a short stroke', () => {
    expect(archRiseM(0)).toBeGreaterThanOrEqual(1.2);
    expect(archRiseM(0.1)).toBeGreaterThanOrEqual(1.2);
  });
});

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

  it('peaks in the middle at the arch rise', () => {
    const pts = archPoints(a, b, 32);
    const mid = pts[16];
    expect(mid.y).toBeCloseTo(archRiseM(4), 5);
    const maxY = Math.max(...pts.map((p) => p.y));
    expect(maxY).toBeCloseTo(mid.y, 5);
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
    const pts = archPoints({ x: 1, y: 1 }, { x: 1, y: 1 });
    for (const p of pts) {
      expect(Number.isFinite(p.x)).toBe(true);
      expect(Number.isFinite(p.y)).toBe(true);
      expect(Number.isFinite(p.z)).toBe(true);
    }
  });
});
