import { describe, it, expect } from 'vitest';
import { growAt, cardLineAt, GROWN_BY, UNFURL_SPAN, revealSpanPx, readerLead, clamp01, organAt, ORGAN_LAG, ORGAN_FADE } from './reveal';
import { subBranchPolylines, computePlates, SUB_ORDER_STAGGER, subBranchOrderLag, subBranchStagger } from './CrossPathsTimeline';

/**
 * reveal.ts HAD NO TESTS, and it is the expression the entire page's motion is made of. That is why
 * round 10's defect survived: the timeline's growth was reasoned about in a comment and never
 * measured.
 *
 * THE RULE, from Daniel on 2026-07-16, and it is the only thing these tests are about:
 *
 *   "The animation must be fully COMPLETE by the halfway mark, not starting near it."
 *
 * An element rises up the frame: it enters at the bottom (frame-fraction 1.0) and travels to the top
 * (0.0). By the time it reaches 0.5 it must be finished growing. Measured before the fix, growth
 * STARTED at 50.6%-51.3% ("a little before the halfway mark", exactly as he described it) and
 * COMPLETED at 33%-43% — well after. So the whole animation played across the halfway mark instead
 * of finishing at it.
 *
 * WHAT THESE TESTS DO NOT COVER, stated plainly so the green does not overclaim: they exercise the
 * FUNCTIONS, not the components. vitest here is configured for pure functions with no jsdom ("Nothing
 * here renders a component"), so nothing below can see whether CrossPathsTimeline actually places its
 * line against the same stagger it lags its branches by. Sabotaged that exact desync — line placed
 * against the SUB_ORDER_STAGGER ceiling while the branches lag by the frame-fitted value — and this
 * suite passed. The wiring is held instead by construction: both come from one `stagger` computed
 * once in the parent and handed down, with a comment at the site saying why. Worth knowing that the
 * guard there is a convention, not this file.
 */

/**
 * Where in its frame (1 = bottom edge, 0 = top edge) an element is when `grow` first reaches 1.
 *
 * `lag` is what THIS element carries; `maxLag` is what the LINE was placed against (the largest lag
 * anything in the frame carries). They are separate arguments because conflating them is the whole
 * subtlety: the line is placed once, for the frame, against the worst case — so a less-lagged
 * element finishes EARLIER than GROWN_BY, and only the most-lagged one lands exactly on it.
 */
function completionFraction(frameH: number, span: number, lag: number, maxLag: number = lag): number {
  const frameTop = 0;
  const line = cardLineAt(frameTop, frameH, span, maxLag);
  // Walk the element up the frame and find where it is when it finishes.
  for (let i = 0; i <= 20000; i++) {
    const f = 1 - i / 20000;
    if (growAt(line, frameTop + frameH * f, span, lag) >= 1) return f;
  }
  return -Infinity; // never finished anywhere in the frame
}

