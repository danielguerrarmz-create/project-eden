/**
 * plantPlacement.ts — anchor the living layer to the ACTUAL lattice.
 *
 * The round-3 overlay placed one primitive per (u,v) strut-field CELL on the
 * shell surface, oriented along the cell's outward normal — so every plant stuck
 * straight OUT of the skin like a pin in a pincushion, scattered on a parametric
 * grid that mostly missed the timber. It read as "floating things", not growth.
 *
 * This builds vines on the real MEMBERS instead. Each strut becomes a climbable
 * axis: stations are tiled ALONG its centreline (low end -> high end), oriented
 * so a plant runs UP the timber it grows on rather than poking away from it. The
 * grow-in order is the station's height up the canopy (`climb01`, 0 = ground/eave,
 * 1 = crown), so the fill visibly rises from the eave to the crown with the year.
 * Foliage richness reads the strut-density FIELD at each member (denser support
 * -> lusher growth), keeping the species-driven field load-bearing on screen.
 *
 * Pure Vec3 math, no three.js, so placement is testable in a bare node env.
 */
import type { Member, Vec3 } from '../../engine/types';

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);

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

/** One tiled station of a vine, riding a member's centreline. */
export interface VineSeg {
  /** Anchor on the member, stood off the timber by `standoffM`. */
  pos: Vec3;
  /** Unit climb direction along the member (low end -> high end). */
  axis: Vec3;
  /** Unit outward normal, orthonormalised to `axis` (the frame's out-of-skin). */
  out: Vec3;
  /** Height up the canopy, 0 = ground/eave, 1 = crown — the grow-in order. */
  climb01: number;
  /** Position along its member, 0 = low end, 1 = high end. */
  along01: number;
  /** Member centreline length (m), for sizing the tiling. */
  memberLen: number;
  /** Strut-field density sampled at this member (0..1). */
  density01: number;
}

export interface VineOptions {
  /** Target spacing (m) between tiled stations — the habit's leaf fineness. */
  segSpacingM: number;
  /** Hard cap on stations per member, so a long ring cannot explode the pool. */
  maxPerMember: number;
  /** How far off the timber each station sits (m). */
  standoffM: number;
}

/**
 * Tile vine stations along every member. `densityAt` samples the strut-density
 * field (the component wires it to nearest cell); kept as a callback so this
 * stays pure and testable without the field.
 */
export function placeVines(
  members: readonly Member[],
  densityAt: (u: number, v: number) => number,
  opts: VineOptions,
): VineSeg[] {
  const { segSpacingM, maxPerMember, standoffM } = opts;

  // Height span defines the climb coordinate: ground (min y) -> crown (max y),
  // measured from the real geometry so it is exact regardless of config.
  let yMin = Infinity;
  let yMax = -Infinity;
  for (const m of members) {
    if (m.start[1] < yMin) yMin = m.start[1];
    if (m.end[1] < yMin) yMin = m.end[1];
    if (m.start[1] > yMax) yMax = m.start[1];
    if (m.end[1] > yMax) yMax = m.end[1];
  }
  const ySpan = Math.max(1e-6, yMax - yMin);

  const segs: VineSeg[] = [];
  for (const m of members) {
    // Climb from the lower end to the higher end, so growth rises up the strut.
    const startLow = m.start[1] <= m.end[1];
    const lo = startLow ? m.start : m.end;
    const hi = startLow ? m.end : m.start;
    const dx = hi[0] - lo[0];
    const dy = hi[1] - lo[1];
    const dz = hi[2] - lo[2];
    const len = Math.hypot(dx, dy, dz) || 1e-6;
    const axis: Vec3 = [dx / len, dy / len, dz / len];

    // Outward normal, orthonormalised against the axis so the frame is a proper
    // basis; if the section normal is parallel to the axis, fall back to any
    // perpendicular.
    const n = m.normal;
    const dot = n[0] * axis[0] + n[1] * axis[1] + n[2] * axis[2];
    let ox = n[0] - dot * axis[0];
    let oy = n[1] - dot * axis[1];
    let oz = n[2] - dot * axis[2];
    let ol = Math.hypot(ox, oy, oz);
    if (ol < 1e-6) {
      const ref: Vec3 = Math.abs(axis[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
      ox = ref[1] * axis[2] - ref[2] * axis[1];
      oy = ref[2] * axis[0] - ref[0] * axis[2];
      oz = ref[0] * axis[1] - ref[1] * axis[0];
      ol = Math.hypot(ox, oy, oz) || 1e-6;
    }
    const out: Vec3 = [ox / ol, oy / ol, oz / ol];

    const density01 = clamp01(densityAt(m.u, m.v));
    const count = Math.max(1, Math.min(maxPerMember, Math.round(len / segSpacingM)));
    for (let i = 0; i < count; i++) {
      const along01 = count === 1 ? 0.5 : (i + 0.5) / count;
      const cy = lo[1] + dy * along01;
      const pos: Vec3 = [
        lo[0] + dx * along01 + out[0] * standoffM,
        cy + out[1] * standoffM,
        lo[2] + dz * along01 + out[2] * standoffM,
      ];
      segs.push({
        pos,
        axis,
        out,
        climb01: clamp01((cy - yMin) / ySpan),
        along01,
        memberLen: len,
        density01,
      });
    }
  }
  return segs;
}
