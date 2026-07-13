/**
 * growth.ts — the mathematics the crossing-paths graphic is drawn with.
 *
 * The curvature of every strand is derived from plant growth, not from spline taste. If
 * someone asks why a line bends the way it does, there is one answer: it is a Gompertz
 * growth curve, sampled twice. That is the whole graphic.
 *
 * SOURCES (real, checked):
 *   Gompertz, B. (1825), Phil. Trans. R. Soc. 115:513. The asymmetric biological growth
 *     curve: slow establishment, rapid elongation, long settling tail. Chosen over the
 *     logistic (Verhulst 1838), whose inflection is always dead centre and reads mechanical,
 *     and over Von Bertalanffy, which has no establishment lag at all.
 *   Vogel, H. (1979), Math. Biosci. 44:179. Phyllotaxis: the golden angle (360/phi^2) is the
 *     divergence angle that packs primordia with no radial alignment at any N. It is why the
 *     strands nest instead of colliding.
 *   Logarithmic spiral (spira mirabilis), golden case: radius multiplies by phi each quarter
 *     turn, so b = 2*ln(phi)/pi. Over the small sweep used here (under 50 degrees) this is
 *     nearly linear, which is exactly why it reads as a gentle tightening rather than a coil.
 *   Goriely, A. & Tabor, M. (1998), Phys. Rev. Lett. 80:1564, for tendril coiling. Bower's own
 *     armature is tendril and twining climbers, so the strands wind the way the plants do.
 */

export const PHI = (1 + Math.sqrt(5)) / 2;

/** The golden angle in radians: 360/phi^2 = 137.507... degrees. */
export const GOLDEN_ANGLE = (2 * Math.PI) / (PHI * PHI);

/** Golden log-spiral growth rate: the radius multiplies by phi every quarter turn. */
export const SPIRAL_B = (2 * Math.log(PHI)) / Math.PI; // ~0.3063

/**
 * Gompertz growth, g: [0,1] -> [0,1]. Slow establishment, rapid elongation, settling tail.
 *
 * Reparametrised so it is dialled by eye rather than by raw b and c:
 *   p — where along the strand's own life the growth is fastest (the visual bend)
 *   k — how steep that elongation is
 * The inflection VALUE is fixed at 1/e by the curve itself, which is what makes it
 * asymmetric, and what makes it read as something that grew rather than something that
 * was drawn.
 */
export function gompertz(t: number, p = 0.36, k = 6): number {
  const c = k;
  const b = Math.exp(k * p);
  return Math.exp(-b * Math.exp(-c * clamp01(t)));
}

export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const lerp = (a: number, b: number, s: number) => a + (b - a) * s;

/**
 * The lateral wander of a growing tip: a damped arc of a golden logarithmic spiral, phased
 * per strand by the golden angle so the six of them nest rather than overlap.
 *
 * The amplitude is tied to (1 - g), the growth left to do, so the wander vanishes at exactly
 * the rate the strand commits to the egg. One growth function drives both.
 *
 * The sweep is deliberately held under ~45 degrees. A log spiral only coils once theta runs
 * for radians; kept this short, the true golden rate is almost linear and reads as calm.
 */
export function lateral(t: number, g: number, phase: number, amplitude: number, sweep: number) {
  const theta = sweep * clamp01(t);
  const radius = amplitude * (1 - g) * Math.exp(SPIRAL_B * theta);
  return radius * Math.sin(theta + phase);
}

/**
 * A SEED, not an egg and not an ellipse.
 *
 * The distinction matters: an egg is laid finished and waits, a seed is a plan for a plant
 * that has not happened yet. The timeline arrives at the second thing. Formally the seed is
 * an asymmetric ovoid, pointed at one end (the micropyle, where the root will emerge) and
 * full at the other (the chalaza, where the food is) — which is exactly the shape of the
 * page's argument, so the tip is drawn UPWARD, at the strands, and the strands gather into
 * the point of highest curvature the way converging lines want to.
 *
 * Drawn in local coordinates around (0,0): tip at (0,-b), body swelling below.
 *
 * @param a half-width at the widest point
 * @param b half-height, tip to base
 */
export function seedPath(a: number, b: number): string {
  return [
    `M 0 ${-b}`,
    // Down the right flank: leaves the tip almost straight, then swells.
    `C ${a * 0.58} ${-b * 0.56}, ${a} ${-b * 0.06}, ${a * 0.93} ${b * 0.44}`,
    `C ${a * 0.82} ${b * 0.87}, ${a * 0.44} ${b}, 0 ${b}`,
    // And back up the left, mirrored: the seed is bilaterally symmetric about its axis.
    `C ${-a * 0.44} ${b}, ${-a * 0.82} ${b * 0.87}, ${-a * 0.93} ${b * 0.44}`,
    `C ${-a} ${-b * 0.06}, ${-a * 0.58} ${-b * 0.56}, 0 ${-b}`,
    'Z',
  ].join(' ');
}

/**
 * The EMBRYO inside the seed: the curled radicle-and-cotyledon hook that every dicot seed
 * carries, drawn as a single open stroke. It is the smallest possible drawing of "this is
 * not finished, it is folded up waiting" — which is the whole point of ending here.
 *
 * It hangs from the tip, curls into the body, and turns back on itself.
 */
export function embryoPath(a: number, b: number): string {
  return [
    `M 0 ${-b * 0.66}`,
    `C ${a * 0.1} ${-b * 0.3}, ${a * 0.42} ${-b * 0.16}, ${a * 0.42} ${b * 0.14}`,
    `C ${a * 0.42} ${b * 0.44}, ${a * 0.1} ${b * 0.56}, ${-a * 0.16} ${b * 0.42}`,
    `C ${-a * 0.36} ${b * 0.31}, ${-a * 0.38} ${b * 0.05}, ${-a * 0.2} ${-b * 0.06}`,
  ].join(' ');
}
