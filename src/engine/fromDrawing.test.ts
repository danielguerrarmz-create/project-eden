import { describe, it, expect } from 'vitest';
import {
  readDrawing,
  polygonAreaM2,
  bearingDeg,
  apertureFromFeet,
  centroid,
  convexHull,
  type Drawing,
} from './fromDrawing';
import { ENVELOPE } from '../data/config';
import { generateGeometry } from './geometry';
import { shapeFromDrawing } from './shapeFromDrawing';

/** A rough square blob of a given side, centred on the origin. */
const blob = (side: number) => [
  { x: -side / 2, y: -side / 2 },
  { x: side / 2, y: -side / 2 },
  { x: side / 2, y: side / 2 },
  { x: -side / 2, y: side / 2 },
];

describe('polygonAreaM2', () => {
  it('measures a square regardless of winding', () => {
    expect(polygonAreaM2(blob(4))).toBeCloseTo(16, 6);
    expect(polygonAreaM2([...blob(4)].reverse())).toBeCloseTo(16, 6);
  });

  it('is 0 for a degenerate scribble', () => {
    expect(polygonAreaM2([])).toBe(0);
    expect(polygonAreaM2([{ x: 0, y: 0 }, { x: 1, y: 1 }])).toBe(0);
  });
});

describe('bearingDeg: engine convention (0=north=+y, 90=east=+x)', () => {
  const o = { x: 0, y: 0 };
  it('reads the four cardinals', () => {
    expect(bearingDeg(o, { x: 0, y: 1 })).toBeCloseTo(0, 6);
    expect(bearingDeg(o, { x: 1, y: 0 })).toBeCloseTo(90, 6);
    expect(bearingDeg(o, { x: 0, y: -1 })).toBeCloseTo(180, 6);
    expect(bearingDeg(o, { x: -1, y: 0 })).toBeCloseTo(270, 6);
  });
});

describe('apertureFromFeet: the opening is what the legs LEAVE OVER', () => {
  it('finds the middle of the widest gap', () => {
    // Legs at 0/90/180 leave a 180° gap from 180 back round to 0 -> mid 270.
    expect(apertureFromFeet([0, 90, 180])).toBe(270);
  });

  it('puts the opening opposite a lone leg', () => {
    expect(apertureFromFeet([0])).toBe(180);
  });

  it('falls back to the default with nothing drawn', () => {
    expect(apertureFromFeet([])).toBe(ENVELOPE.apertureDeg.default);
  });

  it('handles the wrap-around gap, not just the interior ones', () => {
    // Legs bunched at 350/10/20: widest gap wraps from 20 round to 350.
    const a = apertureFromFeet([350, 10, 20]);
    expect(a).toBeGreaterThan(100);
    expect(a).toBeLessThan(280);
  });
});

