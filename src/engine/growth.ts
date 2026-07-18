/**
 * growth.ts — year 0 / 1 / 2 plant-coverage states.
 *
 * Powers "it's finished in year three" as something you SEE, not just read
 * (mvp-spec §"What it must prove" #4). A visual approximation (labelled as such
 * in config/SCREENS), not a biological warranty — the stress-test is explicit
 * that year-three is an unwarrantable deferred deliverable, so the demo shows it
 * as a projection, honestly (stress-test §6).
 *
 * PURE. coverage = species vigour × years, saturating toward the lattice's
 * capacity, capped by config bounds.
 */
import { GROWTH } from '../data/config';
import type { GrowthState, Species, Year } from './types';

const LABELS: Record<Year, string> = {
  0: 'Year 0 — just planted',
  1: 'Year 1 — establishing',
  2: 'Year 2 — grown in',
};

export function computeGrowth(species: Species, year: Year): GrowthState {
  let coverageFraction: number;

  if (year === 0) {
    coverageFraction = GROWTH.year0CoverageFraction;
  } else {
    // Metres of growth achieved / the characteristic bed-to-crown climb.
    // Saturating curve so year 2 is nearly full but never a guaranteed 100%.
    const reach = (species.growthRateMPerYr * year) / GROWTH.characteristicLengthM;
    coverageFraction = GROWTH.maxCoverageFraction * (1 - Math.exp(-reach));
  }

  coverageFraction = Math.min(GROWTH.maxCoverageFraction, coverageFraction);

  return {
    year,
    coverageFraction: Number(coverageFraction.toFixed(3)),
    leafDensity01: Number(coverageFraction.toFixed(3)),
    label: LABELS[year],
  };
}
