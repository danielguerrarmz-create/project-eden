import { describe, expect, it } from 'vitest';
import { distPointToSegmentSq, placeVines, type VineOptions } from './plantPlacement';
import type { Member, Vec3 } from '../../engine/types';

describe('point to segment distance', () => {
  const a: Vec3 = [0, 0, 0];
  const b: Vec3 = [2, 0, 0];

  it('is zero on the segment', () => {
    expect(distPointToSegmentSq([1, 0, 0], a, b)).toBeCloseTo(0, 9);
  });

  it('measures perpendicular distance to the interior', () => {
    expect(distPointToSegmentSq([1, 0.5, 0], a, b)).toBeCloseTo(0.25, 9); // 0.5^2
  });

  it('clamps past the endpoints rather than to the infinite line', () => {
    expect(distPointToSegmentSq([5, 0, 0], a, b)).toBeCloseTo(9, 9); // (5-2)^2
    expect(distPointToSegmentSq([-2, 0, 0], a, b)).toBeCloseTo(4, 9);
  });

  it('handles a degenerate zero-length segment as a point', () => {
    expect(distPointToSegmentSq([3, 4, 0], [0, 0, 0], [0, 0, 0])).toBeCloseTo(25, 9);
  });
});

describe('placeVines — vines on the real lattice', () => {
  // Only start/end/normal/u/v are read; a partial Member is enough.
  const mk = (start: Vec3, end: Vec3, normal: Vec3, u: number, v: number): Member =>
    ({ start, end, normal, u, v }) as unknown as Member;

  const density = () => 0.5;
  const opts: VineOptions = { segSpacingM: 0.25, maxPerMember: 6, standoffM: 0.03 };

  const ground = mk([0, 0, 0], [0, 1, 0], [1, 0, 0], 0.0, 0.0); // vertical, ground->up
  const crown = mk([0, 2, 0], [1, 2, 0], [0, 1, 0], 0.5, 1.0); // horizontal, up high
  const members = [ground, crown];

  it('produces stations for every member (probe: not empty)', () => {
    const segs = placeVines(members, density, opts);
    expect(segs.length).toBeGreaterThan(0);
    // 1m / 0.25 = 4 stations each -> 8.
    expect(segs.length).toBe(8);
  });

  it('every station rides its member centreline within the standoff', () => {
    for (const s of placeVines([ground], density, opts)) {
      const d = Math.sqrt(distPointToSegmentSq(s.pos, [0, 0, 0], [0, 1, 0]));
      expect(d).toBeLessThanOrEqual(opts.standoffM + 1e-9);
    }
  });

  it('builds an orthonormal frame (axis and out are unit and perpendicular)', () => {
    for (const s of placeVines(members, density, opts)) {
      expect(Math.hypot(...s.axis)).toBeCloseTo(1, 6);
      expect(Math.hypot(...s.out)).toBeCloseTo(1, 6);
      const dot = s.axis[0] * s.out[0] + s.axis[1] * s.out[1] + s.axis[2] * s.out[2];
      expect(dot).toBeCloseTo(0, 6);
    }
  });

  it('climb rises from ground toward crown across the model height', () => {
    const segs = placeVines(members, density, opts);
    const groundSegs = segs.slice(0, 4);
    const crownSegs = segs.slice(4);
    // Ground strut spans y 0..1 of a 0..2 model -> climb near 0 at its base.
    expect(Math.min(...groundSegs.map((s) => s.climb01))).toBeLessThan(0.1);
    expect(Math.min(...groundSegs.map((s) => s.climb01))).toBeGreaterThan(0);
    // Crown ring sits at y=2 -> climb 1.
    for (const s of crownSegs) expect(s.climb01).toBeCloseTo(1, 6);
    // Every crown station climbs higher than every ground station.
    expect(Math.min(...crownSegs.map((s) => s.climb01))).toBeGreaterThan(
      Math.max(...groundSegs.map((s) => s.climb01)),
    );
  });

  it('climbs low end -> high end within a member', () => {
    const segs = placeVines([ground], density, opts);
    for (let i = 1; i < segs.length; i++) {
      expect(segs[i].along01).toBeGreaterThan(segs[i - 1].along01);
      expect(segs[i].pos[1]).toBeGreaterThan(segs[i - 1].pos[1]); // rises up the strut
    }
    expect(segs[0].along01).toBeGreaterThan(0);
    expect(segs[segs.length - 1].along01).toBeLessThan(1);
  });

  it('orders the climb from the lower end even when start is the high node', () => {
    const flipped = mk([0, 1, 0], [0, 0, 0], [1, 0, 0], 0, 0); // authored top-down
    const segs = placeVines([flipped], density, opts);
    for (let i = 1; i < segs.length; i++) {
      expect(segs[i].pos[1]).toBeGreaterThan(segs[i - 1].pos[1]);
    }
  });

  it('respects the per-member cap and reads finer spacing as more stations', () => {
    const long = mk([0, 0, 0], [0, 3, 0], [1, 0, 0], 0, 0);
    const capped = placeVines([long], density, { segSpacingM: 0.1, maxPerMember: 6, standoffM: 0.03 });
    expect(capped.length).toBe(6); // 3/0.1 = 30, capped at 6
    const fine = placeVines([long], density, { segSpacingM: 0.3, maxPerMember: 40, standoffM: 0.03 });
    const coarse = placeVines([long], density, { segSpacingM: 0.6, maxPerMember: 40, standoffM: 0.03 });
    expect(fine.length).toBeGreaterThan(coarse.length);
  });

  it('passes the sampled field density through to every station', () => {
    const segs = placeVines([ground], (u, v) => (u === 0 && v === 0 ? 0.83 : 0.1), opts);
    for (const s of segs) expect(s.density01).toBeCloseTo(0.83, 6);
  });

  it('is deterministic', () => {
    expect(placeVines(members, density, opts)).toEqual(placeVines(members, density, opts));
  });
});
