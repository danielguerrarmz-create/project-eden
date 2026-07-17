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
 * camera's, placed against `camY`. The founders and the coda are in normal page flow and have no
 * camera, so their frame is the viewport and their line is placed against `scrollY`. Same rule, same
 * span, same ramp — the difference is only which frame the reader is looking through. See
 * `cardLineAt`, which is the one place either of them is decided.
 */

export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/**
 * GROWTH IS FINISHED BY THE TIME A THING HAS RISEN TO THE MIDDLE OF ITS FRAME.
 *
 * Daniel, 2026-07-16, and it was the single most repeated note of the round: "it's already too
 * late... the animation must be fully COMPLETE by the halfway mark, not starting near it."
 *
 * A frame-fraction: 1 is the bottom edge, 0 the top, and an element rises from 1 towards 0 as the
 * reader scrolls. This is the moment growth must be OVER, not the moment it starts.
 *
 * THIS REPLACES `CARD_LINE = 0.52`, and the difference is not the number, it is the KIND of thing.
 * 0.52 pinned where growth BEGAN and let the ending fall wherever the arithmetic put it — which was
 * 33% of the frame at a 700px viewport and 43% at 1440px, because the span is a DISTANCE and the
 * line was a PROPORTION, so the gap between them scaled with the window. There is no value of
 * CARD_LINE that finishes at the middle of every frame. Naming the END and solving for the line is
 * the only way the rule can hold everywhere, so that is what `cardLineAt` does.
 */
export const GROWN_BY = 0.5;

/**
 * The dead zone: a thing does not begin growing the instant the line touches it.
 *
 * It was an unnamed `- 10` inside `growAt`. It matters here only because `cardLineAt` has to add it
 * back: the two cancel, which is what makes completion land EXACTLY on GROWN_BY rather than ten
 * units past it. Naming it is what makes that cancellation legible instead of looking like a fudge.
 */
const LINE_NUDGE = 10;

/**
 * WHERE TO PUT THE REVEAL LINE so that growth is over by `GROWN_BY`. The whole of item 2 is this
 * function, and every frame on the page gets its line from here.
 *
 * Solve `growAt(...) = 1` for the line, given where the thing must be when it finishes:
 *
 *     grow = (line - y - LINE_NUDGE - lag) / span = 1   at   y = frameTop + frameH * GROWN_BY
 *     =>   line = frameTop + frameH * GROWN_BY + LINE_NUDGE + span + lag
 *
 * `maxLag` is the LARGEST lag anything in this frame carries, so that the LAST thing to finish still
 * finishes by GROWN_BY. Everything less lagged finishes earlier, which is what "by" means and is
 * also what keeps a plate and the branch beside it reading as one event rather than two.
 *
 * The event therefore occupies a band of `span + maxLag` below the halfway mark. That band has to
 * FIT INSIDE THE FRAME, and this is the constraint that bites: "complete by halfway" is satisfiable
 * trivially and uselessly by making the band so tall that growth begins below the bottom edge and
 * the reader never sees it happen. See SUB_ORDER_STAGGER, which is bounded for exactly this reason,
 * and the test that pins it.
 */
export function cardLineAt(frameTop: number, frameH: number, span: number, maxLag = 0): number {
  return frameTop + frameH * GROWN_BY + LINE_NUDGE + span + maxLag;
}

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
  return clamp01((cardLine - y - LINE_NUDGE - lag) / span);
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

/**
 * HOW FAR AHEAD OF THE READER A PAGE-FLOW REGION STARTS GROWING — the distance from the card line to
 * the viewport's bottom edge, so a region begins the moment its top first appears at the bottom of
 * the screen.
 *
 * Daniel: "Let the flowers and vine make their loading animation earlier in the cycle, so they are
 * fully visualized before being out of frame, like it currently is now."
 *
 * The reveal is a LINE, not a trigger, so "start earlier" is a DISTANCE rather than a threshold —
 * this is the card-line equivalent of an IntersectionObserver's `rootMargin`. The plant starts
 * growing below the fold and is finished by the time the reader arrives.
 *
 * THE TIMELINE DOES NOT USE THIS, and the reason is that its plates fade on the same line as its
 * branches, so pulling the branches ahead of the reader without the plates would break the one thing
 * Daniel has been consistent about: "both of those emissions should match each other". It gets to
 * the same place by a different route — `cardLineAt` places its line so the whole event lands in the
 * frame's bottom half.
 *
 * THIS PARAGRAPH USED TO SAY THE TIMELINE WAS FINE AND IT WAS WRONG, which is worth leaving on the
 * record because the comment is what stopped anyone measuring. It read: "Its branches are short:
 * each draws over UNFURL_SPAN as it crosses the card line and completes at ~38% of the frame, well
 * inside." True of order 0, and only order 0 — 38 of 195 runs. It reasoned about the span and forgot
 * the order lag stacked on top of it, which ran to 1155 units against a span of 175. Measured, 195
 * of 195 runs were unfinished at halfway and 64 finished after leaving the top of the screen. A
 * confident comment is not a measurement, and this file had no tests until round 10 (reveal.test.ts).
 */
export function readerLead(viewportH: number): number {
  return viewportH * (1 - GROWN_BY);
}

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
