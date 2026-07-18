import { describe, expect, it } from 'vitest';
import { SPECIES } from '../../engine/species';
import { SPECIES_VISUAL, visualFor } from './speciesVisual';

const STEM_FORMS = ['net', 'spiral', 'arch', 'mat'];
const PETAL_FORMS = ['star', 'raceme', 'bloom', 'none'];

describe('every real species has a visual', () => {
  it('covers all seven ids, with no extras', () => {
    for (const sp of SPECIES) expect(SPECIES_VISUAL[sp.id]).toBeDefined();
    expect(Object.keys(SPECIES_VISUAL).sort()).toEqual([...SPECIES.map((s) => s.id)].sort());
  });

  it('petal colour is a valid 6-digit hex per species', () => {
    for (const sp of SPECIES) expect(visualFor(sp.id).petalColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });

  it('gives distinct petal colours, so two swatches never collide', () => {
    const hues = SPECIES.map((s) => visualFor(s.id).petalColor.toLowerCase());
    expect(new Set(hues).size).toBe(hues.length);
  });

  it('uses only known stem and petal forms', () => {
    for (const sp of SPECIES) {
      const v = visualFor(sp.id);
      expect(STEM_FORMS).toContain(v.stemForm);
      expect(PETAL_FORMS).toContain(v.petalForm);
    }
  });

  it('flower density is a fraction, and a non-flowering plant stays near zero', () => {
    for (const sp of SPECIES) {
      const v = visualFor(sp.id);
      expect(v.flowerDensity01).toBeGreaterThanOrEqual(0);
      expect(v.flowerDensity01).toBeLessThanOrEqual(1);
      if (v.petalForm === 'none') expect(v.flowerDensity01).toBeLessThan(0.1);
    }
  });

  it('stem form tracks the climbing habit family', () => {
    // The four habit families map one-to-one to the four drawn stem forms.
    const byHabit: Record<string, string> = {
      tendril: 'net',
      twining: 'spiral',
      scrambler: 'arch',
      clinging: 'mat',
    };
    for (const sp of SPECIES) {
      expect(visualFor(sp.id).stemForm).toBe(byHabit[sp.habit]);
    }
  });

  it('falls back to a neutral for an unknown id rather than throwing', () => {
    expect(visualFor('not-a-plant').petalColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });
});
