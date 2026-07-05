import { describe, it, expect } from 'vitest';
import { computeGrowth } from './growth';
import { getSpecies } from './species';
import { GROWTH } from '../data/config';

const species = getSpecies('lonicera');

describe('growth: a saturating establishment curve, never a warranty', () => {
  it('starts at the year-0 establishment fraction', () => {
    expect(computeGrowth(species, 0).coverageFraction).toBe(GROWTH.year0CoverageFraction);
  });

  it('increases year 0 -> 1 -> 3', () => {
    const y0 = computeGrowth(species, 0).coverageFraction;
    const y1 = computeGrowth(species, 1).coverageFraction;
    const y3 = computeGrowth(species, 3).coverageFraction;
    expect(y1).toBeGreaterThan(y0);
    expect(y3).toBeGreaterThan(y1);
  });

  it('never claims more than the saturating maximum coverage', () => {
    for (const year of GROWTH.years) {
      expect(computeGrowth(species, year).coverageFraction).toBeLessThanOrEqual(
        GROWTH.maxCoverageFraction,
      );
    }
  });

  it('mirrors coverage into leafDensity and carries a stage label', () => {
    const g = computeGrowth(species, 3);
    expect(g.leafDensity01).toBe(g.coverageFraction);
    expect(g.label.length).toBeGreaterThan(0);
  });
});
