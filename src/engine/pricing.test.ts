import { describe, it, expect } from 'vitest';
import { runEngine } from './index';
import { PRICING } from '../data/config';
import type { DesignParams } from './types';

const base: DesignParams = {
  footprintM2: 15,
  riseM: 2.3,
  strutSpacingM: 0.55,
  apertureDeg: 90,
  jointSystem: 'hub',
  speciesId: 'clematis',
  year: 0,
};

describe('pricing: a fixed figure built from the real BOM', () => {
  const { price } = runEngine(base);

  it('rounds the total UP to the commitment step', () => {
    expect(price.fixedTotalGBP % PRICING.roundTotalToGBP).toBe(0);
    expect(price.fixedTotalGBP).toBeGreaterThanOrEqual(price.subtotalGBP + price.marginGBP);
  });

  it('decomposes into materials, fabrication, install, planting and margin', () => {
    const sum =
      price.componentsGBP + price.fabricationGBP + price.installGBP + price.plantingGBP;
    // Each part is rounded for display; allow the rounding slack.
    expect(Math.abs(price.subtotalGBP - sum)).toBeLessThanOrEqual(3);
    expect(price.marginGBP).toBeGreaterThan(0);
  });

  it('keeps the stock rates honestly labelled as placeholders', () => {
    const stockLine = price.lines.find((l) => /timber stock/i.test(l.label));
    expect(stockLine?.note).toMatch(/placeholder/i);
  });

  it('every hardware id the joints stage emits has a price in config', () => {
    for (const jointSystem of ['hub', 'lamella'] as const) {
      const { components } = runEngine({ ...base, jointSystem });
      for (const h of components.hardware) {
        expect(
          PRICING.hardwareGBP[h.id],
          `missing rate for hardware id "${h.id}"`,
        ).toBeGreaterThan(0);
      }
    }
  });

  it('moves with the design: a bigger pavilion costs more', () => {
    const small = runEngine({ ...base, footprintM2: 12 }).price.fixedTotalGBP;
    const big = runEngine({ ...base, footprintM2: 18 }).price.fixedTotalGBP;
    expect(big).toBeGreaterThan(small);
  });

  it('prices both joint systems to a positive fixed figure', () => {
    for (const jointSystem of ['hub', 'lamella'] as const) {
      const { price: p } = runEngine({ ...base, jointSystem });
      expect(p.fixedTotalGBP).toBeGreaterThan(0);
    }
  });
});
