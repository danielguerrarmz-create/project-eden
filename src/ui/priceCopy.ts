/**
 * priceCopy.ts — the words next to the numbers, kept where they can be tested.
 *
 * WHY THIS IS ITS OWN MODULE. The surfaces that carry a price pull in R3F and
 * three.js, and this suite runs in a bare node environment with no DOM on
 * purpose (see vitest.config.ts). So the copy that matters most would be the
 * only copy nothing could pin. It is one import and it buys a regression test
 * on the sentences that carry the honesty claim.
 *
 * It moved here from `pages/draw/` on 2026-07-17 when the honesty pass reached
 * the other three surfaces. `ui/` importing from `pages/draw/` was backwards,
 * and this copy was never draw-specific.
 *
 * ---------------------------------------------------------------------------
 * THE TWO KINDS OF NUMBER. This is the whole reason the module exists, and the
 * distinction it enforces is the thing to preserve:
 *
 *   COMMISSION RANGE (£75k to £150k) is STATED. It is the pricing ladder's
 *   core-product tier, a business decision about what an Eden is sold for. No
 *   code computes it. It does not move when you shape the form.
 *
 *   COST BUILD-UP (~£17k) is COMPUTED. `pricing.ts` builds it line-by-line
 *   from the real BOM, so it MOVES correctly, and its own header carries the
 *   loudest TODO in the demo: every unit rate in PRICING is a PLACEHOLDER
 *   until fab quotes land. It is the cost of a kit and its install at invented
 *   rates. It is NOT a commission price, and the two differ by ~6x because
 *   they measure different things: one is cost-plus, one is value-based.
 *
 * They must never be rendered as the same kind of number, and neither is a
 * quote. Keeping them apart, and saying which is which, is the honest position
 * available right now.
 * ---------------------------------------------------------------------------
 *
 * WHY THE LABEL IS NOT "FIXED". It said "fixed" until 2026-07-17, and that word
 * was doing work no number here can support. A price honestly derived from
 * placeholder rates is indicative, not fixed. "Fixed" is what you say AFTER the
 * quotes come back, and they have not.
 *
 * The decomposition stays visible because the decomposition is the credible
 * part: 194 pieces and 108 nodes are counted off the actual kit and are true
 * right now. It is the MAGNITUDE that is pre-quote, not the object.
 *
 * Do not "fix" any of this by moving a rate in PRICING to make the computed
 * figure look more like the stated range. That is reverse-engineering evidence
 * to fit a claim, and it would not survive one question from a technical
 * reader. The gap is real. Report it; do not close it in code.
 */

/**
 * The qualifier that sits beside a computed figure, not buried under it: a
 * reader who takes only the number should have already read this.
 */
export const PRICE_QUALIFIER = 'indicative · pre-quote';

/**
 * The commission range, quoted from the pricing ladder's core-product tier
 * (pavilion / studio / sauna, installed and planted). STATED, not computed.
 *
 * The ladder itself is still marked "proposed, DECISION open", which is why
 * every string here says "typically" and none says "your price". If Daniel
 * settles the ladder, this is the one place the bounds live.
 */
export const COMMISSION_RANGE = '£75k to £150k';

/** What the range is a range OF. Sits with it, never with a computed figure. */
export const COMMISSION_LABEL = 'commission, installed and planted';

/** The qualifier for the STATED range: a range, and no quote behind it yet. */
export const COMMISSION_QUALIFIER = 'indicative range · pre-quote';

/** The range in a sentence, for surfaces with room for one. */
export const COMMISSION_NOTE =
  'What an Eden of this kind typically commissions for, installed and planted. Your own figure is set after a site survey and a fabrication quote, not before.';

/** The disclosure that opens the computed build-up. Deliberately not "price". */
export const COST_BUILDUP_LABEL = 'how this design costs out';

/**
 * The admission that has to travel with the computed figure everywhere it is
 * shown. Two separate things, and it needs both: the rates are invented, AND
 * this is not the commission price.
 */
export const COST_BUILDUP_NOTE =
  "A build-up from this design's real cut list, at placeholder rates. It moves correctly as you shape the form, but every rate is a placeholder until fabrication quotes land. It is the cost of the kit and its install, not the commission price.";

/** The BOM decomposition: every number here is counted off the real kit. */
export function priceMetaLine(kit: {
  footprintM2: number;
  feetCount: number;
  pieceCount: number;
  nodeCount: number;
}): string {
  return `${kit.footprintM2.toFixed(1)} m² · ${kit.feetCount} feet · ${kit.pieceCount} pieces · ${kit.nodeCount} nodes`;
}