describe('THE RULE: growth is finished by the halfway mark', () => {
  const VIEWPORTS = [700, 800, 900, 1080, 1440];

  it('an unlagged thing finishes exactly at the halfway mark, at every viewport height', () => {
    // Exactly, not approximately, and at EVERY height — which is the reason the line is placed by a
    // function rather than pinned to a fraction. The old CARD_LINE = 0.52 could not do this: its
    // completion point drifted with the viewport (33.1% at 700px, 42.8% at 1440px) because the span
    // is a distance and the line was a proportion. One constant cannot hold an invariant that has a
    // distance in it.
    for (const vh of VIEWPORTS) {
      const f = completionFraction(vh, revealSpanPx(0.696), 0);
      expect(f, `viewport ${vh}px finishes at ${(f * 100).toFixed(1)}% of the frame`).toBeCloseTo(GROWN_BY, 3);
    }
  });

  it('the same holds in the timeline\'s world units, which is a different frame and the same rule', () => {
    for (const viewH of [1000, 1293, 1500]) {
      const f = completionFraction(viewH, UNFURL_SPAN, 0);
      expect(f, `viewH ${viewH} world units`).toBeCloseTo(GROWN_BY, 3);
    }
  });

  it('THE ONE THAT MATTERS: every real sub-branch is finished by halfway, however deep in the tree', () => {
    /**
     * This is the assertion the page actually needed, and the one whose absence let the bug ship.
     *
     * The sub-branches stagger by tree depth so parents draw before children. The lag was 55 units
     * PER ORDER against a tree that is 21 deep — up to 1155 units of delay behind an UNFURL_SPAN of
     * 175. Measured against the real geometry at viewH 1293: 195 of 195 runs unfinished at halfway,
     * MEDIAN completion at 16.4% of the frame, and 64 of them (33%) finishing at a negative fraction
     * — that is, still growing after they had scrolled off the top of the screen. Playing to nobody.
     *
     * reveal.ts had reasoned the opposite in a comment: "THE TIMELINE DOES NOT USE THIS AND MUST NOT.
     * Its branches are short: each draws over UNFURL_SPAN as it crosses the card line and completes
     * at ~38% of the frame, well inside." That is true of order 0 and only order 0 — 38 of the 195
     * runs. The comment reasoned about the span and forgot the lag stacked on top of it. It is the
     * same defect round 7 fixed for the founders' arms ("a 650px arm's tail only drew when the card
     * line reached the tail, by which time its head was long gone"), and it was sitting in the
     * timeline the whole time, behind a comment saying it could not be.
     */
    const runs = subBranchPolylines();
    expect(runs.length, 'no runs — the probe is measuring nothing').toBeGreaterThan(40);

    const maxOrder = Math.max(...runs.map((r) => r.order));
    expect(maxOrder, 'the tree is deep; that is the whole point of this test').toBeGreaterThan(10);

    for (const viewH of [1000, 1293, 1500]) {
      const stagger = subBranchStagger(viewH);
      const worst = runs
        .map((r) => ({ order: r.order, f: completionFraction(viewH, UNFURL_SPAN, subBranchOrderLag(r.order, maxOrder, stagger), stagger) }))
        .sort((a, b) => a.f - b.f)[0];
      expect(
        worst.f,
        `viewH ${viewH}: the deepest branch (order ${worst.order}) is still growing at ${(worst.f * 100).toFixed(1)}% ` +
          `of the frame — past the halfway mark. Suspect the order stagger (${stagger.toFixed(0)}) against the span.`,
      ).toBeGreaterThanOrEqual(GROWN_BY - 1e-3);
    }
  });

  it('...and every plate too — a plate and the branch beside it are one event', () => {
    // Daniel: "both of those emissions should match each other." A plate carries no lag, so it
    // finishes at or before the deepest twig; what matters is that it, too, clears halfway.
    const plates = computePlates();
    expect(plates.length).toBeGreaterThan(5);
    for (const viewH of [1000, 1293, 1500]) {
      const f = completionFraction(viewH, UNFURL_SPAN, 0, subBranchStagger(viewH));
      expect(f, `viewH ${viewH}: plates finish at ${(f * 100).toFixed(1)}%`).toBeGreaterThanOrEqual(GROWN_BY - 1e-3);
    }
  });

  it('growth still STARTS inside the frame — finishing early must not mean starting off-screen', () => {
    /**
     * The other side of the fix, and the reason the stagger is bounded rather than merely accounted
     * for. Placing the line to finish the DEEPEST twig by halfway means the whole event occupies a
     * band of (span + stagger) below that. If the stagger stayed at 1155 that band would be 103% of
     * the frame: growth would begin below the bottom edge and the reader would never see it start.
     * "Complete by halfway" is satisfiable trivially and uselessly by growing everything off-screen.
     * So the event has to FIT: it must begin inside the frame and end at the middle of it.
     */
    /**
     * ASSERTED AT THE BOTTOM EDGE, and the first draft of this test was wrong in a way worth
     * recording. It searched downward from f=1 for the first f where grow>0 and asserted `<= 1`.
     * That cannot fail: if growth has already started (or finished) below the frame, the search
     * simply reports f=1 and reads as healthy. Sabotaged with the old 1155 stagger it PASSED — a
     * test for "does growth start off-screen" that could not see off-screen, because it never looked
     * past the edge it was asking about. The instrument only sampled where the answer was safe.
     *
     * The honest question is a state, not a search: AT the bottom edge, has anything begun? If a
     * thing is already growing the moment it appears, the reader missed the start of it.
     */
    for (const viewH of [1000, 1293, 1500]) {
      const runs = subBranchPolylines();
      const maxOrder = Math.max(...runs.map((r) => r.order));
      const stagger = subBranchStagger(viewH);
      const line = cardLineAt(0, viewH, UNFURL_SPAN, stagger);
      // Order 0 is the earliest thing to move, so it is the one that would breach the bottom edge.
      const atBottomEdge = growAt(line, viewH, UNFURL_SPAN, subBranchOrderLag(0, maxOrder, stagger));
      expect(
        atBottomEdge,
        `viewH ${viewH}: the ornament is already ${(atBottomEdge * 100).toFixed(1)}% grown at the frame's bottom edge — ` +
          `it began off-screen and the reader never sees it start. The event (span ${UNFURL_SPAN} + stagger ` +
          `${stagger.toFixed(0)} = ${(UNFURL_SPAN + stagger).toFixed(0)}) is taller than the ${(viewH * (1 - GROWN_BY)).toFixed(0)} ` +
          `units it has below the halfway mark.`,
      ).toBe(0);
    }
  });

  it('the stagger still orders parents before children', () => {
    // Bounding it must not flatten it into a uniform fade, which is the thing the lag exists to
    // prevent ("Trunk -> branch -> twig, in that order, rather than a tree that fades in uniformly").
    const maxOrder = 21;
    for (let o = 1; o <= maxOrder; o++) {
      expect(subBranchOrderLag(o, maxOrder, SUB_ORDER_STAGGER)).toBeGreaterThan(subBranchOrderLag(o - 1, maxOrder, SUB_ORDER_STAGGER));
    }
    expect(subBranchOrderLag(0, maxOrder, SUB_ORDER_STAGGER)).toBe(0);
    expect(subBranchOrderLag(maxOrder, maxOrder, SUB_ORDER_STAGGER)).toBeCloseTo(SUB_ORDER_STAGGER, 6);
  });

  it('a one-node tree does not divide by zero', () => {
    expect(subBranchOrderLag(0, 0, SUB_ORDER_STAGGER)).toBe(0);
  });
});

describe('reduced motion and the degenerate ends', () => {
  it('an infinite card line saturates everything to fully grown', () => {
    // usePageCardLine returns Infinity under reduced motion, and the whole page must settle grown.
    expect(growAt(Infinity, 500, UNFURL_SPAN)).toBe(1);
    expect(clamp01(Infinity)).toBe(1);
  });

  it('readerLead is the distance from the line to the bottom of the frame', () => {
    expect(readerLead(900)).toBeCloseTo(900 * (1 - GROWN_BY), 6);
  });

  it('an organ never opens before the stem it sits on has drawn past it', () => {
    // The correctness round 7 called out: organs key to their stem's growth, not to their own y.
    expect(organAt(0, 0.5)).toBe(0);
    expect(organAt(0.5 + ORGAN_LAG - 0.001, 0.5)).toBe(0);
    expect(organAt(0.5 + ORGAN_LAG + ORGAN_FADE, 0.5)).toBeCloseTo(1, 6);
  });
});
