/**
 * garland.ts — gongbi growth arranged along the page's own geometry.
 *
 * The vendored nonflowers module paints whole plants: woody() and herbal() decide
 * where stems go. A garland inverts that: the PAGE decides the path (the One Stem
 * vine down the story rail, a frame around a portrait) and this composer walks it
 * with the same brush — the vendor's own tubify rails and graded-quad shading for
 * the vine, and the vendor's actual leaf()/stem() organ painters for foliage and
 * blossom clusters, aimed with grot() exactly the way woody() aims its flowers.
 * One genome per garland (createFlora(seed).genParams()), so a vine has a single
 * species' hand from root to tip, and the same seed grows the same garland forever.
 *
 * Two voices:
 *   'pigment' — the genome's own palette, full gongbi colour.
 *   'ink'     — every organ's colour range overridden to ramps of the practice's
 *               blue (#3E7CA8 ≈ hue 205). This is how a garland lives on the About
 *               page without breaking its one-colour doctrine; pigment is rationed
 *               to the commissioned moments. inkTune() exposes the same override
 *               for whole-plant commissions via GenerateOptions.tune.
 *
 * A handful of small helpers (hsv/lerpHue/rgba/polygon and the wispy filter
 * formula) are pure functions copied from the vendored module rather than
 * exported from it — the vendor's public surface stays the upstream algorithm,
 * and the copies are marked with their upstream line numbers.
 */
import {
  createFlora,
  grot,
  tubify,
  Layer,
  type ColorRange,
  type Ctx2D,
  type FloraInstance,
  type FloraParams,
  type Vec,
} from '../../vendor/nonflowers/nonflowers';

export type GarlandVoice = 'ink' | 'pigment';
export type GarlandOrgan = 'leaf' | 'bloom' | 'bud';

export interface GarlandStation {
  /** Position along the path, 0 (root) … 1 (tip). */
  t: number;
  organ: GarlandOrgan;
}

export interface GarlandOpts {
  seed: string;
  voice: GarlandVoice;
  /** Strip canvas size, px. */
  width: number;
  height: number;
  /** Root-first polyline in strip px. The vine is drawn root → tip. */
  path: Array<[number, number]>;
  stations: GarlandStation[];
  /** Organ size multiplier (default 1). */
  scale?: number;
  /** Vine half-width at the root, px (default 7; tapers toward the tip). */
  rootWidth?: number;
}

/* ------------------------------------------------------------------------- */
/* Pure helpers copied from the vendor (upstream main.js line refs)           */
/* ------------------------------------------------------------------------- */

const PI = Math.PI;
const { sin, abs, max, min } = Math;

/** upstream 352–359 */
function rgba(r: number, g: number, b: number, a = 1): string {
  return `rgba(${Math.floor(r)},${Math.floor(g)},${Math.floor(b)},${a.toFixed(3)})`;
}

/** upstream 360–369 */
function hsv(h: number, s: number, v: number, a?: number): string {
  const c = v * s;
  const x = c * (1 - abs(((h / 60) % 2) - 1));
  const m = v - c;
  const table: Array<[number, number, number]> = [
    [c, x, 0], [x, c, 0], [0, c, x], [0, x, c], [x, 0, c], [c, 0, x],
  ];
  const [rv, gv, bv] = table[Math.floor(h / 60) % 6];
  return rgba((rv + m) * 255, (gv + m) * 255, (bv + m) * 255, a);
}

/** upstream 397–406 */
function lerpHue(h0: number, h1: number, p: number): number {
  const methods: Array<[number, number]> = [
    [abs(h1 - h0), h0 + (h1 - h0) * p],
    [abs(h1 + 360 - h0), h0 + (h1 + 360 - h0) * p],
    [abs(h1 - 360 - h0), h0 + (h1 - 360 - h0) * p],
  ];
  methods.sort((a, b) => a[0] - b[0]);
  return (methods[0][1] + 720) % 360;
}

/** upstream 370–396, simplified to what the tube needs */
function polygon(ctx: Ctx2D, pts: Vec[], col: string, fil: boolean, str: boolean): void {
  const c = ctx as CanvasRenderingContext2D;
  c.beginPath();
  if (pts.length > 0) c.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
  if (fil) {
    c.fillStyle = col;
    c.fill();
  }
  if (str) {
    c.strokeStyle = col;
    c.stroke();
  }
}

function mapval(v: number, a: number, b: number, c: number, d: number): number {
  return c + (d - c) * ((v - a) / (b - a));
}

/* ------------------------------------------------------------------------- */
/* The ink voice                                                              */
/* ------------------------------------------------------------------------- */

/** #3E7CA8 in HSV: hue ≈ 205, sat 0.63, val 0.66. Ramps stay in that family. */
const INK_HUE = 205;
export const INK_RANGES: Record<'stem' | 'leaf' | 'flower' | 'inner', ColorRange> = {
  stem: { min: [INK_HUE, 0.58, 0.4, 1], max: [INK_HUE, 0.38, 0.6, 1] },
  leaf: { min: [INK_HUE, 0.52, 0.36, 0.95], max: [INK_HUE, 0.28, 0.66, 0.85] },
  flower: { min: [INK_HUE, 0.42, 0.48, 0.92], max: [INK_HUE, 0.12, 0.9, 0.6] },
  inner: { min: [INK_HUE, 0.55, 0.42, 1], max: [INK_HUE, 0.5, 0.58, 0.9] },
};

