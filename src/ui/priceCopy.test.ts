import { describe, it, expect } from 'vitest';
import {
  COMMISSION_LABEL,
  COMMISSION_NOTE,
  COMMISSION_QUALIFIER,
  COMMISSION_RANGE,
  COST_BUILDUP_LABEL,
  COST_BUILDUP_NOTE,
  PRICE_QUALIFIER,
  priceMetaLine,
} from './priceCopy';

/** Everything this module ships onto a screen. New export => add it here. */
const ALL_COPY = [
  PRICE_QUALIFIER,
  COMMISSION_RANGE,
  COMMISSION_LABEL,
  COMMISSION_QUALIFIER,
  COMMISSION_NOTE,
  COST_BUILDUP_LABEL,
  COST_BUILDUP_NOTE,
];

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
    for (const s of ALL_COPY) expect(/[—–]/.test(s)).toBe(false);
    expect(
      /[—–]/.test(priceMetaLine({ footprintM2: 14.3, feetCount: 4, pieceCount: 194, nodeCount: 108 })),
    ).toBe(false);
  });

  it('is short enough to sit beside the figure', () => {
    // The panel is a hero-shot HUD, not a disclaimer box. If this grows, it
    // wraps and pushes the BOM line around.
    expect(PRICE_QUALIFIER.length).toBeLessThanOrEqual(26);
    expect(COMMISSION_QUALIFIER.length).toBeLessThanOrEqual(32);
  });
});

describe('the stated commission range is stated, and says so', () => {
  it('carries the ladder bounds, so a drift toward the computed figure fails here', () => {
    // The one test that would catch the forbidden "fix": moving the range down
    // toward the engine's ~£17k (or a rate up toward the range) so the two
    // agree. They do not agree, they are not the same kind of number, and the
    // ~6x gap is real until fab quotes land. See the module header.
    expect(COMMISSION_RANGE).toContain('75k');
    expect(COMMISSION_RANGE).toContain('150k');
    expect(COMMISSION_RANGE).not.toContain('17');
  });

  it('is a range and never a single figure', () => {
    // A range that collapses to one number is a price, and there is no price.
    expect(COMMISSION_RANGE.toLowerCase()).toContain(' to ');
    expect(COMMISSION_QUALIFIER.toLowerCase()).toContain('range');
  });

  it('admits no quote stands behind it', () => {
    expect(COMMISSION_QUALIFIER.toLowerCase()).toContain('pre-quote');
    expect(COMMISSION_NOTE.toLowerCase()).toContain('typically');
    // The ladder is still marked "proposed, DECISION open" in the brief, so the
    // copy may say what an Eden typically commissions for. It may not tell the
    // reader that this is THEIR price.
    expect(COMMISSION_NOTE.toLowerCase()).not.toContain('your price');
    for (const word of ['fixed', 'guaranteed', 'commitment']) {
      expect(COMMISSION_NOTE.toLowerCase()).not.toContain(word);
      expect(COMMISSION_QUALIFIER.toLowerCase()).not.toContain(word);
    }
  });

  it('says what the range includes, since "installed" is the load-bearing word', () => {
    // £75k for a kit and £75k installed and planted are different claims. The
    // ladder's tier is the installed one.
    expect(COMMISSION_LABEL.toLowerCase()).toContain('installed');
    expect(COMMISSION_NOTE.toLowerCase()).toContain('installed');
  });
});

describe('the computed build-up never passes itself off as the price', () => {
  it('is not labelled a price', () => {
    // "how this price is built" was the old label, and it conceded the whole
    // point: it is not the price, it is what the kit costs out at.
    expect(COST_BUILDUP_LABEL.toLowerCase()).not.toContain('price');
  });

  it('admits the rates are invented', () => {
    expect(COST_BUILDUP_NOTE.toLowerCase()).toContain('placeholder');
  });

  it('denies being the commission price, in as many words', () => {
    // Without this sentence the build-up sits under a stated range looking like
    // a cheaper version of it, which is the misreading the whole pass exists to
    // prevent.
    expect(COST_BUILDUP_NOTE.toLowerCase()).toContain('not the commission price');
  });

  it('keeps the claim it CAN support: the figure moves off the real cut list', () => {
    expect(COST_BUILDUP_NOTE.toLowerCase()).toContain('cut list');
    expect(COST_BUILDUP_NOTE.toLowerCase()).toContain('moves correctly');
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
