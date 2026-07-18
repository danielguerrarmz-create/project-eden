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
 *   COMMISSION FLOOR (from £150k) is STATED, and it is a PRICE. Daniel's own
 *   ladder — a business decision about what an Eden is sold for. No code
 *   computes it. It does not move when you shape the form.
 *
 *   COST TO CONSTRUCT (~£15k) is COMPUTED, and it is a COST. `pricing.ts`
 *   builds it line-by-line from the real BOM, so it MOVES correctly, and its
 *   own header carries the loudest TODO in the demo: every unit rate in
 *   PRICING is a PLACEHOLDER until fab quotes land.
 *
 * They must never be rendered as the same kind of number, and neither is a
 * quote. A cost and a price are ALLOWED to differ — the difference is the
 * business. What is not allowed is presenting one as evidence for the other.
 *
 * THE GAP IS NOW ~10x, AND IT IS ON SCREEN ON PURPOSE (2026-07-17). Daniel
 * asked for the cost to construct to be visible and expandable; the commission
 * floor sits beside it. They visibly disagree, and they always have. That is a
 * real thing for Daniel to see, not a rendering bug to hide in a disclosure:
 * ~£15k of construction against a £150k floor implies ~90% gross margin, while
 * the brief's own target is 35-45%. Something is wrong and it is NOT resolvable
 * from this file: either the placeholder rates are far too low (most likely —
 * nobody has quoted them), or the cost base and the ladder were built from
 * different assumptions. Flagged, not papered.
 *
 * Do not "fix" it by moving a rate in PRICING until the total looks like the
 * ladder. Choosing rates so the output matches the marketing number and then
 * showing that output as evidence FOR the number is circular, and it is the one
 * move that dies to a single question from a technical reader. Daniel
 * authorised fake numbers; he did not authorise fabricated evidence, and he is
 * the one who would be holding it on camera.
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
 * The commission FLOOR. STATED, not computed. Daniel's own ladder, 2026-07-17:
 * "core commissions from £150k, landmark and hospitality pieces into the mid
 * six figures."
 *
 * It said `£75k to £150k` this morning, taken from the written ladder in the
 * evaluator brief. **The founder superseded that ladder.** £150k is now the
 * FLOOR, not the ceiling, and the £25-50k entry tier is gone from his model
 * entirely — do not reintroduce tier logic to chase it.
 *
 * A floor, not a single figure, and that distinction is load-bearing: "from
 * £150k" is open-ended and cannot be mistaken for a quote, which is the same
 * property the old range had and the reason neither ever says "your price".
 * This is the one place the number lives.
 */
export const COMMISSION_FROM = 'from £150k';

/** What the floor is a floor OF. Sits with it, never with a computed figure. */
export const COMMISSION_LABEL = 'commission, installed and planted';

/** The qualifier for the STATED floor: indicative, and no quote behind it. */
export const COMMISSION_QUALIFIER = 'indicative · pre-quote';

/** The floor in a sentence, for surfaces with room for one. */
export const COMMISSION_NOTE =
  'What an Eden of this kind commissions from, installed and planted. Landmark and hospitality pieces run into the mid six figures. Your own figure is set after a site survey and a fabrication quote, not before.';

/**
 * DEMO ONLY (2026-07-17). For a very short demo video Daniel asked the `#/draw`
 * panel to state ONE general commission figure and not get into the specifics
 * of pricing: no computed build-up, no itemisation, no money hop, no bridge, no
 * stewardship line. His words: "assume a general £150,000 figure and do not get
 * into specifics of pricing. This is for a very short demo, does not have to be
 * true."
 *
 * This CONSCIOUSLY SUPERSEDES the price-honesty pass FOR THE DEMO. The honest,
 * itemised panel — cost to construct vs stated floor, the ~10x gap on screen on
 * purpose, the bridge that prices nothing — lives in git history and its whole
 * argument is above. It is not gone, it is not filmed. When the demo is cut,
 * the honest panel comes back; the constants it needs (everything above) are
 * kept and still tested, and `#/studio` still renders them.
 *
 * A flat figure, not "from £150k", because the panel now shows one clean number
 * on camera and Daniel authorised a general figure. £150,000 is his own floor.
 */
export const COMMISSION_DEMO_FIGURE = '£150,000';

/** The mono label beside the demo figure. Register: lowercase, terse. */
export const COMMISSION_DEMO_LABEL = 'commission';

