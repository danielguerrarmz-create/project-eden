import { describe, it, expect } from 'vitest';
import {
  tentHeight,
  nearestOnArc,
  surfaceHeight,
  isHole,
  surfaceBounds,
  surfaceAreaM2,
  surfacePeakM,
  arcRiseM,
  arcReachM,
  type SurfaceInput,
} from './surface';
import { GRAMMAR } from '../data/config';
import { convexHull, polygonAreaM2, type Spine } from './fromDrawing';

const arcEW: Spine = { a: { x: -2, y: 0 }, b: { x: 2, y: 0 } };
const arcNS: Spine = { a: { x: 0, y: -2 }, b: { x: 0, y: 2 } };

describe('arcRiseM / arcReachM: assumed from the line, never asked for', () => {
  it('rise grows with span but never needs planning permission', () => {
    expect(arcRiseM(4)).toBeGreaterThan(arcRiseM(2));
    for (const s of [0, 1, 4, 40, 400]) {
      expect(arcRiseM(s)).toBeLessThanOrEqual(GRAMMAR.pdHeightCapM + 1e-9);
    }
  });

  it('reach grows with span and is never zero', () => {
    expect(arcReachM(4)).toBeGreaterThan(arcReachM(1));
    expect(arcReachM(0)).toBeGreaterThan(0);
  });
});