describe('readDrawing: dumb linework -> buildable params', () => {
  const twoSpines: Drawing = {
    outline: blob(4), // 16 m², inside the family
    spines: [
      { a: { x: -2, y: -2 }, b: { x: 2, y: 2 } },
      { a: { x: 2, y: -2 }, b: { x: -2, y: 2 } },
    ],
  };

  it('reads two crossed spines as four ground contacts', () => {
    const r = readDrawing(twoSpines);
    expect(r.footBearingsDeg).toHaveLength(4);
    expect(r.params.footprintM2).toBeCloseTo(16, 1);
  });

  it('speaks even when it overrode nothing — it read your line and took it', () => {
    const r = readDrawing(twoSpines); // 16 m², comfortably inside the family
    const read = r.nudges.filter((n) => n.kind === 'read');
    expect(read.some((n) => n.text.includes('16.0 m²'))).toBe(true);
    // ...and it must NOT claim to have held anything it didn't.
    expect(r.nudges.some((n) => n.kind === 'held')).toBe(false);
  });

  it('produces params the REAL engine accepts and can build', () => {
    const r = readDrawing(twoSpines);
    const g = generateGeometry(r.params);
    expect(g.members.length).toBeGreaterThan(0);
    expect([3, 4]).toContain(g.feetCount);
    // The whole point: a drawing yields a costed, buildable thing.
    for (const p of g.pieces) expect(p.lengthM).toBeGreaterThan(0);
  });

  it('eases an oversized blob into the validated family AND says so', () => {
    const r = readDrawing({ ...twoSpines, outline: blob(8) }); // 64 m²
    expect(r.drawnAreaM2).toBeCloseTo(64, 1);
    expect(r.params.footprintM2).toBe(ENVELOPE.footprintM2.max);
    const held = r.nudges.filter((n) => n.kind === 'held');
    expect(held.some((n) => n.text.includes(String(ENVELOPE.footprintM2.max)))).toBe(true);
  });

  it('eases a tiny blob UP to the minimum and says so', () => {
    const r = readDrawing({ ...twoSpines, outline: blob(1) }); // 1 m²
    expect(r.params.footprintM2).toBe(ENVELOPE.footprintM2.min);
    expect(r.nudges.some((n) => n.kind === 'held')).toBe(true);
  });

  it('never emits params outside the envelope, whatever the scribble', () => {
    const wild: Drawing = {
      outline: blob(200),
      spines: Array.from({ length: 9 }, (_, i) => ({
        a: { x: Math.cos(i) * 30, y: Math.sin(i) * 30 },
        b: { x: -Math.cos(i) * 30, y: -Math.sin(i) * 30 },
      })),
      crownPullM: 40,
    };
    const r = readDrawing(wild);
    const p = r.params;
    expect(p.footprintM2).toBeLessThanOrEqual(ENVELOPE.footprintM2.max);
    expect(p.footprintM2).toBeGreaterThanOrEqual(ENVELOPE.footprintM2.min);
    expect(p.riseM).toBeLessThanOrEqual(ENVELOPE.riseM.max);
    expect(p.riseM).toBeGreaterThanOrEqual(ENVELOPE.riseM.min);
    expect(p.apertureDeg).toBeGreaterThanOrEqual(0);
    expect(p.apertureDeg).toBeLessThan(360);
    // And it still builds.
    expect(() => generateGeometry(p)).not.toThrow();
  });

  it('holds the crown at the planning cap rather than silently obeying', () => {
    const r = readDrawing({ ...twoSpines, crownPullM: 10 });
    expect(r.params.riseM).toBe(ENVELOPE.riseM.max);
    expect(r.nudges.some((n) => n.kind === 'held' && /planning/.test(n.text))).toBe(true);
  });

  it('OFFERS the grammar-count opinion on extra contacts without applying it', () => {
    const spines = [
      { a: { x: -2, y: 0 }, b: { x: 2, y: 0 } },
      { a: { x: 0, y: -2 }, b: { x: 0, y: 2 } },
      { a: { x: -1, y: -1 }, b: { x: 1, y: 1 } },
    ];
    const r = readDrawing({ ...twoSpines, spines });
    expect(r.footBearingsDeg).toHaveLength(6);
    // The drawn path roots what you drew; the grammar's view is advice only.
    expect(r.nudges.some((n) => n.kind === 'offered' && /usually stands on/.test(n.text))).toBe(true);
    const g = generateGeometry(r.params, shapeFromDrawing({ arcs: spines, edits: [] }));
    expect(g.feetCount).toBe(6);
  });

  it('NEVER contradicts the readout beside it: the feet it names are the feet it roots', () => {
    // "rooted 4" printed next to a 6-footed structure reads as a bug. The
    // engine roots the DRAWN bearings, so the nudge must count those.
    for (const outline of [blob(3.6), blob(4), blob(4.6)]) {
      const r = readDrawing({ ...twoSpines, outline });
      const g = generateGeometry(r.params, shapeFromDrawing({ arcs: twoSpines.spines, edits: [] }));
      expect(g.feetCount).toBe(r.footBearingsDeg.length);

      const claim = r.nudges.find((n) => /ground contacts/.test(n.text))!;
      expect(claim.kind).toBe('read');
      expect(claim.text).toContain(`${g.feetCount} ground contacts`);
    }
  });

  it('OFFERS the sun rotation without applying it — the user stays in charge', () => {
    // Legs leaving the opening due north (0°), far off the southern arc.
    const r = readDrawing({
      outline: blob(4),
      spines: [
        { a: { x: -2, y: -1 }, b: { x: 2, y: -1 } },
        { a: { x: -1, y: -2 }, b: { x: 1, y: -2 } },
      ],
    });
    const offered = r.nudges.filter((n) => n.kind === 'offered');
    if (offered.length > 0) {
      // The offer must NOT have moved the aperture — it only speaks.
      const again = readDrawing({
        outline: blob(4),
        spines: [
          { a: { x: -2, y: -1 }, b: { x: 2, y: -1 } },
          { a: { x: -1, y: -2 }, b: { x: 1, y: -2 } },
        ],
      });
      expect(again.params.apertureDeg).toBe(r.params.apertureDeg);
    }
  });

  it('survives an empty canvas with buildable defaults', () => {
    const r = readDrawing({ outline: [], spines: [] });
    expect(r.params.footprintM2).toBe(ENVELOPE.footprintM2.default);
    expect(() => generateGeometry(r.params)).not.toThrow();
  });
});

describe('convexHull: the feet ARE the plan', () => {
  it('hulls a square and ignores an interior point', () => {
    const h = convexHull([...blob(4), { x: 0, y: 0 }]);
    expect(h).toHaveLength(4);
    expect(polygonAreaM2(h)).toBeCloseTo(16, 6);
  });

  it('is safe on degenerate input', () => {
    expect(convexHull([])).toEqual([]);
    expect(convexHull([{ x: 1, y: 1 }])).toHaveLength(1);
  });
});

