import { describe, it, expect } from 'vitest';
import { clampParams, generateGeometry } from './geometry';
import { ENVELOPE, baseParams, ALL_SPECIES_IDS, range } from './_fixtures';

/**
 * The instanced mesh in scene/Eden.tsx is allocated ONCE at a fixed capacity
 * (CAPACITY = 260) because reallocating an InstancedMesh re-triggers the WebGL
 * build. If the geometry ever emits more members than that, they silently vanish
 * from the render. This is the contract that keeps that from happening.
 */
const MESH_CAPACITY = 260; // scene/Eden.tsx CAPACITY — keep in sync
const OBSERVED_MAX_MEMBERS = 217; // full-density design; comfortably under capacity

describe('clampParams', () => {
  it('clamps every ranged knob into the pre-engineered envelope', () => {
    const p = clampParams(
      baseParams({
        enclosurePct: 999,
        heightM: 0,
        footprintRadiusM: 99,
        latticeDensity: -5,
        siteLatitudeDeg: 999,
      }),
    );
    expect(p.enclosurePct).toBe(ENVELOPE.enclosurePct.max);
    expect(p.heightM).toBe(ENVELOPE.heightM.min);
    expect(p.footprintRadiusM).toBe(ENVELOPE.footprintRadiusM.max);
    expect(p.latticeDensity).toBe(ENVELOPE.latticeDensity.min);
    expect(p.siteLatitudeDeg).toBe(ENVELOPE.siteLatitudeDeg.max);
  });

  it('passes in-envelope values through untouched', () => {
    const input = baseParams();
    const p = clampParams(input);
    expect(p.enclosurePct).toBe(input.enclosurePct);
    expect(p.heightM).toBe(input.heightM);
    expect(p.footprintRadiusM).toBe(input.footprintRadiusM);
    expect(p.latticeDensity).toBe(input.latticeDensity);
  });

  it('wraps orientation angles into [0, 360)', () => {
    expect(clampParams(baseParams({ openingOrientationDeg: -90 })).openingOrientationDeg).toBe(270);
    expect(clampParams(baseParams({ openingOrientationDeg: 450 })).openingOrientationDeg).toBe(90);
    expect(clampParams(baseParams({ siteOrientationDeg: -1 })).siteOrientationDeg).toBe(359);
  });
});

describe('generateGeometry member capacity', () => {
  it('never exceeds the instanced-mesh capacity across the whole input space', () => {
    let worst = 0;
    for (const speciesId of ALL_SPECIES_IDS) {
      for (const enclosurePct of range(20, 90, 5)) {
        for (const heightM of range(2.0, 4.0, 3)) {
          for (const footprintRadiusM of range(1.5, 3.5, 3)) {
            for (const latticeDensity of range(0, 1.2, 13)) {
              for (const openingOrientationDeg of [0, 90, 200, 359]) {
                const g = generateGeometry(
                  baseParams({
                    speciesId,
                    enclosurePct,
                    heightM,
                    footprintRadiusM,
                    latticeDensity,
                    openingOrientationDeg,
                  }),
                );
                worst = Math.max(worst, g.members.length);
                expect(g.members.length).toBeLessThanOrEqual(MESH_CAPACITY);
              }
            }
          }
        }
      }
    }
    // Lock the true peak too: if an envelope change pushes it past this, we want a
    // failing test long before it reaches the 260 ceiling and starts dropping members.
    expect(worst).toBe(OBSERVED_MAX_MEMBERS);
  });

  it('member count depends only on lattice density, not on size or species', () => {
    const a = generateGeometry(baseParams({ latticeDensity: 0.7, footprintRadiusM: 2.0, heightM: 2.5, speciesId: 'hedera' }));
    const b = generateGeometry(baseParams({ latticeDensity: 0.7, footprintRadiusM: 3.2, heightM: 3.6, speciesId: 'lathyrus' }));
    expect(a.members.length).toBe(b.members.length);
  });

  it('emits diagonal braces only above the density threshold (d > 0.55)', () => {
    const sparse = generateGeometry(baseParams({ latticeDensity: 0.5 }));
    const dense = generateGeometry(baseParams({ latticeDensity: 0.6 }));
    expect(sparse.members.some((m) => m.type === 'brace')).toBe(false);
    expect(dense.members.some((m) => m.type === 'brace')).toBe(true);
  });
});

describe('generateGeometry clamping to plot / envelope', () => {
  it('reports the CLAMPED footprint radius, never the raw request', () => {
    // A Grand-sized request (3.1 m) on an out-of-envelope oversize ask still lands
    // at the envelope max (3.2 m); an undersize ask lands at the min (1.8 m).
    expect(generateGeometry(baseParams({ footprintRadiusM: 99 })).footprintRadiusM).toBe(ENVELOPE.footprintRadiusM.max);
    expect(generateGeometry(baseParams({ footprintRadiusM: 0 })).footprintRadiusM).toBe(ENVELOPE.footprintRadiusM.min);
  });

  it('is deterministic: identical params give byte-identical geometry', () => {
    const p = baseParams({ latticeDensity: 0.83, enclosurePct: 62 });
    expect(generateGeometry(p)).toEqual(generateGeometry(p));
  });
});
