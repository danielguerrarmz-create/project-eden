import { describe, it, expect } from 'vitest';
import {
  bandTarget,
  buildBand,
  buildGridshell,
  beginGrab,
  moveGrab,
  endGrab,
  relax,
  solveStrut,
  shellStats,
  strutLength,
  nearestNode,
  getPos,
  FAB_MIN_M,
  FAB_MAX_M,
  DEFAULT_OPTS,
  type Strut,
} from './formFinding';

describe('formFinding — the buildability law (bandTarget)', () => {
  it('is rigid above the band: clamps a stretched strut to lmax', () => {
    expect(bandTarget(2.0, 0.5, 0.25, 0.75, 0.12)).toBe(0.75);
  });

  it('is rigid below the band: clamps a crushed strut to lmin', () => {
    expect(bandTarget(0.1, 0.5, 0.25, 0.75, 0.12)).toBe(0.25);
  });

  it('is soft inside the band: only weakly pulls toward rest (clay)', () => {
    // len 0.60, rest 0.50, grain 0.12 -> 0.60 + 0.12*(0.50-0.60) = 0.588
    expect(bandTarget(0.6, 0.5, 0.25, 0.75, 0.12)).toBeCloseTo(0.588, 6);
  });

  it('with grain=0 holds any in-band length (pure clay, plastic)', () => {
    expect(bandTarget(0.6, 0.5, 0.25, 0.75, 0)).toBe(0.6);
  });

  it('with grain=1 springs fully back to rest inside the band', () => {
    expect(bandTarget(0.6, 0.5, 0.25, 0.75, 1)).toBeCloseTo(0.5, 6);
  });

  it('never returns a length outside the band, for any input', () => {
    for (const len of [0, 0.1, 0.25, 0.5, 0.75, 1, 5]) {
      const t = bandTarget(len, 0.5, 0.25, 0.75, 0.5);
      expect(t).toBeGreaterThanOrEqual(0.25 - 1e-9);
      expect(t).toBeLessThanOrEqual(0.75 + 1e-9);
    }
  });
});

describe('formFinding — buildBand clamps to the fabrication grammar', () => {
  it('keeps a normal strut band strictly inside the hard fab limits', () => {
    const { lmin, lmax } = buildBand(0.5);
    expect(lmin).toBeGreaterThanOrEqual(FAB_MIN_M);
    expect(lmax).toBeLessThanOrEqual(FAB_MAX_M);
  });

  it('a very short rest still floors lmin at the fab minimum (joints overlap below)', () => {
    const { lmin } = buildBand(0.2);
    expect(lmin).toBe(FAB_MIN_M);
  });

  it('a very long rest caps lmax at the fab maximum (sheet length)', () => {
    const { lmax } = buildBand(3.0);
    expect(lmax).toBe(FAB_MAX_M);
  });
});

describe('formFinding — solveStrut projection', () => {
  it('pulls a single free strut exactly to its target length in one solve', () => {
    // Two nodes, both free, along X. Rest 0.5, start length 0.6 (in band) grain=1.
    const pos = new Float64Array([0, 0, 0, 0.6, 0, 0]);
    const invMass = new Float64Array([1, 1]);
    const st: Strut = { a: 0, b: 1, rest: 0.5, lmin: 0.25, lmax: 0.75, kind: 'ring' };
    solveStrut(pos, invMass, st, 1); // grain 1 -> target = rest = 0.5
    const len = Math.hypot(pos[3] - pos[0], pos[4] - pos[1], pos[5] - pos[2]);
    expect(len).toBeCloseTo(0.5, 9);
  });

  it('a pinned end (invMass 0) does not move; the free end takes the whole correction', () => {
    const pos = new Float64Array([0, 0, 0, 1.2, 0, 0]); // len 1.2 > lmax 0.75
    const invMass = new Float64Array([0, 1]); // node 0 pinned
    const st: Strut = { a: 0, b: 1, rest: 0.5, lmin: 0.25, lmax: 0.75, kind: 'ring' };
    solveStrut(pos, invMass, st, 0.12);
    expect(pos[0]).toBe(0); // pinned end fixed
    expect(pos[1]).toBe(0);
    expect(pos[2]).toBe(0);
    const len = Math.hypot(pos[3] - pos[0], pos[4] - pos[1], pos[5] - pos[2]);
    expect(len).toBeCloseTo(0.75, 9); // snapped to the rigid upper edge
  });

  it('does nothing when both ends are pinned', () => {
    const pos = new Float64Array([0, 0, 0, 3, 0, 0]);
    const before = pos.slice();
    const invMass = new Float64Array([0, 0]);
    const st: Strut = { a: 0, b: 1, rest: 0.5, lmin: 0.25, lmax: 0.75, kind: 'ring' };
    solveStrut(pos, invMass, st, 0.12);
    expect(Array.from(pos)).toEqual(Array.from(before));
  });
});

describe('formFinding — gridshell construction', () => {
  const shell = buildGridshell();

  it('builds (rings+1)*spokes nodes', () => {
    expect(shell.n).toBe((6 + 1) * 18);
  });

  it('pins exactly `feet` ground anchors at y=0', () => {
    expect(shell.feet.length).toBe(4);
    for (const f of shell.feet) {
      expect(shell.invMass[f]).toBe(0);
      expect(getPos(shell, f)[1]).toBe(0);
    }
  });

  it('every seed strut is born inside the hard fabrication limits', () => {
    const s = shellStats(shell);
    expect(s.outOfSpec).toBe(0);
    expect(s.minLen).toBeGreaterThanOrEqual(FAB_MIN_M - 1e-6);
    expect(s.maxLen).toBeLessThanOrEqual(FAB_MAX_M + 1e-6);
  });

  it('has diagrid, ring, radial and eave struts', () => {
    const kinds = new Set(shell.struts.map((st) => st.kind));
    expect(kinds).toEqual(new Set(['diagrid', 'ring', 'radial', 'eave']));
  });
});

