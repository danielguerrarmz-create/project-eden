/**
 * nonflower.ts — deterministic, single-colour VECTOR botany generator.
 *
 * Procedural forms adapted from *nonflowers* by Lingdong Huang
 *   https://github.com/LingDong-/nonflowers  (MIT License)
 *   Copyright (c) 2018 Lingdong Huang
 * The original renders painterly, multi-tone Gongbi ink to a RASTER canvas. This
 * is a re-implementation of its procedural FORMS only — the seed-driven genome,
 * the noise-wandered stem/branch spines, the blade-with-veins leaf, and the
 * leaf-as-petal radial flower — re-expressed as strict single-colour SVG PATH
 * output in this site's ink (`INK_BLUE`), keeping the one-colour vector
 * discipline. No canvas, no colour ramps, no per-pixel shading. MIT attribution
 * is retained above per the license.
 *
 * PURE + DETERMINISTIC: given a genome and a seed, `growPlant` returns identical
 * paths every call, on every machine. All variation flows through the seeded
 * `Rng` / `Noise` — never `Math.random` (this repo forbids it in render paths).
 */
import type { Genome } from './genes';
import { genParams, SPECIES_PRESETS } from './genes';
import { Noise } from './noise';
import { bladeProfile } from './profiles';
import { Rng, type Seed } from './prng';
import {
  add,
  dir,
  dotPath,
  f,
  len as vlen,
  lerpPt,
  linePath,
  type Point,
  perp,
  ribbonPath,
  scale,
  smoothPath,
  sub,
} from './geom';

/** The site's single ink colour. Matches `INK_BLUE` in CrossPathsTimeline.tsx. */
export const INK_BLUE = '#3E7CA8';

export type PlantRole = 'stem' | 'leaf' | 'vein' | 'petal' | 'center';

/** One renderable ink stroke/blade: spread straight onto an SVG `<path>`. */
export type PlantPath = {
  readonly d: string;
  readonly role: PlantRole;
  readonly stroke: string;
  readonly strokeWidth: number;
  readonly fill: string;
  readonly fillOpacity: number;
};

export type BBox = { minX: number; minY: number; maxX: number; maxY: number };

/** The full plant: a flat list of ink paths plus a ready-to-use viewBox. */
export type PlantDrawing = {
  readonly genome: Genome;
  readonly seed: string;
  readonly paths: readonly PlantPath[];
  readonly bbox: BBox;
  readonly width: number;
  readonly height: number;
  /** `${x} ${y} ${w} ${h}`, already padded — drop into `<svg viewBox>`. */
  readonly viewBox: string;
};

// --- ink register, matched to the site's existing leaf/spine conventions ------
// (SeasonalBecomingDiagram: leaf fill ~0.16, stroke ~0.85; CrossPathsTimeline
//  calyx: fill ~0.05, stroke ~0.55. Stems read as spines with a faint body.)
const STYLE: Record<PlantRole, Omit<PlantPath, 'd'>> = {
  stem: { role: 'stem', stroke: INK_BLUE, strokeWidth: 1, fill: INK_BLUE, fillOpacity: 0.06 },
  leaf: { role: 'leaf', stroke: INK_BLUE, strokeWidth: 0.9, fill: INK_BLUE, fillOpacity: 0.07 },
  vein: { role: 'vein', stroke: INK_BLUE, strokeWidth: 0.55, fill: 'none', fillOpacity: 0 },
  petal: { role: 'petal', stroke: INK_BLUE, strokeWidth: 0.9, fill: INK_BLUE, fillOpacity: 0.07 },
  center: { role: 'center', stroke: INK_BLUE, strokeWidth: 0.7, fill: INK_BLUE, fillOpacity: 0.5 },
};

function pathOf(d: string, role: PlantRole): PlantPath {
  return { d, ...STYLE[role] };
}

/** Mutable generation context threaded through the recursion. */
type Ctx = {
  rng: Rng;
  noise: Noise;
  g: Genome;
  paths: PlantPath[];
  bounds: BBox;
  noiseCursor: number;
};

function include(ctx: Ctx, p: Point): void {
  const b = ctx.bounds;
  if (p[0] < b.minX) b.minX = p[0];
  if (p[0] > b.maxX) b.maxX = p[0];
  if (p[1] < b.minY) b.minY = p[1];
  if (p[1] > b.maxY) b.maxY = p[1];
}

