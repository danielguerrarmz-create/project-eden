import { describe, expect, it } from 'vitest';
import { GRAMMAR } from '../../data/config';
import { surfaceHeight, type SurfaceInput } from '../../engine/surface';
import {
  RING_STATIONS,
  drapeRing,
  previewHeightM,
  projectToSkin,
  skinRuns,
  type DrapedPoint,
} from './drape';

/** Two crossing lines: the real case, and what the demo is driven with. */
const CANOPY: SurfaceInput = {
  arcs: [
    { a: { x: -2.2, y: -1.4 }, b: { x: 2.4, y: 1.6 } },
    { a: { x: -1.9, y: 1.7 }, b: { x: 2.1, y: -1.8 } },
  ],
  edits: [],
};

const withEdits = (edits: SurfaceInput['edits']): SurfaceInput => ({ ...CANOPY, edits });

/** Fake a run pattern without needing a real surface. */
const pts = (flags: boolean[]): DrapedPoint[] =>
  flags.map((onSkin, i) => ({ x: i, y: 0, z: 0, onSkin }));

describe('projectToSkin — the height comes from the engine, not from here', () => {
  it('answers with the height field, not a guess', () => {
    const p = { x: 0.3, y: 0.2 };
    expect(projectToSkin(CANOPY, p).y).toBe(surfaceHeight(CANOPY, p));
  });

  it('does the plan-to-THREE axis swap once, here, so callers never redo it', () => {
    // plan's y IS three's z. Getting this wrong puts the mark 90 degrees off
    // and it still looks plausible, which is the worst kind of wrong.
    const d = projectToSkin(CANOPY, { x: 1.1, y: -0.7 });
    expect(d.x).toBe(1.1);
    expect(d.z).toBe(-0.7);
  });

  it('lies down on the lawn off the plan, rather than breaking', () => {
    // The lawn is a real surface. A ring that runs off the eave and onto the
    // grass is telling the truth, so it stays on skin.
    const far = projectToSkin(CANOPY, { x: 40, y: 40 });
    expect(far.y).toBe(0);
    expect(far.onSkin).toBe(true);
  });

  it('reports NO skin over a hole, though the field still answers there', () => {
    // The whole subtlety. Excavation is a mask, not a dent: surfaceHeight is
    // happy to report a confident height for skin that has been removed.
    const holed = withEdits([{ kind: 'hole', at: { x: 0, y: 0 }, radiusM: 1.2 }]);
    const inside = { x: 0.2, y: 0.1 };
    expect(surfaceHeight(holed, inside)).toBeGreaterThan(0); // the field lies
    expect(projectToSkin(holed, inside).onSkin).toBe(false); // we do not
  });
});

describe('drapeRing', () => {
  it('samples the ring in plan, at the radius asked for', () => {
    const ring = drapeRing(CANOPY, { x: 0.4, y: -0.3 }, 1.5);
    expect(ring).toHaveLength(RING_STATIONS);
    for (const p of ring) {
      expect(Math.hypot(p.x - 0.4, p.z - -0.3)).toBeCloseTo(1.5, 6);
    }
  });

  it('rides the skin: every station takes its own height', () => {
    const ring = drapeRing(CANOPY, { x: 0, y: 0 }, 1.8);
    for (const p of ring) {
      expect(p.y).toBe(surfaceHeight(CANOPY, { x: p.x, y: p.z }));
    }
  });

  it('is not flat, which is the entire point of the change', () => {
    // The bug: a ring pinned to y=0.03 while the canopy floats metres above it.
    // Over a domed skin a real ring MUST vary in height.
    const ys = drapeRing(CANOPY, { x: 0, y: 0 }, 1.6).map((p) => p.y);
    expect(Math.max(...ys)).toBeGreaterThan(0.5);
    expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(0.05);
  });

  it('honours the bearing convention the rest of the codebase uses', () => {
    // 0 = north = +z, 90 = east = +x. GardenContext's beds and figurePositionM
    // agree; a ring that did not would be right about height, wrong about where.
    const ring = drapeRing(CANOPY, { x: 0, y: 0 }, 2, 4);
    expect(ring[0].x).toBeCloseTo(0, 6);
    expect(ring[0].z).toBeCloseTo(2, 6); // station 0 -> north
    expect(ring[1].x).toBeCloseTo(2, 6); // station 1 -> east
    expect(ring[1].z).toBeCloseTo(0, 6);
  });
});

