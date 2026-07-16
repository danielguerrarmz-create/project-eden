/**
 * geom.ts — 2D point math and SVG-path emitters for the botanical generator.
 *
 * Everything is built in SVG coordinate space directly: origin at the plant's
 * base, +x right, and UP is negative y (so a plant grows into negative y, exactly
 * like the rest of this repo's ink diagrams). Heading `theta` is measured from
 * straight-up, positive = leaning right, so `dir(theta) = (sin, -cos)`.
 *
 * Path smoothing uses Catmull-Rom -> cubic Bezier (tension 1/6) on each side of
 * an outline separately, so leaf tips and stem caps stay crisp instead of being
 * rounded off by smoothing across the cusp.
 */

export type Point = readonly [number, number];

export const add = (a: Point, b: Point): Point => [a[0] + b[0], a[1] + b[1]];
export const sub = (a: Point, b: Point): Point => [a[0] - b[0], a[1] - b[1]];
export const scale = (a: Point, s: number): Point => [a[0] * s, a[1] * s];
export const len = (a: Point): number => Math.hypot(a[0], a[1]);
export const lerpPt = (a: Point, b: Point, t: number): Point => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
];

/** Unit heading vector; theta measured from straight-up, +theta leans right. */
export const dir = (theta: number): Point => [Math.sin(theta), -Math.cos(theta)];
/** Perpendicular (90 deg CCW) of a vector. */
export const perp = (a: Point): Point => [-a[1], a[0]];

/** Compact, cross-platform-stable number formatting for path `d` strings. */
export function f(n: number): string {
  if (!Number.isFinite(n)) return '0';
  const r = Math.round(n * 1000) / 1000;
  return Object.is(r, -0) ? '0' : String(r);
}

const pt = (p: Point): string => `${f(p[0])},${f(p[1])}`;

/**
 * Catmull-Rom -> Bezier segments for an OPEN polyline. Returns the `C ...`
 * command tail (no leading move), so callers compose outlines from several
 * smoothed runs joined by their shared endpoints.
 */
function smoothTail(points: readonly Point[]): string {
  if (points.length < 2) return '';
  if (points.length === 2) return `L ${pt(points[1])}`;
  const out: string[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? points[i + 1];
    const c1: Point = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Point = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    out.push(`C ${pt(c1)} ${pt(c2)} ${pt(p2)}`);
  }
  return out.join(' ');
}

/** Smooth open polyline as its own path (`M ... C ...`). */
export function smoothPath(points: readonly Point[]): string {
  if (points.length === 0) return '';
  return `M ${pt(points[0])} ${smoothTail(points)}`.trim();
}

/**
 * A closed ribbon outline from two rails given base->tip: smooth up the `left`
 * rail, across the tip, back down the reversed `right` rail, and close. The tip
 * and base junctions stay crisp (they are cusps, not smoothed through).
 */
export function ribbonPath(left: readonly Point[], right: readonly Point[]): string {
  if (left.length === 0 || right.length === 0) return '';
  const rightBack = [...right].reverse();
  return `M ${pt(left[0])} ${smoothTail(left)} L ${pt(rightBack[0])} ${smoothTail(rightBack)} Z`;
}

/** A tiny filled dot as a path (two half-arcs), for flower centers. */
export function dotPath(c: Point, r: number): string {
  return (
    `M ${f(c[0] - r)},${f(c[1])} ` +
    `a ${f(r)},${f(r)} 0 1,0 ${f(r * 2)},0 ` +
    `a ${f(r)},${f(r)} 0 1,0 ${f(-r * 2)},0 Z`
  );
}

/** Straight line segment path. */
export function linePath(a: Point, b: Point): string {
  return `M ${pt(a)} L ${pt(b)}`;
}