/** Genome transform for whole-plant commissions in the ink voice (generate({ tune })). */
export function inkTune(params: FloraParams): FloraParams {
  return {
    ...params,
    branchColor: INK_RANGES.stem,
    leafColor: INK_RANGES.leaf,
    flowerColor: INK_RANGES.flower,
    innerColor: INK_RANGES.inner,
  };
}

/* ------------------------------------------------------------------------- */
/* Path plumbing                                                              */
/* ------------------------------------------------------------------------- */

/** Even arc-length resample of a root-first polyline into 3-vectors (z = 0). */
function resample(path: Array<[number, number]>, step: number): Vec[] {
  const out: Vec[] = [];
  let carry = 0;
  for (let i = 1; i < path.length; i++) {
    const [x0, y0] = path[i - 1];
    const [x1, y1] = path[i];
    const seg = Math.hypot(x1 - x0, y1 - y0);
    if (seg === 0) continue;
    let d = carry;
    while (d < seg) {
      const p = d / seg;
      out.push([x0 + (x1 - x0) * p, y0 + (y1 - y0) * p, 0]);
      d += step;
    }
    carry = d - seg;
  }
  const last = path[path.length - 1];
  out.push([last[0], last[1], 0]);
  return out;
}

/* ------------------------------------------------------------------------- */
/* The composer                                                               */
/* ------------------------------------------------------------------------- */

/**
 * Paint the vine tube along resampled points with the vendor's own rendering
 * (tubify rails, noise-graded quads, dark rail strokes — upstream stem(),
 * lines 586–642 — but over OUR points instead of a self-grown walk).
 */
function drawTube(flora: FloraInstance, ctx: Ctx2D, pts: Vec[], rootWidth: number, col: ColorRange): void {
  const wid = (x: number) =>
    rootWidth * (1 - 0.55 * x) * mapval(flora.noise(x * 10), 0, 1, 0.65, 1);
  const [L, R] = tubify({ pts, wid });
  const wseg = 4;
  for (let i = 1; i < pts.length; i++) {
    for (let j = 1; j < wseg; j++) {
      const m = (j - 1) / (wseg - 1);
      const n = j / (wseg - 1);
      const p = i / (pts.length - 1);
      const p0: Vec = lerp3(L[i - 1], R[i - 1], m);
      const p1: Vec = lerp3(L[i], R[i], m);
      const p2: Vec = lerp3(L[i - 1], R[i - 1], n);
      const p3: Vec = lerp3(L[i], R[i], n);
      const lt = n / max(p, 1e-6);
      const nz = mapval(flora.noise(p * 10, m * 10, n * 10), 0, 1, 0.5, 1);
      // Upstream stem() multiplies HUE by the noise too, which walks a blue
      // (205) down into the greens — charming on a wild plant, doctrine-breaking
      // on an ink vine. The tube keeps noise on sat/value only; hue holds.
      const h = lerpHue(col.min[0], col.max[0], min(lt, 1));
      const s = mapval(min(lt, 1), 0, 1, col.max[1], col.min[1]) * nz;
      const v = mapval(min(lt, 1), 0, 1, col.min[2], col.max[2]) * nz;
      const a = mapval(min(lt, 1), 0, 1, col.min[3], col.max[3]);
      polygon(ctx, [p0, p1, p3, p2], hsv(h, s, v, a), true, true);
    }
  }
  strokeRail(flora, ctx, L);
  strokeRail(flora, ctx, R);
}

function lerp3(u: Vec, v: Vec, p: number): Vec {
  return [u[0] * (1 - p) + v[0] * p, u[1] * (1 - p) + v[1] * p, 0];
}

/** The dark ink edge along a rail (upstream stroke(), lines 440–456). */
function strokeRail(flora: FloraInstance, ctx: Ctx2D, pts: Vec[]): void {
  if (pts.length < 3) return;
  const [a, b] = tubify({
    pts,
    wid: (x: number) => sin(x * PI) * mapval(flora.noise(x * 10), 0, 1, 0.5, 1),
  });
  polygon(ctx, a.concat(b.reverse()), rgba(0, 0, 0, 0.5), true, false);
}

