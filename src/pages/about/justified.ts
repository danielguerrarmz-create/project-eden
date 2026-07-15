/**
 * justified.ts — an aspect-ratio-aware packer that fills a fixed W x H frame exactly.
 *
 * The plate frame on the About page must always fill an exact box with NO inner scroll, at every
 * image count (n = 1..8), while honouring each image's real aspect ratio. The old approach sized
 * cells by fixed fr-percentages that ignored the images, so a landscape node-canvas floated in a tall
 * white void (n=5) and a mix of portrait and landscape shots shattered into mismatched strips (n=8).
 * This replaces those magic numbers with a real algorithm.
 *
 * THE FRAME IS NOT A FIXED SHAPE. On a wide display the plate sits BESIDE the text and is portrait
 * (~478 x 724); when it stacks above the text on a medium display it is landscape (~756 x 408). A
 * row-only justified layout (Flickr style) fills a tall frame beautifully but cannot fill a wide one
 * without huge distortion, and cannot keep the hero dominant on a wide frame. So the packer is
 * ADAPTIVE:
 *
 *   1. THE HERO (index 0) gets its own region, split off the frame's SHORT axis: a full-width band
 *      across the top of a portrait frame, or a full-height column down the left of a landscape one.
 *      Its extent is the hero's own honest aspect (portrait: height = W / ratio; landscape:
 *      width = H * ratio), lightly clamped so it can never collapse or swallow the whole frame. That
 *      makes the hero honest AND the single largest cell, at any frame shape.
 *
 *   2. THE REST fill the leftover rectangle as a JUSTIFIED ROW layout: images keep reading order and
 *      are cut into rows; within a row every image shares a common height so its widths sum to the
 *      region width (fills width, keeps each cell at its ratio); the row count is chosen so the
 *      natural row heights are closest to the region height, then one uniform vertical scale makes
 *      them sum to it EXACTLY. Because the scale is a single factor, every cell in the rest is off its
 *      source ratio by the same small amount, which the row-count search keeps near 1.
 *
 * The cell aspect never matches the image perfectly, but the IMAGE inside is object-fit (cover crops,
 * contain letterboxes) — so a small cell-vs-image mismatch is a small crop or a hairline letterbox,
 * never a geometric squash. Minimising the mismatch is exactly what removes the voids and the jumble.
 *
 * This module is pure and framework-free so it can be unit-tested directly (justified.test.ts).
 */

export interface JImage {
  /** Intrinsic aspect ratio, width / height. Must be finite and > 0. */
  ratio: number;
}

