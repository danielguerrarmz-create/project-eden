import { describe, it, expect } from 'vitest';
import { computeGrowth } from './growth';
import { GROWTH } from '../data/config';
import { getSpecies } from './species';

describe('computeGrowth', () => {
  const honeysuckle = getSpecies('lonicera');

  it('grows in over time, year 0 < year 1 < year 3', () => {
    const y0 = computeGrowth(honeysuckle, 0).coverageFraction;
    const y1 = computeGrowth(honeysuckle, 1).coverageFraction;
    const y3 = computeGrowth(honeysuckle, 3).coverageFraction;
    expect(y0).toBeLessThan(y1);
    expect(y1).toBeLessThan(y3);
  });

  it('starts at the config year-0 establishment fraction', () => {
    expect(computeGrowth(honeysuckle, 0).coverageFraction).toBe(GROWTH.year0CoverageFraction);
  });

  it('never exceeds the saturating coverage cap, even for the most vigorous species', () => {
    const vigorous = getSpecies('clematis'); // fastest grower in the catalogue
    expect(computeGrowth(vigorous, 3).coverageFraction).toBeLessThanOrEqual(GROWTH.maxCoverageFraction);
  });

  it('carries the human-readable stage label', () => {
    expect(computeGrowth(honeysuckle, 3).label).toContain('Year 3');
  });
});
