/**
 * speciesSwatch.ts — the swatch colour per species, DERIVED from speciesVisual.
 *
 * Round 3 (spec B3): the rail swatch is no longer an independent hand-picked
 * hue. It IS the real bloom colour the growth layer paints (`speciesVisual.ts`),
 * so the dot on a card is a paint chip for the flower the structure will carry,
 * the way a nursery tag relates to its plant. Keeping two separate colour maps
 * risked them drifting apart; this collapses them to one source of truth.
 *
 * The public shape is unchanged (SPECIES_SWATCH map + swatchFor + the
 * completeness invariant) so callers and the existing test keep working.
 */
import { SPECIES } from '../../engine/species';
import { SPECIES_VISUAL, visualFor } from './speciesVisual';

/** Swatch hue per id = the species' petal colour. Built once from speciesVisual. */
export const SPECIES_SWATCH: Record<string, string> = Object.fromEntries(
  Object.entries(SPECIES_VISUAL).map(([id, v]) => [id, v.petalColor]),
);

/** The swatch for a species id, falling back to a neutral if one is missing. */
export function swatchFor(id: string): string {
  return visualFor(id).petalColor;
}

/** Every real species has a swatch. Guards the "new species => add a hue" gap. */
export const EVERY_SPECIES_HAS_A_SWATCH = SPECIES.every((s) => s.id in SPECIES_SWATCH);
