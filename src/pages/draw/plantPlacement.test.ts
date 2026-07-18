import { describe, expect, it } from 'vitest';
import { distPointToSegmentSq, isCellOnStructure, nearestMemberDistSq } from './plantPlacement';
import type { Vec3 } from '../../engine/types';

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
    // Point beyond b: nearest is b itself, not the line's foot.
    expect(distPointToSegmentSq([5, 0, 0], a, b)).toBeCloseTo(9, 9); // (5-2)^2
    expect(distPointToSegmentSq([-2, 0, 0], a, b)).toBeCloseTo(4, 9);
  });

  it('handles a degenerate zero-length segment as a point', () => {
    expect(distPointToSegmentSq([3, 4, 0], [0, 0, 0], [0, 0, 0])).toBeCloseTo(25, 9);
  });
});

describe('cell on structure filter', () => {
  const members = [
    { start: [0, 0, 0] as Vec3, end: [1, 0, 0] as Vec3 },
    { start: [0, 2, 0] as Vec3, end: [0, 2, 1] as Vec3 },
  ];

  it('keeps a cell hugging a member and drops a detached one', () => {
    expect(isCellOnStructure([0.5, 0.1, 0], members, 0.5)).toBe(true);
    // A metre off every member: floating.
    expect(isCellOnStructure([5, 5, 5], members, 0.5)).toBe(false);
  });

  it('nearest distance takes the closest of several members', () => {
    // Right on the second member.
    expect(nearestMemberDistSq([0, 2, 0.5], members)).toBeCloseTo(0, 9);
  });

  it('respects the threshold boundary', () => {
    // Exactly 0.4 off the first member, inside a 0.5 threshold, outside 0.3.
    const p: Vec3 = [0.5, 0.4, 0];
    expect(isCellOnStructure(p, members, 0.5)).toBe(true);
    expect(isCellOnStructure(p, members, 0.3)).toBe(false);
  });
});
