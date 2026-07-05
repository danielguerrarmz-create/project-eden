/**
 * pricing.ts — price = Σ components × rate + fabrication + install +
 * groundwork + planting + margin, shown as ONE FIXED figure (demo-spec §2.3).
 *
 * The price ticks live beside the viewport on every parameter change. It is
 * built ENTIRELY from named constants in data/config.ts — not one magic number
 * in this file. The decomposition (components / fabrication / install /
 * planting) is shown on the panel because decomposition = credibility; the
 * margin is shown plainly too, because hiding it would be the overclaim the
 * application warns against.
 *
 * >>> THE SINGLE MOST IMPORTANT TODO IN THE WHOLE DEMO <<<
 * PRICING.ratePerComponentGBP is a PLACEHOLDER until Clay's fab quote lands
 * (~Day 4–6). Swap the constants in config.ts and every number here is real.
 * Until then: the price MOVES correctly, it is not yet TRUE.
 */
import { PRICING } from '../data/config';
import type { CanopyGeometry, ComponentList, PriceBreakdown, Species } from './types';

export function priceDesign(
  geometry: CanopyGeometry,
  components: ComponentList,
  species: Species,
  plantCount: number,
): PriceBreakdown {
  const componentsGBP = components.totalCount * PRICING.ratePerComponentGBP;
  const fabricationGBP = components.totalLengthM * PRICING.cutCostPerMetreGBP;
  const installGBP =
    PRICING.installBaseGBP +
    components.totalCount * PRICING.installPerComponentGBP +
    geometry.feetCount * PRICING.groundworkPerFootGBP;
  const plantingGBP = plantCount * PRICING.plantingPerPlantGBP;

  const subtotalGBP = componentsGBP + fabricationGBP + installGBP + plantingGBP;
  const marginGBP = subtotalGBP * PRICING.marginRate;

  // Rounded UP to the commitment step: a fixed price must never round below cost.
  const fixedTotalGBP =
    Math.ceil((subtotalGBP + marginGBP) / PRICING.roundTotalToGBP) * PRICING.roundTotalToGBP;

  const r = (x: number) => Math.round(x);

  const lines: PriceBreakdown['lines'] = [
    {
      label: `${components.totalCount} CNC components`,
      valueGBP: r(componentsGBP),
      note: 'PLACEHOLDER rate — TODO: wire real fab quote',
    },
    { label: `Fabrication (${components.totalLengthM} m cut & finished)`, valueGBP: r(fabricationGBP) },
    {
      label: `Install & groundwork (${geometry.feetCount} feet)`,
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
