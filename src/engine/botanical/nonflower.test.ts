/**
 * nonflower.test.ts — determinism + invariants for the botanical generator.
 *
 * The whole point of the module is reproducibility (this repo forbids
 * Math.random in render paths), so determinism is the primary contract; the rest
 * guard against NaN/Infinity coords, empty output, and the one-colour rule.
 */
import { describe, expect, it } from 'vitest';
import {
  flowerSprite,
  genParams,
  growFromPreset,
  growPlant,
  growWild,
  INK_BLUE,
  leafSprite,
  type PlantSprite,
  SPECIES_PRESETS,
  type PlantDrawing,
} from './nonflower';

/** Extract every numeric literal from a plant's path `d` strings. */
function allNumbers(plant: PlantDrawing): number[] {
  const nums: number[] = [];
  for (const p of plant.paths) {
    for (const m of p.d.matchAll(/-?\d+(?:\.\d+)?/g)) nums.push(Number(m[0]));
  }
  return nums;
}

describe('determinism', () => {
  it('same genome + same seed -> byte-identical paths', () => {
    const a = growPlant(SPECIES_PRESETS[0], 'seed-alpha');
    const b = growPlant(SPECIES_PRESETS[0], 'seed-alpha');
    expect(a.paths).toEqual(b.paths);
    expect(a.viewBox).toBe(b.viewBox);
  });

  it('numeric and string seeds hash consistently within their own value', () => {
    expect(growWild(7).paths).toEqual(growWild(7).paths);
    expect(growWild('7').paths).toEqual(growWild('7').paths);
  });

  it('different seeds -> different output', () => {
    const a = growPlant(SPECIES_PRESETS[0], 'seed-one');
    const b = growPlant(SPECIES_PRESETS[0], 'seed-two');
    expect(JSON.stringify(a.paths)).not.toBe(JSON.stringify(b.paths));
  });

  it('genParams is deterministic per seed', () => {
    expect(genParams('x')).toEqual(genParams('x'));
    expect(genParams('x')).not.toEqual(genParams('y'));
  });

  it('every preset renders deterministically', () => {
    for (const preset of SPECIES_PRESETS) {
      const s = `preset-${preset.name}`;
      expect(growFromPreset(preset.name, s).paths).toEqual(
        growFromPreset(preset.name, s).paths,
      );
    }
  });
});

describe('invariants', () => {
  const plants = [
    ...SPECIES_PRESETS.map((p, i) => growFromPreset(p.name, `inv-${i}`)),
    ...Array.from({ length: 8 }, (_, i) => growWild(`wild-${i}`)),
  ];

  it('produces non-empty output with a stem and foliage', () => {
    for (const plant of plants) {
      expect(plant.paths.length).toBeGreaterThan(0);
      expect(plant.paths.some((p) => p.role === 'stem')).toBe(true);
      expect(plant.paths.some((p) => p.role === 'leaf' || p.role === 'petal')).toBe(true);
      for (const p of plant.paths) expect(p.d.length).toBeGreaterThan(0);
    }
  });

  it('all coordinates are finite (no NaN / Infinity)', () => {
    for (const plant of plants) {
      const nums = allNumbers(plant);
      expect(nums.length).toBeGreaterThan(0);
      for (const n of nums) expect(Number.isFinite(n)).toBe(true);
    }
  });

  it('bbox and viewBox are finite with positive extent', () => {
    for (const plant of plants) {
      for (const v of Object.values(plant.bbox)) expect(Number.isFinite(v)).toBe(true);
      expect(plant.width).toBeGreaterThan(0);
      expect(plant.height).toBeGreaterThan(0);
      const vb = plant.viewBox.split(' ').map(Number);
      expect(vb).toHaveLength(4);
      for (const v of vb) expect(Number.isFinite(v)).toBe(true);
    }
  });

  it('honors the one-colour rule (INK_BLUE stroke; fill is none or INK_BLUE)', () => {
    for (const plant of plants) {
      for (const p of plant.paths) {
        expect(p.stroke).toBe(INK_BLUE);
        expect(p.fill === 'none' || p.fill === INK_BLUE).toBe(true);
        expect(p.fillOpacity).toBeGreaterThanOrEqual(0);
        expect(p.fillOpacity).toBeLessThanOrEqual(1);
      }
    }
  });

  it('grows upward from the base (foliage extends above the origin)', () => {
    for (const plant of plants) {
      // Up is negative y; the canopy must reach above the base at y=0.
      expect(plant.bbox.minY).toBeLessThan(0);
    }
  });
});

