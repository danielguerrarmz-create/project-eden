/**
 * costAttribution.ts — what one part of the kit costs, tiered honestly.
 *
 * This is the "money hop": the explode shows 158 pieces as objects in space,
 * and a viewer looking at one should be able to find its line in the build-up.
 * Daniel's sentence — "here's what each of these is, and here's what it costs."
 *
 * ---------------------------------------------------------------------------
 * THE PRICING MODEL IS NOT UNIFORM, AND THIS MODULE'S ONLY REAL JOB IS TO NOT
 * PRETEND OTHERWISE. Sai found the model's own dividing line and it is real:
 *
 *   EXACT — docking (£5/piece), install (£6.50/piece) and every hardware line
 *   are, IN THE MODEL'S OWN DEFINITION, a flat rate times a real count off real
 *   per-node/per-piece kinds. There is no batching and no shared waste in them.
 *   A clicked strut can say "£5 docking + £6.50 install" and be exactly right.
 *
 *   SHARED — sheet CNC (£65/sheet) is charged per SHEET, split across whatever
 *   got nested onto it. The bulk timber purchase buys whole standard lengths by
 *   bin-packing, so one piece's share carries offcut waste that is not cleanly
 *   assignable to it. Both are real costs. Neither is separable to one piece
 *   without an allocation rule THE PRICING MODEL DOES NOT HAVE.
 *
 * So shared lines are LABELLED shared and shown with their real basis, never
 * divided by a piece count to manufacture a per-piece number. Inventing an
 * allocation is the same error as tuning a rate to match the deck: it would
 * look precise and be fiction, and it would be the first thing a technical
 * reader pulled on. `exact: false` is not a hedge, it is the finding.
 *
 * KNOWN GAP, NOT FAKED: which exact sheet a specific `Piece.id` landed on is
 * NOT knowable today — `nesting.ts` re-explodes the ROUNDED, TALLIED cut list
 * rather than `geometry.pieces`, so individual identity is lost in the pack. So
 * "this lamella, on this rectangle of this sheet" is not offered. Synthesising
 * an id to make it look like it works would be the same lie in a smaller hat.
 * See the handoff; it is its own small task.
 * ---------------------------------------------------------------------------
 *
 * Pure and DOM-free, for the reason priceCopy.ts already states: this is the
 * claim the whole feature rests on, so it lives where the suite can pin it.
 */
import { PRICING } from '../data/config';
import type { HardwareItem, NestingResult, Piece } from '../engine/types';

export interface AttributionLine {
  label: string;
  /** The number itself. Totals sum THIS; nothing re-parses the display string. */
  valueGBP: number;
  /** The number, formatted. */
  amount: string;
  /**
   * True when the pricing model defines a flat per-unit rate for this and the
   * figure is that rate. False when the real cost is batched or shared and the
   * number shown is a basis, not this part's separable share.
   */
  exact: boolean;
  /** Why it is not exact. Present only when `exact` is false. */
  note?: string;
}

export type Selection =
  | { kind: 'piece'; piece: Piece }
  | { kind: 'hardware'; item: HardwareItem };

/**
 * NEVER ROUNDED TO THE POUND. This started as `Math.round` and rendered the
 * install rate — £6.50, one of the figures this module exists to state EXACTLY
 * — as "£7". A 7.7% error, presented under an `exact: true` flag. The rounding
 * that is fine on a £14,000 build-up total is a lie on a £6.50 line, and this
 * module's whole claim is per-unit precision where the model has it.
 */
const gbp = (n: number) =>
  `£${n.toLocaleString('en-GB', {
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;

const line = (
  label: string,
  valueGBP: number,
  exact: boolean,
  note?: string,
): AttributionLine => ({ label, valueGBP, amount: gbp(valueGBP), exact, ...(note ? { note } : {}) });

/** The headline for a selection: what the thing IS, before what it costs. */
export function selectionLabel(sel: Selection): string {
  if (sel.kind === 'hardware') return `${sel.item.qty}× ${sel.item.id}`;
  const p = sel.piece;
  return `${p.kind} · ${p.lengthM.toFixed(2)} m`;
}

/**
 * The cost lines for one selected part.
 *
 * Every line is either the model's own flat rate (exact) or the model's own
 * real basis with the sharing named (not exact). Nothing here divides a batch
 * cost by a count.
 */
export function attributionFor(sel: Selection, nesting: NestingResult): AttributionLine[] {
  if (sel.kind === 'hardware') {
    const rate = PRICING.hardwareGBP[sel.item.id] ?? 0;
    // Hardware is the cleanest case in the whole model: a flat rate times a
    // real count of a real kind. Both the unit and the line are exact.
    return [
      line(`${sel.item.id}, each`, rate, true),
      line(`× ${sel.item.qty} in this design`, rate * sel.item.qty, true),
    ];
  }

  const p = sel.piece;
  const lines: AttributionLine[] = [];

  if (p.stock === 'linear') {
    // Docking: two ends, one program, flat per piece. Exact by definition.
    lines.push(line('docking, this piece', PRICING.dockingPerPieceGBP, true));
    lines.push(
      line(
        `timber, ${p.lengthM.toFixed(2)} m at £${PRICING.timberPerMetreGBP}/m`,
        p.lengthM * PRICING.timberPerMetreGBP,
        false,
        `stock is bought as whole ${nesting.stockPlan.stockLengthM} m lengths and bin-packed, so this piece's real share carries part of the batch's offcut (the batch runs ${Math.round(nesting.stockPlan.utilisation * 100)}% utilised)`,
      ),
    );
  } else {
    // Sheet CNC is charged per SHEET, not per part. The honest thing to show is
    // the sheet's real cost and the fact that this piece shares it.
    lines.push(
      line(
        `CNC, one of ${nesting.sheets.length} sheets at £${PRICING.sheetCncGBP}`,
        PRICING.sheetCncGBP,
        false,
        `charged per sheet and shared with this piece's ${Math.max(0, nesting.totalParts - 1)} sheet-mates; the model has no rule for splitting it per part, so this is the sheet's cost, not this piece's share`,
      ),
    );
  }

  // Install is per piece of every kind, flat. Exact.
  lines.push(line('install, this piece', PRICING.installPerComponentGBP, true));

  return lines;
}

/** The exact subtotal: only what the model can stand behind per-piece. */
export function exactTotalGBP(lines: AttributionLine[]): number {
  return lines.filter((l) => l.exact).reduce((sum, l) => sum + l.valueGBP, 0);
}
