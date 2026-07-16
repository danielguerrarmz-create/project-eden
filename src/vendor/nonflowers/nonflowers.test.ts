/**
 * nonflowers.test.ts — parity + determinism tests for the vendored port.
 *
 * Runs in vitest's plain node environment: no DOM, no canvas. Only the
 * DOM-free surface is exercised here — the PRNG, the Perlin noise, genParams,
 * and the pure geometry helpers. The painting functions (woody/herbal/paper/
 * generate) need a real 2d canvas and are verified visually in the app.
 *
 * The GOLDEN numbers below were captured from UPSTREAM main.js (commit
 * 03b653d220f16c6bed7ea9c7edc852f7e91846cb) by extracting its Prng + Noise
 * verbatim and running them in an isolated node child process (upstream
 * overrides Math dot random globally, so it must never load in this process).
 * Capture protocol, which this file mirrors exactly:
 *   1. seed the prng (hash + retry loop + 10-draw warmup)
 *   2. take 5 rng draws
 *   3. take 5 noise samples at NOISE_INPUTS (the first noise call lazily
 *      seeds the 4096-entry perlin table from the rng)
 */
import { describe, it, expect } from 'vitest';
import {
  createFlora,
  bezmh,
  midPt,
  tubify,
  type FloraParams,
  type Vec,
} from './nonflowers';

const NOISE_INPUTS: Array<[number, number?, number?]> = [
  [0.5],
  [1.5, 2.5],
  [10, 20],
  [0.1, 0.2, 0.3],
  [3.14, 1.59, 2.65],
];

// Captured from upstream (see header). Exact doubles — the port performs the
// identical arithmetic, so equality is exact, not approximate.
const GOLDEN = {
  bower: {
    rng: [
      0.18445638093062444,
      0.22454515653178558,
      0.8459875819190954,
      0.2483238762876473,
      0.1307645504702349,
    ],
    noise: [
      0.8165253030716422,
      0.42219623717203847,
      0.5584803221138629,
      0.5669470006574456,
      0.6227454475723682,
    ],
  },
  num12345: {
    rng: [
      0.8740068725741373,
      0.026774613658760497,
      0.39422036536614724,
      0.434049865231923,
      0.25976579893362306,
    ],
    noise: [
      0.4752763497703676,
      0.51109954460467,
      0.5780722907913032,
      0.457150677013076,
      0.595759248497404,
    ],
  },
};

// Upstream genParams() fingerprint for seed 'bower', captured from verbatim
// upstream code (only console.log/vizParams stripped) in the same quarantined
// child-process harness. Function-valued params sampled per fingerprint().
const GOLDEN_GENOME_BOWER = {
  flowerChance: 0.006736354695953567,
  leafChance: 0.013076455047023492,
  leafType: [2, 6, 3],
  flowerShape: [0, 0.5357953646809569, 0.18211619277001886, 0.5160410572892314, 0.00041222863103533537],
  leafShape: [0, 0.2996996768637387, 0.5223456452801641, 0.3238092124529311, 3.952265118014582e-9],
  flowerColor: {
    min: [21.551606732031928, 0.05094257965024025, 1, 0.8111488181515096],
    max: [8, 0.04944161833825923, 0.9595762078198284, 0.5781206944314993],
  },
  leafColor: {
    min: [92.2782303610004, 0.3598715961431293, 0.5309995134866456, 0.8225063553540687],
    max: [82.4813289324036, 0.1725162767378277, 0.6988447823769427, 0.9063096216596706],
  },
  flowerOpenCurve: [0, 0, -0.010679794346531324, -5.016019691519796, -10.021359588693063],
  flowerColorCurve: [0.04625088689389793, 0.2071046595228157, 0.5845271788861403, 0.8834216601360423, 0.9760861292243943],
  leafLength: 52.20300997749267,
  flowerLength: 25.942063850249994,
  pedicelLength: 10.613390670716507,
  leafWidth: 28.119887348490444,
  flowerWidth: 18.285511936685666,
  stemWidth: 2.181314374214491,
  stemBend: 11.375075668824513,
  stemLength: 338.05843800625735,
  stemCount: 3,
  sheathLength: 0,
  sheathWidth: 7.327666389431821,
  shootCount: 4.217833328989736,
  shootLength: 89.86492935113355,
  leafPosition: 2,
  flowerPetal: 8,
  innerLength: 12.51893969689922,
  innerWidth: 4.613142468653917,
  innerShape: [0, 0.7071067811865475, 1, 0.7071067811865476, 1.2246467991473532e-16],
  innerColor: {
    min: [29.791785317906413, 0.3545553538357695, 0.8516906947396465, 0.8876609152236836],
    max: [29.791785317906413, 0.5046949707548125, 0.6021046621035085, 0.6144634405013756],
  },
  branchWidth: 1.0454424279552392,
  branchTwist: 5,
  branchDepth: 4,
  branchFork: 6,
  branchColor: {
    min: [32.20638391451107, 0.24776477857823392, 0.7238283822258178, 1],
    max: [32.20638391451107, 0.24776477857823392, 0.7238283822258178, 1],
  },
};

