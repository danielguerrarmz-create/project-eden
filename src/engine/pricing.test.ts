import { describe, it, expect } from 'vitest';
import { runEngine } from './index';
import { PRICING } from '../data/config';
import type { DesignParams } from './types';

const base: DesignParams = {
  footprintM2: 15,
  riseM: 2.3,
  strutSpacingM: 0.35,
  apertureDeg: 90,
  speciesId: 'clematis',
  year: 0,
};

describe('pricing: a fixed figure that never rounds below cost', () => {
  const { price } = runEngine(base);

  it('rounds the total UP to the commitment step', () => {
    expect(price.fixedTotalGBP % PRICING.roundTotalToGBP).toBe(0);
    expect(price.fixedTotalGBP).toBeGreaterThanOrEqual(price.subtotalGBP + price.marginGBP);
  });

  it('decomposes into components, fabrication, install, planting and margin', () => {
    const sum =
      price.componentsGBP + price.fabricationGBP + price.installGBP + price.plantingGBP;
    expect(price.subtotalGBP).toBe(sum);
    expect(price.marginGBP).toBeGreaterThan(0);
  });

  it('keeps the per-component rate honestly labelled as a placeholder', () => {
    const compLine = price.lines.find((l) => /component/i.test(l.label));
    expect(compLine?.note).toMatch(/placeholder/i);
  });

  it('moves with the design: a bigger pavilion costs more', () => {
    const small = runEngine({ ...base, footprintM2: 12 }).price.fixedTotalGBP;
    const big = runEngine({ ...base, footprintM2: 18 }).price.fixedTotalGBP;
    expect(big).toBeGreaterThan(small);
  });
});
