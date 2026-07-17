import { describe, expect, it } from 'vitest';
import { PRICING } from '../data/config';
import { runEngine } from '../engine';
import type { DesignParams } from '../engine/types';
import { attributionFor, exactTotalGBP, selectionLabel } from './costAttribution';

const base: DesignParams = {
  footprintM2: 15,
  riseM: 2.3,
  strutSpacingM: 0.55,
  apertureDeg: 90,
  jointSystem: 'hub',
  speciesId: 'clematis',
  year: 0,
};

const out = runEngine(base);
const { nesting, components, geometry } = out;
const linear = geometry.pieces.find((p) => p.stock === 'linear')!;
const sheet = runEngine({ ...base, jointSystem: 'lamella' }).geometry.pieces.find(
  (p) => p.stock === 'sheet',
)!;
const hardware = components.hardware.find((h) => h.id === 'hub')!;

describe('the exact tier is exact, because the model defines it that way', () => {
  it('charges a linear piece the flat docking rate, to the penny', () => {
    // £5/piece, two ends, one program. There is no batching in this line, so a
    // clicked strut can say the number and be right.
    const lines = attributionFor({ kind: 'piece', piece: linear }, nesting);
    const docking = lines.find((l) => l.label.startsWith('docking'))!;
    expect(docking.exact).toBe(true);
    expect(docking.amount).toBe(`£${PRICING.dockingPerPieceGBP}`);
  });

  it('charges install per piece, flat, for every stock', () => {
    for (const piece of [linear, sheet]) {
      const install = attributionFor({ kind: 'piece', piece }, nesting).find((l) =>
        l.label.startsWith('install'),
      )!;
      expect(install.exact).toBe(true);
      // £6.50, NOT "£7": rounding an exact per-unit rate to the pound makes
      // the exactness claim false. This is the assertion that caught it.
      expect(install.amount).toBe('£6.50');
      expect(install.valueGBP).toBe(PRICING.installPerComponentGBP);
    }
  });

  it('prices hardware at the model s own rate times the real count', () => {
    const lines = attributionFor({ kind: 'hardware', item: hardware }, nesting);
    expect(lines.every((l) => l.exact)).toBe(true);
    expect(lines[0].amount).toBe(`£${PRICING.hardwareGBP.hub}`);
    expect(lines[1].amount).toBe(
      `£${(PRICING.hardwareGBP.hub * hardware.qty).toLocaleString('en-GB')}`,
    );
  });
});

describe('the shared tier NEVER invents a per-piece split', () => {
  it('shows a sheet s whole CNC cost, marked shared, not divided', () => {
    // The forbidden move: £65 / N parts, which would look precise and be
    // fiction — the model has no allocation rule to base it on.
    const lines = attributionFor({ kind: 'piece', piece: sheet }, nesting);
    const cnc = lines.find((l) => l.label.startsWith('CNC'))!;
    expect(cnc.exact).toBe(false);
    expect(cnc.amount).toBe(`£${PRICING.sheetCncGBP}`); // the SHEET's cost, whole
    expect(cnc.note).toContain('shared');
    expect(cnc.note).toContain('no rule for splitting it');
  });

  it('marks bulk timber shared, because the offcut is not assignable', () => {
    const lines = attributionFor({ kind: 'piece', piece: linear }, nesting);
    const timber = lines.find((l) => l.label.startsWith('timber'))!;
    expect(timber.exact).toBe(false);
    expect(timber.note).toContain('offcut');
  });

  it('gives every inexact line a reason, and every exact line none', () => {
    // `exact: false` is a finding, not a hedge. A shared line with no note is
    // just a number someone will read as precise anyway.
    for (const piece of [linear, sheet]) {
      for (const l of attributionFor({ kind: 'piece', piece }, nesting)) {
        if (l.exact) expect(l.note).toBeUndefined();
        else expect(l.note && l.note.length).toBeGreaterThan(0);
      }
    }
  });
});

describe('the totals only claim what the model can back', () => {
  it('sums the exact lines and ignores the shared ones', () => {
    const lines = attributionFor({ kind: 'piece', piece: linear }, nesting);
    // A linear piece: docking + install are exact; the timber line is not.
    expect(exactTotalGBP(lines)).toBe(
      PRICING.dockingPerPieceGBP + PRICING.installPerComponentGBP,
    );
  });

  it('never totals a sheet piece s CNC into an exact figure', () => {
    const lines = attributionFor({ kind: 'piece', piece: sheet }, nesting);
    expect(exactTotalGBP(lines)).toBe(PRICING.installPerComponentGBP);
  });
});

describe('selectionLabel says what the thing IS before what it costs', () => {
  it('names a piece by kind and real cut length', () => {
    expect(selectionLabel({ kind: 'piece', piece: linear })).toContain(linear.kind);
    expect(selectionLabel({ kind: 'piece', piece: linear })).toContain(
      linear.lengthM.toFixed(2),
    );
  });

  it('names hardware by its real count', () => {
    expect(selectionLabel({ kind: 'hardware', item: hardware })).toContain(`${hardware.qty}×`);
  });
});

describe('it holds up against every real piece in a real design', () => {
  it('produces usable lines for all of them, in both systems', () => {
    for (const jointSystem of ['hub', 'lamella'] as const) {
      const o = runEngine({ ...base, jointSystem });
      for (const piece of o.geometry.pieces) {
        const lines = attributionFor({ kind: 'piece', piece }, o.nesting);
        expect(lines.length).toBeGreaterThan(0);
        // Every piece, whatever its stock, gets at least one thing the model
        // can stand behind. A part with nothing exact would make the money hop
        // a shrug.
        expect(lines.some((l) => l.exact)).toBe(true);
        for (const l of lines) expect(l.amount).toMatch(/^£[\d,]+(\.\d{2})?$/);
      }
    }
  });
});
