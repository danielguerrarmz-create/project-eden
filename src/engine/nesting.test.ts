import { describe, it, expect } from 'vitest';
import { runEngine } from './index';
import { ENVELOPE, GRAMMAR } from '../data/config';
import type { DesignParams } from './types';

const base: DesignParams = {
  footprintM2: 15,
  riseM: 2.3,
  strutSpacingM: 0.35,
  apertureDeg: 90,
  speciesId: 'clematis',
  year: 0,
};

describe('nesting: first-fit-decreasing shelf packing onto CNC sheets', () => {
  it('places every cut blank, and no part overruns the sheet length', () => {
    for (let f = ENVELOPE.footprintM2.min; f <= ENVELOPE.footprintM2.max; f += 2) {
      const { components, nesting } = runEngine({ ...base, footprintM2: f });
      const placed = nesting.sheets.reduce((n, s) => n + s.parts.length, 0);
      expect(placed).toBe(components.totalCount);
      expect(nesting.totalParts).toBe(components.totalCount);
      for (const sheet of nesting.sheets) {
        for (const part of sheet.parts) {
          expect(part.x + part.lengthM).toBeLessThanOrEqual(nesting.sheetLengthM + 1e-9);
          expect(part.lengthM).toBeLessThanOrEqual(GRAMMAR.maxComponentLengthM + 1e-6);
        }
      }
    }
  });

  it('reports a utilisation fraction in (0, 1] for every sheet used', () => {
    const { nesting } = runEngine(base);
    expect(nesting.sheets.length).toBeGreaterThan(0);
    for (const sheet of nesting.sheets) {
      expect(sheet.utilisation).toBeGreaterThan(0);
      expect(sheet.utilisation).toBeLessThanOrEqual(1);
    }
  });

  it('uses the standard 2.4 × 1.2 m sheet from the grammar', () => {
    const { nesting } = runEngine(base);
    expect(nesting.sheetLengthM).toBe(GRAMMAR.sheet.lengthM);
    expect(nesting.sheetWidthM).toBe(GRAMMAR.sheet.widthM);
  });
});
