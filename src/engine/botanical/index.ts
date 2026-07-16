/**
 * botanical — procedural single-colour vector botany, adapted from nonflowers
 * (Lingdong Huang, MIT). Deterministic per seed; outputs SVG path data in
 * `INK_BLUE`. Phase 1: generator + isolated preview only (see #/lab/botanical).
 */
export {
  growPlant,
  growFromPreset,
  growWild,
  leafSprite,
  flowerSprite,
  genParams,
  SPECIES_PRESETS,
  INK_BLUE,
} from './nonflower';
export type {
  PlantDrawing,
  PlantPath,
  PlantRole,
  PlantSprite,
  LeafSpriteOpts,
  FlowerSpriteOpts,
  BBox,
  Genome,
} from './nonflower';
export type { BladeProfile } from './genes';
export { Rng } from './prng';
export { Noise } from './noise';
