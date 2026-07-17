/**
 * nonflowers.ts — vendored TypeScript port of Lingdong Huang's "nonflowers".
 *
 * Procedurally generated Gongbi-style paintings of nonexistent flowers, drawn
 * onto a 2d canvas. This is a faithful, diff-reviewable port of the original:
 *
 *   Upstream:  https://github.com/LingDong-/nonflowers
 *   Commit:    03b653d220f16c6bed7ea9c7edc852f7e91846cb
 *   Author:    (c) Lingdong Huang 2018
 *   License:   MIT — see ./LICENSE (verbatim upstream copy). The original
 *              main.js/index.html/style.css are kept under ./upstream/ for
 *              reference and are never imported by app code.
 *
 * What changed and why (full transformation log in ./README.md): the upstream
 * program is a single global-state <script> — it pollutes Array.prototype with
 * .x/.y/.z and negative-index getters, overrides the ambient global RNG, and
 * paints into page-level globals. This port keeps the algorithm — same function
 * names, same magic numbers, same draw order, same quirks (including the ones
 * that look like bugs but shape the output) — while scoping ALL mutable state
 * (PRNG + Perlin table) inside createFlora(seed), rewriting the prototype-getter
 * indexing as plain array indexing, and drawing through a tiny canvas
 * abstraction so it runs identically on the main thread and inside a module
 * Web Worker (OffscreenCanvas).
 *
 * Determinism contract: two createFlora(seed) instances given the same seed and
 * the same sequence of calls produce bit-identical numbers and pixel-identical
 * canvases. Nothing here reads the clock, the DOM state, or the ambient global
 * RNG. Seeds are hashed via btoa(JSON.stringify(seed)), so string seeds must be
 * Latin-1 representable (same constraint as upstream).
 *
 * Structure note for diff review against upstream/main.js: pure, rng-free
 * helpers sit at module level in upstream source order; every function that
 * consumes randomness or noise lives inside createFlora(), also in upstream
 * source order.
 */

// ---------------------------------------------------------------------------
// types (port addition — upstream is untyped ES5)
// ---------------------------------------------------------------------------

/**
 * Point/vector: by convention 3 components [x, y, z]. Upstream indexes these
 * via Array.prototype .x/.y/.z getters; the port uses [0]/[1]/[2]. tubify()
 * emits 2-component [x, y] points; only [0]/[1] are read from those.
 */
export type Vec = number[];

/** Colour ramp endpoint pair; each entry is [h, s, v, a]. */
export interface ColorRange {
  min: number[];
  max: number[];
}

/**
 * Minimal 2d-context union: every operation this module performs (path fills,
 * fillRect, drawImage, get/putImageData, globalCompositeOperation) exists with
 * identical runtime behaviour on both. TypeScript cannot unify the two overload
 * sets through the union, so call sites that hit overloaded methods pin one arm
 * with a local, commented cast (see e.g. polygon(), Layer.blit()).
 */
export type Ctx2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

/** Per-pixel filter: (x, y, r, g, b, a) → [r, g, b, a]. */
type FilterFn = (x: number, y: number, r: number, g: number, b: number, a: number) => number[];

/** One branch() result entry: [depth, polyline]. */
type BranchEntry = [number, Vec[]];

/** The plant genome — same fields, same distributions as upstream genParams(). */
export interface FloraParams {
  flowerChance: number;
  leafChance: number;
  leafType: number[];
  flowerShape: (x: number) => number;
  leafShape: (x: number) => number;
  flowerColor: ColorRange;
  leafColor: ColorRange;
  flowerOpenCurve: (x: number, op: number) => number;
  flowerColorCurve: (x: number) => number;
  leafLength: number;
  flowerLength: number;
  pedicelLength: number;
  leafWidth: number;
  flowerWidth: number;
  stemWidth: number;
  stemBend: number;
  stemLength: number;
  stemCount: number;
  sheathLength: number;
  sheathWidth: number;
  shootCount: number;
  shootLength: number;
  leafPosition: number;
  flowerPetal: number;
  innerLength: number;
  innerWidth: number;
  innerShape: (x: number) => number;
  innerColor: ColorRange;
  branchWidth: number;
  branchTwist: number;
  branchDepth: number;
  branchFork: number;
  branchColor: ColorRange;
}

/**
 * Args for woody()/herbal() — same as upstream (ctx, xof, yof, PAR), except ctx
 * is required because the port has no page-global CTX to fall back on.
 */
export interface PlantArgs {
  ctx: Ctx2D;
  xof?: number;
  yof?: number;
  PAR?: FloraParams;
}

/** Args for paper() — same defaults as upstream. */
export interface PaperArgs {
  /** Base colour multipliers [r, g, b] in 0..1. Default [0.98, 0.91, 0.74]. */
  col?: number[];
  /** Texture strength. Default 20. */
  tex?: number;
  /** Speckle rate. Default 1. */
  spr?: number;
}

/** Options for generate() — the high-level reproduction of upstream generate(). */
export interface GenerateOptions {
  /** Canvas is size × size px. Default 600 (upstream's fixed size). */
  size?: number;
  /**
   * 'auto' (default) draws the 50/50 woody-vs-herbal coin flip from the
   * instance rng, exactly like upstream. Forcing 'woody'/'herbal' skips that
   * draw, which shifts the rng stream relative to upstream defaults (still
   * fully deterministic for a given seed + options).
   */
  kind?: 'auto' | 'woody' | 'herbal';
  /**
   * 'aged' (default) = upstream PAPER_COL1, 'cream' = upstream PAPER_COL0 (the
   * page-background tone; consumes the identical rng stream as 'aged'), 'none'
   * = fully transparent background: no white fill, no paper texture, and no
   * border unless explicitly requested. 'none' skips paper()'s rng draws, which
   * shifts the stream relative to upstream defaults.
   */
  paper?: 'aged' | 'cream' | 'none';
  /** Squircle border mask. Default: true unless paper is 'none'. */
  border?: boolean;
  /**
   * Optional genome transform (API addition over upstream): receives the drawn
   * genome and returns the one to paint with — the seam for palette overrides
   * (e.g. a monochrome ink voice) without a second genome draw. Identity when
   * omitted; rng stream is unaffected either way.
   */
  tune?: (params: FloraParams) => FloraParams;
}

export interface GenerateResult {
  canvas: HTMLCanvasElement | OffscreenCanvas;
  params: FloraParams;
  kind: 'woody' | 'herbal';
}

/** A seeded, self-contained flora painter. See createFlora(). */
export interface FloraInstance {
  /** The seeded PRNG in [0, 1) — the instance's replacement for the global RNG. */
  random(): number;
  /** The seeded Perlin noise (p5.js-derived), lazily seeded from random(). */
  noise(x: number, y?: number, z?: number): number;
  /** p5-style octave/falloff control for this instance's noise. */
  noiseDetail(lod: number, falloff: number): void;
  /** p5-style reseed of this instance's Perlin table via an LCG. */
  noiseSeed(seed: number): void;
  /** Gaussian-ish sample in (-1, 1) via rejection sampling (upstream helper). */
  randGaussian(): number;
  /** Generate a plant genome; consumes rng draws in upstream order. */
  genParams(): FloraParams;
  /** Paint a woody plant (branching shrub) onto args.ctx. */
  woody(args: PlantArgs): void;
  /** Paint a herbaceous plant (stems from a common root) onto args.ctx. */
  herbal(args: PlantArgs): void;
  /** Generate a 512×512 paper texture tile. */
  paper(args?: PaperArgs): HTMLCanvasElement | OffscreenCanvas;
  /** Full painting: paper, plant, squircle border. Upstream generate(). */
  generate(opts?: GenerateOptions): GenerateResult;
  /**
   * The organ painters, exposed for composers that arrange growth along their
   * own geometry (API addition over upstream — the functions themselves are the
   * unmodified ports; upstream simply never exported them individually).
   */
  stem(args: StemArgs): Vec[];
  leaf(args: LeafArgs): Vec[];
}

// ---------------------------------------------------------------------------
// math constants (upstream main.js lines 29-38)
// ---------------------------------------------------------------------------

const rad2deg = 180 / Math.PI;
const deg2rad = Math.PI / 180;
const PI = Math.PI;
const sin = Math.sin;
const cos = Math.cos;
const abs = Math.abs;
const pow = Math.pow;
/** Degrees → radians. */
export function rad(x: number): number { return x * deg2rad; }
/** Radians → degrees. (Unused upstream and here; kept + exported for parity.) */
export function deg(x: number): number { return x * rad2deg; }

// ---------------------------------------------------------------------------
// seedable pseudo random number generator (upstream lines 40-78)
// Upstream is a singleton that overwrites the global RNG; here it is a factory
// and each createFlora() owns one. Same algorithm: s = s*s % (p*q) with
// p=999979, q=999983, the btoa(JSON.stringify(x)) charCode hash, the seed-retry
// loop, and the 10-draw warmup. (Prng.test — a demo benchmark — is dropped.)
// ---------------------------------------------------------------------------

