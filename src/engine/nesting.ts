/**
 * nesting.ts — components laid out on CNC sheets (demo-spec §2.5).
 *
 * The credibility kicker: rectangles-on-sheets photographs like the real
 * fabrication pipeline. Each cut item becomes a blank of its length × the
 * member section width, shelf-packed (first-fit decreasing) onto standard
 * sheet stock with a kerf gap. Real nesting software does better than shelves
 * — this is deliberately a conservative layout, so the sheet count on the spec
 * sheet errs high rather than flattering the quote.
 *
 * PURE. Geometry-agnostic: consumes the ComponentList only.
 */
import { GRAMMAR } from '../data/config';
import type { ComponentList, Member, NestedSheet, NestingResult } from './types';

interface Blank {
  lengthM: number;
  type: Member['type'];
}

export function nestComponents(components: ComponentList): NestingResult {
  const sheetL = GRAMMAR.sheet.lengthM;
  const sheetW = GRAMMAR.sheet.widthM;
  const kerf = GRAMMAR.nestingKerfM;
  const partW = GRAMMAR.memberSectionMm.width / 1000;

  // Explode the tallied cut list back into individual blanks, longest first.
  const blanks: Blank[] = [];
  for (const item of components.items) {
    for (let n = 0; n < item.count; n++) blanks.push({ lengthM: item.lengthM, type: item.type });
  }
  blanks.sort((a, b) => b.lengthM - a.lengthM);

  const rowsPerSheet = Math.floor((sheetW + kerf) / (partW + kerf));

  interface Row {
    y: number;
    usedM: number;
  }
  interface SheetState {
    rows: Row[];
    sheet: NestedSheet;
  }
  const sheets: SheetState[] = [];

  const newSheet = (): SheetState => {
    const s: SheetState = { rows: [], sheet: { parts: [], utilisation: 0 } };
    sheets.push(s);
    return s;
  };

  for (const blank of blanks) {
    let placed = false;
    for (const s of sheets) {
      // Try an existing row with room, else open a new row on this sheet.
      let row = s.rows.find((r) => r.usedM + blank.lengthM + (r.usedM > 0 ? kerf : 0) <= sheetL);
      if (!row && s.rows.length < rowsPerSheet) {
        row = { y: s.rows.length * (partW + kerf), usedM: 0 };
        s.rows.push(row);
      }
      if (row && row.usedM + blank.lengthM + (row.usedM > 0 ? kerf : 0) <= sheetL) {
        const x = row.usedM + (row.usedM > 0 ? kerf : 0);
        s.sheet.parts.push({ x, y: row.y, lengthM: blank.lengthM, widthM: partW, type: blank.type });
        row.usedM = x + blank.lengthM;
        placed = true;
        break;
      }
    }
    if (!placed) {
      const s = newSheet();
      const row: Row = { y: 0, usedM: blank.lengthM };
      s.rows.push(row);
      s.sheet.parts.push({ x: 0, y: 0, lengthM: blank.lengthM, widthM: partW, type: blank.type });
    }
  }

  const sheetArea = sheetL * sheetW;
  for (const s of sheets) {
    const used = s.sheet.parts.reduce((sum, p) => sum + p.lengthM * p.widthM, 0);
    s.sheet.utilisation = Number((used / sheetArea).toFixed(3));
  }

  return {
    sheets: sheets.map((s) => s.sheet),
    sheetLengthM: sheetL,
    sheetWidthM: sheetW,
    totalParts: blanks.length,
  };
}
