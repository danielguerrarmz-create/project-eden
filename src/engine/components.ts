/**
 * components.ts — geometry -> the kit: piece schedule + hardware tally.
 *
 * This is the visible answer to "is this real?": the form compiles to a flat
 * list of cuttable PIECES (not member segments — a two-bay lamella or a
 * curved eave blank is one piece) plus the connector/fastener schedule from
 * joints.ts and the living-armature allowance. Piece lengths round to a
 * fabrication bucket so identical cuts collapse into tidy lines; the rounding
 * is display-side only — the geometry keeps exact lengths.
 *
 * PURE. No pricing, no geometry maths — just decomposition + tally.
 */
import { GRAMMAR } from '../data/config';
import { computeHardware } from './joints';
import type { CanopyGeometry, ComponentList, CutItem, StrutField } from './types';

export function decomposeComponents(
  geometry: CanopyGeometry,
  strutField?: StrutField,
): ComponentList {
  const bucket = GRAMMAR.cutListRoundingM;

  const map = new Map<string, CutItem>();
  let totalLengthM = 0;

  for (const p of geometry.pieces) {
    const roundedLen = Math.max(bucket, Math.round(p.lengthM / bucket) * bucket);
    totalLengthM += p.lengthM;
    // NESTED width: a curved profile occupies depth + camber of the sheet
    // (rounded UP — stock estimates never round into the flattering side).
    const widthM =
      p.stock === 'sheet'
        ? Math.ceil((p.depthM + (p.camberM ?? 0)) * 100) / 100
        : p.depthM;
    const k = `${p.kind}:${roundedLen.toFixed(2)}:${widthM.toFixed(2)}`;
    const existing = map.get(k);
    if (existing) {
      existing.count += 1;
    } else {
      map.set(k, {
        lengthM: Number(roundedLen.toFixed(2)),
        kind: p.kind,
        stock: p.stock,
        depthM: p.depthM,
        widthM,
        count: 1,
      });
    }
  }

  const items = [...map.values()].sort(
    (a, b) => a.kind.localeCompare(b.kind) || a.lengthM - b.lengthM,
  );

  const hardware = computeHardware(geometry);
  // Living armature (FABRICATION.md §6): stainless wire run over the canopy
  // at the strut-field's recommended spacing — sacrificial, never load path.
  if (strutField) {
    const wireM = Math.ceil(geometry.surfaceAreaM2 / Math.max(0.15, strutField.recommendedSpacingM));
    hardware.push({
      id: 'armatureWirePerM',
      label: '6 mm stainless armature wire + eye screws (species-spaced, sacrificial)',
      qty: wireM,
      unit: 'm',
    });
  }

  return {
    items,
    hardware,
    totalCount: geometry.pieces.length,
    totalLengthM: Number(totalLengthM.toFixed(1)),
  };
}