function createPrng(): { seed(x: string | number): void; next(): number } {
  let s = 1234;
  const p = 999979;
  const q = 999983;
  const m = p * q;
  function hash(x: string | number): number {
    const y = btoa(JSON.stringify(x));
    let z = 0;
    for (let i = 0; i < y.length; i++) {
      z += y.charCodeAt(i) * Math.pow(128, i);
    }
    return z;
  }
  function seed(x: string | number): void {
    // upstream falls back to the current time when x is undefined; createFlora
    // always supplies a seed, so that nondeterministic branch is not ported.
    let y = 0;
    let z = 0;
    function redo(): void { y = (hash(x) + z) % m; z += 1; }
    while (y % p === 0 || y % q === 0 || y === 0 || y === 1) { redo(); }
    s = y;
    for (let i = 0; i < 10; i++) { next(); }
  }
  function next(): number {
    s = (s * s) % m;
    return s / m;
  }
  return { seed, next };
}

// ---------------------------------------------------------------------------
// perlin noise adapted from p5.js (upstream lines 100-165)
// Same algorithm, factory-scoped per instance; the table is lazily seeded from
// the instance rng on the first noise() call, exactly like upstream (where the
// overridden global RNG fed it).
// ---------------------------------------------------------------------------

function createNoise(random: () => number): {
  noise(x: number, y?: number, z?: number): number;
  noiseDetail(lod: number, falloff: number): void;
  noiseSeed(seed: number): void;
} {
  const PERLIN_YWRAPB = 4; const PERLIN_YWRAP = 1 << PERLIN_YWRAPB;
  const PERLIN_ZWRAPB = 8; const PERLIN_ZWRAP = 1 << PERLIN_ZWRAPB;
  const PERLIN_SIZE = 4095;
  let perlin_octaves = 4; let perlin_amp_falloff = 0.5;
  const scaled_cosine = (i: number): number => 0.5 * (1.0 - Math.cos(i * Math.PI));
  let perlin: number[] | undefined;
  const noise = (x: number, y?: number, z?: number): number => {
    y = y || 0; z = z || 0;
    if (perlin == null) {
      perlin = new Array<number>(PERLIN_SIZE + 1);
      for (let i = 0; i < PERLIN_SIZE + 1; i++) {
        perlin[i] = random();
      }
    }
    if (x < 0) { x = -x; } if (y < 0) { y = -y; } if (z < 0) { z = -z; }
    let xi = Math.floor(x); let yi = Math.floor(y); let zi = Math.floor(z);
    let xf = x - xi; let yf = y - yi; let zf = z - zi;
    let rxf; let ryf;
    let r = 0; let ampl = 0.5;
    let n1; let n2; let n3;
    for (let o = 0; o < perlin_octaves; o++) {
      let of = xi + (yi << PERLIN_YWRAPB) + (zi << PERLIN_ZWRAPB);
      rxf = scaled_cosine(xf); ryf = scaled_cosine(yf);
      n1  = perlin[of & PERLIN_SIZE];
      n1 += rxf * (perlin[(of + 1) & PERLIN_SIZE] - n1);
      n2  = perlin[(of + PERLIN_YWRAP) & PERLIN_SIZE];
      n2 += rxf * (perlin[(of + PERLIN_YWRAP + 1) & PERLIN_SIZE] - n2);
      n1 += ryf * (n2 - n1);
      of += PERLIN_ZWRAP;
      n2  = perlin[of & PERLIN_SIZE];
      n2 += rxf * (perlin[(of + 1) & PERLIN_SIZE] - n2);
      n3  = perlin[(of + PERLIN_YWRAP) & PERLIN_SIZE];
      n3 += rxf * (perlin[(of + PERLIN_YWRAP + 1) & PERLIN_SIZE] - n3);
      n2 += ryf * (n3 - n2);
      n1 += scaled_cosine(zf) * (n2 - n1);
      r += n1 * ampl;
      ampl *= perlin_amp_falloff;
      xi <<= 1; xf *= 2; yi <<= 1; yf *= 2; zi <<= 1; zf *= 2;
      if (xf >= 1.0) { xi++; xf--; }
      if (yf >= 1.0) { yi++; yf--; }
      if (zf >= 1.0) { zi++; zf--; }
    }
    return r;
  };
  const noiseDetail = (lod: number, falloff: number): void => {
    if (lod > 0)     { perlin_octaves = lod; }
    if (falloff > 0) { perlin_amp_falloff = falloff; }
  };
  const noiseSeed = (seed: number): void => {
    // upstream's lcg.getSeed() accessor is dropped (never called).
    const lcg = (function () {
      const m = 4294967296; const a = 1664525; const c = 1013904223;
      let z = 0;
      return {
        setSeed: function (val?: number | null): void {
          // upstream falls back to a draw from the (then-global) rng when the
          // seed is null; the instance rng plays that role here.
          z = ((val == null ? random() * m : val)) >>> 0;
        },
        rand: function (): number { z = (a * z + c) % m; return z / m; },
      };
    }());
    lcg.setSeed(seed);
    perlin = new Array<number>(PERLIN_SIZE + 1);
    for (let i = 0; i < PERLIN_SIZE + 1; i++) { perlin[i] = lcg.rand(); }
  };
  return { noise, noiseDetail, noiseSeed };
}

// ---------------------------------------------------------------------------
// pure helpers (upstream lines 166-250, minus the rng-consuming ones which
// live inside createFlora)
// ---------------------------------------------------------------------------

/** distance between 2 coordinates in 2D */
export function distance(p0: Vec, p1: Vec): number {
  return Math.sqrt(Math.pow(p0[0] - p1[0], 2) + Math.pow(p0[1] - p1[1], 2));
}
/** map float from one range to another */
export function mapval(value: number, istart: number, istop: number, ostart: number, ostop: number): number {
  return ostart + (ostop - ostart) * (((value - istart) * 1.0) / (istop - istart));
}
/** sigmoid curve */
export function sigmoid(x: number, k?: number): number {
  k = (k !== undefined) ? k : 10;
  return 1 / (1 + Math.exp(-k * (x - 0.5)));
}
/** pseudo bean curve (unused upstream and here; kept + exported for parity) */
export function bean(x: number): number {
  return pow(0.25 - pow(x - 0.5, 2), 0.5) * (2.6 + 2.4 * pow(x, 1.5)) * 0.54;
}
/** interpolate between square and circle */
export function squircle(r: number, a: number): (th: number) => number {
  return function (th: number): number {
    while (th > PI / 2) {
      th -= PI / 2;
    }
    while (th < 0) {
      th += PI / 2;
    }
    return r * pow(1 / (pow(cos(th), a) + pow(sin(th), a)), 1 / a);
  };
}
/** mid-point of an array of points (accepts one Vec[] or Vecs as varargs) */
export function midPt(...args: Array<Vec | Vec[]>): Vec {
  const plist = ((args.length === 1) ? args[0] : args) as Vec[];
  return plist.reduce(function (acc: Vec, v: Vec): Vec {
    return [v[0] / plist.length + acc[0],
            v[1] / plist.length + acc[1],
            v[2] / plist.length + acc[2]];
  }, [0, 0, 0]);
}
/** rational bezier curve */
export function bezmh(P: Vec[], w?: number): Vec[] {
  w = (w === undefined) ? 1 : w;
  if (P.length === 2) {
    P = [P[0], midPt(P[0], P[1]), P[1]];
  }
  const plist: Vec[] = [];
  for (let j = 0; j < P.length - 2; j++) {
    let p0: Vec; let p2: Vec;
    if (j === 0) { p0 = P[j]; } else { p0 = midPt(P[j], P[j + 1]); }
    const p1 = P[j + 1];
    if (j === P.length - 3) { p2 = P[j + 2]; } else { p2 = midPt(P[j + 1], P[j + 2]); }
    const pl = 20;
    for (let i = 0; i < pl + (j === P.length - 3 ? 1 : 0); i += 1) {
      const t = i / pl;
      const u = Math.pow(1 - t, 2) + 2 * t * (1 - t) * w + t * t;
      plist.push([
        (Math.pow(1 - t, 2) * p0[0] + 2 * t * (1 - t) * p1[0] * w + t * t * p2[0]) / u,
        (Math.pow(1 - t, 2) * p0[1] + 2 * t * (1 - t) * p1[1] * w + t * t * p2[1]) / u,
        (Math.pow(1 - t, 2) * p0[2] + 2 * t * (1 - t) * p1[2] * w + t * t * p2[2]) / u]);
    }
  }
  return plist;
}

// ---------------------------------------------------------------------------
// tools for vectors in 3d (upstream lines 251-351). All .x/.y/.z accesses are
// rewritten as [0]/[1]/[2] (T1), including the rot components in roteuler.
// v3.normalize is omitted: upstream references an undefined global mag() and
// leaks a global p — it would throw if called, and it never is (T6).
// ---------------------------------------------------------------------------