function capture(seed: string | number): { rng: number[]; noise: number[] } {
  const flora = createFlora(seed);
  const rng = Array.from({ length: 5 }, () => flora.random());
  const noise = NOISE_INPUTS.map(([x, y, z]) => flora.noise(x, y, z));
  return { rng, noise };
}

describe('PRNG + noise parity with upstream', () => {
  it('matches upstream exactly for string seed "bower"', () => {
    expect(capture('bower')).toEqual(GOLDEN.bower);
  });

  it('matches upstream exactly for numeric seed 12345', () => {
    expect(capture(12345)).toEqual(GOLDEN.num12345);
  });
});

describe('genParams parity with upstream', () => {
  it('reproduces the upstream genome for seed "bower", draw for draw', () => {
    const genome = createFlora('bower').genParams();
    expect(fingerprint(genome)).toEqual(GOLDEN_GENOME_BOWER);
  });
});

/**
 * Flatten a genome into plain data: numeric/array fields verbatim, and each
 * function-valued param sampled at x = 0, 0.25, 0.5, 0.75, 1 (flowerOpenCurve
 * additionally fixed at op = 0.3).
 */
function fingerprint(p: FloraParams): Record<string, unknown> {
  const xs = [0, 0.25, 0.5, 0.75, 1];
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(p)) {
    if (typeof v === 'function') {
      out[k] =
        k === 'flowerOpenCurve'
          ? xs.map((x) => (v as (x: number, op: number) => number)(x, 0.3))
          : xs.map((x) => (v as (x: number) => number)(x));
    } else {
      out[k] = v;
    }
  }
  return out;
}

describe('determinism', () => {
  it('two instances with the same seed draw identical rng sequences', () => {
    const a = createFlora('x');
    const b = createFlora('x');
    const seqA = Array.from({ length: 10 }, () => a.random());
    const seqB = Array.from({ length: 10 }, () => b.random());
    expect(seqA).toEqual(seqB);
  });

  it('two instances with the same seed generate identical genomes', () => {
    const a = createFlora('x');
    const b = createFlora('x');
    expect(fingerprint(a.genParams())).toEqual(fingerprint(b.genParams()));
  });

  it('different seeds diverge', () => {
    const a = createFlora('bower');
    const b = createFlora('folly');
    const seqA = Array.from({ length: 10 }, () => a.random());
    const seqB = Array.from({ length: 10 }, () => b.random());
    expect(seqA).not.toEqual(seqB);
  });

  it('genome fields have the expected shapes', () => {
    const p = createFlora('shape-check').genParams();
    expect(p.stemCount).toBeGreaterThanOrEqual(2);
    expect(p.stemCount).toBeLessThanOrEqual(5);
    expect([1, 2]).toContain(p.leafPosition);
    expect([3, 4]).toContain(p.branchDepth);
    expect([4, 5, 6, 7]).toContain(p.branchFork);
    expect(p.flowerColor.min).toHaveLength(4);
    expect(p.flowerColor.max).toHaveLength(4);
    // flowerShape is masked by sin(pi*x)^0.2 → exactly 0 at both ends
    expect(p.flowerShape(0)).toBe(0);
  });
});

describe('geometry sanity', () => {
  it('bezmh emits 20 points per span plus 1 terminal point', () => {
    const p3: Vec[] = [[0, 0, 0], [10, 5, 0], [20, 0, 0]];
    expect(bezmh(p3)).toHaveLength(21); // one span → 20 + closing point
    const p4: Vec[] = [[0, 0, 0], [10, 5, 0], [20, 0, 0], [30, 5, 0]];
    expect(bezmh(p4)).toHaveLength(41); // two spans → 20 + 21
    const p2: Vec[] = [[0, 0, 0], [10, 0, 0]];
    expect(bezmh(p2)).toHaveLength(21); // promoted to 3 control points
  });

  it('tubify offsets a straight polyline symmetrically', () => {
    const pts: Vec[] = [[0, 0, 0], [10, 0, 0], [20, 0, 0]];
    const [left, right] = tubify({ pts, wid: () => 2 });
    expect(left).toHaveLength(pts.length);
    expect(right).toHaveLength(pts.length);
    for (let i = 0; i < pts.length; i++) {
      // mirrored across the line y = 0, at distance 2, same x
      expect(left[i][0]).toBeCloseTo(right[i][0], 9);
      expect(left[i][1]).toBeCloseTo(-right[i][1], 9);
      expect(Math.abs(left[i][1])).toBeCloseTo(2, 9);
      expect(left[i][0]).toBeCloseTo(pts[i][0], 9);
    }
  });

  it('midPt averages all three components, in both calling styles', () => {
    const a: Vec = [1, 0, 0];
    const b: Vec = [0, 1, 0];
    const c: Vec = [0, 0, 1];
    for (const m of [midPt(a, b, c), midPt([a, b, c])]) {
      expect(m[0]).toBeCloseTo(1 / 3, 12);
      expect(m[1]).toBeCloseTo(1 / 3, 12);
      expect(m[2]).toBeCloseTo(1 / 3, 12);
    }
  });
});

// Isolation from the ambient global RNG is enforced by review: nonflowers.ts
// contains zero references to the global random function (grep verified; this
// repo ships no node types, so a readFileSync-based test is not available).