describe('skinRuns — a mark must break where the skin does', () => {
  it('closes the loop when the ring is intact', () => {
    const runs = skinRuns(pts([true, true, true, true]));
    expect(runs).toHaveLength(1);
    // First point repeated at the end, so a caller can build a closed curve
    // without special-casing the intact ring.
    expect(runs[0]).toHaveLength(5);
    expect(runs[0][4]).toBe(runs[0][0]);
  });

  it('draws nothing when there is no skin at all', () => {
    // Nothing to draw is a legitimate answer, not an edge case to paper over.
    expect(skinRuns(pts([false, false, false]))).toEqual([]);
    expect(skinRuns([])).toEqual([]);
  });

  it('breaks into runs across a gap', () => {
    const runs = skinRuns(pts([true, true, false, false, true]));
    expect(runs).toHaveLength(1); // 4,0,1 is ONE run: the ring wraps
    expect(runs[0].map((p) => p.x)).toEqual([4, 0, 1]);
  });

  it('WRAPS: a gap straddling station 0 is one run, not two', () => {
    // The case that is easy to get wrong and looks almost right. Treating the
    // array as linear reports [0,1] and [6,7] as separate runs, putting a seam
    // at station 0 — a place with no relationship to the hole that caused it.
    const runs = skinRuns(pts([true, true, false, false, false, false, true, true]));
    expect(runs).toHaveLength(1);
    expect(runs[0].map((p) => p.x)).toEqual([6, 7, 0, 1]);
  });

  it('reports two runs when the ring really is cut twice', () => {
    const runs = skinRuns(pts([true, false, true, false]));
    expect(runs).toHaveLength(2);
    expect(runs.map((r) => r.map((p) => p.x))).toEqual([[0], [2]]);
  });

  it('breaks a real ring over a real hole', () => {
    // End to end through the engine, not with fixtures: a hole punched off to
    // one side must cut the ring that crosses it.
    const holed = withEdits([{ kind: 'hole', at: { x: 1.4, y: 0 }, radiusM: 0.7 }]);
    const ring = drapeRing(holed, { x: 0, y: 0 }, 1.4);
    expect(ring.some((p) => !p.onSkin)).toBe(true);
    const runs = skinRuns(ring);
    expect(runs.length).toBeGreaterThanOrEqual(1);
    expect(runs.flat().every((p) => p.onSkin)).toBe(true);
  });
});

describe('previewHeightM — the handle promises what the engine will do', () => {
  const at = { x: 0, y: 0 };

  it('rises for a pull', () => {
    const before = surfaceHeight(CANOPY, at);
    const after = previewHeightM(CANOPY, { kind: 'pushpull', at, radiusM: 1.5, amountM: 0.6 }, at);
    expect(after).toBeGreaterThan(before);
  });

  it('SINKS for a push, which is the capability nobody could see', () => {
    // Push/pull has been bidirectional the whole time and the UI never showed
    // it. This is the assertion that says so.
    const before = surfaceHeight(CANOPY, at);
    const after = previewHeightM(CANOPY, { kind: 'pushpull', at, radiusM: 1.5, amountM: -0.6 }, at);
    expect(after).toBeLessThan(before);
  });

  it('previews the planning cap instead of promising past it', () => {
    // A handle that kept climbing past pdHeightCapM would promise a building
    // the grammar refuses to make, and the user would find out on release.
    const after = previewHeightM(CANOPY, { kind: 'pushpull', at, radiusM: 1.5, amountM: 99 }, at);
    expect(after).toBe(GRAMMAR.pdHeightCapM);
  });

  it('never previews below the ground', () => {
    const after = previewHeightM(CANOPY, { kind: 'pushpull', at, radiusM: 1.5, amountM: -99 }, at);
    expect(after).toBe(0);
  });

  it('does not mutate the input it was asked about', () => {
    // It appends to a copy. If it pushed onto input.edits the preview would
    // COMMIT the gesture on every pointer move.
    const input = withEdits([]);
    previewHeightM(input, { kind: 'pushpull', at, radiusM: 1.5, amountM: 0.5 }, at);
    expect(input.edits).toHaveLength(0);
  });
});