/** The wispy texture filter (upstream Filter.wispy, lines 1157–1161). */
function wispy(flora: FloraInstance, ctx: Ctx2D): void {
  const c = ctx as CanvasRenderingContext2D;
  const w = c.canvas.width;
  const h = c.canvas.height;
  const imgd = c.getImageData(0, 0, w, h);
  const pix = imgd.data;
  for (let i = 0; i < pix.length; i += 4) {
    if (pix[i + 3] === 0) continue;
    const x = (i / 4) % w;
    const y = Math.floor(i / 4 / w);
    const n = flora.noise(x * 0.2, y * 0.2);
    const m = flora.noise(x * 0.5, y * 0.5, 2);
    pix[i + 1] = pix[i + 1] * mapval(m, 0, 1, 0.95, 1);
    pix[i + 2] = pix[i + 2] * mapval(m, 0, 1, 0.9, 1);
    pix[i + 3] = pix[i + 3] * mapval(n, 0, 1, 0.5, 1);
  }
  c.putImageData(imgd, 0, 0);
}

export function paintGarland(opts: GarlandOpts): HTMLCanvasElement | OffscreenCanvas {
  const { seed, voice, width, height, path, stations } = opts;
  const scale = opts.scale ?? 1;
  const rootWidth = opts.rootWidth ?? 7;

  const flora = createFlora(seed);
  const PAR = flora.genParams();
  const nr = (m: number, M: number) => mapval(flora.random(), 0, 1, m, M);

  const stemCol = voice === 'ink' ? INK_RANGES.stem : PAR.branchColor;
  const leafCol = voice === 'ink' ? INK_RANGES.leaf : PAR.leafColor;
  const flowerCol = voice === 'ink' ? INK_RANGES.flower : PAR.flowerColor;
  const innerCol = voice === 'ink' ? INK_RANGES.inner : PAR.innerColor;

  const ctx = Layer.empty(width, height);
  const pts = resample(path, 4);

  drawTube(flora, ctx, pts, rootWidth, stemCol);

  // Stations are painted in ledger order; every draw comes from the instance
  // rng, so the whole arrangement is one deterministic sequence.
  for (const station of stations) {
    const idx = max(1, min(pts.length - 1, Math.round(station.t * (pts.length - 1))));
    const [x, y] = pts[idx];

    if (station.organ === 'leaf') {
      flora.leaf({
        ctx,
        xof: x,
        yof: y,
        len: PAR.leafLength * scale * nr(0.7, 1.1),
        vei: PAR.leafType,
        col: leafCol,
        rot: [nr(-1, 1) * PI, nr(-1, 1) * PI, 0],
        wid: (t: number) => PAR.leafShape(t) * PAR.leafWidth * scale * 0.8,
        ben: (t: number) => [
          mapval(flora.noise(t * 1, idx), 0, 1, -1, 1) * 5,
          0,
          mapval(flora.noise(t * 1, idx + PI), 0, 1, -1, 1) * 5,
        ],
      });
      continue;
    }

    // 'bloom' and 'bud' both follow woody()'s flower recipe (upstream lines
    // 949–998): a short pedicel, then a fan of flo-leaves around its tip. The
    // pedicel is drawn with OUR tube (hue held) rather than vendor stem(),
    // for the same hue-walk reason as the vine itself.
    const bud = station.organ === 'bud';
    const pedLen = (PAR.pedicelLength + 4) * scale * (bud ? 0.6 : 1);
    const ang = nr(0, 2 * PI);
    const bow = nr(-0.6, 0.6);
    const P_: Vec[] = Array.from({ length: 8 }, (_, i) => {
      const q = i / 7;
      const swing = ang + bow * q;
      return [Math.cos(swing) * pedLen * q, Math.sin(swing) * pedLen * q, 0];
    });
    drawTube(
      flora,
      ctx,
      P_.map(([px, py]) => [x + px, y + py, 0] as Vec),
      2.2 * scale,
      voice === 'ink' ? INK_RANGES.stem : { min: [50, 1, 0.9, 1], max: [50, 1, 0.9, 1] },
    );
    const op = flora.random();
    const tip = P_[P_.length - 1];
    const r = grot(P_, -1);
    const petals = bud ? 3 : PAR.flowerPetal;
    for (let k = 0; k < petals; k++) {
      flora.leaf({
        ctx,
        flo: true,
        xof: x + tip[0],
        yof: y + tip[1],
        rot: [r[0], r[1], r[2] + (k / petals) * PI * 2],
        len: PAR.flowerLength * scale * nr(0.7, 1.3) * (bud ? 0.45 : 1),
        wid: (t: number) => PAR.flowerShape(t) * PAR.flowerWidth * scale * (bud ? 0.6 : 1),
        vei: [0],
        col: flowerCol,
        cof: PAR.flowerColorCurve,
        ben: (t: number) => [PAR.flowerOpenCurve(t, op), 0, 0],
      });
      if (!bud) {
        flora.leaf({
          ctx,
          flo: true,
          xof: x + tip[0],
          yof: y + tip[1],
          rot: [r[0], r[1], r[2] + (k / petals) * PI * 2],
          len: PAR.innerLength * scale * nr(0.8, 1.2),
          wid: (t: number) => sin(t * PI) * 4 * scale,
          vei: [0],
          col: innerCol,
          cof: (t: number) => t,
          ben: (t: number) => [PAR.flowerOpenCurve(t, op), 0, 0],
        });
      }
    }
  }

  wispy(flora, ctx);
  return ctx.canvas;
}
