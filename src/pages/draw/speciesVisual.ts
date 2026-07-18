/**
 * speciesVisual.ts — how each climber is DRAWN, presentation only.
 *
 * The same pattern as `speciesSwatch.ts` (which now derives from this): keyed by
 * `Species.id`, hand-authored, flagged as such, and guarded by a "every species
 * has an entry" test. Nothing here feeds the engine or the load path — it only
 * decides what geometry the growth layer places per species so a clematis reads
 * as a fine flowering net and a wisteria as a spiralled twiner with hanging
 * racemes (round-3 brief item 2: botanically recognisable per species).
 *
 * FOUR HABIT FAMILIES cover all seven plants, matching `ClimbingHabit` in
 * engine/types.ts:
 *   tendril   -> 'net'    a fine mesh of thin stem segments (clematis, sweet pea)
 *   twining   -> 'spiral' a short helical stem wrap (wisteria, jasmine, honeysuckle)
 *   scrambler -> 'arch'   arched cane segments (the rose)
 *   clinging  -> 'mat'    a dense flat leaf mat, almost no flower (ivy)
 *
 * PETAL COLOUR doubles as the rail swatch (brief item, spec B3): the dot on the
 * species card is a paint chip for the bloom the structure will actually carry,
 * a nursery tag's relationship to its plant. Colours are desaturated and
 * warm-shifted to sit inside the house palette (wisteria mauve, not its real
 * blue-violet, the same reasoning speciesSwatch used before). Star jasmine and
 * ivy have white / insignificant flowers that would vanish on paper, so their
 * "petal" colour leans on their evergreen character instead — an honest tag,
 * since the evergreen skin IS their visual signature.
 */
import { SPECIES } from '../../engine/species';

export type StemForm = 'net' | 'spiral' | 'arch' | 'mat';
export type PetalForm = 'star' | 'raceme' | 'bloom' | 'none';

export interface SpeciesVisual {
  /** tendril / twining / scrambler / clinging, as a drawn stem primitive. */
  stemForm: StemForm;
  /** Real-ish bloom colour, desaturated into the house palette. Ties to the
   *  rail swatch (B3). */
  petalColor: string;
  /** clematis-star / wisteria-raceme / rose-or-pea-bloom / ivy has none. */
  petalForm: PetalForm;
  /** How much of the coverage is bloom vs plain leaf, 0..1. */
  flowerDensity01: number;
}

export const SPECIES_VISUAL: Record<string, SpeciesVisual> = {
  // Vigorous spring blossom on a fine clasping mesh — dense small stars.
  clematis: { stemForm: 'net', petalColor: '#C98F82', petalForm: 'star', flowerDensity01: 0.7 },
  // The heavyweight twiner; hanging racemes, warm-shifted mauve off its blue-violet.
  wisteria: { stemForm: 'spiral', petalColor: '#8B7398', petalForm: 'raceme', flowerDensity01: 0.6 },
  // Evergreen tidy twiner; white star flowers read faintly, so it leans green.
  trachelospermum: { stemForm: 'spiral', petalColor: '#6E7C52', petalForm: 'star', flowerDensity01: 0.22 },
  // Twining, clustered tubular blooms in warm coral.
  lonicera: { stemForm: 'spiral', petalColor: '#C97B4A', petalForm: 'bloom', flowerDensity01: 0.5 },
  // Scrambling cane, larger sparser dusty-rose blooms on wide horizontal runs.
  'rosa-newdawn': { stemForm: 'arch', petalColor: '#C97286', petalForm: 'bloom', flowerDensity01: 0.4 },
  // Annual tendril; fastest to clothe a fine net, pale orchid-pink pea flowers.
  lathyrus: { stemForm: 'net', petalColor: '#B98CA6', petalForm: 'bloom', flowerDensity01: 0.6 },
  // Self-clinging dense evergreen mat; its Sep-Nov flowers are invisibly small.
  hedera: { stemForm: 'mat', petalColor: '#4F5A3A', petalForm: 'none', flowerDensity01: 0.02 },
};

const NEUTRAL: SpeciesVisual = {
  stemForm: 'net',
  petalColor: '#8a8577',
  petalForm: 'none',
  flowerDensity01: 0,
};

/** The visual spec for a species id, falling back to a neutral if missing. */
export function visualFor(id: string): SpeciesVisual {
  return SPECIES_VISUAL[id] ?? NEUTRAL;
}

/** Every real species has a visual entry. Guards the "new species => add one" gap. */
export const EVERY_SPECIES_HAS_A_VISUAL = SPECIES.every((s) => s.id in SPECIES_VISUAL);
