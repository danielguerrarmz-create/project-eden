import { describe, it, expect } from 'vitest';
import { generateGeometry, canopyProfile } from './geometry';
import { GRAMMAR, ENVELOPE } from '../data/config';
import type { DesignParams } from './types';

const base: DesignParams = {
  footprintM2: 15,
  riseM: 2.3,
  strutSpacingM: 0.35,
  apertureDeg: 90,
  speciesId: 'clematis',
  year: 0,
};

/** Sweep a representative grid of designs for the invariant checks. */
function sweep(fn: (p: DesignParams) => void) {
  for (let f = ENVELOPE.footprintM2.min; f <= ENVELOPE.footprintM2.max; f += 1.5) {
    for (const r of [1.9, 2.2, 2.5]) {
      for (const s of [0.25, 0.35, 0.5]) {
        for (const ap of [0, 90, 210]) {
          fn({ ...base, footprintM2: f, riseM: r, strutSpacingM: s, apertureDeg: ap });
        }
      }
    }
  }
}

describe('generateGeometry: structural invariants across the whole range', () => {
  it('always lands feet on the ground and never dips below it', () => {
    sweep((p) => {
      const g = generateGeometry(p);
      let minY = Infinity;
      for (const m of g.members) {
        minY = Math.min(minY, m.start[1], m.end[1]);
        expect(m.start[1]).toBeGreaterThanOrEqual(-1e-6);
        expect(m.end[1]).toBeGreaterThanOrEqual(-1e-6);
      }
      // Some node actually reaches the lawn (a foot), not hovering above it.
      expect(minY).toBeLessThan(0.1);
    });
  });

  it('never emits a component longer than the CNC sheet cut limit', () => {
    sweep((p) => {
      const g = generateGeometry(p);
      expect(g.maxComponentLengthM).toBeLessThanOrEqual(GRAMMAR.maxComponentLengthM + 1e-6);
      for (const m of g.members) {
        expect(m.lengthM).toBeLessThanOrEqual(GRAMMAR.maxComponentLengthM + 1e-6);
      }
    });
  });

  it('produces 3 or 4 feet, a resolved diagrid, and a real major/minor ellipse', () => {
    sweep((p) => {
      const g = generateGeometry(p);
      expect([3, 4]).toContain(g.feetCount);
      expect(g.footBearingsDeg).toHaveLength(g.feetCount);
      expect(g.ringCount).toBeGreaterThanOrEqual(4);
      expect(g.spokeCount).toBeGreaterThanOrEqual(12);
      expect(g.members.length).toBeGreaterThan(0);
      expect(g.planA).toBeGreaterThan(g.planB); // major > minor
    });
  });

  it('is deterministic: same params in, identical member count out', () => {
    expect(generateGeometry(base).members.length).toBe(generateGeometry(base).members.length);
  });
});

describe('canopyProfile: the elevation silhouette the diagrams draw', () => {
  it('runs edge (v=0) up to the crown (v=1) with the crown highest', () => {
    const prof = canopyProfile(base, base.apertureDeg);
    expect(prof.length).toBeGreaterThan(2);
    const edge = prof[0];
    const crown = prof[prof.length - 1];
    expect(crown.y).toBeGreaterThan(edge.y);
    expect(crown.radius).toBeLessThan(edge.radius); // narrows toward the crown
  });

  it('lifts the aperture side above its opposite side', () => {
    const front = canopyProfile(base, base.apertureDeg);
    const back = canopyProfile(base, base.apertureDeg + 180);
    // Eave (edge) height is higher on the aperture side.
    expect(front[0].y).toBeGreaterThanOrEqual(back[0].y - 1e-9);
  });
});
