import { describe, expect, it } from 'vitest';
import { SPECIES } from '../../engine/species';
import { SPECIES_SWATCH, swatchFor } from './speciesSwatch';

describe('every real species has a swatch', () => {
  // The "new export => add it here" invariant priceCopy.test.ts uses for
  // ALL_COPY, applied to hues: add a species to the catalogue and this fails
  // until it has a colour, so the row never renders a plant with a blank dot.
  it('covers all seven ids, with no extras', () => {
    for (const sp of SPECIES) expect(SPECIES_SWATCH[sp.id]).toBeDefined();
    expect(Object.keys(SPECIES_SWATCH).sort()).toEqual([...SPECIES.map((s) => s.id)].sort());
  });

  it('is a valid 6-digit hex per species', () => {
    for (const sp of SPECIES) expect(swatchFor(sp.id)).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });

  it('falls back to a neutral for an unknown id rather than undefined', () => {
    expect(swatchFor('not-a-plant')).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });

  it('gives distinct hues, so two plants never share a dot', () => {
    const hues = SPECIES.map((s) => swatchFor(s.id).toLowerCase());
    expect(new Set(hues).size).toBe(hues.length);
  });
});
