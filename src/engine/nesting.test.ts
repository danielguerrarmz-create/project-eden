import { describe, it, expect } from 'vitest';
import { runEngine } from './index';
import { ENVELOPE, GRAMMAR, STOCK } from '../data/config';
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

describe('nesting: sheet pieces shelf-packed, linear pieces bin-packed into stock lengths', () => {
  it('places every SHEET piece; linear pieces go to the stock plan instead', () => {
    for (let f = ENVELOPE.footprintM2.min; f <= ENVELOPE.footprintM2.max; f += 2) {
      for (const jointSystem of ['hub', 'lamella'] as const) {
        const { components, nesting } = runEngine({ ...base, footprintM2: f, jointSystem });
        const sheetPieceCount = components.items
          .filter((it) => it.stock === 'sheet')
          .reduce((n, it) => n + it.count, 0);
        const linearPieceCount = components.items
          .filter((it) => it.stock === 'linear')
          .reduce((n, it) => n + it.count, 0);
        const placed = nesting.sheets.reduce((n, s) => n + s.parts.length, 0);
        expect(placed).toBe(sheetPieceCount);
        expect(nesting.totalParts).toBe(sheetPieceCount);
        expect(nesting.stockPlan.pieceCount).toBe(linearPieceCount);
        expect(sheetPieceCount + linearPieceCount).toBe(components.totalCount);
        for (const sheet of nesting.sheets) {
          for (const part of sheet.parts) {
            expect(part.x + part.lengthM).toBeLessThanOrEqual(nesting.sheetLengthM + 1e-9);
            expect(part.y + part.widthM).toBeLessThanOrEqual(nesting.sheetWidthM + 1e-9);
            expect(part.lengthM).toBeLessThanOrEqual(GRAMMAR.maxComponentLengthM + 1e-6);
          }
        }
      }
    }
  });

  it('hub system needs linear stock (struts off the docking saw); lamella system is all-sheet', () => {
    const hub = runEngine({ ...base, jointSystem: 'hub' });
    expect(hub.nesting.stockPlan.pieceCount).toBeGreaterThan(0);
    expect(hub.nesting.stockPlan.lengthsNeeded).toBeGreaterThan(0);
    expect(hub.nesting.stockPlan.stockLengthM).toBe(STOCK.strut.stockLengthM);
    expect(hub.nesting.stockPlan.utilisation).toBeGreaterThan(0);
    expect(hub.nesting.stockPlan.utilisation).toBeLessThanOrEqual(1);

    // Lamella: every piece (lamellas, blanks) comes off sheet stock.
    const lam = runEngine({ ...base, jointSystem: 'lamella' });
    expect(lam.nesting.stockPlan.pieceCount).toBe(0);
    expect(lam.nesting.stockPlan.lengthsNeeded).toBe(0);
    expect(lam.nesting.sheets.length).toBeGreaterThan(0);
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
