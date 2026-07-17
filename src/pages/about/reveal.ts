/**
 * reveal.ts — ONE motion for the whole page.
 *
 * Daniel: "Make sure that all flowers on site, the founder ones and the ones below, appear in the
 * same motion as the timeline ones." And, earlier, that a plate arriving and the branch beside it
 * growing are one event: "both of those emissions should match each other."
 *
 * He is consistent about this, and the reason is that the page's whole claim is that it is ONE PLANT
 * growing. Three regions that each animate in their own dialect break that at the seam: if the
 * founder vines pop in while the timeline draws on, the illusion dies. So the motion lives here, in
 * one place, and the three regions call it. Copying the animation into three call sites is how they
 * drift apart on the next change — which is the whole reason this file exists rather than a
 * convention.
 *
 * ---
 *
 * THE MECHANISM, and why it is a LINE rather than a trigger.
 *
 * The plates fade on `clamp01((cardLineY - y - 10) / UNFURL_SPAN)`: a line sweeping down the
 * drawing, and how far past it a thing is. Everything else reveals on the SAME expression, read at
 * its own position. So a plate arriving and the branch beside it growing are not two animations that
 * agree — they are one expression read at two places, and they cannot drift.
 *
 * An IntersectionObserver ("animate when it enters the viewport") is the obvious alternative and it
 * is the wrong one HERE, for a reason worth keeping: the plates are scroll-driven, so an observer
 * would make the branch a DIFFERENT event from the plate beside it — exactly the thing Daniel's note
 * rules out. It also cannot express "a beat behind", because it has no notion of distance.
 *
 * ---
 *
 * TWO CARD LINES, ONE RULE. The timeline is a sticky frame with a panning camera, so its line is the
 * camera's: `camY + viewH * CARD_LINE`. The founders and the coda are in normal page flow and have
 * no camera, so their line is the viewport's own: `scrollY + innerHeight * CARD_LINE`. Same
 * fraction, same span, same ramp — the difference is only which frame the reader is looking through,
 * and in both cases the answer to "how grown is this?" is "how far is it past 52% of the frame".
 */

export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/** The reveal line sits at 52% of the frame; a thing grows as the line passes it. */
export const CARD_LINE = 0.52;

/**
 * How much travel a thing takes to arrive, in the units of whatever line it is read against.
 *
 * The timeline reads this in WORLD units (its drawing is 1200 wide and scales into its frame), and
 * the page reads it in CSS px. They are the same motion on screen only if the screen distances
 * match, so `revealSpanPx` converts rather than reusing the number — see there.
 */
export const UNFURL_SPAN = 175;

/**
 * The same span, in CSS px, for regions that live in page flow.
 *
 * NOT 175. The timeline draws in world units and scales them into its frame — measured at 1440x900,
 * 1200 world units render into an 835px frame, so its 175-unit reveal is ~122 CSS px on screen. A
 * page-flow region using 175 CSS px would reveal over a visibly longer stretch than the timeline
 * does, which is a different motion wearing the same constant. `frameScale` is the timeline's
 * measured px-per-world-unit; pass it and this returns the distance that LOOKS the same.
 */
export function revealSpanPx(frameScale: number): number {
  return UNFURL_SPAN * (frameScale > 0 ? frameScale : 0.696);
}

/**
 * HOW GROWN IS IT: 0 (not yet) → 1 (fully). The one expression.
 *
 * `lag` pushes a thing later by a distance — this is what "draw parents before children" and "the
 * foliage a beat behind the stem" are made of. A distance, not a delay, because everything here is
 * read against a line rather than a clock.
 */
export function growAt(cardLine: number, y: number, span: number, lag = 0): number {
  return clamp01((cardLine - y - 10 - lag) / span);
}

/**
 * When an ORGAN opens, given how grown its own stem is.
 *
 * `t` is where the organ sits along that stem (0 root, 1 tip), so it cannot open until the stem has
 * drawn past it — then a beat later. Keying an organ to its OWN stem's growth rather than to its y
 * is the whole correctness of this: space colonization grows in every direction, and 195 of 332
 * organs sit ABOVE the root they grow from, so anything keyed to height uncovers blossoms whose twig
 * has not been drawn. (It did. The page showed flowers floating on bare paper.)
 */
export function organAt(stemGrow: number, t: number, lag = ORGAN_LAG, fade = ORGAN_FADE): number {
  return clamp01((stemGrow - t - lag) / fade);
}

/** How far behind its own stem an organ follows, as a fraction of the stem's draw. */
export const ORGAN_LAG = 0.12;
/** How long an organ takes to open, same units. */
export const ORGAN_FADE = 0.22;

/**
 * The reveal disc's radius, CSS px / world units — comfortably larger than the biggest organ, because
 * a disc that clips its own organ is just a differently-shaped bug.
 */
export const ORGAN_DISC_R = 85;

/** Arc length of a polyline — the dash reveal needs it, and `getTotalLength()` would mean reading
 *  layout back out of the DOM for geometry we already have in hand. */
export function polyLen(pts: ReadonlyArray<{ x: number; y: number }>): number {
  let d = 0;
  for (let i = 1; i < pts.length; i++) d += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  return d;
}

/**
 * The dash pair that reveals `grow` of a path of length `len`, root → tip.
 *
 * Returns undefined at full growth ON PURPOSE, so a finished stem carries no dash attributes at all:
 * a `stroke-dasharray` of its own length still forces the renderer to walk the dash machinery every
 * frame for a line that is simply solid, and reduced motion must produce plain paths.
 */
export function dashProps(len: number, grow: number): { strokeDasharray?: number; strokeDashoffset?: number } {
  if (grow >= 1) return {};
  return { strokeDasharray: len, strokeDashoffset: len * (1 - grow) };
}
