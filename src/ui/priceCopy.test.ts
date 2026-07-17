import { describe, it, expect } from 'vitest';
import {
  COMMISSION_FROM,
  COMMISSION_LABEL,
  COMMISSION_NOTE,
  COMMISSION_QUALIFIER,
  COST_BUILDUP_LABEL,
  COST_BUILDUP_NOTE,
  COST_SUMMARY_LABEL,
  COST_TO_COMMISSION_BRIDGE,
  DEMO_SCOPE_NOTE,
  PRICE_QUALIFIER,
  STEWARDSHIP_LABEL,
  STEWARDSHIP_NOTE,
  priceMetaLine,
} from './priceCopy';

/** Everything this module ships onto a screen. New export => add it here. */
const ALL_COPY = [
  PRICE_QUALIFIER,
  COMMISSION_FROM,
  COMMISSION_LABEL,
  COMMISSION_QUALIFIER,
  COMMISSION_NOTE,
  STEWARDSHIP_LABEL,
  STEWARDSHIP_NOTE,
  COST_SUMMARY_LABEL,
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

describe('the stated commission floor is stated, and says so', () => {
  it('carries Daniel s floor, so a drift toward the computed figure fails here', () => {
    // The one test that would catch the forbidden "fix": moving the floor down
    // toward the engine's ~£15k (or a rate up toward the floor) so the two
    // agree. They do not agree, they are not the same kind of number, and the
    // ~10x gap is real until fab quotes land. See the module header.
    //
    // CHANGED 2026-07-17: was `£75k to £150k`, from the evaluator brief's
    // written ladder. Daniel superseded that ladder himself — £150k is the
    // FLOOR now, not the ceiling. The assertion moved because the FACT moved,
    // which is the only reason it is allowed to move.
    expect(COMMISSION_FROM).toContain('150k');
    expect(COMMISSION_FROM).not.toContain('75k'); // the superseded ceiling
    expect(COMMISSION_FROM).not.toContain('15,'); // never the cost build-up
  });

  it('is open-ended, and never a single definite figure', () => {
    // The property that survived the ladder change. A floor cannot be mistaken
    // for a quote, the same way the old range could not: both say "at least
    // this", neither says "this". The moment it reads as one exact number it is
    // a price, and there is no price.
    expect(COMMISSION_FROM.toLowerCase()).toContain('from');
  });

  it('admits no quote stands behind it', () => {
    expect(COMMISSION_QUALIFIER.toLowerCase()).toContain('pre-quote');
    expect(COMMISSION_QUALIFIER.toLowerCase()).toContain('indicative');
    // It may say what an Eden commissions FROM. It may not tell the reader that
    // this is THEIR price.
    expect(COMMISSION_NOTE.toLowerCase()).not.toContain('your price');
    for (const word of ['fixed', 'guaranteed', 'commitment']) {
      expect(COMMISSION_NOTE.toLowerCase()).not.toContain(word);
      expect(COMMISSION_QUALIFIER.toLowerCase()).not.toContain(word);
    }
  });

  it('does not imply an entry tier that no longer exists', () => {
    // The £25-50k entry piece is gone from Daniel's ladder entirely. Nothing
    // here should imply a cheaper way in.
    //
    // Anchored on the currency symbol, and that is not fussiness: a bare '50k'
    // is a SUBSTRING of '£150k', so the naive assertion failed against the very
    // floor it was written to protect. It would have been just as wrong in the
    // other direction later, quietly passing on '£250k'.
    for (const s of [COMMISSION_FROM, COMMISSION_NOTE, COMMISSION_LABEL]) {
      expect(s).not.toContain('£25k');
      expect(s).not.toContain('£50k');
      expect(s.toLowerCase()).not.toContain('entry');
    }
  });

  it('says what the floor includes, since "installed" is the load-bearing word', () => {
    // £150k for a kit and £150k installed and planted are different claims. The
    // ladder's tier is the installed one.
    expect(COMMISSION_LABEL.toLowerCase()).toContain('installed');
    expect(COMMISSION_NOTE.toLowerCase()).toContain('installed');
  });
});

describe('stewardship, the recurring line the demo never mentioned', () => {
  it('states the rate and what it is a rate OF', () => {
    // "6 to 10%" of nothing in particular is not a business model. Install
    // value is the base, and it has to be on screen with the number.
    expect(STEWARDSHIP_NOTE).toContain('6 to 10%');
    expect(STEWARDSHIP_NOTE.toLowerCase()).toContain('install value');
  });

  it('is recurring, and says so', () => {
    expect(STEWARDSHIP_NOTE.toLowerCase()).toContain('each year');
  });

  it('names what the money is FOR, which is the whole thesis', () => {
    // Recurring revenue that exists BECAUSE the thing is alive. A pavilion does
    // not need stewarding. If this ever reads as a maintenance contract on a
    // shed, the most on-thesis number in the model has been thrown away.
    expect(STEWARDSHIP_NOTE.toLowerCase()).toContain('living');
  });

  it('never hardens into a quote either', () => {
    for (const word of ['fixed', 'guaranteed', 'your price']) {
      expect(STEWARDSHIP_NOTE.toLowerCase()).not.toContain(word);
    }
  });
});

describe('the computed build-up never passes itself off as the price', () => {
  it('is not labelled a price', () => {
    // "how this price is built" was the old label, and it conceded the whole
    // point: it is not the price, it is what the thing costs to construct.
    expect(COST_BUILDUP_LABEL.toLowerCase()).not.toContain('price');
    expect(COST_SUMMARY_LABEL.toLowerCase()).not.toContain('price');
  });

  it('names itself a COST, which is what keeps it apart from the floor', () => {
    // Daniel's own words, and they are the reason the summary can sit on the
    // hero panel at all: a cost to construct is a different kind of claim from
    // a commission price, so showing it is not the overclaim that "£17,000"
    // under a serif hero was.
    expect(COST_SUMMARY_LABEL.toLowerCase()).toContain('cost');
    expect(COST_SUMMARY_LABEL.toLowerCase()).toContain('construct');
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

describe('the bridge between the two figures', () => {
  it('names every category that sits in the gap', () => {
    // The floor and the build-up used to sit four lines apart with nothing
    // between them. A reader who meets two figures an order of magnitude apart
    // and no explanation supplies their own, and both available explanations
    // are wrong: "they print money", or "the £14k is fake". The second one
    // costs us the decomposition, which is the only thing on the sheet that is
    // true right now.
    const b = COST_TO_COMMISSION_BRIDGE.toLowerCase();
    expect(b).toContain('design');
    expect(b).toContain('engineering stamp');
    expect(b).toContain('project management');
    expect(b).toContain('insurance');
    expect(b).toContain('vat');
  });

  it('PRICES NONE OF THEM — this is the whole discipline, do not relax it', () => {
    // A numeric bridge ("kit £14k -> design £X -> delivered £150k") requires
    // inventing £X, and £X could only ever be BACK-SOLVED from £150k, because
    // that is the only constraint available. That is the same circular move
    // this module already refuses on rates, committed at a higher altitude and
    // made MORE dangerous by looking more rigorous: asked about the £14k there
    // is a strong answer ("the real cut list at placeholder rates"); asked "how
    // do you know design is £38,000?" there is none.
    //
    // If this test fails, someone put a figure in the bridge. Do not update the
    // test. Take the figure out.
    expect(COST_TO_COMMISSION_BRIDGE).not.toMatch(/\d/);
    expect(COST_TO_COMMISSION_BRIDGE).not.toContain('£');
  });

  it('defers the figures to the quote rather than implying they exist', () => {
    expect(COST_TO_COMMISSION_BRIDGE.toLowerCase()).toContain('when the quotes do');
  });
});

describe('which rung the demo is on', () => {
  it('says the object on screen is the smallest one, and prices nothing', () => {
    // GRAMMAR caps every design at 18 m² / 2.5 m, non-occupied. That object is
    // the entry piece; the £150k floor prices a core commission the engine has
    // never built and currently cannot. Saying so turns the distance between
    // the figures from an accusation into scope.
    expect(DEMO_SCOPE_NOTE.toLowerCase()).toContain('smallest');
    expect(DEMO_SCOPE_NOTE).not.toMatch(/\d/);
  });
});
