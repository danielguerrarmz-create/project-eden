/**
 * plantPlacement.ts — keep the living layer ON the structure.
 *
 * Live QA found growth clusters hanging detached in mid-air, off the lattice
 * (worst on ivy and wisteria). The strut-field cells the growth places on are a
 * parametric u,v grid on the shell, and a few land clear of any actual member.
 * This filters them: a cell is kept only if it sits within a small distance of
 * some member's centreline, so foliage hugs the timber it grows on.
 *
 * Pure Vec3 math, no three.js, so the point-to-segment distance is testable.
 */
import type { Vec3 } from '../../engine/types';

/** Squared distance from point `p` to the segment `a`-`b`. */
export function distPointToSegmentSq(p: Vec3, a: Vec3, b: Vec3): number {
  const abx = b[0] - a[0];
  const aby = b[1] - a[1];
  const abz = b[2] - a[2];
  const apx = p[0] - a[0];
  const apy = p[1] - a[1];
  const apz = p[2] - a[2];
  const abLenSq = abx * abx + aby * aby + abz * abz;
  let t = abLenSq > 1e-12 ? (apx * abx + apy * aby + apz * abz) / abLenSq : 0;
  t = Math.max(0, Math.min(1, t));
  const dx = apx - abx * t;
  const dy = apy - aby * t;
  const dz = apz - abz * t;
  return dx * dx + dy * dy + dz * dz;
}

/** Squared distance from `p` to the nearest member centreline (Infinity if none). */
export function nearestMemberDistSq(
  p: Vec3,
  members: readonly { start: Vec3; end: Vec3 }[],
): number {
  let best = Infinity;
  for (const m of members) {
    const d = distPointToSegmentSq(p, m.start, m.end);
    if (d < best) best = d;
  }
  return best;
}

/**
 * A cell counts as on-structure if it is within `maxDist` of a member. The skin
 * the cells sit on stands off the member centrelines by roughly half a section
 * plus its own offset, and cells fall mid-bay between struts, so the threshold
 * has to clear a normal gap while still catching the clearly-detached floaters.
 * Eyeball-tunable, like every unsourced distance in this repo.
 */
export function isCellOnStructure(
  p: Vec3,
  members: readonly { start: Vec3; end: Vec3 }[],
  maxDist = 0.5,
): boolean {
  return nearestMemberDistSq(p, members) <= maxDist * maxDist;
}
