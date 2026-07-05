import { describe, it, expect } from 'vitest';
import { runEngine } from './index';
import { plantCountFor, priceDesign } from './pricing';
import { decomposeComponents } from './components';
import { generateGeometry } from './geometry';
import { getSpecies } from './species';
import { baseParams, ALL_SPECIES_IDS } from './_fixtures';

describe('priceDesign reacts to the design', () => {
  it('costs more as the lattice gets denser (more components)', () => {
    const sparse = runEngine(baseParams({ latticeDensity: 0.3 }));
    const dense = runEngine(baseParams({ latticeDensity: 1.0 }));
    expect(dense.components.totalCount).toBeGreaterThan(sparse.components.totalCount);
    expect(dense.price.incVatGBP).toBeGreaterThan(sparse.price.incVatGBP);
  });

  it('costs more as the footprint grows (longer members + more plants)', () => {
    const small = runEngine(baseParams({ footprintRadiusM: 1.8 }));
    const big = runEngine(baseParams({ footprintRadiusM: 3.2 }));
    expect(big.price.incVatGBP).toBeGreaterThan(small.price.incVatGBP);
  });

  it('adds up: subtotal + designer fee + VAT = inc-VAT total', () => {
    const { price } = runEngine(baseParams());
    // Values are rounded per-line, so allow a rounding pound of slack.
    const rebuilt = price.buildSubtotalGBP + price.designerFeeGBP + price.vatGBP;
    expect(Math.abs(rebuilt - price.incVatGBP)).toBeLessThanOrEqual(1);
    expect(price.exVatGBP).toBe(price.buildSubtotalGBP + price.designerFeeGBP);
  });
});

/**
 * CHARACTERIZATION TEST — locks in CURRENT behavior, flags it for engine review.
 *
 * Price is IDENTICAL across all species at the same geometry: species only
 * changes the planting LABEL, never any number. Planting is a flat
 * PRICING.plantingPerPlantGBP (£55) per plant regardless of which climber it is,
 * and species never touches geometry, so component/cutting/install/planting all
 * match. That is intentional for the MVP but is a simplification worth revisiting:
 * a real supplier quote would price a mature ivy differently from an annual sweet
 * pea. When per-species supply costs land (config.ts), THIS test is expected to
 * change — that is the signal it exists to give.
 */
describe('priceDesign is species-invariant at fixed geometry (characterization)', () => {
  it('every species yields the identical price breakdown for the same design', () => {
    const geom = generateGeometry(baseParams());
    const components = decomposeComponents(geom);
    const plantCount = plantCountFor((geom.params.enclosurePct / 100) * 2 * Math.PI * geom.footprintRadiusM);

    const breakdowns = ALL_SPECIES_IDS.map((id) => priceDesign(components, getSpecies(id), plantCount));
    const first = breakdowns[0];
    for (const b of breakdowns) {
      expect(b.incVatGBP).toBe(first.incVatGBP);
      expect(b.buildSubtotalGBP).toBe(first.buildSubtotalGBP);
      expect(b.plantingGBP).toBe(first.plantingGBP);
    }
  });

  it('confirmed end-to-end: runEngine price does not move when only species changes', () => {
    const prices = ALL_SPECIES_IDS.map((speciesId) => runEngine(baseParams({ speciesId })).price.incVatGBP);
    expect(new Set(prices).size).toBe(1);
  });
});

describe('plantCountFor', () => {
  it('is one climber per ~2.5 m of arc perimeter, floored at 2', () => {
    expect(plantCountFor(0)).toBe(2);
    expect(plantCountFor(2)).toBe(2);
    expect(plantCountFor(10)).toBe(4);
    expect(plantCountFor(25)).toBe(10);
  });
});
