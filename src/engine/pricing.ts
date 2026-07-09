/**
 * pricing.ts — price built line-by-line from the REAL kit:
 * stock actually ordered (linear lengths + LVL sheets, waste included),
 * fabrication ops (sheet CNC + docking programs), the hardware schedule from
 * joints.ts, install, planting, margin — shown as ONE FIXED figure.
 *
 * Every rate is a named constant in data/config.ts — not one magic number in
 * this file. The decomposition is shown on the panel because decomposition =
 * credibility; the margin is shown plainly too.
 *
 * >>> THE SINGLE MOST IMPORTANT TODO IN THE WHOLE DEMO <<<
 * Every unit rate in PRICING is a PLACEHOLDER until fab quotes land. The
 * price MOVES correctly — it is built from the true BOM — it is not yet TRUE.
 */
import { PRICING } from '../data/config';
import type { ComponentList, NestingResult, PriceBreakdown, Species } from './types';

export function priceDesign(
  components: ComponentList,
  nesting: NestingResult,
  species: Species,
  plantCount: number,
): PriceBreakdown {
  // --- Materials: what actually gets ordered, waste included. ---
  const timberGBP =
    nesting.stockPlan.lengthsNeeded * nesting.stockPlan.stockLengthM * PRICING.timberPerMetreGBP;
  const sheetsGBP = nesting.sheets.length * PRICING.lvlSheetGBP;
  const hardwareGBP = components.hardware.reduce(
    (sum, h) => sum + h.qty * (PRICING.hardwareGBP[h.id] ?? 0),
    0,
  );
  const componentsGBP = timberGBP + sheetsGBP + hardwareGBP;

  // --- Fabrication ops: CNC sheet profiling + docking-saw end programs. ---
  const fabricationGBP =
    nesting.sheets.length * PRICING.sheetCncGBP +
    nesting.stockPlan.pieceCount * PRICING.dockingPerPieceGBP;

  // --- Install: mobilisation + per-piece labour (screws priced as driven). ---
  const installGBP = PRICING.installBaseGBP + components.totalCount * PRICING.installPerComponentGBP;

  const plantingGBP = plantCount * PRICING.plantingPerPlantGBP;

  const subtotalGBP = componentsGBP + fabricationGBP + installGBP + plantingGBP;
  const marginGBP = subtotalGBP * PRICING.marginRate;

  // Rounded UP to the commitment step: a fixed price must never round below cost.
  const fixedTotalGBP =
    Math.ceil((subtotalGBP + marginGBP) / PRICING.roundTotalToGBP) * PRICING.roundTotalToGBP;

  const r = (x: number) => Math.round(x);
  const screws = components.hardware.find((h) => h.id === 'groundScrew')?.qty ?? 0;

  const lines: PriceBreakdown['lines'] = [
    {
      label: `Timber stock — ${nesting.stockPlan.lengthsNeeded}× ${nesting.stockPlan.stockLengthM} m lengths + ${nesting.sheets.length} LVL sheets`,
      valueGBP: r(timberGBP + sheetsGBP),
      note: 'ordered stock incl. offcuts — PLACEHOLDER rates until fab quote',
    },
    {
      label: `Steel & fixings — ${components.hardware
        .filter((h) => h.id !== 'armatureWirePerM')
        .reduce((n, h) => n + h.qty, 0)} counted items, ${screws} ground screws`,
      valueGBP: r(hardwareGBP),
    },
    {
      label: `Fabrication — ${nesting.sheets.length} sheets CNC'd, ${nesting.stockPlan.pieceCount} docking programs`,
      valueGBP: r(fabricationGBP),
    },
    {
      label: `Install — ${components.totalCount} pieces, crew + delivery`,
      valueGBP: r(installGBP),
    },
    { label: `Planting allowance — ${plantCount}× ${species.common}`, valueGBP: r(plantingGBP) },
    {
      label: 'Margin & fixed-price guarantee',
      valueGBP: r(marginGBP),
      note: 'shown, not hidden — this is what makes the figure fixed',
    },
  ];

  return {
    componentsGBP: r(componentsGBP),
    fabricationGBP: r(fabricationGBP),
    installGBP: r(installGBP),
    plantingGBP: r(plantingGBP),
    subtotalGBP: r(subtotalGBP),
    marginGBP: r(marginGBP),
    fixedTotalGBP,
    lines,
  };
}

/** How many climbers a design needs: one per ~2.5 m of eave perimeter, min 2. */
export function plantCountFor(perimeterM: number): number {
  return Math.max(2, Math.round(perimeterM / 2.5));
}