const angleOf = (v: Point): number => Math.atan2(v[0], -v[1]);

/** Finite-difference tangents along a polyline. */
function tangents(spine: readonly Point[]): Point[] {
  const out: Point[] = [];
  for (let i = 0; i < spine.length; i++) {
    const a = spine[Math.max(0, i - 1)];
    const b = spine[Math.min(spine.length - 1, i + 1)];
    const t = sub(b, a);
    const l = vlen(t) || 1e-9;
    out.push([t[0] / l, t[1] / l]);
  }
  return out;
}

type Spine = { pts: Point[]; tan: Point[]; endAngle: number };

/**
 * Grow a noise-wandered spine from `origin` heading `theta0`. `lean` is a steady
 * per-length curvature (the stalk's overall bow); `wobble`/`noiseScale` add the
 * Perlin wander. Adapted from nonflowers' `stem`/`ben` accumulated-rotation walk.
 */
function buildSpine(
  ctx: Ctx,
  origin: Point,
  theta0: number,
  length: number,
  lean: number,
  wobbleMul = 1,
): Spine {
  const seg = Math.max(5, Math.min(24, Math.round(length / 11)));
  const nOff = (ctx.noiseCursor += 7.31);
  let theta = theta0;
  let pos = origin;
  const pts: Point[] = [pos];
  include(ctx, pos);
  for (let i = 1; i <= seg; i++) {
    const t = i / seg;
    const wob = ctx.noise.fbm(nOff + t * ctx.g.noiseScale) * ctx.g.wobble * wobbleMul;
    theta += lean / seg + wob;
    pos = add(pos, scale(dir(theta), length / seg));
    pts.push(pos);
    include(ctx, pos);
  }
  return { pts, tan: tangents(pts), endAngle: theta };
}

/** Build the left/right rails of a blade/tube from a spine + a half-width fn. */
function rails(
  spine: Spine,
  widthAt: (t: number) => number,
): { left: Point[]; right: Point[] } {
  const left: Point[] = [];
  const right: Point[] = [];
  const n = spine.pts.length - 1;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const w = widthAt(t);
    const nrm = perp(spine.tan[i]);
    left.push(add(spine.pts[i], scale(nrm, w)));
    right.push(add(spine.pts[i], scale(nrm, -w)));
  }
  return { left, right };
}

/** A blade (leaf or petal): outline + midrib + optional lateral veins. */
function blade(
  ctx: Ctx,
  origin: Point,
  theta: number,
  length: number,
  halfWidth: number,
  profile: (t: number) => number,
  veins: number,
  role: 'leaf' | 'petal',
): void {
  // A leaf midrib has its own gentle, seeded curl.
  const curl = ctx.rng.gauss() * 0.35;
  const spine = buildSpine(ctx, origin, theta, length, curl, 0.6);
  const widthAt = (t: number): number => halfWidth * profile(t);
  const { left, right } = rails(spine, widthAt);
  left.forEach((p) => include(ctx, p));
  right.forEach((p) => include(ctx, p));

  ctx.paths.push(pathOf(ribbonPath(left, right), role));
  ctx.paths.push(pathOf(smoothPath(spine.pts), 'vein'));

  const n = spine.pts.length - 1;
  for (let k = 1; k <= veins; k++) {
    const t = (k / (veins + 1)) * 0.92 + 0.04;
    const idx = Math.round(t * n);
    if (idx <= 0 || idx >= n) continue;
    // A pair of forward-swept veins from the midrib toward each edge.
    const fwd = Math.min(n, idx + 1);
    ctx.paths.push(pathOf(linePath(spine.pts[idx], lerpPt(left[fwd], spine.pts[fwd], 0.25)), 'vein'));
    ctx.paths.push(pathOf(linePath(spine.pts[idx], lerpPt(right[fwd], spine.pts[fwd], 0.25)), 'vein'));
  }
}

