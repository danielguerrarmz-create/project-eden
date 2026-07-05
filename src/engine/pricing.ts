/**
 * pricing.ts — price = count × rate + install + planting (+ channel fee + VAT).
 *
 * The price ticks live as the form changes (mvp-spec success bar). It is built
 * ENTIRELY from named constants in data/config.ts — there is not one magic
 * number in this file.
 *
 * >>> THE SINGLE MOST IMPORTANT TODO IN THE WHOLE DEMO <<<
 * PRICING.ratePerComponentGBP is a PLACEHOLDER. The margin claim, the "priceable
 * in real time" thesis, and whether this reads as real or as a toy all rest on
 * it (stress-test §4, §9.2). Wire in a real itemised CNC-timber fab quote
 * against the demo's actual cut geometry before filming anything that presents
 * the number as a quote. Until then: the price MOVES correctly, it is not yet
 * TRUE. See config.ts for the exact constant.
 */
import { PRICING } from '../data/config';
import type { ComponentList, PriceBreakdown, Species } from './types';

export function priceDesign(
  components: ComponentList,
  species: Species,
  plantCount: number,
): PriceBreakdown {
  const componentsGBP = components.totalCount * PRICING.ratePerComponentGBP;
  const cuttingGBP = components.totalLengthM * PRICING.cutCostPerMetreGBP;
  const installGBP =
    PRICING.installBaseGBP + components.totalCount * PRICING.installPerComponentGBP;
  const plantingGBP = plantCount * PRICING.plantingPerPlantGBP;

  const buildSubtotalGBP = componentsGBP + cuttingGBP + installGBP + plantingGBP;

  // Mandatory garden-designer channel fee is COGS, not a discount lever
  // (stress-test §4). Applied on the build subtotal.
  const designerFeeGBP = buildSubtotalGBP * PRICING.designerChannelFeeRate;

  const exVatGBP = buildSubtotalGBP + designerFeeGBP;
  const vatGBP = exVatGBP * PRICING.vatRate;
  const incVatGBP = exVatGBP + vatGBP;

  const r = (x: number) => Math.round(x);

  const lines: PriceBreakdown['lines'] = [
    {
      label: `${components.totalCount} timber components`,
      valueGBP: r(componentsGBP),
      note: 'Placeholder rate, not yet a confirmed fabrication quote',
    },
    { label: `Cutting & finishing (${components.totalLengthM} m)`, valueGBP: r(cuttingGBP) },
    { label: 'Install (base + per member)', valueGBP: r(installGBP) },
    { label: `Planting: ${plantCount}× ${species.common}`, valueGBP: r(plantingGBP) },
    { label: 'Garden-designer channel fee (12%)', valueGBP: r(designerFeeGBP), note: 'mandatory, counted as cost of goods' },
    { label: 'VAT (20%)', valueGBP: r(vatGBP) },
  ];

  return {
    componentsGBP: r(componentsGBP),
    cuttingGBP: r(cuttingGBP),
    installGBP: r(installGBP),
    plantingGBP: r(plantingGBP),
    buildSubtotalGBP: r(buildSubtotalGBP),
    designerFeeGBP: r(designerFeeGBP),
    exVatGBP: r(exVatGBP),
    vatGBP: r(vatGBP),
    incVatGBP: r(incVatGBP),
    lines,
  };
}

/** How many climbers a design needs: one per ~2.5m of built arc perimeter, min 2. */
export function plantCountFor(perimeterM: number): number {
  return Math.max(2, Math.round(perimeterM / 2.5));
}