const v3 = {
  forward: [0, 0, 1] as Vec,
  up: [0, 1, 0] as Vec,
  right: [1, 0, 0] as Vec,
  zero: [0, 0, 0] as Vec,

  rotvec: function (vec: Vec, axis: Vec, th: number): Vec {
    const [l, m, n] = axis;
    const [x, y, z] = vec;
    const [costh, sinth] = [Math.cos(th), Math.sin(th)];
    const mat: Record<number, number> = {};
    mat[11] = l * l * (1 - costh) + costh;
    mat[12] = m * l * (1 - costh) - n * sinth;
    mat[13] = n * l * (1 - costh) + m * sinth;

    mat[21] = l * m * (1 - costh) + n * sinth;
    mat[22] = m * m * (1 - costh) + costh;
    mat[23] = n * m * (1 - costh) - l * sinth;

    mat[31] = l * n * (1 - costh) - m * sinth;
    mat[32] = m * n * (1 - costh) + l * sinth;
    mat[33] = n * n * (1 - costh) + costh;
    return [
      x * mat[11] + y * mat[12] + z * mat[13],
      x * mat[21] + y * mat[22] + z * mat[23],
      x * mat[31] + y * mat[32] + z * mat[33],
    ];
  },
  roteuler: function (vec: Vec, rot: Vec): Vec {
    if (rot[2] !== 0) { vec = v3.rotvec(vec, v3.forward, rot[2]); }
    if (rot[0] !== 0) { vec = v3.rotvec(vec, v3.right, rot[0]); }
    if (rot[1] !== 0) { vec = v3.rotvec(vec, v3.up, rot[1]); }
    return vec;
  },

  scale: function (vec: Vec, p: number): Vec {
    return [vec[0] * p, vec[1] * p, vec[2] * p];
  },
  copy: function (v0: Vec): Vec {
    return [v0[0], v0[1], v0[2]];
  },
  add: function (v0: Vec, v: Vec): Vec {
    return [v0[0] + v[0], v0[1] + v[1], v0[2] + v[2]];
  },
  subtract: function (v0: Vec, v: Vec): Vec {
    return [v0[0] - v[0], v0[1] - v[1], v0[2] - v[2]];
  },
  mag: function (v: Vec): number {
    return Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
  },
  dot: function (u: Vec, v: Vec): number {
    return u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
  },
  cross: function (u: Vec, v: Vec): Vec {
    return [
      u[1] * v[2] - u[2] * v[1],
      u[2] * v[0] - u[0] * v[2],
      u[0] * v[1] - u[1] * v[0],
    ];
  },
  angcos: function (u: Vec, v: Vec): number {
    return v3.dot(u, v) / (v3.mag(u) * v3.mag(v));
  },
  ang: function (u: Vec, v: Vec): number {
    return Math.acos(v3.angcos(u, v));
  },
  toeuler: function (v0: Vec): Vec {
    // upstream keeps a write-only `cnt` debug counter here; dropped (T6/T8).
    const ep = 5;
    let ma = 2 * PI;
    let mr: Vec = [0, 0, 0];
    for (let x = -180; x < 180; x += ep) {
      for (let y = -90; y < 90; y += ep) {
        const r: Vec = [rad(x), rad(y), 0];
        const v = v3.roteuler([0, 0, 1], r);
        const a = v3.ang(v0, v);
        if (a < rad(ep)) {
          return r;
        }
        if (a < ma) {
          ma = a;
          mr = r;
        }
      }
    }
    return mr;
  },
  lerp: function (u: Vec, v: Vec, p: number): Vec {
    return [
      u[0] * (1 - p) + v[0] * p,
      u[1] * (1 - p) + v[1] * p,
      u[2] * (1 - p) + v[2] * p,
    ];
  },
};

// ---------------------------------------------------------------------------
// colour + drawing helpers (upstream lines 352-456)
// ---------------------------------------------------------------------------

/** rgba to css color string */
function rgba(r?: number, g?: number, b?: number, a?: number): string {
  r = (r !== undefined) ? r : 255;
  g = (g !== undefined) ? g : r;
  b = (b !== undefined) ? b : g;
  a = (a !== undefined) ? a : 1.0;
  return 'rgba(' + Math.floor(r) + ',' + Math.floor(g) + ',' + Math.floor(b) + ',' + a.toFixed(3) + ')';
}
/** hsv to css color string */
function hsv(h: number, s: number, v: number, a?: number): string {
  const c = v * s;
  const x = c * (1 - abs(((h / 60) % 2) - 1));
  const m = v - c;
  const [rv, gv, bv] = ([[c, x, 0], [x, c, 0], [0, c, x],
                         [0, x, c], [x, 0, c], [c, 0, x]])[Math.floor(h / 60)];
  const [r, g, b] = [(rv + m) * 255, (gv + m) * 255, (bv + m) * 255];
  return rgba(r, g, b, a);
}

interface PolygonArgs {
  ctx: Ctx2D;
  xof?: number;
  yof?: number;
  pts?: Vec[];
  col?: string;
  fil?: boolean;
  str?: boolean;
}
/** polygon for HTML canvas (ctx required — no page-global CTX in the port) */
function polygon(args: PolygonArgs): void {
  const xof = (args.xof !== undefined) ? args.xof : 0;
  const yof = (args.yof !== undefined) ? args.yof : 0;
  const pts = (args.pts !== undefined) ? args.pts : [];
  const col = (args.col !== undefined) ? args.col : 'black';
  const fil = (args.fil !== undefined) ? args.fil : true;
  const str = (args.str !== undefined) ? args.str : !fil;

  // fill()/stroke() are overloaded on both context flavours, which TS cannot
  // call through the union; pin one arm (runtime behaviour is identical).
  const ctx = args.ctx as CanvasRenderingContext2D;
  ctx.beginPath();
  if (pts.length > 0) {
    ctx.moveTo(pts[0][0] + xof, pts[0][1] + yof);
  }
  for (let i = 1; i < pts.length; i++) {
    ctx.lineTo(pts[i][0] + xof, pts[i][1] + yof);
  }
  if (fil) {
    ctx.fillStyle = col;
    ctx.fill();
  }
  if (str) {
    ctx.strokeStyle = col;
    ctx.stroke();
  }
}
/** lerp hue wrapping around 360 degs */
function lerpHue(h0: number, h1: number, p: number): number {
  const methods = [
    [abs(h1 - h0),       mapval(p, 0, 1, h0, h1)],
    [abs(h1 + 360 - h0), mapval(p, 0, 1, h0, h1 + 360)],
    [abs(h1 - 360 - h0), mapval(p, 0, 1, h0, h1 - 360)],
  ];
  methods.sort((x, y) => (x[0] - y[0]));
  return (methods[0][1] + 720) % 360;
}
/**
 * get rotation at given index of a poly-line. Upstream calls this with
 * ind === -1, hitting the Array.prototype negative-index getters (P[-1] is the
 * last point, P[-2] the one before); normalized here instead (T1). Exported
 * (API addition) for external composers that aim organs along their own paths.
 */
export function grot(P: Vec[], ind: number): Vec {
  const i = ind < 0 ? P.length + ind : ind;
  const d = v3.subtract(P[i], P[i - 1]);
  return v3.toeuler(d);
}

interface TubifyArgs {
  pts?: Vec[];
  wid?: (x: number) => number;
}
/**
 * generate 2d tube shape from list of points. Upstream leaks vtxlist0/vtxlist1
 * as accidental globals plus a third `vtxlist` that is never read; the first
 * two are locals here and the dead one is dropped (T6).
 */
export function tubify(args?: TubifyArgs): [Vec[], Vec[]] {
  const pts = (args !== undefined && args.pts !== undefined) ? args.pts : [];
  const wid = (args !== undefined && args.wid !== undefined) ? args.wid : (_x: number) => 10;
  const vtxlist0: Vec[] = [];
  const vtxlist1: Vec[] = [];
  for (let i = 1; i < pts.length - 1; i++) {
    const w = wid(i / pts.length);
    const a1 = Math.atan2(pts[i][1] - pts[i - 1][1], pts[i][0] - pts[i - 1][0]);
    const a2 = Math.atan2(pts[i][1] - pts[i + 1][1], pts[i][0] - pts[i + 1][0]);
    let a = (a1 + a2) / 2;
    if (a < a2) { a += PI; }
    vtxlist0.push([pts[i][0] + w * cos(a), (pts[i][1] + w * sin(a))]);
    vtxlist1.push([pts[i][0] - w * cos(a), (pts[i][1] - w * sin(a))]);
  }
  const l = pts.length - 1;
  const a0 = Math.atan2(pts[1][1] - pts[0][1], pts[1][0] - pts[0][0]) - Math.PI / 2;
  const a1 = Math.atan2(pts[l][1] - pts[l - 1][1], pts[l][0] - pts[l - 1][0]) - Math.PI / 2;
  const w0 = wid(0);
  const w1 = wid(1);
  vtxlist0.unshift([pts[0][0] + w0 * Math.cos(a0), (pts[0][1] + w0 * Math.sin(a0))]);
  vtxlist1.unshift([pts[0][0] - w0 * Math.cos(a0), (pts[0][1] - w0 * Math.sin(a0))]);
  vtxlist0.push([pts[l][0] + w1 * Math.cos(a1), (pts[l][1] + w1 * Math.sin(a1))]);
  vtxlist1.push([pts[l][0] - w1 * Math.cos(a1), (pts[l][1] - w1 * Math.sin(a1))]);
  return [vtxlist0, vtxlist1];
}