/**
 * DYNAMIC DEMO FIGURE (2026-07-17, Sai's demo-round spec §6; recalibrated to read
 * as COMPUTED per Daniel, 2026-07-17). Daniel: the on-screen figure "must feel
 * computed, not flat" — non-round and derived from the ACTUAL geometry, varying
 * as the draw changes. So it MOVES with what you draw, in named weighted
 * proportion to footprint area, real piece count, real node count and the
 * selected species' stem load, snapped to £10 (not £1,000) so the geometry
 * survives into the units. The reference bake resolves to £173,820; every other
 * draw is a different non-round figure. It is floored at Daniel's stated £150k
 * (COMMISSION_FLOOR_GBP), which a real baked design clears — only a very small
 * draw with the lightest species reaches the floor.
 *
 * DELIBERATELY SEPARATE from `pricing.ts`'s cost model. That machinery answers a
 * different, already-honest question (cost to construct); tuning it to hit a
 * marketing number is exactly the "reverse-engineer evidence to fit a figure"
 * move this file's own header refuses for the real floor. This is openly
 * demo-only. `COMMISSION_DEMO_FIGURE` (£150,000) stays what it always was: the
 * STATED general/floor figure in prose, not the computed output, which now sits
 * above it and moves.
 */
/**
 * The reference bake resolves here. NON-ROUND on purpose (Daniel, 2026-07-17:
 * "must feel computed, not flat") — a believable mid-six-figure garden-pavilion
 * commission, not a chosen round price. Every other draw lands on a different
 * non-round figure off the real geometry.
 */
export const COMMISSION_ANCHOR_GBP = 173_820;
/** The reference bake: 14.3 m², 194 pieces, 108 nodes, clematis (stemLoad01 0.5). */
export const COMMISSION_ANCHOR_AREA_M2 = 14.3;
export const COMMISSION_ANCHOR_PIECES = 194;
export const COMMISSION_ANCHOR_NODES = 108;
export const COMMISSION_AREA_WEIGHT = 0.45;
export const COMMISSION_PIECE_WEIGHT = 0.28;
export const COMMISSION_NODE_WEIGHT = 0.12;
export const COMMISSION_SPECIES_WEIGHT = 0.15;
/**
 * speciesFactor ranges 0.85 (stemLoad01=0) to 1.15 (stemLoad01=1); clematis
 * (0.5) lands it at exactly 1.0, so the reference bake's species term is a no-op
 * and the anchor calibration holds.
 */
export const COMMISSION_SPECIES_FLOOR = 0.85;
export const COMMISSION_SPECIES_SPAN = 0.3;
/** Daniel's stated "from £150k": the computed figure never dips below it. */
export const COMMISSION_FLOOR_GBP = 150_000;
/**
 * Resolution the figure snaps to. £10, NOT £1,000/£5,000: the footprint, piece
 * and node counts survive into the tens/hundreds digits, so the number reads as
 * computed (£173,820) rather than picked (£175,000). Fine enough to feel derived,
 * coarse enough that the count-up never chases per-frame noise.
 */
export const COMMISSION_STEP_GBP = 10;

export function commissionDemoFigureGBP(kit: {
  footprintM2: number;
  pieceCount: number;
  nodeCount: number;
  speciesStemLoad01: number;
}): number {
  const areaFactor = kit.footprintM2 / COMMISSION_ANCHOR_AREA_M2;
  const pieceFactor = kit.pieceCount / COMMISSION_ANCHOR_PIECES;
  const nodeFactor = kit.nodeCount / COMMISSION_ANCHOR_NODES;
  const speciesFactor =
    COMMISSION_SPECIES_FLOOR + kit.speciesStemLoad01 * COMMISSION_SPECIES_SPAN;
  const multiplier =
    COMMISSION_AREA_WEIGHT * areaFactor +
    COMMISSION_PIECE_WEIGHT * pieceFactor +
    COMMISSION_NODE_WEIGHT * nodeFactor +
    COMMISSION_SPECIES_WEIGHT * speciesFactor;
  // Snap to £10, not £1,000: the actual footprint, piece and node counts survive
  // into the tens/hundreds digits, so the figure reads as computed off the real
  // geometry (every draw a different non-round number) rather than a chosen round
  // price. At the reference bake all four factors are 1.0 => exactly the anchor.
  const stepped =
    Math.round((COMMISSION_ANCHOR_GBP * multiplier) / COMMISSION_STEP_GBP) *
    COMMISSION_STEP_GBP;
  // Never below Daniel's stated floor ("core commissions from £150k"): only a very
  // small draw with the lightest species reaches it; a real baked design clears it.
  return Math.max(COMMISSION_FLOOR_GBP, stepped);
}