/** A radial flower: petals as blades around a center, plus stamens. */
function flower(ctx: Ctx, center: Point, faceTheta: number): void {
  const g = ctx.g;
  if (g.flowerPetals <= 0) return;
  const open = g.flowerOpen;
  const spread = 0.5 + (2 * Math.PI - 0.5) * open; // bud -> full rosette
  const petalLen = g.flowerLength * (0.6 + 0.4 * open);
  const profile = bladeProfile(g.flowerProfile);
  for (let k = 0; k < g.flowerPetals; k++) {
    const frac = (k + 0.5) / g.flowerPetals;
    const ang = faceTheta - spread / 2 + frac * spread;
    // Each petal springs from just off the center so the throat stays open.
    const base = add(center, scale(dir(ang), g.flowerWidth * 0.35));
    blade(ctx, base, ang, petalLen, g.flowerWidth, profile, 0, 'petal');
  }
  // Center disc + a few stamen ticks when open.
  const r = Math.max(1.2, g.flowerWidth * 0.28);
  ctx.paths.push(pathOf(dotPath(center, r), 'center'));
  include(ctx, [center[0] - r, center[1] - r]);
  include(ctx, [center[0] + r, center[1] + r]);
  if (open > 0.55) {
    const stamens = 4;
    for (let k = 0; k < stamens; k++) {
      const ang = faceTheta - spread / 2 + ((k + 0.5) / stamens) * spread;
      const tip = add(center, scale(dir(ang), r + g.flowerWidth * 0.5));
      ctx.paths.push(pathOf(linePath(center, tip), 'vein'));
      include(ctx, tip);
    }
  }
}

/** A tapered stem tube from a spine. Returns the spine for attaching children. */
function stemTube(ctx: Ctx, spine: Spine, baseW: number): void {
  const widthAt = (t: number): number => baseW * (1 - 0.62 * t) * 0.5 + baseW * 0.18;
  const { left, right } = rails(spine, widthAt);
  left.forEach((p) => include(ctx, p));
  right.forEach((p) => include(ctx, p));
  ctx.paths.push(pathOf(ribbonPath(left, right), 'stem'));
}

/**
 * Recursive branch: grow a stalk, hang leaves along it, fork children, and cap
 * tips with a flower or a terminal leaf. Adapted from nonflowers' `branch`.
 */
function grow(
  ctx: Ctx,
  origin: Point,
  theta: number,
  length: number,
  width: number,
  depth: number,
): void {
  const g = ctx.g;
  const lean = (theta >= 0 ? 1 : -1) * g.stemBend * 0.5 + ctx.rng.gauss() * 0.1;
  const spine = buildSpine(ctx, origin, theta, length, lean);
  stemTube(ctx, spine, width);

  const n = spine.pts.length - 1;
  const leafProfile = bladeProfile(g.leafProfile);
  let side = ctx.rng.chance(0.5) ? 1 : -1;
  // Step by 2 nodes = a minimum internode gap, so leaves never crowd shoulder
  // to shoulder into a smudge; leafChance thins them further. Airy by design.
  for (let i = 3; i < n; i += 2) {
    const t = i / n;
    if (t < 0.32) continue;
    if (!ctx.rng.chance(g.leafChance)) continue;
    const tanAng = angleOf(spine.tan[i]);
    const leafLen = g.leafLength * ctx.rng.range(0.8, 1.15);
    blade(ctx, spine.pts[i], tanAng + side * g.leafAngle, leafLen, g.leafWidth, leafProfile, g.leafVeins, 'leaf');
    side = -side;
  }

  const canFork = depth > 0 && length > 30 && g.branchFork > 0;
  if (canFork) {
    let forks = g.branchFork;
    if (ctx.rng.chance(0.35)) forks -= 1;
    for (let k = 0; k < forks; k++) {
      const at = ctx.rng.range(0.55, 0.92);
      const idx = Math.max(1, Math.round(at * n));
      const s = k % 2 === 0 ? 1 : -1;
      const childTheta = angleOf(spine.tan[idx]) + s * g.branchAngle * ctx.rng.range(0.7, 1.2);
      grow(
        ctx,
        spine.pts[idx],
        childTheta,
        length * g.branchLengthRatio,
        width * 0.62,
        depth - 1,
      );
    }
  }

  // Cap the tip: flower, else a terminal leaf/bud.
  const tip = spine.pts[n];
  const tipAng = spine.endAngle;
  if (g.flowerChance > 0 && ctx.rng.chance(g.flowerChance)) {
    flower(ctx, tip, tipAng);
  } else {
    blade(ctx, tip, tipAng, g.leafLength * 1.05, g.leafWidth, leafProfile, g.leafVeins, 'leaf');
  }
}