describe('tentHeight: one arc is a tent over its chord', () => {
  it('is on the ground at its own feet', () => {
    expect(tentHeight(arcEW, arcEW.a)).toBeCloseTo(0, 6);
    expect(tentHeight(arcEW, arcEW.b)).toBeCloseTo(0, 6);
  });

  it('peaks over the middle of the chord', () => {
    expect(tentHeight(arcEW, { x: 0, y: 0 })).toBeCloseTo(arcRiseM(4), 5);
  });

  it('falls off to either side and dies at the reach', () => {
    const mid = tentHeight(arcEW, { x: 0, y: 0 });
    const off = tentHeight(arcEW, { x: 0, y: 1 });
    expect(off).toBeGreaterThan(0);
    expect(off).toBeLessThan(mid);
    expect(tentHeight(arcEW, { x: 0, y: arcReachM(4) + 0.01 })).toBe(0);
  });

  it('is zero well beyond the chord ends', () => {
    expect(tentHeight(arcEW, { x: 40, y: 0 })).toBe(0);
  });

  it('is never negative and never NaN, including a degenerate arc', () => {
    const degenerate: Spine = { a: { x: 1, y: 1 }, b: { x: 1, y: 1 } };
    for (const p of [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: -5, y: 3 }]) {
      const h = tentHeight(degenerate, p);
      expect(Number.isFinite(h)).toBe(true);
      expect(h).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('surfaceHeight: a skin stretched OVER the ribs', () => {
  const two: SurfaceInput = { arcs: [arcEW, arcNS], edits: [] };
  const one: SurfaceInput = { arcs: [arcEW], edits: [] };

  it('ONE line encloses no plan, so there is no surface yet — a rib is not a vault', () => {
    // Deliberate: the first stroke gives you an arch and nothing else. The
    // surface is what appears when a second line closes a footprint, which is
    // exactly the moment worth showing.
    expect(surfaceAreaM2(one)).toBe(0);
    expect(surfaceHeight(one, { x: 0, y: 0 })).toBe(0);
  });

  it('PASSES THROUGH the rib — the line you drew is still on the surface', () => {
    // The whole reason this isn't a p-norm blend of tents: that buried the
    // drawn arcs inside a mound. On a rib, the skin must BE the rib.
    // Sampled along the EW rib, inside the hull and clear of the eave easing.
    for (const x of [-0.8, 0, 0.8]) {
      const p = { x, y: 0 };
      const { ribHeight } = nearestOnArc(arcEW, p);
      expect(surfaceHeight(two, p)).toBeCloseTo(ribHeight, 1);
    }
  });

  it('still passes through each rib when several cross', () => {
    // On the EW rib, away from the crossing: the skin follows THAT rib to
    // within a centimetre. Not exactly — a taller neighbouring rib tensions
    // the skin a hair above this one, which is what a stretched skin does —
    // but nowhere near enough to lift the drawn line off its own surface.
    const p = { x: 1.5, y: 0 };
    const { ribHeight } = nearestOnArc(arcEW, p);
    expect(surfaceHeight(two, p)).toBeCloseTo(ribHeight, 2);
  });

  it('never balloons above the tallest rib — a skin does not levitate', () => {
    const peak = surfacePeakM(two);
    expect(peak).toBeLessThanOrEqual(arcRiseM(4) + 1e-6);
  });

  it('SAGS between ribs rather than creasing or spiking', () => {
    // Midway between the two ribs, off both: below the ribs, above the ground.
    const p = { x: 0.9, y: 0.9 };
    const h = surfaceHeight(two, p);
    expect(h).toBeGreaterThan(0);
    expect(h).toBeLessThan(arcRiseM(4));
  });

  it('a second line GROWS the thing rather than parking another object', () => {
    // A point far off the first rib but near the second picks up real height.
    const p = { x: 0, y: 1.6 };
    expect(surfaceHeight(two, p)).toBeGreaterThan(surfaceHeight(one, p));
  });

  it('is on the ground far away', () => {
    expect(surfaceHeight(two, { x: 50, y: 50 })).toBe(0);
  });

  it('never exceeds the planning cap, whatever you draw', () => {
    const many: SurfaceInput = {
      arcs: Array.from({ length: 8 }, (_, i) => ({
        a: { x: -3, y: i * 0.05 },
        b: { x: 3, y: i * 0.05 },
      })),
      edits: [],
    };
    expect(surfaceHeight(many, { x: 0, y: 0 })).toBeLessThanOrEqual(GRAMMAR.pdHeightCapM + 1e-9);
  });

  it('with nothing drawn it is simply flat ground', () => {
    expect(surfaceHeight({ arcs: [], edits: [] }, { x: 0, y: 0 })).toBe(0);
  });
});

describe('lift: a place and a size, no numbers', () => {
  const base: SurfaceInput = { arcs: [arcEW], edits: [] };
  const lifted: SurfaceInput = {
    arcs: [arcEW],
    edits: [{ kind: 'lift', at: { x: 1, y: 0 }, radiusM: 1, amountM: 0.5 }],
  };

  it('raises the surface at the lift, and only there', () => {
    expect(surfaceHeight(lifted, { x: 1, y: 0 })).toBeGreaterThan(
      surfaceHeight(base, { x: 1, y: 0 }),
    );
    // Outside the radius, untouched.
    expect(surfaceHeight(lifted, { x: -1.8, y: 0 })).toBeCloseTo(
      surfaceHeight(base, { x: -1.8, y: 0 }),
      6,
    );
  });

  it('is still capped — a lift cannot buy you a planning application', () => {
    const silly: SurfaceInput = {
      arcs: [arcEW],
      edits: [{ kind: 'lift', at: { x: 0, y: 0 }, radiusM: 2, amountM: 99 }],
    };
    expect(surfaceHeight(silly, { x: 0, y: 0 })).toBe(GRAMMAR.pdHeightCapM);
  });

  it('never drives the surface below ground', () => {
    const dug: SurfaceInput = {
      arcs: [arcEW],
      edits: [{ kind: 'lift', at: { x: 0, y: 0 }, radiusM: 2, amountM: -99 }],
    };
    expect(surfaceHeight(dug, { x: 0, y: 0 })).toBeGreaterThanOrEqual(0);
  });
});

describe('hole: excavated, not dented — you see through it', () => {
  const holed: SurfaceInput = {
    arcs: [arcEW, arcNS],
    edits: [{ kind: 'hole', at: { x: 0, y: 0 }, radiusM: 0.6 }],
  };

  it('marks the excavated region', () => {
    expect(isHole(holed, { x: 0, y: 0 })).toBe(true);
    expect(isHole(holed, { x: 0.3, y: 0 })).toBe(true);
    expect(isHole(holed, { x: 1.5, y: 0 })).toBe(false);
  });

  it('takes area out of the thing — the price must know', () => {
    const solid: SurfaceInput = { arcs: [arcEW, arcNS], edits: [] };
    expect(surfaceAreaM2(holed)).toBeLessThan(surfaceAreaM2(solid));
  });

  it('nothing is a hole when nothing was excavated', () => {
    expect(isHole({ arcs: [arcEW], edits: [] }, { x: 0, y: 0 })).toBe(false);
  });
});

describe('bounds / area / peak', () => {
  const two: SurfaceInput = { arcs: [arcEW, arcNS], edits: [] };

  it('bounds contain every arc plus its reach', () => {
    const b = surfaceBounds(two);
    expect(b.minX).toBeLessThanOrEqual(-2);
    expect(b.maxX).toBeGreaterThanOrEqual(2);
    expect(b.minY).toBeLessThanOrEqual(-2);
    expect(b.maxY).toBeGreaterThanOrEqual(2);
  });

  it('bounds are sane with nothing drawn', () => {
    const b = surfaceBounds({ arcs: [], edits: [] });
    expect(Number.isFinite(b.minX)).toBe(true);
    expect(b.maxX).toBeGreaterThan(b.minX);
  });

  it('area appears only when the lines enclose a plan', () => {
    const one: SurfaceInput = { arcs: [arcEW], edits: [] };
    expect(surfaceAreaM2(one)).toBe(0);
    expect(surfaceAreaM2(two)).toBeGreaterThan(0);
  });

  it('the area it SHOWS is the area the engine will PRICE', () => {
    // Both are the hull through the feet. If these two drift, the soft thing
    // says 54 m² and the bake says 15, and the tool looks like it lied.
    const hullArea = polygonAreaM2(convexHull([arcEW.a, arcEW.b, arcNS.a, arcNS.b]));
    expect(surfaceAreaM2(two)).toBeGreaterThan(hullArea * 0.75);
    expect(surfaceAreaM2(two)).toBeLessThanOrEqual(hullArea * 1.05);
  });

  it('area is 0 with nothing drawn', () => {
    expect(surfaceAreaM2({ arcs: [], edits: [] })).toBe(0);
  });

  it('peak matches the blended crown and respects the cap', () => {
    const peak = surfacePeakM(two);
    expect(peak).toBeGreaterThan(arcRiseM(4) * 0.9);
    expect(peak).toBeLessThanOrEqual(GRAMMAR.pdHeightCapM + 1e-9);
  });
});
