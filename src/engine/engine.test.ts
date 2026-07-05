import { describe, it, expect } from 'vitest';
import { runEngine } from './index';
import { baseParams, ALL_SPECIES_IDS } from './_fixtures';

describe('runEngine determinism', () => {
  it('same inputs give a byte-identical output bundle', () => {
    const p = baseParams({ latticeDensity: 0.71, enclosurePct: 48, footprintRadiusM: 2.9 });
    expect(runEngine(p)).toEqual(runEngine(p));
  });

  it('is stable across the whole species catalogue', () => {
    for (const speciesId of ALL_SPECIES_IDS) {
      const p = baseParams({ speciesId });
      expect(runEngine(p)).toEqual(runEngine(p));
    }
  });

  it('produces a consistent bundle: components tally matches the geometry members', () => {
    const { geometry, components } = runEngine(baseParams({ latticeDensity: 0.8 }));
    expect(components.totalCount).toBe(geometry.members.length);
  });
});

/**
 * The thesis success bar: "changing the species VISIBLY changes the strut field."
 * Different climbing habits must produce a different recommended support pattern,
 * even though the load-bearing geometry and the price stay put.
 */
describe('species changes the strut field but not the structure', () => {
  it('twining vs self-clinging yield different strut density and orientation', () => {
    const twiner = runEngine(baseParams({ speciesId: 'lonicera' })).strutField; // twining
    const clinger = runEngine(baseParams({ speciesId: 'hedera' })).strutField; // self-clinging
    expect(clinger.meanDensity01).not.toBe(twiner.meanDensity01);
    expect(clinger.habitStrategy).not.toBe(twiner.habitStrategy);
  });

  it('keeps geometry (member count) identical while the strut field moves', () => {
    const a = runEngine(baseParams({ speciesId: 'rosa-newdawn' }));
    const b = runEngine(baseParams({ speciesId: 'lathyrus' }));
    expect(a.geometry.members.length).toBe(b.geometry.members.length);
    expect(a.strutField.recommendedSpacingM).not.toBe(b.strutField.recommendedSpacingM);
  });
});