export function commissionDemoLabel(gbp: number): string {
  return `£${gbp.toLocaleString('en-GB')}`;
}

/**
 * STEWARDSHIP — a revenue line the demo never mentioned, and the most on-thesis
 * number in the model: recurring income that exists BECAUSE the thing is alive.
 * A pavilion does not need stewarding; a living structure does.
 *
 * Daniel, 2026-07-17: "for stewardship, the ongoing care that keeps the living
 * structure thriving, at roughly 6-10% of install value each year."
 */
export const STEWARDSHIP_LABEL = 'stewardship';
export const STEWARDSHIP_NOTE =
  '6 to 10% of install value each year: the ongoing care that keeps the living structure thriving.';

/**
 * The summary Daniel asked for: "a summary cost to construct, and then the user
 * can expand it and see their itemized costs."
 *
 * "Cost to construct" is the honest name for what `pricing.ts` computes, and it
 * is a DIFFERENT KIND OF NUMBER from the commission floor above — a cost, not a
 * price. Note it includes the margin line, which is normal: a builder's price to
 * construct includes the builder's margin.
 */
export const COST_SUMMARY_LABEL = 'cost to construct';

/** The disclosure that opens the computed build-up. Deliberately not "price". */
export const COST_BUILDUP_LABEL = 'itemized';

/**
 * The admission that has to travel with the computed figure everywhere it is
 * shown. Two separate things, and it needs both: the rates are invented, AND
 * this is not the commission price.
 */
export const COST_BUILDUP_NOTE =
  "A build-up from this design's real cut list, at placeholder rates. It moves correctly as you shape the form, but every rate is a placeholder until fabrication quotes land. It is the cost of the kit and its install, not the commission price.";

/**
 * THE BRIDGE, AND WHY IT HAS NO NUMBERS IN IT.
 *
 * `CommissionSheet` put the stated floor and the computed build-up four lines
 * apart with nothing between them, so a reader met two figures an order of
 * magnitude apart and was left to explain the gap themselves. The two available
 * explanations are both wrong and both expensive: "they print money", or "the
 * £14k is fake" — and the second one takes the itemization down with it, which
 * is the most credible thing in the product (138 pieces and 80 nodes are
 * counted off the real kit and are true right now).
 *
 * So the gap gets named. It does NOT get priced, and that restraint is the
 * whole point of this constant. A numeric bridge — "kit £14k → design and
 * engineering £X → delivered £150k" — requires inventing £X, and £X could only
 * ever be BACK-SOLVED from £150k, because that is the only constraint
 * available. That is precisely the circular move this module already refuses to
 * make on rates, committed at a higher altitude and made MORE dangerous by
 * looking more rigorous. Asked about the £14k today there is a strong answer:
 * it is the real cut list at placeholder rates. There is no answer at all for
 * "how do you know design is £38,000?"
 *
 * Words, not figures. Do not add numbers to this sentence.
 */
export const COST_TO_COMMISSION_BRIDGE =
  'What this kit costs to construct is not what an Eden commissions for. Between them sit the design, the engineering stamp, the specifier’s fee, project management, insurance and VAT. Those numbers land when the quotes do.';

/**
 * WHICH RUNG THIS IS.
 *
 * The grammar caps every design at 18 m² and 2.5 m, non-occupied and
 * planning-free (`GRAMMAR.maxFootprintM2`, `pdHeightCapM`). That object is the
 * SMALLEST thing this studio makes — the original ladder called it the entry
 * piece. The £150k floor is a core commission: enclosed, serviced, larger. The
 * engine has never built one and currently cannot.
 *
 * That is not a defect to hide, it is a fact about scope, and saying it out
 * loud turns the distance between the two figures from an accusation into
 * information. It costs nothing, moves no rate, and is true.
 */
export const DEMO_SCOPE_NOTE = 'This demo models the smallest structure we make.';

/** The BOM decomposition: every number here is counted off the real kit. */
export function priceMetaLine(kit: {
  footprintM2: number;
  feetCount: number;
  pieceCount: number;
  nodeCount: number;
}): string {
  return `${kit.footprintM2.toFixed(1)} m² · ${kit.feetCount} feet · ${kit.pieceCount} pieces · ${kit.nodeCount} nodes`;
}
