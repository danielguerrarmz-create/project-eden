import { describe, it, expect } from 'vitest';
import {
  AUSTIN_PARCELS,
  analyseSite,
  maxFootprintForRadius,
  REAR_SETBACK_M,
  SIDE_SETBACK_M,
} from './site';

describe('analyseSite: the yard is real, so say true things about it', () => {
  for (const parcel of AUSTIN_PARCELS) {
    describe(parcel.address, () => {
      const a = analyseSite(parcel);

      it('puts the back yard BEHIND the house and inside the setbacks', () => {
        const houseMaxY = Math.max(...parcel.house.map((p) => p.y));
        const lotMaxY = Math.max(...parcel.lot.map((p) => p.y));
        const lotMaxX = Math.max(...parcel.lot.map((p) => p.x));
        expect(a.backyard.minY).toBeGreaterThanOrEqual(houseMaxY - 1e-9);
        expect(a.backyard.maxY).toBeCloseTo(lotMaxY - REAR_SETBACK_M, 6);
        expect(a.backyard.maxX).toBeCloseTo(lotMaxX - SIDE_SETBACK_M, 6);
        expect(a.backyard.minX).toBeCloseTo(SIDE_SETBACK_M, 6);
      });

      it('reports a positive yard area', () => {
        expect(a.backyardAreaM2).toBeGreaterThan(0);
      });

      it('places INSIDE its own back yard', () => {
        expect(a.placement.x).toBeGreaterThanOrEqual(a.backyard.minX - 1e-6);
        expect(a.placement.x).toBeLessThanOrEqual(a.backyard.maxX + 1e-6);
        expect(a.placement.y).toBeGreaterThanOrEqual(a.backyard.minY - 1e-6);
        expect(a.placement.y).toBeLessThanOrEqual(a.backyard.maxY + 1e-6);
      });

      it('never places inside a tree canopy it claims to keep clear', () => {
        for (const t of parcel.trees) {
          const d = Math.hypot(t.at.x - a.placement.x, t.at.y - a.placement.y);
          expect(d).toBeGreaterThanOrEqual(t.canopyRadiusM - 1e-6);
        }
      });

      it('always explains itself', () => {
        expect(a.reasons.length).toBeGreaterThan(0);
      });
    });
  }

  it('warns rather than silently proposing an impossible spot', () => {
    const cramped = {
      id: 'cramped',
      address: 'test',
      neighbourhood: 'test',
      lot: [
        { x: 0, y: 0 },
        { x: 8, y: 0 },
        { x: 8, y: 12 },
        { x: 0, y: 12 },
      ],
      // House eats nearly the whole lot; what's left can't take an Eden.
      house: [
        { x: 0.5, y: 0.5 },
        { x: 7.5, y: 0.5 },
        { x: 7.5, y: 8.4 },
        { x: 0.5, y: 8.4 },
      ],
      trees: [],
    };
    const a = analyseSite(cramped);
    expect(a.placementRadiusM).toBeLessThan(2.2);
    expect(a.warnings.length).toBeGreaterThan(0);
    expect(a.warnings[0]).toMatch(/2\.2 m/);
  });

  it('the protected-pecan lot is pushed off the tree, not onto it', () => {
    const th = analyseSite(AUSTIN_PARCELS.find((p) => p.id === 'travis-heights')!);
    const pecan = th.parcel.trees.find((t) => t.protected)!;
    const d = Math.hypot(pecan.at.x - th.placement.x, pecan.at.y - th.placement.y);
    expect(d).toBeGreaterThan(pecan.canopyRadiusM);
    expect(th.reasons.some((r) => /protected/.test(r))).toBe(true);
  });
});

describe('maxFootprintForRadius', () => {
  it('grows with room and is never negative', () => {
    expect(maxFootprintForRadius(0)).toBe(0);
    expect(maxFootprintForRadius(-5)).toBe(0);
    expect(maxFootprintForRadius(3)).toBeGreaterThan(maxFootprintForRadius(2));
  });
});
