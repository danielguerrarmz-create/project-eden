import { describe, it, expect } from 'vitest';
import { colonize, branches, seededRandom, type Vec2, type ColonyNode } from './spaceColonization';

const d = (a: Vec2, b: Vec2) => Math.hypot(a.x - b.x, a.y - b.y);

/** A jittered grid of attractors in a rect — the same shape of input the page builds. */
function scatter(x0: number, y0: number, x1: number, y1: number, step: number, rand: () => number): Vec2[] {
  const out: Vec2[] = [];
  for (let y = y0; y < y1; y += step) {
    for (let x = x0; x < x1; x += step) {
      out.push({ x: x + rand() * step, y: y + rand() * step });
    }
  }
  return out;
}

const base = {
  segment: 6,
  influence: 60,
  kill: 14,
  wobble: 0.2,
};

describe('seededRandom', () => {
  it('is deterministic per seed and different across seeds', () => {
    const a = seededRandom('bower/x');
    const b = seededRandom('bower/x');
    const c = seededRandom('bower/y');
    const take = (r: () => number) => Array.from({ length: 8 }, () => r());
    expect(take(a)).toEqual(take(b));
    expect(take(seededRandom('bower/x'))).not.toEqual(take(c));
  });

  it('stays in [0,1)', () => {
    const r = seededRandom('bower/range');
    for (let i = 0; i < 2000; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('colonize: growth reaches into the space it is given', () => {
  it('is deterministic: the same seed grows the same tree, forever', () => {
    const run = () =>
      colonize({
        ...base,
        attractors: scatter(100, 0, 300, 200, 20, seededRandom('att')),
        sources: [{ x: 100, y: 100 }],
        rand: seededRandom('grow'),
      });
    expect(run()).toEqual(run());
  });

  it('a different seed grows a different tree', () => {
    const run = (s: string) =>
      colonize({
        ...base,
        attractors: scatter(100, 0, 300, 200, 20, seededRandom('att')),
        sources: [{ x: 100, y: 100 }],
        rand: seededRandom(s),
      });
    expect(run('a')).not.toEqual(run('b'));
  });

  it('grows from the sources toward the attractors, not away from them', () => {
    // Attractors strictly to the RIGHT of the source: every node must end up right of it.
    const nodes = colonize({
      ...base,
      attractors: scatter(140, 80, 320, 120, 12, seededRandom('att')),
      sources: [{ x: 100, y: 100 }],
      rand: seededRandom('grow'),
    });
    expect(nodes.length).toBeGreaterThan(5);
    for (const n of nodes) expect(n.pos.x).toBeGreaterThanOrEqual(99);
    // ...and it actually got there.
    expect(Math.max(...nodes.map((n) => n.pos.x))).toBeGreaterThan(190);
  });

  it('a source with nothing inside `influence` never starts, however much space is out there', () => {
    // The failure mode this pins is quiet and cost me a fixture: `influence` is measured from the
    // SOURCE at step one, so a source parked further than `influence` from the nearest attractor
    // grows nothing at all and the region reads as empty for no visible reason. The page seeds its
    // sources on the spine and its attractors from the spine outward for exactly this reason.
    const attractors = scatter(200, 80, 320, 120, 12, seededRandom('att'));
    const far = colonize({ ...base, attractors, sources: [{ x: 100, y: 100 }], rand: seededRandom('g') });
    expect(far).toHaveLength(1); // nearest attractor is ~102 away; influence is 60
    const near = colonize({ ...base, influence: 150, attractors, sources: [{ x: 100, y: 100 }], rand: seededRandom('g') });
    expect(near.length).toBeGreaterThan(5);
  });

  it('THE WHOLE POINT: it never grows into a region with no attractors', () => {
    // This is the property the page leans on instead of a collision test. The empty band is a
    // stand-in for a project plate: the page keeps ornament off a plate purely by not scattering
    // attractors on it, so if this ever stops holding, the ornament is loose on the layout.
    const hole = { x0: 180, y0: 0, x1: 260, y1: 200 };
    const attractors = scatter(100, 0, 400, 200, 14, seededRandom('att')).filter(
      (a) => !(a.x >= hole.x0 && a.x <= hole.x1 && a.y >= hole.y0 && a.y <= hole.y1),
    );
    const nodes = colonize({
      ...base,
      attractors,
      sources: [{ x: 100, y: 100 }],
      rand: seededRandom('grow'),
      maxSteps: 200,
    });
    // Growth may brush the hole's edge on its way past (an attractor just outside pulls a node
    // toward it), so allow a node within `kill` of the boundary but never deep inside.
    const margin = base.kill;
    for (const n of nodes) {
      const inside =
        n.pos.x > hole.x0 + margin &&
        n.pos.x < hole.x1 - margin &&
        n.pos.y > hole.y0 + margin &&
        n.pos.y < hole.y1 - margin;
      expect(inside, `node at ${n.pos.x.toFixed(1)},${n.pos.y.toFixed(1)} is inside the hole`).toBe(false);
    }
  });

  it('consumes the space: most attractors end up reached', () => {
    const attractors = scatter(100, 0, 300, 200, 16, seededRandom('att'));
    const nodes = colonize({
      ...base,
      attractors,
      sources: [{ x: 100, y: 100 }],
      rand: seededRandom('grow'),
      maxSteps: 300,
    });
    const reached = attractors.filter((a) => nodes.some((n) => d(a, n.pos) <= base.kill));
    expect(reached.length / attractors.length).toBeGreaterThan(0.7);
  });

  it('every step is exactly one segment long: no zero-length or runaway nodes', () => {
    const nodes = colonize({
      ...base,
      attractors: scatter(100, 0, 300, 200, 20, seededRandom('att')),
      sources: [{ x: 100, y: 100 }],
      rand: seededRandom('grow'),
    });
    for (const n of nodes) {
      if (n.parent < 0) continue;
      expect(d(n.pos, nodes[n.parent].pos)).toBeCloseTo(base.segment, 6);
    }
  });

  it('is a real tree: every parent precedes its child, and only sources are rootless', () => {
    const nodes = colonize({
      ...base,
      attractors: scatter(100, 0, 300, 200, 20, seededRandom('att')),
      sources: [{ x: 100, y: 100 }, { x: 300, y: 100 }],
      rand: seededRandom('grow'),
    });
    expect(nodes.filter((n) => n.parent < 0)).toHaveLength(2);
    for (let i = 0; i < nodes.length; i++) {
      expect(nodes[i].parent).toBeLessThan(i);
      expect(nodes[i].parent).toBeGreaterThanOrEqual(-1);
    }
  });

  it('terminates rather than hanging when nothing is in reach', () => {
    const nodes = colonize({
      ...base,
      attractors: [{ x: 10_000, y: 10_000 }], // far outside `influence`
      sources: [{ x: 0, y: 0 }],
      rand: seededRandom('grow'),
    });
    expect(nodes).toHaveLength(1); // the source, and nothing grown
  });

  it('respects maxNodes, so a bad parameter set cannot hang the paint worker', () => {
    const nodes = colonize({
      ...base,
      attractors: scatter(0, 0, 600, 600, 8, seededRandom('att')),
      sources: [{ x: 300, y: 300 }],
      rand: seededRandom('grow'),
      maxNodes: 50,
    });
    expect(nodes.length).toBeLessThanOrEqual(50 + 64); // the cap, plus at most one step's sprouts
  });
});

describe('branches: the tree, as drawable runs with a hierarchy', () => {
  const nodes = colonize({
    ...base,
    attractors: scatter(100, 0, 340, 220, 15, seededRandom('att')),
    sources: [{ x: 100, y: 110 }],
    rand: seededRandom('grow'),
  });

  it('emits runs of at least two points, all finite', () => {
    const runs = branches(nodes).map((b) => b.pts);
    expect(runs.length).toBeGreaterThan(0);
    for (const run of runs) {
      expect(run.length).toBeGreaterThanOrEqual(2);
      for (const p of run) {
        expect(Number.isFinite(p.x)).toBe(true);
        expect(Number.isFinite(p.y)).toBe(true);
      }
    }
  });

  it('draws every segment of the tree exactly once', () => {
    // A shared trunk emitted once per tip would paint over itself and read heavier than the
    // branches it carries — the reason runs are cut at forks rather than traced tip-to-root.
    const key = (a: Vec2, b: Vec2) =>
      [a.x.toFixed(4), a.y.toFixed(4), b.x.toFixed(4), b.y.toFixed(4)].join('|');
    const seen = new Map<string, number>();
    for (const b of branches(nodes)) {
      const run = b.pts;
      for (let i = 1; i < run.length; i++) {
        const k = key(run[i - 1], run[i]);
        seen.set(k, (seen.get(k) ?? 0) + 1);
      }
    }
    const edgeCount = nodes.filter((n) => n.parent >= 0).length;
    expect([...seen.values()].every((v) => v === 1)).toBe(true);
    expect(seen.size).toBe(edgeCount);
  });

  it('leaves no gap at a fork: each run is anchored on its parent node', () => {
    for (const { pts: run } of branches(nodes)) {
      for (let i = 1; i < run.length; i++) {
        expect(d(run[i - 1], run[i])).toBeCloseTo(base.segment, 6);
      }
    }
  });

  it('THE HIERARCHY: order 0 leaves a source, and every child run is exactly one deeper', () => {
    // Daniel: "the leaves and flowers are immediately on the branch, although realistic, are lacking
    // and they lack more depth and texture that I feel like sub-branches would give it a lot of
    // strength." The tree already branches; what was missing was knowing WHICH tier a run is, so the
    // organs could be put on the twigs instead of the trunk. Order increments at a FORK.
    const bs = branches(nodes);
    const byStart = new Map(bs.map((b) => [`${b.pts[0].x.toFixed(4)},${b.pts[0].y.toFixed(4)}`, b]));
    for (const b of bs) {
      if (b.order === 0) continue;
      // a child run starts at its parent run's fork point, so some run must END where this one starts
      const parent = bs.find((o) => o !== b && o.pts[o.pts.length - 1].x === b.pts[0].x && o.pts[o.pts.length - 1].y === b.pts[0].y);
      expect(parent, `order ${b.order} run has no parent run`).toBeDefined();
      expect(b.order).toBe(parent!.order + 1);
    }
    expect(byStart.size).toBeGreaterThan(0);
    expect(bs.some((b) => b.order === 0)).toBe(true);
    expect(Math.max(...bs.map((b) => b.order))).toBeGreaterThanOrEqual(2);
  });

  it('marks a run terminal iff it ends at a tip', () => {
    const bs = branches(nodes);
    const tips = bs.filter((b) => b.terminal);
    expect(tips.length).toBeGreaterThan(0);
    // A terminal run's end point must not be the start of any other run (nothing continues past it).
    for (const t of tips) {
      const end = t.pts[t.pts.length - 1];
      const continues = bs.some((o) => o !== t && o.pts[0].x === end.x && o.pts[0].y === end.y);
      expect(continues).toBe(false);
    }
  });

  it('handles a bare source with nothing grown', () => {
    const lone: ColonyNode[] = [{ pos: { x: 0, y: 0 }, parent: -1 }];
    expect(branches(lone)).toEqual([]);
  });
});
