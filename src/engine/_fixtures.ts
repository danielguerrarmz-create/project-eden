/**
 * _fixtures.ts — shared test fixtures for the engine unit tests.
 *
 * Not part of the app bundle (nothing imports it outside *.test.ts). Gives every
 * test one canonical mid-envelope DesignParams to vary from, and the small sweep
 * helpers used to walk the whole input space.
 */
import { ENVELOPE } from '../data/config';
import { SPECIES } from './species';
import type { DesignParams } from './types';

/** A mid-envelope design, matching the app's default Eden closely enough. */
export function baseParams(over: Partial<DesignParams> = {}): DesignParams {
  return {
    enclosurePct: 55,
    heightM: 3.0,
    footprintRadiusM: 2.4,
    latticeDensity: 0.55,
    openingOrientationDeg: 180,
    siteOrientationDeg: 0,
    siteLatitudeDeg: 51.5,
    speciesId: 'lonicera',
    year: 0,
    ...over,
  };
}

export const ALL_SPECIES_IDS = SPECIES.map((s) => s.id);

/** N evenly-spaced samples across [lo, hi] inclusive (N >= 2). */
export function range(lo: number, hi: number, n: number): number[] {
  return Array.from({ length: n }, (_, i) => lo + ((hi - lo) * i) / (n - 1));
}

export { ENVELOPE };
