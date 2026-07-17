import { describe, it, expect } from 'vitest';
import { PRICE_QUALIFIER, priceMetaLine } from './priceCopy';

describe('the price label does not claim more than the price knows', () => {
  it('never calls the figure fixed', () => {
    // The word this replaced. Every rate behind the number is a placeholder
    // until fab quotes land (pricing.ts's own header), so "fixed" asserted a
    // certainty that does not exist yet.
    expect(PRICE_QUALIFIER.toLowerCase()).not.toContain('fixed');
  });

  it('says both that it is a guide and that no quote exists yet', () => {
    // Two different admissions, and the panel needs both: "indicative" is about
    // the magnitude, "pre-quote" is about why.
    expect(PRICE_QUALIFIER.toLowerCase()).toContain('indicative');
    expect(PRICE_QUALIFIER.toLowerCase()).toContain('pre-quote');
  });

  it('never hardens into quote language', () => {
    // Guards the drift that would undo this: a later edit reaching for
    // "quoted", "guaranteed", "final" and quietly making the claim again.
    for (const word of ['guaranteed', 'final', 'exact', 'confirmed', 'quoted price']) {
      expect(PRICE_QUALIFIER.toLowerCase()).not.toContain(word);
    }
  });

  it('uses no em or en dash, like every other on-camera string', () => {
    expect(/[—–]/.test(PRICE_QUALIFIER)).toBe(false);
    expect(/[—–]/.test(priceMetaLine({ footprintM2: 14.3, feetCount: 4, pieceCount: 194, nodeCount: 108 }))).toBe(false);
  });

  it('is short enough to sit beside the figure', () => {
    // The panel is a hero-shot HUD, not a disclaimer box. If this grows, it
    // wraps and pushes the BOM line around.
    expect(PRICE_QUALIFIER.length).toBeLessThanOrEqual(26);
  });
});

describe('the decomposition stays on screen', () => {
  it('keeps every number that makes the price credible', () => {
    // The magnitude is pre-quote; the KIT is not. 194 pieces and 108 nodes are
    // counted off the real thing, and they are the reason to believe the panel
    // at all, so honesty about the figure must not cost the decomposition.
    const line = priceMetaLine({ footprintM2: 14.3, feetCount: 4, pieceCount: 194, nodeCount: 108 });
    expect(line).toContain('14.3 m²');
    expect(line).toContain('4 feet');
    expect(line).toContain('194 pieces');
    expect(line).toContain('108 nodes');
  });

  it('reports the kit it is given, not a remembered one', () => {
    const line = priceMetaLine({ footprintM2: 22.6, feetCount: 6, pieceCount: 240, nodeCount: 131 });
    expect(line).toBe('22.6 m² · 6 feet · 240 pieces · 131 nodes');
  });
});
