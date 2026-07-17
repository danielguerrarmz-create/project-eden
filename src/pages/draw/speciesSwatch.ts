/**
 * speciesSwatch.ts — a swatch colour per species, presentation only.
 *
 * Keyed by `Species.id`, testable the bare-node way `priceCopy.ts` is. These
 * are hand-picked hues, NOT sourced from anything horticultural — flagged
 * plainly, the same way species.ts flags its numbers as ballpark. They identify
 * seven plants the way a nursery tag does; the job is telling them apart at a
 * glance, not literal petal colour (star jasmine's flower is white and would
 * vanish against paperVellum, so it leans on its evergreen character instead).
 *
 * Wisteria is warm-shifted off its real blue-violet on purpose, the same
 * reasoning StudioEnvironment used to keep a blue cast off the steel.
 *
 * Every hue is desaturated and shown at 10 px, so the row reads as informational
 * rather than as decorative chrome. That it clears the house's one-accent
 * restraint is a judgement call flagged for Daniel (spec §11), to eyeball live.
 */
import { SPECIES } from '../../engine/species';

export const SPECIES_SWATCH: Record<string, string> = {
  clematis: '#C98F82', // warm terracotta-pink, spring blossom
  wisteria: '#8B7398', // muted mauve, warm-shifted off the real blue-violet
  trachelospermum: '#6E7C52', // star jasmine: evergreen character, flower is white
  lonicera: '#C97B4A', // honeysuckle, warm coral
  'rosa-newdawn': '#C97286', // dusty rose
  lathyrus: '#B98CA6', // sweet pea, pale orchid-pink
  hedera: '#4F5A3A', // ivy, deep evergreen
};

/** The swatch for a species id, falling back to a neutral if one is missing. */
export function swatchFor(id: string): string {
  return SPECIES_SWATCH[id] ?? '#8a8577';
}

/** Every real species has a swatch. Guards the "new species => add a hue" gap. */
export const EVERY_SPECIES_HAS_A_SWATCH = SPECIES.every((s) => s.id in SPECIES_SWATCH);
