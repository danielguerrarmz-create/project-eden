/**
 * components.ts — geometry -> flat cuttable component list + count.
 *
 * This is the visible answer to "is this real?" (mvp-spec §"Terminal outputs":
 * the form compiles to a flat list of cuttable components). It collapses the
 * discretised members into a tidy cut-list by rounding each length to a
 * fabrication bucket, then counts identical pieces.
 *
 * PURE. No pricing, no geometry maths — just decomposition + tally.
 */
import { FABRICATION } from '../data/config';
import type { ComponentList, CutItem, FollyGeometry } from './types';

export function decomposeComponents(geometry: FollyGeometry): ComponentList {
  const bucket = FABRICATION.cutListRoundingM;
  const key = (lengthM: number, type: CutItem['type']) =>
    `${type}:${(Math.round(lengthM / bucket) * bucket).toFixed(2)}`;

  const map = new Map<string, CutItem>();
  let totalLengthM = 0;

  for (const m of geometry.members) {
    const roundedLen = Math.max(bucket, Math.round(m.lengthM / bucket) * bucket);
    totalLengthM += m.lengthM;
    const k = key(roundedLen, m.type);
    const existing = map.get(k);
    if (existing) {
      existing.count += 1;
    } else {
      map.set(k, { lengthM: Number(roundedLen.toFixed(2)), type: m.type, count: 1 });
    }
  }

  const items = [...map.values()].sort(
    (a, b) => a.type.localeCompare(b.type) || a.lengthM - b.lengthM,
  );
  const totalCount = items.reduce((n, it) => n + it.count, 0);

  return {
    items,
    totalCount,
    totalLengthM: Number(totalLengthM.toFixed(1)),
  };
}