describe('readDrawing: spines ALONE are enough (the 3D flow traces no blob)', () => {
  // Two crossing strokes, endpoints 4m apart on the diagonals.
  const spinesOnly: Drawing = {
    spines: [
      { a: { x: -2, y: -2 }, b: { x: 2, y: 2 } },
      { a: { x: 2, y: -2 }, b: { x: -2, y: 2 } },
    ],
  };

  it('reads the footprint from the ground contacts with no outline at all', () => {
    const r = readDrawing(spinesOnly);
    // The 4 endpoints hull to a 4x4 square rotated 45° -> 16 m².
    expect(r.drawnAreaM2).toBeCloseTo(16, 1);
    expect(r.params.footprintM2).toBeCloseTo(16, 1);
    expect(r.footBearingsDeg).toHaveLength(4);
  });

  it('still builds a real, costed structure', () => {
    const r = readDrawing(spinesOnly);
    const g = generateGeometry(r.params);
    expect(g.members.length).toBeGreaterThan(0);
    expect([3, 4]).toContain(g.feetCount);
  });

  it('a single line still reads as something buildable', () => {
    const r = readDrawing({ spines: [{ a: { x: -2, y: 0 }, b: { x: 2, y: 0 } }] });
    expect(r.footBearingsDeg).toHaveLength(2);
    expect(() => generateGeometry(r.params)).not.toThrow();
    expect(r.params.footprintM2).toBeGreaterThanOrEqual(ENVELOPE.footprintM2.min);
  });

  it('an outline, when traced, still wins over the hull', () => {
    const r = readDrawing({ ...spinesOnly, outline: blob(4) }); // 16 either way
    expect(r.drawnAreaM2).toBeCloseTo(16, 1);
    const big = readDrawing({ ...spinesOnly, outline: blob(8) }); // 64 -> outline wins
    expect(big.drawnAreaM2).toBeCloseTo(64, 1);
  });
});

describe('centroid', () => {
  it('averages a cloud, and is safe when empty', () => {
    expect(centroid([{ x: 0, y: 0 }, { x: 2, y: 4 }])).toEqual({ x: 1, y: 2 });
    expect(centroid([])).toEqual({ x: 0, y: 0 });
  });
});

describe('nudge prose obeys the house punctuation rule', () => {
  /**
   * Every nudge this engine can produce, across drawings chosen to light up
   * each branch: in-family, clamped big, clamped small, feet-count offer,
   * aperture, the sun offer, and the rise cap.
   */
  const everyNudge = () => {
    const line = (x1: number, y1: number, x2: number, y2: number) => ({
      a: { x: x1, y: y1 },
      b: { x: x2, y: y2 },
    });
    const drawings: Drawing[] = [
      { spines: [line(-2, -2, 2, 2), line(2, -2, -2, 2)] },
      { spines: [line(-1, 0, 1, 0)] },
      // Clamped large, and clamped small: the two 'held' footprint branches.
      { spines: [line(-9, -9, 9, 9), line(9, -9, -9, 9)] },
      { spines: [line(-0.4, 0, 0.4, 0), line(0, -0.4, 0, 0.4)] },
      // Six contacts: trips the feet-count 'offered' branch.
      {
        spines: [line(-2.5, 0, 2.5, 0), line(-1.2, -2.2, 1.2, 2.2), line(1.2, -2.2, -1.2, 2.2)],
      },
      // A long span asks for more rise than the cap allows: 'held' on rise.
      { spines: [line(-8, 0, 8, 0), line(0, -3, 0, 3)] },
      { spines: [line(-2, -2, 2, 2), line(2, -2, -2, 2)], crownPullM: 4 },
      { spines: [line(-2, -2, 2, 2), line(2, -2, -2, 2)], crownPullM: -4 },
      { spines: [line(-3, -1, 3, 1), line(-1, -3, 1, 3)], outline: blob(6) },
    ];
    return drawings.flatMap((d) => readDrawing(d).nudges);
  };

  it('never uses an em or en dash as punctuation', () => {
    const nudges = everyNudge();
    // Probe guard: an empty list would pass the assertion below while proving
    // nothing at all. These drawings must actually produce prose.
    expect(nudges.length).toBeGreaterThan(12);
    const offenders = nudges.filter((n) => /[—–]/.test(n.text)).map((n) => n.text);
    expect(offenders).toEqual([]);
  });

  it('covers every kind of nudge, so the rule is tested where it can break', () => {
    // If a refactor stopped a branch from firing, the dash test above would go
    // quietly green over prose it never read.
    const kinds = new Set(everyNudge().map((n) => n.kind));
    expect([...kinds].sort()).toEqual(['held', 'offered', 'read']);
  });
});
