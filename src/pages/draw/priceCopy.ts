/**
 * priceCopy.ts — the words next to the number, kept where they can be tested.
 *
 * WHY THIS IS ITS OWN MODULE. The panel is rendered from `DrawPage`, which
 * pulls in R3F and three.js, and this suite runs in a bare node environment
 * with no DOM on purpose (see vitest.config.ts). So the copy that matters most
 * would be the only copy nothing could pin. It is one import and it buys a
 * regression test on the sentence that carries the honesty claim.
 *
 * WHY THE LABEL IS NOT "FIXED". It said "fixed" until 2026-07-17, and that word
 * was doing work the number cannot support. `pricing.ts` builds the figure
 * line-by-line from the real BOM, so it MOVES correctly, and its own header
 * carries the loudest TODO in the demo: every unit rate in PRICING is a
 * PLACEHOLDER until fab quotes land. A price that is honestly derived from
 * placeholder rates is indicative, not fixed. "Fixed" is what you say AFTER the
 * quotes come back, and they have not.
 *
 * The decomposition stays visible because the decomposition is the credible
 * part: 194 pieces and 108 nodes are counted off the actual kit and are true
 * right now. It is the MAGNITUDE that is pre-quote, not the object. Keeping
 * both on screen says exactly that, and says it in four words.
 *
 * Do not "fix" this by moving a rate in PRICING to make the figure look more
 * like the deck. That is reverse-engineering evidence to fit a claim.
 */

/**
 * The qualifier that sits beside the figure, not buried under it: a reader who
 * takes only the number should have already read this.
 */
export const PRICE_QUALIFIER = 'indicative · pre-quote';

/** The BOM decomposition: every number here is counted off the real kit. */
export function priceMetaLine(kit: {
  footprintM2: number;
  feetCount: number;
  pieceCount: number;
  nodeCount: number;
}): string {
  return `${kit.footprintM2.toFixed(1)} m² · ${kit.feetCount} feet · ${kit.pieceCount} pieces · ${kit.nodeCount} nodes`;
}
