/**
 * species.ts — the living-layer catalogue.
 *
 * 7 real UK-hardy climbers, each with the two properties that actually drive
 * the engine: its CLIMBING HABIT (what support pattern it physically needs)
 * and its STEM LOAD (how heavy it gets — the "wisteria needs heavier struts"
 * beat, demo-spec §2.4). Twining stems, tendrils, scrambling canes and
 * self-clinging roots each want a physically different armature, so the strut
 * field is visibly different per species.
 *
 * The spec's featured trio (clematis / wisteria / jasmine) leads the list;
 * the rest stay available for designer follow-ups.
 *
 * Numbers are horticultural rules-of-thumb (RHS-style ballpark), good enough
 * to drive the demo. TODO: have a horticulturalist confirm growth + spacing
 * before any of these become a warranty.
 *
 * NOTE: the plants attach to the lattice as a living skin on a SACRIFICIAL
 * armature. Nothing here feeds the structural model — species never change the
 * load path, only the strut PATTERN the armature presents.
 */
import type { Species } from './types';

export const SPECIES: Species[] = [
  {
    id: 'clematis',
    common: 'Mountain clematis',
    latin: 'Clematis montana',
    habit: 'tendril', // leaf-stalk (petiole) clasping — behaves like a tendril climber
    growthRateMPerYr: 2.4,
    matureCoverageM2: 14,
    supportSpacingM: 0.16, // petiole-clasping wants a fine MESH to grab
    stemLoad01: 0.5,
    sunNeed: 'full',
    pollinatorValue: 0.6,
    floweringMonths: 'Apr–May',
    evergreen: false,
    note: 'Vigorous spring blossom. Leaf-stalks clasp thin members, so it wants a fine two-way mesh, not big posts.',
  },
  {
    id: 'wisteria',
    common: 'Chinese wisteria',
    latin: 'Wisteria sinensis',
    habit: 'twining',
    growthRateMPerYr: 2.8,
    matureCoverageM2: 20,
    supportSpacingM: 0.4, // stout, wider-spaced supports — mass over mesh
    stemLoad01: 0.95, // mature trunks are genuinely heavy: the armature must beef up
    sunNeed: 'full',
    pollinatorValue: 0.7,
    floweringMonths: 'May–Jun',
    evergreen: false,
    note: 'The heavyweight. Twining trunks thicken to timber-scale with age — the engine specifies HEAVIER, wider-spaced struts, not more of them.',
  },
  {
    id: 'trachelospermum',
    common: 'Star jasmine',
    latin: 'Trachelospermum jasminoides',
    habit: 'twining',
    growthRateMPerYr: 0.9,
    matureCoverageM2: 7,
    supportSpacingM: 0.3,
    stemLoad01: 0.35,
    sunNeed: 'partial',
    pollinatorValue: 0.7,
    floweringMonths: 'Jul–Aug',
    evergreen: true,
    note: 'Evergreen, intensely fragrant. Slower, tidy twiner — year-round green skin, best on a sheltered warm face.',
  },
  {
    id: 'lonicera',
    common: 'Common honeysuckle',
    latin: 'Lonicera periclymenum',
    habit: 'twining',
    growthRateMPerYr: 1.6,
    matureCoverageM2: 9,
    supportSpacingM: 0.28, // twiners want closely-spaced verticals to wrap
    stemLoad01: 0.45,
    sunNeed: 'partial',
    pollinatorValue: 0.95,
    floweringMonths: 'Jun–Sep',
    evergreen: false,
    note: 'Night-scented; moths + long-tongued bees. Twining stems need vertical wires/battens to spiral around.',
  },
  {
    id: 'rosa-newdawn',
    common: "Climbing rose 'New Dawn'",
    latin: "Rosa 'New Dawn'",
    habit: 'scrambler',
    growthRateMPerYr: 1.2,
    matureCoverageM2: 11,
    supportSpacingM: 0.55, // scramblers ride HORIZONTAL rails and are tied in
    stemLoad01: 0.6,
    sunNeed: 'full',
    pollinatorValue: 0.55,
    floweringMonths: 'Jun–Sep (repeat)',
    evergreen: false,
    note: 'No self-clinging — canes are tied to horizontal rails. Repeat-flowering, disease-tough. Wants wide horizontal supports.',
  },
  {
    id: 'lathyrus',
    common: 'Sweet pea',
    latin: 'Lathyrus odoratus',
    habit: 'tendril',
    growthRateMPerYr: 2.0, // annual — fast to fill, replant each year
    matureCoverageM2: 4,
    supportSpacingM: 0.12, // tendrils want the finest mesh of all
    stemLoad01: 0.1,
    sunNeed: 'full',
    pollinatorValue: 0.5,
    floweringMonths: 'Jun–Aug',
    evergreen: false,
    note: 'Annual; fastest to clothe a mesh in year one but resets each spring. True tendrils need the finest netting.',
  },
  {
    id: 'hedera',
    common: 'Common ivy',
    latin: 'Hedera helix',
    habit: 'clinging',
    growthRateMPerYr: 1.1,
    matureCoverageM2: 16,
    supportSpacingM: 0.9, // self-clinging: needs almost no support, near-solid skin
    stemLoad01: 0.7,
    sunNeed: 'shade',
    pollinatorValue: 0.85, // late-season nectar lifeline (Sep–Nov)
    floweringMonths: 'Sep–Nov',
    evergreen: true,
    note: 'Self-clinging aerial roots — barely needs struts, forms a dense evergreen skin. Vital late-season nectar. Kept OFF the load path on the armature so roots never touch structural timber.',
  },
];

export const SPECIES_BY_ID: Record<string, Species> = Object.fromEntries(
  SPECIES.map((s) => [s.id, s]),
);

export const DEFAULT_SPECIES_ID = 'clematis';

export function getSpecies(id: string): Species {
  return SPECIES_BY_ID[id] ?? SPECIES_BY_ID[DEFAULT_SPECIES_ID];
}