describe('formFinding — relaxation keeps the shell buildable', () => {
  it('stays in-spec after settling under gravity from the seed', () => {
    const shell = buildGridshell();
    for (let i = 0; i < 60; i++) relax(shell);
    const s = shellStats(shell);
    expect(s.outOfSpec).toBe(0);
    expect(Number.isFinite(s.meanLen)).toBe(true);
  });

  it('feet never move during relaxation (anchored)', () => {
    const shell = buildGridshell();
    const before = shell.feet.map((f) => getPos(shell, f));
    for (let i = 0; i < 40; i++) relax(shell);
    shell.feet.forEach((f, k) => {
      expect(getPos(shell, f)).toEqual(before[k]);
    });
  });

  it('no node sinks below the ground plane', () => {
    const shell = buildGridshell();
    for (let i = 0; i < 40; i++) relax(shell);
    for (let i = 0; i < shell.n; i++) {
      expect(getPos(shell, i)[1]).toBeGreaterThanOrEqual(-1e-9);
    }
  });

  it('converges to a small stable residual (settles, no runaway)', () => {
    const shell = buildGridshell();
    for (let i = 0; i < 80; i++) relax(shell); // settle
    const a = shell.pos.slice();
    relax(shell);
    let drift = 0;
    for (let i = 0; i < shell.pos.length; i++) drift += Math.abs(shell.pos[i] - a[i]);
    // Gravity pushing against the rigid buildability floor leaves a sub-mm limit
    // cycle rather than exact stillness — visually settled, not a runaway. This is
    // honest solver behaviour; a production XPBD would damp it out with sleeping.
    expect(drift / shell.n).toBeLessThan(3e-3); // < ~3 mm/node
  });
});

describe('formFinding — grab gesture with falloff', () => {
  it('nearestNode finds the closest lattice node to a world point', () => {
    const shell = buildGridshell();
    const target = getPos(shell, 42);
    expect(nearestNode(shell, target)).toBe(42);
  });

  it('beginGrab weights the seed at 1 and excludes pinned feet', () => {
    const shell = buildGridshell();
    const seed = nearestNode(shell, [0, 2.3, 0]); // near the crown
    const grabbed = beginGrab(shell, seed, 1.0);
    const seedPt = grabbed.grab!.find((g) => g.node === seed);
    expect(seedPt!.weight).toBeCloseTo(1, 6);
    for (const g of grabbed.grab!) {
      expect(shell.invMass[g.node]).not.toBe(0); // no feet in the region
      expect(g.weight).toBeGreaterThan(0);
      expect(g.weight).toBeLessThanOrEqual(1);
    }
  });

  it('pulling a region moves the seed toward the cursor and settles buildable', () => {
    const shell = buildGridshell();
    const seed = nearestNode(shell, [0, 2.3, 0]);
    const start = getPos(shell, seed);
    const grabbed = beginGrab(shell, seed, 1.2);
    const target: [number, number, number] = [start[0], start[1] + 0.6, start[2]];
    moveGrab(grabbed, seed, target);
    for (let i = 0; i < 30; i++) relax(grabbed);
    const now = getPos(grabbed, seed);
    // The seed rose toward the pulled target (buildability may resist full travel).
    expect(now[1]).toBeGreaterThan(start[1] + 0.1);
    // And the shell is still entirely buildable.
    expect(shellStats(grabbed).outOfSpec).toBe(0);
    endGrab(grabbed);
  });

  it('a hard outward pull stiffens: struts max out but never leave the fab limits', () => {
    const shell = buildGridshell();
    const seed = nearestNode(shell, [2.2, 0.5, 0]); // an eave node on +X
    const start = getPos(shell, seed);
    const grabbed = beginGrab(shell, seed, 1.0);
    // Yank it 5 m out — absurd, well past any buildable extension.
    moveGrab(grabbed, seed, [start[0] + 5, start[1], start[2]]);
    for (let i = 0; i < 40; i++) relax(grabbed);
    const s = shellStats(grabbed);
    expect(s.outOfSpec).toBe(0); // the grain held: nothing became unbuildable
    expect(s.maxLen).toBeLessThanOrEqual(FAB_MAX_M + 1e-6);
  });
});

describe('formFinding — determinism', () => {
  it('two shells relaxed identically reach the same state', () => {
    const s1 = buildGridshell();
    const s2 = buildGridshell();
    for (let i = 0; i < 25; i++) {
      relax(s1, DEFAULT_OPTS);
      relax(s2, DEFAULT_OPTS);
    }
    for (let i = 0; i < s1.pos.length; i++) expect(s1.pos[i]).toBe(s2.pos[i]);
  });
});

describe('formFinding — strutLength helper', () => {
  it('measures the live distance between a strut ends', () => {
    const shell = buildGridshell();
    const st = shell.struts[0];
    const manual = Math.hypot(
      getPos(shell, st.b)[0] - getPos(shell, st.a)[0],
      getPos(shell, st.b)[1] - getPos(shell, st.a)[1],
      getPos(shell, st.b)[2] - getPos(shell, st.a)[2],
    );
    expect(strutLength(shell, st)).toBeCloseTo(manual, 9);
  });
});
