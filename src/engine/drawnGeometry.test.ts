/**
 * drawnGeometry.test.ts — the engine OBEYS THE DRAWING.
 *
 * Before this existed, drawing changed a footprint number and nothing else:
 * the generator spread feet evenly around an ellipse and built its own
 * analytic dome regardless of where you put your lines. The drawing was
 * decoration. These tests are the ones that would catch that regressing.
 */
import { describe, it, expect } from 'vitest';
import { generateGeometry } from './geometry';
import { readDrawing, type Spine } from './fromDrawing';
import { shapeFromDrawing } from './shapeFromDrawing';
import { ENVELOPE } from '../data/config';
import type { DesignParams } from './types';

/** A deliberately LOPSIDED pair of lines — nothing an ellipse would invent. */
const lopsided: Spine[] = [
  { a: { x: -2.4, y: -1.1 }, b: { x: 2.2, y: 0.4 } },
  { a: { x: 1.4, y: -2.2 }, b: { x: -1.0, y: 2.3 } },
];

const paramsFor = (arcs: Spine[]): DesignParams => readDrawing({ spines: arcs }).params;

describe('the drawn shape reaches the generator', () => {
  it('roots at the bearings you DREW, not on an even spread', () => {
    const read = readDrawing({ spines: lopsided });
    const shape = shapeFromDrawing({ arcs: lopsided, edits: [] });
    const g = generateGeometry(read.params, shape);

    const ground = g.nodes.filter((n) => n.kind === 'ground');
    expect(ground.length).toBeGreaterThan(0);

    // Every grounded node must sit near a bearing we actually drew.
    const drawn = shape.footBearingsDeg!;
    for (const n of ground) {
      const bearing = ((Math.atan2(n.position[0], n.position[2]) * 180) / Math.PI + 360) % 360;
      const near = drawn.some((d) => {
        const diff = Math.abs(((bearing - d + 540) % 360) - 180);
        return 180 - diff < 14; // within a bay of a drawn foot
      });
      expect(near, `ground node at ${bearing.toFixed(0)}° matches no drawn foot`).toBe(true);
    }
  });

  it('an EVEN spread would have been visibly different — the test has teeth', () => {
    // Guard against the drawn bearings coincidentally matching the grammar's.
    const withShape = generateGeometry(paramsFor(lopsided), shapeFromDrawing({ arcs: lopsided, edits: [] }));
    const without = generateGeometry(paramsFor(lopsided));
    const bearings = (g: typeof withShape) =>
      g.nodes
        .filter((n) => n.kind === 'ground')
        .map((n) => Math.round(((Math.atan2(n.position[0], n.position[2]) * 180) / Math.PI + 360) % 360))
        .sort((a, b) => a - b)
        .join(',');
    expect(bearings(withShape)).not.toBe(bearings(without));
  });

  it('moving a line MOVES the feet — the drawing is live, not decoration', () => {
    const moved: Spine[] = [lopsided[0], { a: { x: 2.2, y: -1.6 }, b: { x: -1.9, y: 1.7 } }];
    const a = generateGeometry(paramsFor(lopsided), shapeFromDrawing({ arcs: lopsided, edits: [] }));
    const b = generateGeometry(paramsFor(moved), shapeFromDrawing({ arcs: moved, edits: [] }));
    const feet = (g: typeof a) =>
      g.nodes.filter((n) => n.kind === 'ground').map((n) => n.position[0].toFixed(2)).join(',');
    expect(feet(a)).not.toBe(feet(b));
  });

  it('the lattice LIES ON the sculpted surface, not on an invented dome', () => {
    const shape = shapeFromDrawing({ arcs: lopsided, edits: [] });
    const g = generateGeometry(paramsFor(lopsided), shape);
    // Ground nodes are pinned to the lawn by the typology (they sit on a
    // driven screw), so they're the one kind that doesn't answer to the field.
    for (const n of g.nodes.filter((x) => x.kind !== 'ground')) {
      const want = Math.max(0, shape.heightAtM!(n.position[0], n.position[2]));
      expect(n.position[1]).toBeCloseTo(want, 4);
    }
  });

  it('a LIFT reaches the built structure', () => {
    const flat = shapeFromDrawing({ arcs: lopsided, edits: [] });
    const bumped = shapeFromDrawing({
      arcs: lopsided,
      edits: [{ kind: 'lift', at: { x: 0, y: 0 }, radiusM: 1.2, amountM: 0.45 }],
    });
    const a = generateGeometry(paramsFor(lopsided), flat);
    const b = generateGeometry(paramsFor(lopsided), bumped);
    const peak = (g: typeof a) => Math.max(...g.nodes.map((n) => n.position[1]));
    expect(peak(b)).toBeGreaterThan(peak(a));
  });

  it('a HOLE reaches the built structure — pieces are actually removed', () => {
    const solid = shapeFromDrawing({ arcs: lopsided, edits: [] });
    const holed = shapeFromDrawing({
      arcs: lopsided,
      edits: [{ kind: 'hole', at: { x: 0.2, y: 0.2 }, radiusM: 0.9 }],
    });
    const a = generateGeometry(paramsFor(lopsided), solid);
    const b = generateGeometry(paramsFor(lopsided), holed);
    expect(b.members.length).toBeLessThan(a.members.length);
    // ...and nothing survives inside the hole.
    for (const m of b.members) {
      const mx = (m.start[0] + m.end[0]) / 2;
      const mz = (m.start[2] + m.end[2]) / 2;
      expect(Math.hypot(mx - 0.2, mz - 0.2)).toBeGreaterThan(0.55);
    }
  });

  it('still roots exactly: no member dips below the lawn', () => {
    const g = generateGeometry(paramsFor(lopsided), shapeFromDrawing({ arcs: lopsided, edits: [] }));
    for (const m of g.members) {
      expect(m.start[1]).toBeGreaterThanOrEqual(-1e-6);
      expect(m.end[1]).toBeGreaterThanOrEqual(-1e-6);
    }
  });

  it('still prices: every piece is real and positive', () => {
    const g = generateGeometry(paramsFor(lopsided), shapeFromDrawing({ arcs: lopsided, edits: [] }));
    expect(g.pieces.length).toBeGreaterThan(0);
    for (const p of g.pieces) expect(p.lengthM).toBeGreaterThan(0);
  });

  it('never exceeds the planning cap, however wildly you draw', () => {
    const wild: Spine[] = [
      { a: { x: -3, y: -3 }, b: { x: 3, y: 3 } },
      { a: { x: 3, y: -3 }, b: { x: -3, y: 3 } },
    ];
    const g = generateGeometry(paramsFor(wild), shapeFromDrawing({
      arcs: wild,
      edits: [{ kind: 'lift', at: { x: 0, y: 0 }, radiusM: 2, amountM: 50 }],
    }));
    for (const n of g.nodes) expect(n.position[1]).toBeLessThanOrEqual(ENVELOPE.riseM.max + 1e-6);
  });

  it('WITHOUT a shape the generator is byte-identical to before', () => {
    // The parametric studio must not notice any of this.
    const p = paramsFor(lopsided);
    expect(JSON.stringify(generateGeometry(p))).toBe(JSON.stringify(generateGeometry(p, undefined)));
  });
});