/** A placed cell in the frame's pixel space. x/y is the top-left, w/h the size. */
export interface Cell {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PackOptions {
  /** Hairline gap between cells, px. Default 1 (matches the plate's hairline grid). */
  gap?: number;
  /** Smallest fraction of the split axis the hero may take. Default 0.34. */
  heroMin?: number;
  /** Largest fraction of the split axis the hero may take. Default 0.7. On a wide (stacked) frame the
   *  landscape hero needs this headroom to grow toward its honest height instead of being squashed
   *  into a letterbox band; on a portrait frame the hero never reaches it, so this is free there. */
  heroMax?: number;
}

/**
 * Pack `images` into a layout that fills the `frameW` x `frameH` box exactly.
 *
 * Returns one Cell per image, in input order. Guarantees (see justified.test.ts):
 *   - every cell has w > 0 and h > 0;
 *   - the cells tile the frame: their union is the whole box, with no overlap and no gap beyond the
 *     hairline `gap`;
 *   - for n >= 2 the hero (index 0) is the largest cell.
 */
export function packJustified(
  images: JImage[],
  frameW: number,
  frameH: number,
  opts: PackOptions = {},
): Cell[] {
  const n = images.length;
  if (n === 0 || frameW <= 0 || frameH <= 0) return [];

  const gap = opts.gap ?? 1;
  const heroMin = opts.heroMin ?? 0.34;
  const heroMax = opts.heroMax ?? 0.7;
  const ratios = images.map((im) => (im.ratio > 0 && Number.isFinite(im.ratio) ? im.ratio : 1));

  if (n === 1) return [{ x: 0, y: 0, w: frameW, h: frameH }];

  const a0 = ratios[0];
  const restRatios = ratios.slice(1);

  // For a 2-image plate there is no "rest gallery"; split the frame between the two, proportional to
  // their ratios, but never letting the hero fall below half so it always leads. Split off whichever
  // axis is longer so both cells stay closest to their real shape.
  if (n === 2) {
    const share = clamp(a0 / (a0 + restRatios[0]), 0.5, heroMax);
    if (frameW >= frameH) {
      const heroW = (frameW - gap) * share;
      return [
        { x: 0, y: 0, w: heroW, h: frameH },
        { x: heroW + gap, y: 0, w: frameW - heroW - gap, h: frameH },
      ];
    }
    const heroH = (frameH - gap) * share;
    return [
      { x: 0, y: 0, w: frameW, h: heroH },
      { x: 0, y: heroH + gap, w: frameW, h: frameH - heroH - gap },
    ];
  }

  // Build BOTH hero placements — a full-width band across the top, and a full-height column down the
  // left — size each hero to its own honest aspect (clamped so it can neither collapse nor swallow
  // the frame), fill the leftover with the best rows-or-columns gallery, and keep whichever layout
  // distorts the images least. That is what lets one packer serve a portrait frame (hero on top) and
  // a landscape one (hero on the left) without a hand-coded rule per breakpoint.
  const top = heroBand(ratios, restRatios, frameW, frameH, gap, heroMin, heroMax, 'top');
  const left = heroBand(ratios, restRatios, frameW, frameH, gap, heroMin, heroMax, 'left');
  return maxDistortion(top, ratios) <= maxDistortion(left, ratios) ? top : left;
}

/** One hero-plus-gallery layout: hero on the given side at its honest (clamped) extent, rest filling
 *  the leftover rectangle as the best rows-or-columns gallery. */
function heroBand(
  ratios: number[],
  restRatios: number[],
  frameW: number,
  frameH: number,
  gap: number,
  heroMin: number,
  heroMax: number,
  side: 'top' | 'left',
): Cell[] {
  const a0 = ratios[0];
  if (side === 'top') {
    const heroH = clamp(frameW / a0, frameH * heroMin, frameH * heroMax);
    const restY = heroH + gap;
    const rest = packRegion(restRatios, frameW, frameH - restY, gap).map((c) => ({ ...c, y: c.y + restY }));
    return [{ x: 0, y: 0, w: frameW, h: heroH }, ...rest];
  }
  const heroW = clamp(frameH * a0, frameW * heroMin, frameW * heroMax);
  const restX = heroW + gap;
  const rest = packRegion(restRatios, frameW - restX, frameH, gap).map((c) => ({ ...c, x: c.x + restX }));
  return [{ x: 0, y: 0, w: heroW, h: frameH }, ...rest];
}

/**
 * How far one cell's shape is from its image's, as a symmetric factor minus one: a cell twice as
 * wide OR twice as tall as its image both score 1.0. This is the honest measure of the crop (for a
 * cover image) or the letterbox (for a contain image) the mismatch produces.
 */
function aspectError(cellAspectValue: number, imageRatio: number): number {
  const x = cellAspectValue / imageRatio;
  return Math.max(x, 1 / x) - 1;
}

/** The worst single-cell aspect error across a whole layout. */
function maxDistortion(cells: Cell[], ratios: number[]): number {
  let max = 0;
  cells.forEach((c, i) => {
    const e = aspectError(c.w / c.h, ratios[i]);
    if (e > max) max = e;
  });
  return max;
}

/**
 * Fill a rectangle with the rest images, choosing the ORIENTATION that distorts least: horizontal
 * rows (images side by side, rows stacked) or vertical columns (images stacked, columns side by
 * side). A tall narrow region with wide images fills far better as columns than as rows, and vice
 * versa, so trying both is what keeps the leftover gallery honest at any region shape.
 */
export function packRegion(ratios: number[], regionW: number, regionH: number, gap: number): Cell[] {
  if (ratios.length <= 1) return packRows(ratios, regionW, regionH, gap);
  const rows = packRows(ratios, regionW, regionH, gap);
  // Columns are the transposed row problem: invert every ratio, swap the region's W and H, pack
  // rows, then transpose each cell back (x<->y, w<->h).
  const cols = packRows(
    ratios.map((r) => 1 / r),
    regionH,
    regionW,
    gap,
  ).map((c) => ({ x: c.y, y: c.x, w: c.h, h: c.w }));
  return maxDistortion(rows, ratios) <= maxDistortion(cols, ratios) ? rows : cols;
}

/* --------------------------- the justified row packer --------------------------- */

/**
 * Fill a `regionW` x `regionH` rectangle with `ratios` as justified rows. Returns cells in input
 * order, tiling the rectangle exactly. The row partition is the one whose natural (width-filling)
 * heights sum closest to the region height, so the single uniform fill-scale stays nearest to 1.
 */
export function packRows(ratios: number[], regionW: number, regionH: number, gap: number): Cell[] {
  const n = ratios.length;
  if (n === 0 || regionW <= 0 || regionH <= 0) return [];
  if (n === 1) return [{ x: 0, y: 0, w: regionW, h: regionH }];

  let best: { rows: number[][]; natural: number[]; s: number; distortion: number } | null = null;
  for (const rows of contiguousPartitions(n)) {
    const natural: number[] = [];
    let ok = true;
    for (const row of rows) {
      const sumRatio = row.reduce((acc, i) => acc + ratios[i], 0);
      const innerW = regionW - (row.length - 1) * gap;
      if (innerW <= 0 || sumRatio <= 0) {
        ok = false;
        break;
      }
      natural.push(innerW / sumRatio);
    }
    if (!ok) continue;

    const contentTarget = regionH - (rows.length - 1) * gap;
    const naturalSum = natural.reduce((a, b) => a + b, 0);
    if (contentTarget <= 0 || naturalSum <= 0) continue;

    const s = contentTarget / naturalSum;
    const distortion = Math.abs(Math.log(s));
    if (
      !best ||
      distortion < best.distortion - 1e-9 ||
      (Math.abs(distortion - best.distortion) <= 1e-9 && rows.length < best.rows.length)
    ) {
      best = { rows, natural, s, distortion };
    }
  }
  if (!best) return stackedFallback(ratios, regionW, regionH, gap);

  const cells: Cell[] = new Array(n);
  let y = 0;
  best.rows.forEach((row, r) => {
    const h = best!.s * best!.natural[r];
    let x = 0;
    row.forEach((i, k) => {
      const w = ratios[i] * best!.natural[r];
      cells[i] = { x, y, w, h };
      x += w + gap;
      if (k === row.length - 1) cells[i].w = regionW - cells[i].x; // snap the row's right edge
    });
    y += h + gap;
    if (r === best!.rows.length - 1) for (const i of row) cells[i].h = regionH - cells[i].y; // snap bottom
  });
  return cells;
}

/** Every contiguous partition of n items into rows, in reading order. n-1 break slots -> 2^(n-1). */
function contiguousPartitions(n: number): number[][][] {
  const out: number[][][] = [];
  const breaks = n - 1;
  for (let mask = 0; mask < 1 << breaks; mask++) {
    const rows: number[][] = [];
    let row: number[] = [0];
    for (let i = 1; i < n; i++) {
      if (mask & (1 << (i - 1))) {
        rows.push(row);
        row = [];
      }
      row.push(i);
    }
    rows.push(row);
    out.push(rows);
  }
  return out;
}

/** Last-resort single stacked column for a region too narrow for its gaps. Rare; keeps output valid. */
function stackedFallback(ratios: number[], regionW: number, regionH: number, gap: number): Cell[] {
  const n = ratios.length;
  const h = (regionH - (n - 1) * gap) / n;
  return ratios.map((_, i) => ({ x: 0, y: i * (h + gap), w: regionW, h: Math.max(h, 1) }));
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/** The rendered aspect ratio of a placed cell — what the eye compares to the source ratio. */
export function cellAspect(cell: Cell): number {
  return cell.w / cell.h;
}
