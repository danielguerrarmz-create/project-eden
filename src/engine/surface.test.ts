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
  fairedRadius,
  footprintHull,
  planCentre,
  type SurfaceInput,
} from './surface';
import { GRAMMAR } from '../data/config';
import { convexHull, polygonAreaM2, type Spine } from './fromDrawing';

/** Boundary-ish point at a bearing: fraction f of the faired plan radius. */
function atBearing(arcs: Spine[], bearingRad: number, f: number) {
  const centre = planCentre(arcs);
  const R = fairedRadius(footprintHull(arcs), centre)(bearingRad);
  return {
    x: centre.x + f * R * Math.sin(bearingRad),
    y: centre.y + f * R * Math.cos(bearingRad),
  };
}

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

  it('nearestOnArc reports the ribbon height itself on the chord — one curve, two callers', () => {
    // The drawn ribbon (DrawStage.archPoints) and this must be one function,
    // or the line you drew floats off the arch it became.
    for (const x of [-1.2, 0, 1.4]) {
      const p = { x, y: 0 };
      const { ribHeight, distM } = nearestOnArc(arcEW, p);
      expect(distM).toBeCloseTo(0, 6);
      expect(tentHeight(arcEW, p)).toBeCloseTo(ribHeight, 6);
    }
  });
});

describe("surfaceHeight: the ENGINE'S canopy over the plan your lines claim", () => {
  // Feet at (±2,0) and (0,±2): bearings 90/270/0/180. Both spans are 4, so the
  // drawn rise is arcRiseM(4) ≈ 1.68 — below headroom, so the canopy crowns at
  // GRAMMAR.minHeadroomM. The same holding readDrawing applies to riseM.
  const two: SurfaceInput = { arcs: [arcEW, arcNS], edits: [] };
  const one: SurfaceInput = { arcs: [arcEW], edits: [] };
  const H = Math.max(GRAMMAR.minHeadroomM, arcRiseM(4));

  it('ONE line encloses no plan, so there is no surface yet — a rib is not a vault', () => {
    // Deliberate: the first stroke gives you an arch and nothing else. The
    // surface is what appears when a second line closes a footprint, which is
    // exactly the moment worth showing.
    expect(surfaceAreaM2(one)).toBe(0);
    expect(surfaceHeight(one, { x: 0, y: 0 })).toBe(0);
  });

  it('CROWNS at the height the tallest line implies, held to headroom', () => {
    // The arcs are the gesture: the longest line says how high. At the crown
    // the cap profile is 1 and no foot reaches, so the height IS the crown.
    expect(surfaceHeight(two, { x: 0, y: 0 })).toBeCloseTo(H, 6);
  });

  it('the EAVE stays up between the legs — open sides, not tent walls', () => {
    // The whole reason the ribs-are-the-surface model died: a rib is at zero
    // near its own foot, so interpolating ribs dove the WHOLE boundary to the
    // lawn and the thing read as a tent. The canopy's free edge holds the
    // eave height between feet and dives only at them.
    const p = atBearing(two.arcs, Math.PI / 4, 0.995); // midway between feet
    expect(surfaceHeight(two, p)).toBeGreaterThan(0.5 * H);
  });

  it('DIVES to the lawn at a drawn foot — the legs still root where you drew', () => {
    const footBearing = Math.PI / 2; // the foot at (2, 0)
    const p = atBearing(two.arcs, footBearing, 0.99);
    expect(surfaceHeight(two, p)).toBeLessThan(0.25);
  });

  it('the eave LIFTS toward the opening the legs leave over', () => {
    // Four symmetric feet leave four equal gaps; apertureFromFeet picks the
    // first (mid-bearing 45°). Same r, feet equally far in bearing from both
    // samples — only the aperture lift distinguishes them.
    const towardOpening = surfaceHeight(two, atBearing(two.arcs, Math.PI / 4, 0.9));
    const awayFromIt = surfaceHeight(two, atBearing(two.arcs, Math.PI / 4 + Math.PI, 0.9));
    expect(towardOpening).toBeGreaterThan(awayFromIt);
  });

  it('the boundary is the FAIRED plan — the same one the preview and the bake use', () => {
    // A hair inside the faired radius is eave; a hair outside is lawn. If the
    // skin used a different plan than the net, they would disagree at exactly
    // the place people look.
    expect(surfaceHeight(two, atBearing(two.arcs, Math.PI / 4, 0.99))).toBeGreaterThan(0.5);
    expect(surfaceHeight(two, atBearing(two.arcs, Math.PI / 4, 1.01))).toBe(0);
  });

  it('SAGS from crown to eave — between them it is below the crown, above the lawn', () => {
    const p = { x: 0.9, y: 0.9 };
    const h = surfaceHeight(two, p);
    expect(h).toBeGreaterThan(0);
    expect(h).toBeLessThan(H);
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
  // Two arcs: a lift needs a surface to lift, and one rib isn't one.
  const base: SurfaceInput = { arcs: [arcEW, arcNS], edits: [] };
  const lifted: SurfaceInput = {
    arcs: [arcEW, arcNS],
    edits: [{ kind: 'lift', at: { x: 0.6, y: 0.2 }, radiusM: 0.8, amountM: 0.4 }],
  };

  it('raises the surface at the lift, and only there', () => {
    expect(surfaceHeight(lifted, { x: 0.6, y: 0.2 })).toBeGreaterThan(
      surfaceHeight(base, { x: 0.6, y: 0.2 }),
    );
    // Outside the radius, untouched.
    expect(surfaceHeight(lifted, { x: -1.2, y: -0.2 })).toBeCloseTo(
      surfaceHeight(base, { x: -1.2, y: -0.2 }),
      6,
    );
  });

  it('is still capped — a lift cannot buy you a planning application', () => {
    const silly: SurfaceInput = {
      arcs: [arcEW, arcNS],
      edits: [{ kind: 'lift', at: { x: 0, y: 0 }, radiusM: 1.5, amountM: 99 }],
    };
    expect(surfaceHeight(silly, { x: 0, y: 0 })).toBe(GRAMMAR.pdHeightCapM);
  });

  it('never drives the surface below ground', () => {
    const dug: SurfaceInput = {
      arcs: [arcEW, arcNS],
      edits: [{ kind: 'lift', at: { x: 0, y: 0 }, radiusM: 1.5, amountM: -99 }],
    };
    expect(surfaceHeight(dug, { x: 0, y: 0 })).toBeGreaterThanOrEqual(0);
  });

  it('a lift cannot happen off the plan — there is nothing there to lift', () => {
    const offPlan: SurfaceInput = {
      arcs: [arcEW, arcNS],
      edits: [{ kind: 'lift', at: { x: 8, y: 8 }, radiusM: 2, amountM: 1 }],
    };
    expect(surfaceHeight(offPlan, { x: 8, y: 8 })).toBe(0);
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

  it('peak matches the crown the tallest line implies and respects the cap', () => {
    const peak = surfacePeakM(two);
    const H = Math.max(GRAMMAR.minHeadroomM, arcRiseM(4));
    expect(peak).toBeGreaterThan(H * 0.95);
    expect(peak).toBeLessThanOrEqual(GRAMMAR.pdHeightCapM + 1e-9);
  });
});