// ---------------------------------------------------------------------------
// canvas abstraction (T4). Upstream creates canvases via document.createElement
// only; this helper falls back to OffscreenCanvas so the whole painter runs in
// a module Web Worker unchanged.
// ---------------------------------------------------------------------------

/** Create a w×h canvas: OffscreenCanvas when there is no document (workers). */
export function createCanvas(w: number, h: number): HTMLCanvasElement | OffscreenCanvas {
  if (typeof document === 'undefined') {
    return new OffscreenCanvas(w, h);
  }
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  return canvas;
}

/**
 * Resolve a 2d context from either canvas flavour. TS cannot unify the two
 * getContext() overload sets through the union, so narrow explicitly.
 */
function getCtx2d(canvas: HTMLCanvasElement | OffscreenCanvas): Ctx2D {
  const context =
    typeof OffscreenCanvas !== 'undefined' && canvas instanceof OffscreenCanvas
      ? canvas.getContext('2d')
      : (canvas as HTMLCanvasElement).getContext('2d');
  if (context == null) {
    throw new Error('nonflowers: could not acquire a 2d canvas context');
  }
  return context;
}

// ---------------------------------------------------------------------------
// canvas context operations (upstream lines 1168-1249). Layer.filter and
// Layer.bound index the pixel array directly instead of allocating a
// pix.slice() per pixel, and bound reads only the alpha channel — the only
// perf changes in the port, both output-identical (T7).
// ---------------------------------------------------------------------------

export const Layer = {
  empty: function (w?: number, h?: number): Ctx2D {
    w = (w !== undefined) ? w : 600;
    h = (h !== undefined) ? h : w;
    // upstream leaks `context` as an accidental global; local here (T6).
    return getCtx2d(createCanvas(w, h));
  },
  blit: function (ctx0: Ctx2D, ctx1: Ctx2D, args?: { ble?: string; xof?: number; yof?: number }): void {
    const ble = (args !== undefined && args.ble !== undefined) ? args.ble : 'normal';
    const xof = (args !== undefined && args.xof !== undefined) ? args.xof : 0;
    const yof = (args !== undefined && args.yof !== undefined) ? args.yof : 0;
    // drawImage is overloaded on both context flavours; pin one arm for TS.
    const c0 = ctx0 as CanvasRenderingContext2D;
    // QUIRK PRESERVED: upstream passes ble:"normal", which is NOT a valid
    // globalCompositeOperation. The canvas spec ignores invalid assignments,
    // so whatever op was last set on ctx0 (e.g. "multiply" from the previous
    // blit in woody()/herbal()) silently stays in effect. That accident is
    // load-bearing for the look, so we keep the raw assignment via a cast.
    c0.globalCompositeOperation = ble as GlobalCompositeOperation;
    c0.drawImage(ctx1.canvas, xof, yof);
  },
  filter: function (ctx: Ctx2D, f: FilterFn): void {
    // getImageData/putImageData overloads don't unify through the union.
    const c = ctx as CanvasRenderingContext2D;
    const imgd = c.getImageData(0, 0,
      c.canvas.width, c.canvas.height);
    const pix = imgd.data;
    for (let i = 0, n = pix.length; i < n; i += 4) {
      const x = (i / 4) % c.canvas.width;
      const y = Math.floor((i / 4) / c.canvas.width);
      const [r1, g1, b1, a1] = f(x, y, pix[i], pix[i + 1], pix[i + 2], pix[i + 3]);
      pix[i]     = r1;
      pix[i + 1] = g1;
      pix[i + 2] = b1;
      pix[i + 3] = a1;
    }
    c.putImageData(imgd, 0, 0);
  },
  border: function (ctx: Ctx2D, f: (theta: number) => number): void {
    const c = ctx as CanvasRenderingContext2D; // see filter()
    const imgd = c.getImageData(0, 0,
      c.canvas.width, c.canvas.height);
    const pix = imgd.data;
    for (let i = 0, n = pix.length; i < n; i += 4) {
      // upstream also destructures a dead pix.slice() here; dropped (T6/T7).
      const x = (i / 4) % c.canvas.width;
      const y = Math.floor((i / 4) / c.canvas.width);

      const nx = (x / c.canvas.width - 0.5) * 2;
      const ny = (y / c.canvas.height - 0.5) * 2;
      const theta = Math.atan2(ny, nx);
      const r_ = distance([nx, ny], [0, 0]);
      const rr_ = f(theta);

      if (r_ > rr_) {
        pix[i]     = 0;
        pix[i + 1] = 0;
        pix[i + 2] = 0;
        pix[i + 3] = 0;
      }
    }
    c.putImageData(imgd, 0, 0);
  },
  // find the dirty region - potentially optimizable
  bound: function (ctx: Ctx2D): { xmin: number; xmax: number; ymin: number; ymax: number } {
    const c = ctx as CanvasRenderingContext2D; // see filter()
    let xmin = c.canvas.width;
    let xmax = 0;
    let ymin = c.canvas.height;
    let ymax = 0;
    const imgd = c.getImageData(0, 0,
      c.canvas.width, c.canvas.height);
    const pix = imgd.data;
    for (let i = 0, n = pix.length; i < n; i += 4) {
      const a = pix[i + 3]; // alpha only (T7); 0..255, so >0.001 means >=1
      if (a > 0.001) {
        const x = (i / 4) % c.canvas.width;
        const y = Math.floor((i / 4) / c.canvas.width);
        if (x < xmin) { xmin = x; }
        if (x > xmax) { xmax = x; }
        if (y < ymin) { ymin = y; }
        if (y > ymax) { ymax = y; }
      }
    }
    return { xmin: xmin, xmax: xmax, ymin: ymin, ymax: ymax };
  },
};

// paper colour presets (upstream lines 1254-1255)
export const PAPER_COL0 = [1, 0.99, 0.9];
export const PAPER_COL1 = [0.98, 0.91, 0.74];

// ---------------------------------------------------------------------------
// createFlora — the instance factory. Everything below consumes the seeded rng
// or the seeded noise, so it is scoped per instance (upstream kept it global
// and overrode the global RNG). Functions appear in upstream source order and
// preserve upstream's exact draw order; see README.md for the full log.
// ---------------------------------------------------------------------------

interface StrokeArgs {
  ctx: Ctx2D;
  pts?: Vec[];
  xof?: number;
  yof?: number;
  col?: string;
  wid?: (x: number) => number;
}
export interface LeafArgs {
  ctx: Ctx2D;
  xof?: number;
  yof?: number;
  rot?: Vec;
  len?: number;
  seg?: number;
  wid?: (x: number) => number;
  vei?: number[];
  flo?: boolean;
  col?: ColorRange;
  cof?: (x: number) => number;
  ben?: (x: number) => Vec;
}
export interface StemArgs {
  ctx: Ctx2D;
  xof?: number;
  yof?: number;
  rot?: Vec;
  len?: number;
  seg?: number;
  wid?: (x: number) => number;
  col?: ColorRange;
  ben?: (x: number) => Vec;
}
interface BranchArgs {
  ctx: Ctx2D;
  xof?: number;
  yof?: number;
  rot?: Vec;
  len?: number;
  seg?: number;
  wid?: number;
  twi?: number;
  col?: ColorRange;
  dep?: number;
  frk?: number;
}

/**
 * Create a self-contained, seeded flora painter. Same seed → same numbers →
 * pixel-identical paintings, on the main thread or in a worker.
 */
