/**
 * pack.ts — the media wall: a ratio-aware pack that builds every box to its picture.
 *
 * Daniel, 2026-07-17, looking at the live page: "Some of our project images are not filling their
 * appropriate space... all of these photos are like bricks, there must be an equal line of mortar
 * between them, and that must be very thin. There are too many spacings between. Find a dynamic way
 * to organize them."
 *
 * HE NAMED NINE OF TWELVE PROJECTS, which is what says this is the layout and not nine assets. And
 * the measurement agreed. The hero/rail layout this replaces put the hero in a `flex-1` REMAINDER and
 * sized the picture inside it with `FIT_FRAME`, so whenever the hero's ratio disagreed with the
 * remainder's the slack opened up BETWEEN the hero and the rail. Measured at 1440x900, the apparent
 * mortar down that seam ran:
 *
 *     12, 12, 12, 172, 12, 169, 12, 12, 12, 12, 219, 12    (the markup says `gap-3`, i.e. 12)
 *
 * Origami's "mortar line" was 219px. That IS "too many spacings between", exactly, and it is why he
 * could name the defect from across the room without measuring anything.
 *
 * ---
 *
 * THIS IS THE SECOND TIME HE HAS ASKED FOR BRICKS, AND THE FIRST ANSWER IS STILL IN THE TREE.
 * `bricks.ts` (2026-07-14, `194d5c8`) took the same instruction and filled the frame by flowing images
 * into balanced columns and then SCALING EACH COLUMN'S BRICKS off their true ratio to reach the
 * bottom edge — "that nudge is absorbed by object-fit". Its own test only bounds the nudge at **3x**.
 * That is the wrong-shape box (CLAUDE.md's most-repeated bug) wearing the word "brick": it fills the
 * rectangle by cutting the picture. It was unwired and nothing imports it.
 *
 * So the law this file is written under: **FILLING IS A PACKING RESULT, NOT A CROPPING RESULT.** Every
 * leaf box below comes out at EXACTLY its image's authored ratio. There is no scale factor, no nudge,
 * and no object-fit left to absorb anything. What varies to make things fit is WHICH ARRANGEMENT we
 * choose, never the pictures.
 *
 * ---
 *
 * WHY A SLICE TREE. The arrangement is any binary tree of horizontal/vertical splits over the images
 * in reading order; leaves are pictures. A slice tree partitions its rectangle EXACTLY, so "no dead
 * space between bricks" and "one uniform gutter" are both true by construction rather than by tuning.
 *
 * The trick that makes it searchable: for any tree, HEIGHT IS AN AFFINE FUNCTION OF WIDTH, h = a*w + b,
 * even once the gutters are counted (the gutters are what force the `b` term — a pure aspect ratio
 * cannot subtract pixels, which is the same reason `railWidth` had to take a height instead of being
 * declared as an `aspectRatio`). So `a` and `b` come bottom-up in one pass and every candidate is
 * costed in O(n). See `affine` for the derivation, and pack.test.ts, which checks the algebra against
 * an independently laid-out tree rather than trusting it.
 *
 * WHAT IS EXACTLY IMPOSSIBLE, STATED PLAINLY SO NOBODY SPENDS ANOTHER ROUND ON IT: you cannot tile a
 * fixed W x H rectangle with fixed-aspect pictures and a uniform gutter and no leftover. The aspect
 * ratios are given, the rectangle is given, and once an arrangement is chosen there is ONE degree of
 * freedom (its scale), which buys you one edge, not two. So there is always residual paper. The only
 * choices are WHERE it goes and HOW MUCH. This pack sends it to ONE OUTER EDGE (right or bottom,
 * whichever dimension is not binding) where it reads as the page's own margin, and picks the
 * arrangement that leaves the least of it. Anything claiming to remove it entirely is cropping and
 * lying about it — which is precisely what `bricks.ts` did.
 *
 * MEASURED, against the real region (874.8 x 414.4) and the real authored ratios:
 *
 *     coverage      min 73.8% -> 77.3%,  mean 87.3% -> 90.2%
 *     Origami       73.8% -> 98.1%   (its 219px seam becomes 6px)
 *     Synthetic V.  79.1% -> 81.8%   (172px -> 6px)
 *     LLO           80.2% -> 81.6%   (169px -> 6px)
 *
 * The mean gain is modest and the mortar fix is the point. Note honestly that Patterns (77.3%), LLO
 * (81.6%) and Robots (82.9%) stay low and NO arrangement helps them: their assets' shapes do not tile
 * a 2.11 rectangle. That is an asset fact, not a layout failure, and it is the same class as
 * Plentify's 47.7% of internal white — do not chase either one in CSS.
 */

