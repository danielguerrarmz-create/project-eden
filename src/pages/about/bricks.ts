/**
 * bricks.ts — a stacked-brick (masonry) packer that FILLS a fixed W x H frame edge to edge.
 *
 * Daniel's ruling: the project images per project read best as STACKED BRICKS (Pinterest / CSS
 * multi-column columns), and Daniel + the team want them to FIT THE RECTANGLE with no dead space —
 * top-aligned, filling top to bottom and side to side, only the thin vellum gutters showing between
 * bricks as mortar.
 *
 * HOW IT FILLS. Images flow into K balanced columns by classic shortest-column-first masonry (each
 * next image drops into the currently shortest column, so the columns come out as even as possible).
 * The K equal-width columns fill the frame WIDTH exactly. Each column is then justified to the frame
 * HEIGHT: its bricks' heights are scaled by one per-column factor so the column fills top to bottom
 * exactly, top-aligned. So every column runs corner to corner and there is no dead band anywhere.
 *
 * The per-column scale nudges each brick a little off its image's true ratio; because the columns are
 * balanced, that nudge is small and uniform, and object-fit absorbs it: a cover shot crops a hair, a
 * contain figure keeps its ratio and shows a thin vellum sliver (the same mortar colour) rather than
 * a squash. The column COUNT is the one whose balanced columns need the LEAST scaling to reach the
 * frame height, i.e. the least distortion — so image-rich projects fill with almost no nudge, and a
 * project of a few very wide plates takes the smallest nudge geometry allows.
 *
 * Pure and framework-free so it unit-tests directly (bricks.test.ts).
 */

export interface BImage {
  /** Intrinsic aspect ratio, width / height. Must be finite and > 0. */
  ratio: number;
}

/** A placed brick in the frame's pixel space. x/y is the top-left, w/h the size. */
export interface Brick {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface BrickOptions {
  /** Even gutter between bricks, px — the vellum mortar. Default 4. */
  gap?: number;
  /** Largest number of columns to consider. Default 4 (the frame is only ~478px wide). */
  maxColumns?: number;
}

/**
 * Pack `images` into stacked-brick columns that FILL the `frameW` x `frameH` box edge to edge.
 *
 * Returns one Brick per image, in input order. Guarantees (see bricks.test.ts):
 *   - every brick has w > 0 and h > 0 and lies inside the frame (nothing clipped);
 *   - the columns fill the full frame width and each column fills the full frame height, top-aligned —
 *     no dead band at the top, bottom, or sides, only the hairline `gap` gutters;
 *   - the bricks read as columns (a vertical stack per column, columns left to right).
 */
export function packBricks(
  images: BImage[],
  frameW: number,
  frameH: number,
  opts: BrickOptions = {},
): Brick[] {
  const n = images.length;
  if (n === 0 || frameW <= 0 || frameH <= 0) return [];

  const gap = opts.gap ?? 4;
  const maxColumns = Math.min(opts.maxColumns ?? 4, n);
  const ratios = images.map((im) => (im.ratio > 0 && Number.isFinite(im.ratio) ? im.ratio : 1));

  // A lone hero fills the whole plate.
  if (n === 1) return [{ x: 0, y: 0, w: frameW, h: frameH }];

  // Pick the column count whose balanced columns fill the frame height with the least scaling — the
  // least distortion. Fewer columns run taller (may need squashing), more columns run shorter (may
  // need stretching); the winner is the count that already sits closest to the frame height.
  let best: Layout | null = null;
  for (let k = 1; k <= maxColumns; k++) {
    const layout = layoutColumns(ratios, k, frameW, frameH, gap);
    if (!layout) continue;
    if (!best || layout.distortion < best.distortion - 1e-9) best = layout;
  }
  // Fallback: a single column always lays out.
  return (best ?? layoutColumns(ratios, 1, frameW, frameH, gap)!).bricks;
}

interface Layout {
  bricks: Brick[];
  /** Worst per-column fill scale, as |log(scale)| — 0 is a perfect natural fit, higher is more nudge. */
  distortion: number;
}

/**
 * Lay `ratios` into exactly `k` balanced columns and justify each column to fill the frame height,
 * top-aligned. Returns null if k columns cannot be filled (more columns than images).
 */
function layoutColumns(
  ratios: number[],
  k: number,
  frameW: number,
  frameH: number,
  gap: number,
): Layout | null {
  const colW = (frameW - (k - 1) * gap) / k;
  if (colW <= 0) return null;

  // Classic masonry balance: each image drops into the currently shortest column (by natural height),
  // which keeps the columns as even as possible so their fill scales stay close and small.
  const cols: number[][] = Array.from({ length: k }, () => []);
  const natH = new Array(k).fill(0); // running natural content height (bricks + gaps) of each column
  for (let i = 0; i < ratios.length; i++) {
    let j = 0;
    for (let c = 1; c < k; c++) if (natH[c] < natH[j] - 1e-9) j = c;
    const brickH = colW / ratios[i];
    natH[j] += (cols[j].length > 0 ? gap : 0) + brickH;
    cols[j].push(i);
  }
  if (cols.some((c) => c.length === 0)) return null; // k > usable columns

  const bricks: Brick[] = new Array(ratios.length);
  let worst = 0;
  cols.forEach((col, c) => {
    const x = c * (colW + gap);
    // Scale the bricks (not the gaps) so the column's stacked height exactly fills the frame.
    const naturalBricks = col.reduce((sum, i) => sum + colW / ratios[i], 0);
    const target = frameH - (col.length - 1) * gap;
    const s = target > 0 && naturalBricks > 0 ? target / naturalBricks : 1;
    worst = Math.max(worst, Math.abs(Math.log(s)));

    let y = 0;
    col.forEach((i, r) => {
      if (r > 0) y += gap;
      const h = (colW / ratios[i]) * s;
      bricks[i] = { x, y, w: colW, h };
      y += h;
    });
    // Snap the last brick's bottom to the frame edge so the column fills to the pixel.
    const last = col[col.length - 1];
    bricks[last].h = frameH - bricks[last].y;
  });

  return { bricks, distortion: worst };
}

/** The rendered aspect ratio of a placed brick. */
export function brickAspect(brick: Brick): number {
  return brick.w / brick.h;
}
