/**
 * growth.ts — the small numeric helpers the crossing-paths graphic is drawn with.
 *
 * This file once carried the seed/embryo growth mathematics (Gompertz curves, golden-angle
 * phyllotaxis, a log-spiral tip wander). Those were retired with the seed finale: the beginning is
 * now a twist-fuse and the finale is an unravel into the mark, both parameterised directly in
 * CrossPathsTimeline.tsx. What survives here is just the arithmetic those parameterisations lean on.
 */

export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const lerp = (a: number, b: number, s: number) => a + (b - a) * s;