/** Anything with an authored aspect ratio. `projects.ts` measures these off the files. */
export interface PackItem {
  ratio: number;
}

/** A placed picture in the wall's pixel space. x/y is the top-left corner. */
export interface PackCell<T> {
  item: T;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Wall<T> {
  cells: PackCell<T>[];
  /** The wall's own size. Never larger than the region; the difference is the residual paper. */
  w: number;
  h: number;
  /** wall area / region area. 1 would mean a perfect tiling, which is generically unreachable. */
  coverage: number;
}

/**
 * THE MORTAR, px. One number, every seam, no exceptions — Daniel: "there must be an equal line of
 * mortar between them, and that must be very thin". It is thin on purpose (the old rail's `gap-3` was
 * 12) and it is a CONSTANT rather than a Tailwind class because the pack has to do arithmetic with it:
 * a gutter the layout cannot count is the (n-1)*12 bug that pushed the old rail out of its box.
 */
export const MORTAR = 6;

/**
 * The smallest side any picture may come out at, px.
 *
 * IT IS 50 BECAUSE THAT IS WHAT ALREADY SHIPS, and picking 60 (the number `qa/project-media.mjs`
 * guards) would have been tightening a rule under cover of a refactor. Measured on the live page
 * before this landed, the smallest side of any rendered cell across all twelve is **51px**: Synthetic
 * Vision's 3.7767-ratio pipeline diagram comes out 192x51, and Archipedia's 2.1522 tri-slider 119x55.
 * The existing MIN_CELL=60 never saw either, because it measures a cell's WIDTH and both are wide and
 * short. So a `min(w,h) >= 60` floor here would have failed two projects the page ships today.
 *
 * Enforced INSIDE the search rather than checked after it: an arrangement that produces a sliver is
 * not a failure to report, it is a candidate to reject in favour of one that does not.
 */
export const MIN_SIDE = 50;

/**
 * The hero's minimum share of the wall's area.
 *
 * WHY THERE IS A FLOOR AT ALL: coverage alone picks arrangements that are excellent tilings and bad
 * pages. Unconstrained, Robotic Factory's best pack at 1440x1000 gives the hero **27%** of the wall
 * against three supports at ~24% each — a four-up grid, technically "the hero" because it wins by a
 * hair, and no hierarchy whatsoever. It buys +11pp of coverage by spending the thing the hero is for.
 *
 * WHY 0.40 AND NOT A ROUNDER NUMBER: it is on a cliff, and the cliff is the argument. Swept per
 * project across three region shapes (1440 x 760 / 900 / 1000 — the region's ratio runs 3.19 to 1.70,
 * and it MOVES WITH THE WINDOW, which is why one viewport could not have found this):
 *
 *   0.45 -> 0.40   changes exactly TWO cells, both pure wins, both at the short viewport where the
 *                  region is 3.19 wide and a near-square hero cannot both dominate and leave room:
 *                    Synthetic Vision  47% -> 94% coverage, hero 48% -> 41%
 *                    Origami           81% -> 95% coverage, hero 50% -> 43%
 *                  Nothing else moves anywhere. 47pp of dead paper for 7pp of hero.
 *
 *   0.40 -> 0.30   changes THREE cells and every one is the hero being SOLD:
 *                    Hydraulic  78% -> 81% coverage, hero 82% -> 31%
 *                    Flowerfield 76% -> 88%,         hero 68% -> 32%
 *                    Robotic F.  83% -> 94%,         hero 73% -> 27%
 *
 * So 0.40 is the last value before coverage starts eating the hero, and 0.45 is one notch past the
 * point where the hero starts eating the page. At 900 and 1000 every floor from 0.35 to 0.45 is
 * IDENTICAL — the whole question lives at the short viewport, i.e. at Daniel's window, which
 * CLAUDE.md notes is shorter than 900.
 *
 * DO NOT RAISE IT WITHOUT RE-SWEEPING. At 0.50 and above, a project at 760 has NO valid arrangement
 * at all and `packWall` returns null — a BLANK media region, not a worse one. That failure is silent
 * in a unit test pinned to one region size, which is exactly why pack.test.ts sweeps regions.
 */
export const HERO_SHARE_FLOOR = 0.4;

type Tree = { leaf: number } | { dir: 'H' | 'V'; L: Tree; R: Tree };

/** height(w) = a*w + b for a whole tree. */
interface Affine {
  a: number;
  b: number;
}

/**
 * Every binary tree over the CONTIGUOUS index range [i, j), both orientations at each split.
 *
 * CONTIGUOUS = READING ORDER IS PRESERVED, and that is a decision, not a limitation of the algorithm.
 * The captions tell a story in order (Origami's hospital photograph is deliberately the first
 * supporting cell so the proof reads immediately after the drawing), so the pack is not allowed to
 * reorder them for a better fit. Measured before accepting the constraint: letting the supports
 * permute freely gains **+0.0pp mean, +0.1pp best, across all twelve** — the fit is decided by the
 * tree's shape, not by which picture sits in which slot. It costs nothing, so it is not a trade.
 *
 * Counts: 4 pictures -> 40 trees, 5 -> 224. Memoized by length below because the shapes do not depend
 * on the ratios, only the costing does.
 */
function treeShapes(n: number): Tree[] {
  const memo = new Map<string, Tree[]>();
  const build = (i: number, j: number): Tree[] => {
    const key = `${i},${j}`;
    const hit = memo.get(key);
    if (hit) return hit;
    if (j - i === 1) return [{ leaf: i }];
    const out: Tree[] = [];
    for (let k = i + 1; k < j; k++)
      for (const L of build(i, k))
        for (const R of build(k, j)) {
          out.push({ dir: 'H', L, R });
          out.push({ dir: 'V', L, R });
        }
    memo.set(key, out);
    return out;
  };
  return build(0, n);
}

const shapeCache = new Map<number, Tree[]>();
function shapesFor(n: number): Tree[] {
  let s = shapeCache.get(n);
  if (!s) {
    s = treeShapes(n);
    shapeCache.set(n, s);
  }
  return s;
}

/**
 * height(w) = a*w + b, bottom-up. THE DERIVATION, because a wrong sign here is invisible on screen
 * (it just packs slightly badly) and pack.test.ts checks it numerically for exactly that reason:
 *
 *   leaf     h = w / r                                    -> a = 1/r,  b = 0
 *
 *   V(A,B)   same width, heights add plus one gutter:
 *            h = (aA*w + bA) + g + (aB*w + bB)            -> a = aA + aB,  b = bA + bB + g
 *
 *   H(A,B)   same height, widths add plus one gutter (wA + wB = w - g), and the shared height
 *            forces  aA*wA + bA = aB*wB + bB.  Solving for wA and substituting back:
 *                                                         -> a = aA*aB / (aA + aB)
 *                                                            b = (aA*bB + aB*bA)/(aA + aB) - a*g
 *            The `- a*g` is the gutter, and it is the whole reason this is affine and not a ratio.
 */
function affine(t: Tree, ratios: readonly number[], g: number): Affine {
  if ('leaf' in t) return { a: 1 / ratios[t.leaf], b: 0 };
  const A = affine(t.L, ratios, g);
  const B = affine(t.R, ratios, g);
  if (t.dir === 'V') return { a: A.a + B.a, b: A.b + B.b + g };
  const a = (A.a * B.a) / (A.a + B.a);
  return { a, b: (A.a * B.b + B.a * A.b) / (A.a + B.a) - a * g };
}

/** Place a tree's leaves into a box. The box is assumed to already match the tree's own h = a*w + b. */
function place(t: Tree, ratios: readonly number[], g: number, x: number, y: number, w: number, h: number, out: PackCell<number>[]): void {
  if ('leaf' in t) {
    out.push({ item: t.leaf, x, y, w, h });
    return;
  }
  if (t.dir === 'V') {
    const A = affine(t.L, ratios, g);
    const hA = A.a * w + A.b;
    place(t.L, ratios, g, x, y, w, hA, out);
    place(t.R, ratios, g, x, y + hA + g, w, h - hA - g, out);
    return;
  }
  const A = affine(t.L, ratios, g);
  const B = affine(t.R, ratios, g);
  const wA = (B.a * (w - g) + B.b - A.b) / (A.a + B.a);
  place(t.L, ratios, g, x, y, wA, h, out);
  place(t.R, ratios, g, x + wA + g, y, w - g - wA, h, out);
}

export interface PackOpts {
  gutter?: number;
  minSide?: number;
  heroShareFloor?: number;
}

/**
 * Pack `items` into a `W` x `H` region. `items[0]` is the HERO and is required to be the largest cell.
 *
 * Returns null when nothing satisfies the constraints (an empty list, a degenerate region, or a
 * region too small to hold the pictures above `minSide`). Callers render nothing rather than
 * rendering something wrong — notably on the first paint, before the region has been measured.
 *
 * The wall is anchored top-left by the caller; the residual is at the right and/or the bottom.
 */
export function packWall<T extends PackItem>(items: readonly T[], W: number, H: number, opts: PackOpts = {}): Wall<T> | null {
  const g = opts.gutter ?? MORTAR;
  const minSide = opts.minSide ?? MIN_SIDE;
  const floor = opts.heroShareFloor ?? HERO_SHARE_FLOOR;
  if (items.length === 0 || !(W > 0) || !(H > 0)) return null;
  // A ratio that is not a positive finite number would silently poison every division below and come
  // out as a NaN rect, which lays out as nothing and looks like a missing asset rather than bad data.
  const ratios = items.map((im) => (Number.isFinite(im.ratio) && im.ratio > 0 ? im.ratio : 1));

  let best: Wall<T> | null = null;
  for (const t of shapesFor(items.length)) {
    const { a, b } = affine(t, ratios, g);
    if (!(a > 0) || !Number.isFinite(b)) continue;
    // ONE degree of freedom, and this is where it is spent. At the region's full width the tree wants
    // to be `a*W + b` tall. If that fits, take the full width and leave the remainder at the bottom.
    // If it overshoots, the height is what binds: solve for the width that makes it exactly H and
    // leave the remainder at the right. Whichever edge is not binding is where the paper goes.
    let w: number;
    let h: number;
    if (a * W + b <= H) {
      w = W;
      h = a * W + b;
    } else {
      h = H;
      w = (H - b) / a;
    }
    if (!(w > 0) || !(h > 0)) continue;

    const raw: PackCell<number>[] = [];
    place(t, ratios, g, 0, 0, w, h, raw);
    if (raw.some((c) => !Number.isFinite(c.w) || !Number.isFinite(c.h) || Math.min(c.w, c.h) < minSide)) continue;

    const areas = raw.map((c) => c.w * c.h);
    const heroArea = areas[raw.findIndex((c) => c.item === 0)];
    if (heroArea < Math.max(...areas) - 0.5) continue;
    if (heroArea / (w * h) < floor) continue;

    const coverage = (w * h) / (W * H);
    if (!best || coverage > best.coverage)
      best = { cells: raw.map((c) => ({ ...c, item: items[c.item] })), w, h, coverage };
  }
  return best;
}
