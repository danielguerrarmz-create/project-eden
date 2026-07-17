/**
 * pricing.ts — a COST BUILD-UP, line-by-line from the REAL kit:
 * stock actually ordered (linear lengths + LVL sheets, waste included),
 * fabrication ops (sheet CNC + docking programs), the hardware schedule from
 * joints.ts, install, planting, margin.
 *
 * It is NOT the commission price and must never be presented as one: it is what
 * this kit and its install cost out at, and the stated commission range is ~6x
 * it. See ui/priceCopy.ts for the distinction. This header said "shown as ONE
 * FIXED figure" until 2026-07-17; nothing about it was fixed.
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

  // Rounded UP: a figure shown to a client must never round below its own cost.
  const costBuildUpGBP =
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
      label: 'Margin & contingency',
      valueGBP: r(marginGBP),
      note: 'shown, not hidden — a margin over placeholder rates is still a placeholder',
    },
  ];

  return {
    componentsGBP: r(componentsGBP),
    fabricationGBP: r(fabricationGBP),
    installGBP: r(installGBP),
    plantingGBP: r(plantingGBP),
    subtotalGBP: r(subtotalGBP),
    marginGBP: r(marginGBP),
    costBuildUpGBP,
    lines,
  };
}

/** How many climbers a design needs: one per ~2.5 m of eave perimeter, min 2. */
export function plantCountFor(perimeterM: number): number {
  return Math.max(2, Math.round(perimeterM / 2.5));
}
