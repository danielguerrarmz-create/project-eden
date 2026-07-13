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
 * An EGG, not an ellipse. Two half-ellipses sharing one height, so the curve is continuous
 * and its tangent is vertical where they meet: one smooth closed form, round at one end and
 * narrow at the other.
 *
 * This is the honest choice. Hügelschäffer's egg is the named historical curve and its
 * two-circle construction is real, but the closed-form parametrisation could not be verified
 * against a primary source, so rather than ship a formula that might be mistranscribed, the
 * shape here is one that can be checked by inspection.
 *
 * The NARROW end points back down the timeline, at the strands. The narrow end is the point
 * of highest curvature, which is where converging lines naturally want to gather.
 *
 * @param narrowRatio semi-axis of the narrow end over the round end. Real eggs sit near 0.65.
 */
export function eggPath(cx: number, cy: number, aWide: number, height: number, narrowRatio = 0.62) {
  const b = height / 2;
  const aNarrow = aWide * narrowRatio;
  const k = 0.5523; // circular-arc constant: the cubic Bezier approximation of a quarter ellipse
  return [
    `M ${cx - aNarrow} ${cy}`,
    `C ${cx - aNarrow} ${cy - b * k}, ${cx - aNarrow * k} ${cy - b}, ${cx} ${cy - b}`,
    `C ${cx + aWide * k} ${cy - b}, ${cx + aWide} ${cy - b * k}, ${cx + aWide} ${cy}`,
    `C ${cx + aWide} ${cy + b * k}, ${cx + aWide * k} ${cy + b}, ${cx} ${cy + b}`,
    `C ${cx - aNarrow * k} ${cy + b}, ${cx - aNarrow} ${cy + b * k}, ${cx - aNarrow} ${cy}`,
    'Z',
  ].join(' ');
}