/**
 * Phase 1.5 retune (Daniel-reviewed): plants must be flower-forward, airier, and
 * must NOT collapse into the dense scribble-blob he rejected (clover seeds 1/2,
 * wild 4/7). These lock the tuning in so a future range change can't silently
 * regress the character.
 */
describe('phase 1.5 retune character', () => {
  it('caps the blob failure mode: no genome explodes into a smudge', () => {
    // The old depth-2 x fork-3 genomes stacked far more geometry than this. Every
    // preset seed AND a wide sweep of wild seeds must stay well under the cap.
    const MAX_PATHS = 600;
    const sweep = [
      ...SPECIES_PRESETS.flatMap((p) => [0, 1, 2].map((k) => growFromPreset(p.name, `${p.name}-${k}`))),
      ...Array.from({ length: 40 }, (_, i) => growWild(`wild-${i}`)),
    ];
    for (const plant of sweep) {
      expect(plant.paths.length).toBeLessThan(MAX_PATHS);
    }
  });

  it('caps depth and leaf density in the randomizer (airy by construction)', () => {
    for (let i = 0; i < 60; i++) {
      const g = genParams(`airy-${i}`);
      expect(g.branchDepth).toBeLessThanOrEqual(1);
      expect(g.leafChance).toBeLessThanOrEqual(0.55);
      expect(g.leafWidth).toBeLessThanOrEqual(16);
    }
  });

  it('is flower-forward: most wild plants carry blooms', () => {
    const N = 40;
    let withFlowers = 0;
    for (let i = 0; i < N; i++) {
      const plant = growWild(`bloomcheck-${i}`);
      if (plant.paths.some((p) => p.role === 'petal' || p.role === 'center')) withFlowers++;
    }
    // The randomizer flowers ~85% of genomes; the vast majority must show petals.
    expect(withFlowers / N).toBeGreaterThan(0.7);
  });

  it('the clover preset no longer blobs (loosened toward sprig/reed)', () => {
    const g = SPECIES_PRESETS.find((p) => p.name === 'clover')!;
    expect(g.branchDepth).toBeLessThanOrEqual(1);
    expect(g.leafChance).toBeLessThanOrEqual(0.45);
    expect(g.flowerChance).toBeGreaterThanOrEqual(0.6);
    for (const seed of ['clover-1', 'clover-2']) {
      expect(growFromPreset('clover', seed).paths.length).toBeLessThan(600);
    }
  });
});

/**
 * Sprites — the single-organ API the growth-phase diagrams consume (D2 splash,
 * D4 engine). Same determinism + finite + one-colour contract as whole plants.
 */
describe('leaf / flower sprites', () => {
  const finite = (s: PlantSprite): boolean =>
    s.paths.every((p) => [...p.d.matchAll(/-?\d+(?:\.\d+)?/g)].every((m) => Number.isFinite(Number(m[0]))));

  it('leafSprite is deterministic and produces a finite, non-empty blade', () => {
    const a = leafSprite('leaf-seed');
    const b = leafSprite('leaf-seed');
    expect(a.paths).toEqual(b.paths);
    expect(a.paths.length).toBeGreaterThan(0);
    expect(a.paths.some((p) => p.role === 'leaf')).toBe(true);
    expect(finite(a)).toBe(true);
  });

  it('flowerSprite is deterministic and produces petals + a finite output', () => {
    const a = flowerSprite('flower-seed', { petals: 5 });
    const b = flowerSprite('flower-seed', { petals: 5 });
    expect(a.paths).toEqual(b.paths);
    expect(a.paths.filter((p) => p.role === 'petal').length).toBe(5);
    expect(a.paths.some((p) => p.role === 'center')).toBe(true);
    expect(finite(a)).toBe(true);
  });

  it('sprite options change the geometry (different seeds/profiles differ)', () => {
    expect(leafSprite('a').paths).not.toEqual(leafSprite('b').paths);
    expect(leafSprite('x', { profile: 'linear' }).paths).not.toEqual(
      leafSprite('x', { profile: 'cordate' }).paths,
    );
  });

  it('sprites obey the one-colour rule (INK_BLUE stroke; fill none or INK_BLUE)', () => {
    for (const s of [leafSprite('one'), flowerSprite('two')]) {
      for (const p of s.paths) {
        expect(p.stroke).toBe(INK_BLUE);
        expect(p.fill === 'none' || p.fill === INK_BLUE).toBe(true);
      }
    }
    // bbox is finite with real extent so consumers can center on it.
    const bb = leafSprite('three').bbox;
    for (const v of Object.values(bb)) expect(Number.isFinite(v)).toBe(true);
    expect(bb.maxY - bb.minY).toBeGreaterThan(0);
  });
});
