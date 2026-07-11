/**
 * nesting.ts — the kit's stock plan (demo-spec §2.5), split by stock type:
 *
 *   SHEET pieces (lamellas, eave + crown blanks — anything curved) are
 *   shelf-packed (first-fit decreasing) onto standard LVL sheets at each
 *   piece's structural depth, with a kerf gap. Real nesting software does
 *   better than shelves — this is deliberately conservative, so the sheet
 *   count on the spec sheet errs high rather than flattering the quote.
 *
 *   LINEAR pieces (hub-system struts) are NOT sheet parts — they come
 *   off standard lengths of planed C24 on a docking saw. They get a
 *   first-fit-decreasing bin pack into stock lengths so the BOM can say how
 *   many lengths to order, honestly including offcut waste.
 *
 * PURE. Geometry-agnostic: consumes the ComponentList only.
 */
import { GRAMMAR, STOCK } from '../data/config';
import type { ComponentList, NestedSheet, NestingResult, Piece } from './types';

interface Blank {
  lengthM: number;
  widthM: number;
  kind: Piece['kind'];
}

export function nestComponents(components: ComponentList): NestingResult {
  const sheetL = GRAMMAR.sheet.lengthM;
  const sheetW = GRAMMAR.sheet.widthM;
  const kerf = GRAMMAR.nestingKerfM;

  // Explode the tallied cut list back into individual parts, longest first.
  const sheetBlanks: Blank[] = [];
  const linearLengths: number[] = [];
  for (const item of components.items) {
    for (let n = 0; n < item.count; n++) {
      if (item.stock === 'sheet') {
        // Nested width = depth + camber (CutItem.widthM): the curved
        // profile's true band on the sheet.
        sheetBlanks.push({ lengthM: item.lengthM, widthM: item.widthM, kind: item.kind });
      } else {
        linearLengths.push(item.lengthM);
      }
    }
  }
  sheetBlanks.sort((a, b) => b.lengthM - a.lengthM);
  linearLengths.sort((a, b) => b - a);

  // --- Sheet pieces: shelf-pack, row height = the widest part in the row. ---
  interface Row {
    y: number;
    heightM: number;
    usedM: number;
  }
  interface SheetState {
    rows: Row[];
    sheet: NestedSheet;
  }
  const sheets: SheetState[] = [];

  const tryPlace = (s: SheetState, blank: Blank): boolean => {
    // An existing row the part fits in (length AND width)…
    let row = s.rows.find(
      (r) =>
        blank.widthM <= r.heightM + 1e-9 &&
        r.usedM + blank.lengthM + (r.usedM > 0 ? kerf : 0) <= sheetL,
    );
    // …else open a new row at this part's width if the sheet has room.
    if (!row) {
      const yNext = s.rows.reduce((y, r) => Math.max(y, r.y + r.heightM + kerf), 0);
      if (yNext + blank.widthM <= sheetW) {
        row = { y: yNext, heightM: blank.widthM, usedM: 0 };
        s.rows.push(row);
      }
    }
    if (!row) return false;
    const x = row.usedM + (row.usedM > 0 ? kerf : 0);
    s.sheet.parts.push({ x, y: row.y, lengthM: blank.lengthM, widthM: blank.widthM, kind: blank.kind });
    row.usedM = x + blank.lengthM;
    return true;
  };

  for (const blank of sheetBlanks) {
    if (!sheets.some((s) => tryPlace(s, blank))) {
      const s: SheetState = { rows: [], sheet: { parts: [], utilisation: 0 } };
      sheets.push(s);
      tryPlace(s, blank);
    }
  }

  const sheetArea = sheetL * sheetW;
  for (const s of sheets) {
    const used = s.sheet.parts.reduce((sum, p) => sum + p.lengthM * p.widthM, 0);
    s.sheet.utilisation = Number((used / sheetArea).toFixed(3));
  }

  // --- Linear pieces: first-fit decreasing into standard stock lengths. ---
  const stockLengthM = STOCK.strut.stockLengthM;
  const bins: number[] = []; // used length per stock length
  for (const len of linearLengths) {
    const i = bins.findIndex((used) => used + len + (used > 0 ? kerf : 0) <= stockLengthM);
    if (i >= 0) {
      bins[i] += len + (bins[i] > 0 ? kerf : 0);
    } else {
      bins.push(len);
    }
  }
  const piecesLinearM = linearLengths.reduce((s, l) => s + l, 0);

  return {
    sheets: sheets.map((s) => s.sheet),
    sheetLengthM: sheetL,
    sheetWidthM: sheetW,
    totalParts: sheetBlanks.length,
    stockPlan: {
      stockLengthM,
      lengthsNeeded: bins.length,
      pieceCount: linearLengths.length,
      utilisation: bins.length
        ? Number((piecesLinearM / (bins.length * stockLengthM)).toFixed(3))
        : 0,
    },
  };
}