export function createFlora(seed: string | number): FloraInstance {
  const Prng = createPrng();
  Prng.seed(seed); // upstream: Math.seed(SEED) — retry loop + 10-draw warmup
  /** every ambient-global-RNG draw in upstream main.js becomes this call */
  const random = Prng.next;

  const Noise = createNoise(random);
  const noise = Noise.noise;
  const noiseDetail = Noise.noiseDetail;
  const noiseSeed = Noise.noiseSeed;

  /** random element from array */
  function randChoice<T>(arr: T[]): T {
    return arr[Math.floor(arr.length * random())];
  }
  /** normalized random number */
  function normRand(m: number, M: number): number {
    return mapval(random(), 0, 1, m, M);
  }
  /** weighted randomness */
  function wtrand(func: (x: number) => number): number {
    const x = random();
    const y = random();
    if (y < func(x)) {
      return x;
    } else {
      return wtrand(func);
    }
  }
  /** gaussian randomness */
  function randGaussian(): number {
    return wtrand(function (x) { return Math.pow(Math.E, -24 * Math.pow(x - 0.5, 2)); }) * 2 - 1;
  }

  /** line work with weight function (instance-scoped: default wid uses noise) */
  function stroke(args: StrokeArgs): [Vec[], Vec[]] {
    const pts = (args.pts !== undefined) ? args.pts : [];
    const ctx = args.ctx;
    const xof = (args.xof !== undefined) ? args.xof : 0;
    const yof = (args.yof !== undefined) ? args.yof : 0;
    const col = (args.col !== undefined) ? args.col : 'black';
    const wid = (args.wid !== undefined) ? args.wid :
      (x: number) => (1 * sin(x * PI) * mapval(noise(x * 10), 0, 1, 0.5, 1));

    const [vtxlist0, vtxlist1] = tubify({ pts: pts, wid: wid });

    polygon({ pts: vtxlist0.concat(vtxlist1.reverse()),
      ctx: ctx, fil: true, col: col, xof: xof, yof: yof });
    return [vtxlist0, vtxlist1];
  }

  /** generate paper texture (512×512 tile) */
  function paper(args?: PaperArgs): HTMLCanvasElement | OffscreenCanvas {
    const col = (args !== undefined && args.col !== undefined) ? args.col : [0.98, 0.91, 0.74];
    const tex = (args !== undefined && args.tex !== undefined) ? args.tex : 20;
    const spr = (args !== undefined && args.spr !== undefined) ? args.spr : 1;

    const canvas = createCanvas(512, 512); // upstream: document.createElement (T4)
    const ctx = getCtx2d(canvas) as CanvasRenderingContext2D; // pin arm; fillRect only
    const reso = 512;
    for (let i = 0; i < reso / 2 + 1; i++) {
      for (let j = 0; j < reso / 2 + 1; j++) {
        let c = (255 - noise(i * 0.1, j * 0.1) * tex * 0.5);
        c -= random() * tex;
        let r = (c * col[0]);
        let g = (c * col[1]);
        let b = (c * col[2]);
        if (noise(i * 0.04, j * 0.04, 2) * random() * spr > 0.7
         || random() < 0.005 * spr) {
          r = (c * 0.7);
          g = (c * 0.5);
          b = (c * 0.2);
        }
        ctx.fillStyle = rgba(r, g, b);
        ctx.fillRect(i, j, 1, 1);
        ctx.fillRect(reso - i, j, 1, 1);
        ctx.fillRect(i, reso - j, 1, 1);
        ctx.fillRect(reso - i, reso - j, 1, 1);
      }
    }
    return canvas;
  }

  /** generate leaf-like structure */
  function leaf(args: LeafArgs): Vec[] {
    const ctx = args.ctx;
    const xof = (args.xof !== undefined) ? args.xof : 0;
    const yof = (args.yof !== undefined) ? args.yof : 0;
    const rot = (args.rot !== undefined) ? args.rot : [PI / 2, 0, 0];
    const len = (args.len !== undefined) ? args.len : 500;
    const seg = (args.seg !== undefined) ? args.seg : 40;
    const wid = (args.wid !== undefined) ? args.wid : (x: number) => (sin(x * PI) * 20);
    const vei = (args.vei !== undefined) ? args.vei : [1, 3];
    const flo = (args.flo !== undefined) ? args.flo : false;
    const col = (args.col !== undefined) ? args.col :
      { min: [90, 0.2, 0.3, 1], max: [90, 0.1, 0.9, 1] };
    const cof = (args.cof !== undefined) ? args.cof : (x: number) => x;
    const ben = (args.ben !== undefined) ? args.ben :
      (_x: number) => ([normRand(-10, 10), 0, normRand(-5, 5)]);

    let disp = v3.zero;
    let crot = v3.zero;
    const P = [disp];
    const ROT = [crot];
    const L = [disp];
    const R = [disp];

    const orient = (v: Vec): Vec => (v3.roteuler(v, rot));

    for (let i = 0; i < seg; i++) {
      const p = i / (seg - 1);
      crot = v3.add(crot, v3.scale(ben(p), 1 / seg));
      disp = v3.add(disp, orient(v3.roteuler([0, 0, len / seg], crot)));
      const w = wid(p);
      const l = v3.add(disp, orient(v3.roteuler([-w, 0, 0], crot)));
      const r = v3.add(disp, orient(v3.roteuler([w, 0, 0], crot)));

      if (i > 0) {
        const v0 = v3.subtract(disp, L[L.length - 1]); // upstream L[-1]
        const v1 = v3.subtract(l, disp);
        const v2 = v3.cross(v0, v1);
        let lt: number;
        if (!flo) {
          lt = mapval(abs(v3.ang(v2, [0, -1, 0])), 0, PI, 1, 0);
        } else {
          lt = p * normRand(0.95, 1);
        }
        lt = cof(lt) || 0;

        const h = lerpHue(col.min[0], col.max[0], lt);
        const s = mapval(lt, 0, 1, col.min[1], col.max[1]);
        const v = mapval(lt, 0, 1, col.min[2], col.max[2]);
        const a = mapval(lt, 0, 1, col.min[3], col.max[3]);

        polygon({ ctx: ctx, pts: [l, L[L.length - 1], P[P.length - 1], disp], // upstream L[-1], P[-1]
          xof: xof, yof: yof, fil: true, str: true, col: hsv(h, s, v, a) });
        polygon({ ctx: ctx, pts: [r, R[R.length - 1], P[P.length - 1], disp], // upstream R[-1], P[-1]
          xof: xof, yof: yof, fil: true, str: true, col: hsv(h, s, v, a) });
      }
      P.push(disp);
      ROT.push(crot);
      L.push(l);
      R.push(r);
    }
    if (vei[0] === 1) {
      for (let i = 1; i < P.length; i++) {
        for (let j = 0; j < vei[1]; j++) {
          const p = j / vei[1];

          const p0 = v3.lerp(L[i - 1], P[i - 1], p);
          const p1 = v3.lerp(L[i], P[i], p);

          const q0 = v3.lerp(R[i - 1], P[i - 1], p);
          const q1 = v3.lerp(R[i], P[i], p);
          polygon({ ctx: ctx, pts: [p0, p1],
            xof: xof, yof: yof, fil: false, col: hsv(0, 0, 0, normRand(0.4, 0.9)) });
          polygon({ ctx: ctx, pts: [q0, q1],
            xof: xof, yof: yof, fil: false, col: hsv(0, 0, 0, normRand(0.4, 0.9)) });
        }
      }
      stroke({ ctx: ctx, pts: P, xof: xof, yof: yof, col: rgba(0, 0, 0, 0.3) });
    } else if (vei[0] === 2) {
      for (let i = 1; i < P.length - vei[1]; i += vei[2]) {
        polygon({ ctx: ctx, pts: [P[i], L[i + vei[1]]],
          xof: xof, yof: yof, fil: false, col: hsv(0, 0, 0, normRand(0.4, 0.9)) });
        polygon({ ctx: ctx, pts: [P[i], R[i + vei[1]]],
          xof: xof, yof: yof, fil: false, col: hsv(0, 0, 0, normRand(0.4, 0.9)) });
      }
      stroke({ ctx: ctx, pts: P, xof: xof, yof: yof, col: rgba(0, 0, 0, 0.3) });
    }

    stroke({ ctx: ctx, pts: L, xof: xof, yof: yof, col: rgba(120, 100, 0, 0.3) });
    stroke({ ctx: ctx, pts: R, xof: xof, yof: yof, col: rgba(120, 100, 0, 0.3) });
    return P;
  }

  /** generate stem-like structure */
  function stem(args: StemArgs): Vec[] {
    const ctx = args.ctx;
    const xof = (args.xof !== undefined) ? args.xof : 0;
    const yof = (args.yof !== undefined) ? args.yof : 0;
    const rot = (args.rot !== undefined) ? args.rot : [PI / 2, 0, 0];
    const len = (args.len !== undefined) ? args.len : 400;
    const seg = (args.seg !== undefined) ? args.seg : 40;
    const wid = (args.wid !== undefined) ? args.wid : (_x: number) => 6;
    const col = (args.col !== undefined) ? args.col :
      { min: [250, 0.2, 0.4, 1], max: [250, 0.3, 0.6, 1] };
    const ben = (args.ben !== undefined) ? args.ben :
      (_x: number) => ([normRand(-10, 10), 0, normRand(-5, 5)]);

    let disp = v3.zero;
    let crot = v3.zero;
    const P = [disp];
    const ROT = [crot];

    const orient = (v: Vec): Vec => (v3.roteuler(v, rot));

    for (let i = 0; i < seg; i++) {
      const p = i / (seg - 1);
      crot = v3.add(crot, v3.scale(ben(p), 1 / seg));
      disp = v3.add(disp, orient(v3.roteuler([0, 0, len / seg], crot)));
      ROT.push(crot);
      P.push(disp);
    }
    const [L, R] = tubify({ pts: P, wid: wid });
    const wseg = 4;
    for (let i = 1; i < P.length; i++) {
      for (let j = 1; j < wseg; j++) {
        const m = (j - 1) / (wseg - 1);
        const n = j / (wseg - 1);
        const p = i / (P.length - 1);

        const p0 = v3.lerp(L[i - 1], R[i - 1], m);
        const p1 = v3.lerp(L[i], R[i], m);

        const p2 = v3.lerp(L[i - 1], R[i - 1], n);
        const p3 = v3.lerp(L[i], R[i], n);

        const lt = n / p;
        const h = lerpHue(col.min[0], col.max[0], lt) * mapval(noise(p * 10, m * 10, n * 10), 0, 1, 0.5, 1);
        const s = mapval(lt, 0, 1, col.max[1], col.min[1]) * mapval(noise(p * 10, m * 10, n * 10), 0, 1, 0.5, 1);
        const v = mapval(lt, 0, 1, col.min[2], col.max[2]) * mapval(noise(p * 10, m * 10, n * 10), 0, 1, 0.5, 1);
        const a = mapval(lt, 0, 1, col.min[3], col.max[3]);

        polygon({ ctx: ctx, pts: [p0, p1, p3, p2],
          xof: xof, yof: yof, fil: true, str: true, col: hsv(h, s, v, a) });
      }
    }
    stroke({ ctx: ctx, pts: L, xof: xof, yof: yof, col: rgba(0, 0, 0, 0.5) });
    stroke({ ctx: ctx, pts: R, xof: xof, yof: yof, col: rgba(0, 0, 0, 0.5) });
    return P;
  }

  /** generate fractal-like branches */
  function branch(args: BranchArgs): BranchEntry[] {
    const ctx = args.ctx;
    const xof = (args.xof !== undefined) ? args.xof : 0;
    const yof = (args.yof !== undefined) ? args.yof : 0;
    const rot = (args.rot !== undefined) ? args.rot : [PI / 2, 0, 0];
    const len = (args.len !== undefined) ? args.len : 400;
    const seg = (args.seg !== undefined) ? args.seg : 40;
    const wid = (args.wid !== undefined) ? args.wid : 1;
    const twi = (args.twi !== undefined) ? args.twi : 5;
    const col = (args.col !== undefined) ? args.col :
      { min: [50, 0.2, 0.8, 1], max: [50, 0.2, 0.8, 1] };
    const dep = (args.dep !== undefined) ? args.dep : 3;
    const frk = (args.frk !== undefined) ? args.frk : 4;

    const jnt: Array<[number, number]> = [];
    for (let i = 0; i < twi; i++) {
      jnt.push([Math.floor(random() * seg), normRand(-1, 1)]);
    }

    function jntdist(x: number): [number, number] {
      let m = seg;
      let j = 0;
      for (let i = 0; i < jnt.length; i++) {
        const n = Math.abs(x * seg - jnt[i][0]);
        if (n < m) {
          m = n;
          j = i;
        }
      }
      return [m, jnt[j][1]];
    }

    const wfun = function (x: number): number {
      const [m] = jntdist(x); // upstream also destructures the (unused) joint value
      if (m < 1) {
        return wid * (3 + 5 * (1 - x));
      } else {
        return wid * (2 + 7 * (1 - x) * mapval(noise(x * 10), 0, 1, 0.5, 1));
      }
    };

    const bfun = function (x: number): Vec {
      const [m, j] = jntdist(x);
      if (m < 1) {
        return [0, j * 20, 0];
      } else {
        return [0, normRand(-5, 5), 0];
      }
    };

    const P = stem({ ctx: ctx,
      xof: xof, yof: yof,
      rot: rot,
      len: len, seg: seg,
      wid: wfun,
      col: col,
      ben: bfun });

    let child: BranchEntry[] = [];
    if (dep > 0 && wid > 0.1) {
      // NOTE: upstream re-evaluates the rng in the loop condition each pass;
      // preserved exactly (each iteration check consumes one draw).
      for (let i = 0; i < frk * random(); i++) {
        const ind = Math.floor(normRand(1, P.length));

        const r = grot(P, ind);
        const L = branch({ ctx: ctx,
          xof: xof + P[ind][0], yof: yof + P[ind][1], // upstream P[ind].x/.y
          rot: [r[0] + normRand(-1, 1) * PI / 6, r[1] + normRand(-1, 1) * PI / 6, r[2] + normRand(-1, 1) * PI / 6],
          seg: seg,
          len: len * normRand(0.4, 0.6),
          wid: wid * normRand(0.4, 0.7),
          twi: twi * 0.7,
          dep: dep - 1,
        });
        // child = child.concat(L.map((v)=>([v[0],[v[1].x+P[ind].x,v[1].y+P[ind].y,v[1].z]])))
        child = child.concat(L);
      }
    }
    return ([[dep, P.map((v): Vec => ([v[0] + xof, v[1] + yof, v[2]]))]] as BranchEntry[]).concat(child); // upstream v.x+xof, v.y+yof, v.z
  }

  // vizParams (upstream lines 727-799) is demo chrome — not ported (T5).

  /** generate random parameters — the plant genome */
  function genParams(): FloraParams {
    const randint = (x: number, y: number): number => (Math.floor(normRand(x, y)));

    // Upstream assigns onto a bare PAR object; strict typing builds the same
    // fields as locals IN UPSTREAM ASSIGNMENT ORDER (rng order preserved) and
    // returns them as one literal at the end.
    const flowerShapeMask = (x: number): number => (pow(sin(PI * x), 0.2));
    const leafShapeMask = (x: number): number => (pow(sin(PI * x), 0.5));

    const flowerChance = randChoice([normRand(0, 0.08), normRand(0, 0.03)]);
    const leafChance = randChoice([0, normRand(0, 0.1), normRand(0, 0.1)]);
    const leafType = randChoice([
      [1, randint(2, 5)],
      [2, randint(3, 7), randint(3, 8)],
      [2, randint(3, 7), randint(3, 8)],
    ]);

    const flowerShapeNoiseSeed = random() * PI;
    const flowerJaggedness = normRand(0.5, 8);
    const flowerShape = (x: number): number => (noise(x * flowerJaggedness, flowerShapeNoiseSeed) * flowerShapeMask(x));

    // QUIRK PRESERVED: upstream draws a leafShapeNoiseSeed here but the jagged
    // leafShape below reuses flowerShapeNoiseSeed instead. The draw must still
    // happen to keep the rng stream aligned.
    void (random() * PI); // leafShapeNoiseSeed (never read upstream)
    const leafJaggedness = normRand(0.1, 40);
    const leafPointyness = normRand(0.5, 1.5);
    const leafShape = randChoice<(x: number) => number>([
      (x) => (noise(x * leafJaggedness, flowerShapeNoiseSeed) * leafShapeMask(x)),
      (x) => (pow(sin(PI * x), leafPointyness)),
    ]);

    const flowerHue0 = (normRand(0, 180) - 130 + 360) % 360;
    const flowerHue1 = Math.floor((flowerHue0 + normRand(-70, 70) + 360) % 360);
    const flowerValue0 = Math.min(1, normRand(0.5, 1.3));
    const flowerValue1 = Math.min(1, normRand(0.5, 1.3));
    const flowerSaturation0 = normRand(0, 1.1 - flowerValue0);
    const flowerSaturation1 = normRand(0, 1.1 - flowerValue1);

    const flowerColor = { min: [flowerHue0, flowerSaturation0, flowerValue0, normRand(0.8, 1)],
                          max: [flowerHue1, flowerSaturation1, flowerValue1, normRand(0.5, 1)] };
    const leafColor = { min: [normRand(10, 200), normRand(0.05, 0.4), normRand(0.3, 0.7), normRand(0.8, 1)],
                        max: [normRand(10, 200), normRand(0.05, 0.4), normRand(0.3, 0.7), normRand(0.8, 1)] };

    const curveCoeff0 = [normRand(-0.5, 0.5), normRand(5, 10)];
    // curveCoeff1 feeds only a commented-out flowerColorCurve variant upstream,
    // and curveCoeff3 feeds nothing at all — but both must still be drawn to
    // keep the rng stream aligned with upstream.
    void [random() * PI, normRand(1, 5)]; // curveCoeff1 (dead upstream)
    const curveCoeff2 = [random() * PI, normRand(5, 15)];
    void [random() * PI, normRand(1, 5)]; // curveCoeff3 (dead upstream)
    const curveCoeff4 = [random() * 0.5, normRand(0.8, 1.2)];

    const flowerOpenCurve = randChoice<(x: number, op: number) => number>([
      (x, op) => (
        (x < 0.1) ?
          2 + op * curveCoeff2[1]
        : noise(x * 10, curveCoeff2[0])),
      (x, op) => (
        (x < curveCoeff4[0]) ? 0 : 10 - x * mapval(op, 0, 1, 16, 20) * curveCoeff4[1]
      ),
    ]);

    const flowerColorCurve = randChoice<(x: number) => number>([
      (x) => (sigmoid(x + curveCoeff0[0], curveCoeff0[1])),
      // (x)=>(Noise.noise(x*curveCoeff1[1],curveCoeff1[0]))  [commented out upstream]
    ]);
    const leafLength = normRand(30, 100);
    const flowerLength = normRand(5, 55); // * (0.1-PAR.flowerChance)*10
    const pedicelLength = normRand(5, 30);

    const leafWidth = normRand(5, 30);

    const flowerWidth = normRand(5, 30);

    const stemWidth = normRand(2, 11);
    const stemBend = normRand(2, 16);
    const stemLength = normRand(300, 400);
    const stemCount = randChoice([2, 3, 4, 5]);

    const sheathLength = randChoice([0, normRand(50, 100)]);
    const sheathWidth = normRand(5, 15);
    const shootCount = normRand(1, 7);
    const shootLength = normRand(50, 180);
    const leafPosition = randChoice([1, 2]);

    const flowerPetal = Math.round(mapval(flowerWidth, 5, 50, 10, 3));

    const innerLength = Math.min(normRand(0, 20), flowerLength * 0.8);
    const innerWidth = Math.min(randChoice([0, normRand(1, 8)]), flowerWidth * 0.8);
    const innerShape = (x: number): number => (pow(sin(PI * x), 1));
    const innerHue = normRand(0, 60);
    const innerColor = { min: [innerHue, normRand(0.1, 0.7), normRand(0.5, 0.9), normRand(0.8, 1)],
                         max: [innerHue, normRand(0.1, 0.7), normRand(0.5, 0.9), normRand(0.5, 1)] };

    const branchWidth = normRand(0.4, 1.3);
    const branchTwist = Math.round(normRand(2, 5));
    const branchDepth = randChoice([3, 4]);
    const branchFork = randChoice([4, 5, 6, 7]);

    const branchHue = normRand(30, 60);
    const branchSaturation = normRand(0.05, 0.3);
    const branchValue = normRand(0.7, 0.9);
    const branchColor = { min: [branchHue, branchSaturation, branchValue, 1],
                          max: [branchHue, branchSaturation, branchValue, 1] };

    // upstream: console.log(PAR); vizParams(PAR) — demo chrome, dropped (T5).
    return {
      flowerChance, leafChance, leafType, flowerShape, leafShape,
      flowerColor, leafColor, flowerOpenCurve, flowerColorCurve,
      leafLength, flowerLength, pedicelLength, leafWidth, flowerWidth,
      stemWidth, stemBend, stemLength, stemCount,
      sheathLength, sheathWidth, shootCount, shootLength, leafPosition,
      flowerPetal, innerLength, innerWidth, innerShape, innerColor,
      branchWidth, branchTwist, branchDepth, branchFork, branchColor,
    };
  }

  /** generate a woody plant */
  function woody(args: PlantArgs): void {
    const ctx = args.ctx;
    const xof = (args.xof !== undefined) ? args.xof : 0;
    const yof = (args.yof !== undefined) ? args.yof : 0;
    const PAR = (args.PAR !== undefined) ? args.PAR : genParams();

    const cwid = 1200;
    const lay0 = Layer.empty(cwid);
    const lay1 = Layer.empty(cwid);

    const PL = branch({
      ctx: lay0, xof: cwid * 0.5, yof: cwid * 0.7,
      wid: PAR.branchWidth,
      twi: PAR.branchTwist,
      dep: PAR.branchDepth,
      col: PAR.branchColor,
      frk: PAR.branchFork,
    });

    for (let i = 0; i < PL.length; i++) {
      if (i / PL.length > 0.1) {
        for (let j = 0; j < PL[i][1].length; j++) {
          if (random() < PAR.leafChance) {
            leaf({ ctx: lay0,
              xof: PL[i][1][j][0], yof: PL[i][1][j][1], // upstream .x/.y
              len: PAR.leafLength * normRand(0.8, 1.2),
              vei: PAR.leafType,
              col: PAR.leafColor,
              rot: [normRand(-1, 1) * PI, normRand(-1, 1) * PI, normRand(-1, 1) * 0],
              wid: (x) => (PAR.leafShape(x) * PAR.leafWidth),
              ben: (x) => ([
                mapval(noise(x * 1, i), 0, 1, -1, 1) * 5,
                0,
                mapval(noise(x * 1, i + PI), 0, 1, -1, 1) * 5,
              ]) });
          }

          if (random() < PAR.flowerChance) {

            const hr = [normRand(-1, 1) * PI, normRand(-1, 1) * PI, normRand(-1, 1) * 0];

            const P_ = stem({ ctx: lay0,
              xof: PL[i][1][j][0], yof: PL[i][1][j][1], // upstream .x/.y
              rot: hr,
              len: PAR.pedicelLength,
              col: { min: [50, 1, 0.9, 1], max: [50, 1, 0.9, 1] },
              wid: (x) => (sin(x * PI) * x * 2 + 1),
              ben: (_x) => ([
                0, 0, 0,
              ]) });

            const op = random();

            const r = grot(P_, -1);
            const hhr = r;
            for (let k = 0; k < PAR.flowerPetal; k++) {

              leaf({ ctx: lay1, flo: true,
                xof: PL[i][1][j][0] + P_[P_.length - 1][0], yof: PL[i][1][j][1] + P_[P_.length - 1][1], // upstream P_[-1].x/.y
                rot: [hhr[0], hhr[1], hhr[2] + k / PAR.flowerPetal * PI * 2],
                len: PAR.flowerLength * normRand(0.7, 1.3),
                wid: (x) => (PAR.flowerShape(x) * PAR.flowerWidth),
                vei: [0],
                col: PAR.flowerColor,
                cof: PAR.flowerColorCurve,
                ben: (x) => ([
                  PAR.flowerOpenCurve(x, op),
                  0,
                  0,
                ]),
              });

              leaf({ ctx: lay1, flo: true,
                xof: PL[i][1][j][0] + P_[P_.length - 1][0], yof: PL[i][1][j][1] + P_[P_.length - 1][1], // upstream P_[-1].x/.y
                rot: [hhr[0], hhr[1], hhr[2] + k / PAR.flowerPetal * PI * 2],
                len: PAR.innerLength * normRand(0.8, 1.2),
                wid: (x) => (sin(x * PI) * 4),
                vei: [0],
                col: PAR.innerColor,
                cof: (x) => (x),
                ben: (x) => ([
                  PAR.flowerOpenCurve(x, op),
                  0,
                  0,
                ]) });
            }
          }
        }
      }
    }
    Layer.filter(lay0, Filter.fade);
    Layer.filter(lay0, Filter.wispy);
    Layer.filter(lay1, Filter.wispy);
    const b1 = Layer.bound(lay0);
    const b2 = Layer.bound(lay1);
    const bd = {
      xmin: Math.min(b1.xmin, b2.xmin),
      xmax: Math.max(b1.xmax, b2.xmax),
      ymin: Math.min(b1.ymin, b2.ymin),
      ymax: Math.max(b1.ymax, b2.ymax),
    };
    const xref = xof - (bd.xmin + bd.xmax) / 2;
    const yref = yof - bd.ymax;
    Layer.blit(ctx, lay0, { ble: 'multiply', xof: xref, yof: yref });
    Layer.blit(ctx, lay1, { ble: 'normal', xof: xref, yof: yref }); // "normal" is invalid → multiply persists (see Layer.blit)
  }

  /** generate a herbaceous plant */
  function herbal(args: PlantArgs): void {
    const ctx = args.ctx;
    const xof = (args.xof !== undefined) ? args.xof : 0;
    const yof = (args.yof !== undefined) ? args.yof : 0;
    const PAR = (args.PAR !== undefined) ? args.PAR : genParams();

    const cwid = 1200;
    const lay0 = Layer.empty(cwid);
    const lay1 = Layer.empty(cwid);

    const x0 = cwid * 0.5;
    const y0 = cwid * 0.7;

    for (let i = 0; i < PAR.stemCount; i++) {
      const r = [PI / 2, 0, normRand(-1, 1) * PI];
      const P = stem({ ctx: lay0, xof: x0, yof: y0,
        len: PAR.stemLength * normRand(0.7, 1.3),
        rot: r,
        wid: (x) => (PAR.stemWidth *
          (pow(sin(x * PI / 2 + PI / 2), 0.5) * noise(x * 10) * 0.5 + 0.5)),
        ben: (x) => ([
          mapval(noise(x * 1, i), 0, 1, -1, 1) * x * PAR.stemBend,
          0,
          mapval(noise(x * 1, i + PI), 0, 1, -1, 1) * x * PAR.stemBend,
        ]) });

      if (PAR.leafPosition === 2) {
        for (let j = 0; j < P.length; j++) {
          if (random() < PAR.leafChance * 2) {
            leaf({ ctx: lay0,
              xof: x0 + P[j][0], yof: y0 + P[j][1], // upstream P[j].x/.y
              len: 2 * PAR.leafLength * normRand(0.8, 1.2),
              vei: PAR.leafType,
              col: PAR.leafColor,
              rot: [normRand(-1, 1) * PI, normRand(-1, 1) * PI, normRand(-1, 1) * 0],
              wid: (x) => (2 * PAR.leafShape(x) * PAR.leafWidth),
              ben: (x) => ([
                mapval(noise(x * 1, i), 0, 1, -1, 1) * 5,
                0,
                mapval(noise(x * 1, i + PI), 0, 1, -1, 1) * 5,
              ]) });
          }
        }
      }

      const hr = grot(P, -1);
      if (PAR.sheathLength !== 0) {
        stem({ ctx: lay0, xof: x0 + P[P.length - 1][0], yof: y0 + P[P.length - 1][1], // upstream P[-1].x/.y
          rot: hr,
          len: PAR.sheathLength,
          col: { min: [60, 0.3, 0.9, 1], max: [60, 0.3, 0.9, 1] },
          wid: (x) => PAR.sheathWidth * (pow(sin(x * PI), 2) - x * 0.5 + 0.5),
          ben: (_x) => ([0, 0, 0]
          ) });
      }
      // NOTE: upstream re-evaluates the rng in this loop condition each pass;
      // preserved exactly (each iteration check consumes one draw).
      for (let j = 0; j < Math.max(1, PAR.shootCount * normRand(0.5, 1.5)); j++) {
        const P_ = stem({ ctx: lay0, xof: x0 + P[P.length - 1][0], yof: y0 + P[P.length - 1][1], // upstream P[-1].x/.y
          rot: hr,
          len: PAR.shootLength * normRand(0.5, 1.5),
          col: { min: [70, 0.2, 0.9, 1], max: [70, 0.2, 0.9, 1] },
          wid: (_x) => (2),
          ben: (x) => ([
            mapval(noise(x * 1, j), 0, 1, -1, 1) * x * 10,
            0,
            mapval(noise(x * 1, j + PI), 0, 1, -1, 1) * x * 10,
          ]) });
        const op = random();
        const hhr = [normRand(-1, 1) * PI, normRand(-1, 1) * PI, normRand(-1, 1) * PI];
        for (let k = 0; k < PAR.flowerPetal; k++) {
          leaf({ ctx: lay1, flo: true,
            xof: x0 + P[P.length - 1][0] + P_[P_.length - 1][0], yof: y0 + P[P.length - 1][1] + P_[P_.length - 1][1], // upstream P[-1] + P_[-1]
            rot: [hhr[0], hhr[1], hhr[2] + k / PAR.flowerPetal * PI * 2],
            len: PAR.flowerLength * normRand(0.7, 1.3) * 1.5,
            wid: (x) => (1.5 * PAR.flowerShape(x) * PAR.flowerWidth),
            vei: [0],
            col: PAR.flowerColor,
            cof: PAR.flowerColorCurve,
            ben: (x) => ([
              PAR.flowerOpenCurve(x, op),
              0,
              0,
            ]) });

          leaf({ ctx: lay1, flo: true,
            xof: x0 + P[P.length - 1][0] + P_[P_.length - 1][0], yof: y0 + P[P.length - 1][1] + P_[P_.length - 1][1], // upstream P[-1] + P_[-1]
            rot: [hhr[0], hhr[1], hhr[2] + k / PAR.flowerPetal * PI * 2],
            len: PAR.innerLength * normRand(0.8, 1.2),
            wid: (x) => (sin(x * PI) * 4),
            vei: [0],
            col: PAR.innerColor,
            cof: (x) => (x),
            ben: (x) => ([
              PAR.flowerOpenCurve(x, op),
              0,
              0,
            ]) });
        }
      }
    }
    if (PAR.leafPosition === 1) {
      for (let i = 0; i < PAR.leafChance * 100; i++) {
        leaf({ ctx: lay0,
          xof: x0, yof: y0, rot: [PI / 3, 0, normRand(-1, 1) * PI],
          len: 4 * PAR.leafLength * normRand(0.8, 1.2),
          wid: (x) => (2 * PAR.leafShape(x) * PAR.leafWidth),
          vei: PAR.leafType,
          ben: (x) => ([
            mapval(noise(x * 1, i), 0, 1, -1, 1) * 10,
            0,
            mapval(noise(x * 1, i + PI), 0, 1, -1, 1) * 10,
          ]) });
      }
    }
    Layer.filter(lay0, Filter.fade);
    Layer.filter(lay0, Filter.wispy);
    Layer.filter(lay1, Filter.wispy);
    const b1 = Layer.bound(lay0);
    const b2 = Layer.bound(lay1);
    const bd = {
      xmin: Math.min(b1.xmin, b2.xmin),
      xmax: Math.max(b1.xmax, b2.xmax),
      ymin: Math.min(b1.ymin, b2.ymin),
      ymax: Math.max(b1.ymax, b2.ymax),
    };
    const xref = xof - (bd.xmin + bd.xmax) / 2;
    const yref = yof - bd.ymax;
    Layer.blit(ctx, lay0, { ble: 'multiply', xof: xref, yof: yref });
    Layer.blit(ctx, lay1, { ble: 'normal', xof: xref, yof: yref }); // "normal" is invalid → multiply persists (see Layer.blit)
  }

  /** collection of image filters (instance-scoped: they sample the noise) */
  const Filter = {
    wispy: ((x, y, r, g, b, a) => {
      const n = noise(x * 0.2, y * 0.2);
      const m = noise(x * 0.5, y * 0.5, 2);
      return [r, g * mapval(m, 0, 1, 0.95, 1), b * mapval(m, 0, 1, 0.9, 1), a * mapval(n, 0, 1, 0.5, 1)];
    }) as FilterFn,
    fade: ((x, y, r, g, b, a) => {
      const n = noise(x * 0.01, y * 0.01);
      return [r, g, b, a * Math.min(Math.max(mapval(n, 0, 1, 0, 1), 0), 1)];
    }) as FilterFn,
  };

  /**
   * generate new plant — the high-level entry, reproducing upstream generate():
   * white fill, tiled paper, 50/50 woody/herbal coin flip, squircle border.
   * Only the default options reproduce upstream's exact rng stream; see
   * GenerateOptions for how each override shifts it (always deterministically).
   */
  function generate(opts?: GenerateOptions): GenerateResult {
    const size = (opts !== undefined && opts.size !== undefined) ? opts.size : 600;
    const kindOpt = (opts !== undefined && opts.kind !== undefined) ? opts.kind : 'auto';
    const paperMode = (opts !== undefined && opts.paper !== undefined) ? opts.paper : 'aged';
    const border = (opts !== undefined && opts.border !== undefined) ? opts.border : paperMode !== 'none';

    const CTX = Layer.empty(size, size);
    // fillRect is a single-signature method on both flavours, but fillStyle +
    // drawImage sites below still want one pinned arm; do it once.
    const c = CTX as CanvasRenderingContext2D;
    if (paperMode !== 'none') {
      c.fillStyle = 'white';
      c.fillRect(0, 0, c.canvas.width, c.canvas.height);
      const ppr = paper({ col: paperMode === 'aged' ? PAPER_COL1 : PAPER_COL0 });
      for (let i = 0; i < c.canvas.width; i += 512) {
        for (let j = 0; j < c.canvas.height; j += 512) {
          c.drawImage(ppr, i, j);
        }
      }
    }
    let kind: 'woody' | 'herbal';
    if (kindOpt === 'auto') {
      kind = (random() <= 0.5) ? 'woody' : 'herbal'; // upstream's coin flip
    } else {
      kind = kindOpt;
    }
    // upstream lets woody()/herbal() default PAR to genParams(); calling it
    // here (immediately before, same rng position) lets us return the genome.
    const drawn = genParams();
    const params = (opts !== undefined && opts.tune !== undefined) ? opts.tune(drawn) : drawn;
    if (kind === 'woody') {
      // upstream: woody({xof:300, yof:550}) on a 600px canvas — scaled to size.
      woody({ ctx: CTX, xof: size / 2, yof: (size * 550) / 600, PAR: params });
    } else {
      // upstream: herbal({xof:300, yof:600}) — the bottom edge.
      herbal({ ctx: CTX, xof: size / 2, yof: size, PAR: params });
    }
    if (border) {
      Layer.border(CTX, squircle(0.98, 3));
    }
    return { canvas: CTX.canvas, params: params, kind: kind };
  }

  // makeDownload, toggle, makeBG, load, reloadWSeed, parseArgs (upstream demo
  // chrome) are not ported (T5).

  return {
    random,
    noise,
    noiseDetail,
    noiseSeed,
    randGaussian,
    genParams,
    woody,
    herbal,
    paper,
    generate,
    stem,
    leaf,
  };
}