/**
 * Generate a plant. Deterministic in (`genome`, `seed`): the same pair always
 * yields the same paths and viewBox.
 */
export function growPlant(genome: Genome, seed: Seed): PlantDrawing {
  const key = String(seed);
  const rng = new Rng(`plant:${key}`);
  const noise = new Noise(new Rng(`noise:${key}`));
  const ctx: Ctx = {
    rng,
    noise,
    g: genome,
    paths: [],
    bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 },
    noiseCursor: 0,
  };

  const n = Math.max(1, genome.stemCount);
  const fan = 0.2;
  for (let s = 0; s < n; s++) {
    const theta0 = (s - (n - 1) / 2) * fan + rng.gauss() * 0.04;
    const length = genome.stemLength * rng.range(0.9, 1.05);
    grow(ctx, [0, 0], theta0, length, genome.stemWidth, genome.branchDepth);
  }

  const pad = 12;
  const b = ctx.bounds;
  const minX = b.minX - pad;
  const minY = b.minY - pad;
  const width = b.maxX - b.minX + pad * 2;
  const height = b.maxY - b.minY + pad * 2;
  return {
    genome,
    seed: key,
    paths: ctx.paths,
    bbox: { ...b },
    width,
    height,
    viewBox: `${f(minX)} ${f(minY)} ${f(width)} ${f(height)}`,
  };
}

/** Grow from a named preset (falls back to the first preset if unknown). */
export function growFromPreset(name: string, seed: Seed): PlantDrawing {
  const g = SPECIES_PRESETS.find((p) => p.name === name) ?? SPECIES_PRESETS[0];
  return growPlant(g, seed);
}

/** Grow a fully-randomized (but deterministic) plant from a single seed. */
export function growWild(seed: Seed): PlantDrawing {
  return growPlant(genParams(seed), seed);
}

// ---------------------------------------------------------------------------
// Sprites — single organs (one leaf, one flower) for surfaces that place their
// own foliage (the growth-phase diagrams). Same generator, same one-colour
// output; the consumer transforms them onto its own scatter points.
// ---------------------------------------------------------------------------

/** A single generated organ: its paths + the local bbox (base at origin, up = -y). */
export type PlantSprite = { readonly paths: readonly PlantPath[]; readonly bbox: BBox };

function spriteCtx(seed: Seed): Ctx {
  return {
    rng: new Rng(`sprite:${seed}`),
    noise: new Noise(new Rng(`sprite-noise:${seed}`)),
    g: SPECIES_PRESETS[0],
    paths: [],
    bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 },
    noiseCursor: 0,
  };
}

export type LeafSpriteOpts = {
  length?: number;
  halfWidth?: number;
  profile?: import('./genes').BladeProfile;
  veins?: number;
};

/** One leaf blade (outline + midrib + veins), base at origin, pointing up. */
export function leafSprite(seed: Seed, opts: LeafSpriteOpts = {}): PlantSprite {
  const ctx = spriteCtx(seed);
  const length = opts.length ?? 3.4;
  const halfWidth = opts.halfWidth ?? 1.15;
  const profile = bladeProfile(opts.profile ?? 'lanceolate');
  const veins = opts.veins ?? 1;
  blade(ctx, [0, 0], 0, length, halfWidth, profile, veins, 'leaf');
  return { paths: ctx.paths, bbox: { ...ctx.bounds } };
}

export type FlowerSpriteOpts = {
  petals?: number;
  length?: number;
  width?: number;
  profile?: import('./genes').BladeProfile;
  open?: number;
};

/** One flower head (radial petals + center), centered at origin. */
export function flowerSprite(seed: Seed, opts: FlowerSpriteOpts = {}): PlantSprite {
  const ctx = spriteCtx(seed);
  ctx.g = {
    ...SPECIES_PRESETS[0],
    flowerPetals: opts.petals ?? 5,
    flowerLength: opts.length ?? 3,
    flowerWidth: opts.width ?? 1.5,
    flowerProfile: opts.profile ?? 'obovate',
    flowerOpen: opts.open ?? 0.9,
  };
  flower(ctx, [0, 0], 0);
  return { paths: ctx.paths, bbox: { ...ctx.bounds } };
}

export { genParams, SPECIES_PRESETS };
export type { Genome };
