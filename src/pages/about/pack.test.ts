import { describe, it, expect } from 'vitest';
import { packWall, MORTAR, MIN_SIDE, HERO_SHARE_FLOOR, type PackCell } from './pack';
import { PROJECTS } from './projects';

/**
 * The media wall's laws. Written to be FALSIFIABLE — every one of these was sabotage-checked (break
 * the code, watch it go red) before it was believed, because this page's history is green checks that
 * asserted nothing: a bio guard keyed on a field that did not exist, a crowding test that filtered
 * away exactly the evidence it was hunting, and a hero-crop probe that answered a different question
 * correctly for rounds.
 *
 * `bricks.test.ts` is the cautionary precedent sitting right next door: it bounds its packer's
 * distortion at **3x** and calls that a pass. A test that permits the defect cannot catch it.
 */

/** The REAL region, measured off the live page at 1440x900. */
const REGION = { w: 874.8, h: 414.4 };

/** items[0] is the hero — the same split the page uses. */
function order(images: (typeof PROJECTS)[number]['images']) {
  const i = images.findIndex((im) => im.hero === true);
  const hero = images[i >= 0 ? i : 0];
  return [hero, ...images.filter((im) => im !== hero)];
}

const overlaps = (a: PackCell<unknown>, b: PackCell<unknown>) =>
  a.x < b.x + b.w - 1e-6 && b.x < a.x + a.w - 1e-6 && a.y < b.y + b.h - 1e-6 && b.y < a.y + a.h - 1e-6;

/**
 * THE MORTAR TEST, and it is deliberately model-free: it does not know what a slice tree is, it looks
 * at the finished wall the way Daniel looks at the screen.
 *
 * Rasterize the wall. Every sample point is on a picture or on paper. Take the DISTANCE TRANSFORM of
 * the paper — for each paper pixel, how far to the nearest picture — and report twice the maximum.
 * That is the width of the widest thing that fits in the gaps, i.e. the widest hole in the wall.
 * A 6px mortar line scores 6 no matter how long it runs, and a 219px hole scores 219. That is
 * Daniel's sentence — "there must be an equal line of mortar between them, and that must be very
 * thin. There are too many spacings between" — as an assertion rather than a proxy for one.
 *
 * IT TOOK TWO WRONG INSTRUMENTS TO GET HERE AND BOTH ARE WORTH RECORDING, because they are this
 * page's standing trap in fresh costumes — each one measured something real and I quoted it for a
 * question it was not answering:
 *
 *   1. THE LONGEST EMPTY RUN. Failed all twelve at once with a "414px hole" that was the vertical
 *      mortar seam measured ALONG ITS OWN LENGTH. A mortar line is thin in one direction only.
 *   2. min(horizontal run, vertical run). Correct for a lone seam, and it failed Flowerfield on a
 *      "158px hole" that was a mortar CROSSING: where the hero/rail seam meets an inter-cell seam,
 *      the horizontal run merges the two mortar lines into one 158px run while the vertical run is
 *      the full 375. Both readings were true. Neither was the thickness of anything.
 *
 * Only the distance transform asks the question I actually mean, which is LOCAL THICKNESS. Both wrong
 * versions failed loudly, which is the only reason they cost minutes instead of a round — and note
 * that both were failing while the geometry underneath was already exact, so a greener instrument
 * would have been the more expensive mistake.
 *
 * L-infinity (Chebyshev) distance, by the standard two-pass chamfer: it makes a 6px line score
 * exactly 6, where a Euclidean transform would score a mortar CROSSING at 6*sqrt(2) and need a
 * fudge factor to accept it. Outside the wall counts as covered, so the wall's own edges bound the
 * paper rather than reading as an infinite hole. The residual paper lives OUTSIDE this box by
 * construction — that is what `wall.w` / `wall.h` mean — so anything found in here is a real hole.
 */
function widestHole(cells: PackCell<unknown>[], w: number, h: number): number {
  const nx = Math.floor(w);
  const ny = Math.floor(h);
  if (nx <= 0 || ny <= 0) return 0;
  const BIG = nx + ny;
  const d = new Int32Array(nx * ny);
  for (let iy = 0; iy < ny; iy++)
    for (let ix = 0; ix < nx; ix++) {
      const px = ix + 0.5;
      const py = iy + 0.5;
      const onPicture = cells.some((c) => px >= c.x && px <= c.x + c.w && py >= c.y && py <= c.y + c.h);
      d[iy * nx + ix] = onPicture ? 0 : BIG;
    }
  const at = (ix: number, iy: number) => (ix < 0 || iy < 0 || ix >= nx || iy >= ny ? 0 : d[iy * nx + ix]);
  for (let iy = 0; iy < ny; iy++)
    for (let ix = 0; ix < nx; ix++) {
      const i = iy * nx + ix;
      if (d[i] === 0) continue;
      d[i] = Math.min(d[i], at(ix - 1, iy) + 1, at(ix, iy - 1) + 1, at(ix - 1, iy - 1) + 1, at(ix + 1, iy - 1) + 1);
    }
  for (let iy = ny - 1; iy >= 0; iy--)
    for (let ix = nx - 1; ix >= 0; ix--) {
      const i = iy * nx + ix;
      if (d[i] === 0) continue;
      d[i] = Math.min(d[i], at(ix + 1, iy) + 1, at(ix, iy + 1) + 1, at(ix + 1, iy + 1) + 1, at(ix - 1, iy + 1) + 1);
    }
  let worst = 0;
  for (let i = 0; i < nx * ny; i++) if (d[i] > worst) worst = d[i];
  return worst * 2;
}

describe('packWall — every box is built to its picture', () => {
  for (const p of PROJECTS) {
    it(`${p.title}: every cell comes out at EXACTLY its authored ratio`, () => {
      const items = order(p.images);
      const wall = packWall(items, REGION.w, REGION.h);
      expect(wall, 'every project must pack').not.toBeNull();
      for (const c of wall!.cells) {
        // THE LAW. Not "close to", not "within a nudge" — the box IS the picture's shape, so
        // object-fit has nothing left to resolve and no picture can be cut. `bricks.ts` allowed 3x
        // here; the honest number is zero.
        expect(c.w / c.h, `${p.title}: a cell is off its picture's ratio`).toBeCloseTo(c.item.ratio, 6);
      }
    });
  }
});

describe('packWall — one uniform, thin mortar and nothing else', () => {
  for (const p of PROJECTS) {
    it(`${p.title}: no run of paper inside the wall is wider than the mortar`, () => {
      const wall = packWall(order(p.images), REGION.w, REGION.h)!;
      const worst = widestHole(wall.cells, wall.w, wall.h);
      // +2 for the raster's own step. The OLD hero/rail layout scores 172, 169 and 219 here.
      expect(worst, `${p.title}: a ${worst}px hole opened inside the wall`).toBeLessThanOrEqual(MORTAR + 2);
    });
  }

  it('the mortar is thin, and one number', () => {
    expect(MORTAR).toBeLessThanOrEqual(8);
  });

  /**
   * THE INSTRUMENT IS SHOWN THE BUG IT WAS WRITTEN FOR, and this test exists because on this page a
   * green check has meant nothing six times. `widestHole` passing twelve walls proves nothing on its
   * own: a function returning 0 would also pass. So it is fed the OLD hero/rail layout — the REAL
   * geometry, measured off the live page at 1440x900 with puppeteer before any of this landed — and
   * required to report the defect Daniel saw.
   *
   * These numbers are observations, not a model: Origami's hero rendered 536x414 in a region of
   * 874.8x414.4, and its rail was 120px wide flush to the right edge, which leaves 219px of paper
   * standing between them. Daniel called that seam "too many spacings between" from a screenshot.
   */
  it('reports the OLD layout as broken — 219px of paper where Daniel said there was too much', () => {
    const oldOrigami = [
      { item: { ratio: 1.2936 }, x: 0, y: 0, w: 536, h: 414 },
      { item: { ratio: 1.2125 }, x: 755, y: 0, w: 120, h: 99 },
      { item: { ratio: 1.2795 }, x: 755, y: 111, w: 120, h: 94 },
      { item: { ratio: 1.2936 }, x: 755, y: 217, w: 120, h: 93 },
      { item: { ratio: 1.2936 }, x: 755, y: 322, w: 120, h: 93 },
    ];
    expect(widestHole(oldOrigami, 874.8, 414.4)).toBeGreaterThan(200);
  });
});

describe('packWall — the pictures do not collide or leave the wall', () => {
  for (const p of PROJECTS) {
    it(`${p.title}: no overlap, nothing out of bounds, nothing a sliver`, () => {
      const wall = packWall(order(p.images), REGION.w, REGION.h)!;
      expect(wall.cells).toHaveLength(p.images.length);
      for (const c of wall.cells) {
        expect(c.x).toBeGreaterThanOrEqual(-1e-6);
        expect(c.y).toBeGreaterThanOrEqual(-1e-6);
        expect(c.x + c.w).toBeLessThanOrEqual(wall.w + 1e-6);
        expect(c.y + c.h).toBeLessThanOrEqual(wall.h + 1e-6);
        expect(Math.min(c.w, c.h), 'a sliver').toBeGreaterThanOrEqual(MIN_SIDE);
      }
      for (let i = 0; i < wall.cells.length; i++)
        for (let j = i + 1; j < wall.cells.length; j++)
          expect(overlaps(wall.cells[i], wall.cells[j]), `${p.title}: cells ${i} and ${j} overlap`).toBe(false);
    });
  }

  it('the wall never exceeds its region', () => {
    for (const p of PROJECTS) {
      const wall = packWall(order(p.images), REGION.w, REGION.h)!;
      expect(wall.w).toBeLessThanOrEqual(REGION.w + 1e-6);
      expect(wall.h).toBeLessThanOrEqual(REGION.h + 1e-6);
    }
  });
});

describe('packWall — the hero stays the hero', () => {
  for (const p of PROJECTS) {
    it(`${p.title}: the hero is the largest brick and holds its share`, () => {
      const items = order(p.images);
      const wall = packWall(items, REGION.w, REGION.h)!;
      const hero = wall.cells.find((c) => c.item === items[0])!;
      const heroArea = hero.w * hero.h;
      for (const c of wall.cells) expect(heroArea + 0.5).toBeGreaterThanOrEqual(c.w * c.h);
      expect(heroArea / (wall.w * wall.h)).toBeGreaterThanOrEqual(HERO_SHARE_FLOOR);
    });
  }
});

describe('packWall — coverage, held to what was measured', () => {
  /**
   * A REGRESSION FLOOR, NOT AN ASPIRATION. These are the numbers the pack actually produced against
   * the real region; the point is that a later "small tidy" to the search cannot quietly give them
   * back. The live hero/rail layout scored min 73.8 / mean 87.3 for comparison.
   *
   * DO NOT "FIX" A LOW ONE BY LOOSENING THIS. Patterns, LLO and Robots are low because their assets'
   * shapes cannot tile a 2.11 rectangle, and no arrangement changes that. See the note in pack.ts.
   *
   * THE MEAN FLOOR MOVED 0.90 -> 0.89 ON AN ASSET CHANGE, NOT A SEARCH ONE (round 11). Daniel replaced
   * Resia's `clay-pitching` from a 0.75 portrait to a 1.9025 landscape; that portrait happened to tile
   * Resia's set ~2pts better (Resia went 96 -> 93.8%), which pulled the 12-project mean from just over
   * 0.90 to 0.898. Every project still clears its own floor and the pack still beats the 0.873 hero/rail
   * baseline it exists to replace, so this is re-baselining after a deliberate asset swap, not loosening
   * to hide a regression — a real search regression drops the mean far below 0.89, which this still
   * catches. If Resia's asset is reverted, restore 0.90.
   */
  it('coverage beats the layout it replaces, on every project and on the mean', () => {
    const cov = PROJECTS.map((p) => ({ title: p.title, c: packWall(order(p.images), REGION.w, REGION.h)!.coverage }));
    const mean = cov.reduce((s, x) => s + x.c, 0) / cov.length;
    for (const { title, c } of cov) expect(c, `${title} coverage ${(c * 100).toFixed(1)}%`).toBeGreaterThan(0.77);
    expect(mean).toBeGreaterThan(0.89);
  });

  it('the short viewport, where the hero floor was actually decided, does not collapse', () => {
    // Synthetic Vision scored 47% here at HERO_SHARE_FLOOR 0.45 — over half the region empty, at the
    // window Daniel actually uses. See the floor's note in pack.ts.
    const cov = PROJECTS.map((p) => ({ title: p.title, c: packWall(order(p.images), 874.8, 274.4)!.coverage }));
    for (const { title, c } of cov) expect(c, `${title} at 760: ${(c * 100).toFixed(1)}%`).toBeGreaterThan(0.79);
  });
});

describe('packWall — every project packs at every region shape, not just the measured one', () => {
  /**
   * THIS TEST EXISTS BECAUSE THE REST OF THIS FILE WAS PINNED TO ONE REGION AND THAT IS THE SAME
   * MISTAKE, AGAIN. `min-h-[302px]` passed at 1440 and drifted 41.4px at 1280. The hero clip was
   * invisible at 1440x900 and total at 1440x760. "A harness that can only look at one viewport is not
   * measuring the page, it is measuring a screenshot of it" — this repo's own words, in
   * qa/project-media.mjs, written last night.
   *
   * The specific thing it catches: `packWall` returns NULL when no arrangement satisfies its
   * constraints, and the page then renders NOTHING. That is not a degraded wall, it is a blank media
   * region, and it is invisible to a test that only ever asks one region size. DEMONSTRATED, not
   * argued: raise HERO_SHARE_FLOOR to 0.5 and a project at the 3.19-ratio region packs to null while
   * every other test in this file stays green.
   *
   * The region is `flex-1` under a viewport-locked panel, so its height is roughly (viewport − chrome
   * − band) and its RATIO swings hard: 3.19 at a 760-tall window, 1.70 at 1000. Both are real
   * windows. Daniel's is the short one.
   */
  const REGIONS = [
    { name: '1440x760 — region 3.19 wide, Daniel-ish', w: 874.8, h: 274.4 },
    { name: '1440x900 — region 2.11 wide, measured', w: 874.8, h: 414.4 },
    { name: '1440x1000 — region 1.70 wide', w: 874.8, h: 514 },
    { name: '1280 narrow', w: 760, h: 400 },
    { name: '1920 wide', w: 1200, h: 560 },
  ];
  for (const r of REGIONS) {
    it(`${r.name}: all twelve pack, at their own ratios, with no sliver and no hole`, () => {
      for (const p of PROJECTS) {
        const wall = packWall(order(p.images), r.w, r.h);
        expect(wall, `${p.title} packs to NULL at ${r.name} — a BLANK media region`).not.toBeNull();
        for (const c of wall!.cells) {
          expect(c.w / c.h, `${p.title} at ${r.name}: a cell is off its ratio`).toBeCloseTo(c.item.ratio, 6);
          expect(Math.min(c.w, c.h), `${p.title} at ${r.name}: a sliver`).toBeGreaterThanOrEqual(MIN_SIDE);
        }
        expect(widestHole(wall!.cells, wall!.w, wall!.h), `${p.title} at ${r.name}: a hole`).toBeLessThanOrEqual(MORTAR + 2);
      }
    });
  }
});

describe('packWall — degenerate inputs return nothing rather than something wrong', () => {
  it('an empty set, or a region with no size, packs to null', () => {
    expect(packWall([], 800, 400)).toBeNull();
    expect(packWall([{ ratio: 1.5 }], 0, 400)).toBeNull();
    expect(packWall([{ ratio: 1.5 }], 800, 0)).toBeNull();
    // The first paint, before the ResizeObserver has measured the region. Rendering nothing here is
    // why the page does not flash a row of zero-width images.
    expect(packWall([{ ratio: 1.5 }], 800, NaN)).toBeNull();
  });

  it('a single picture fills its region in one dimension, at its own ratio', () => {
    const wall = packWall([{ ratio: 2 }], 800, 400)!;
    expect(wall.cells).toHaveLength(1);
    expect(wall.cells[0].w / wall.cells[0].h).toBeCloseTo(2, 6);
    expect(wall.w).toBeCloseTo(800, 6);
    expect(wall.h).toBeCloseTo(400, 6);
  });

  it('a non-finite ratio is treated as square rather than laid out as NaN', () => {
    const wall = packWall([{ ratio: Number.POSITIVE_INFINITY }, { ratio: 1.5 }], 800, 400);
    for (const c of wall?.cells ?? []) {
      expect(Number.isFinite(c.w)).toBe(true);
      expect(Number.isFinite(c.h)).toBe(true);
    }
  });

  it('a region too small for the pictures packs to null, never to slivers', () => {
    expect(packWall([{ ratio: 1.8 }, { ratio: 1.8 }, { ratio: 1.8 }], 60, 30)).toBeNull();
  });
});

describe('packWall — the arithmetic, checked rather than trusted', () => {
  /**
   * `affine` is a derivation, and a wrong sign in it is INVISIBLE: the pack would simply choose
   * slightly worse arrangements and still produce a valid-looking wall. So the gutter term is checked
   * against the finished geometry instead of against itself.
   */
  it('every seam in a two-picture wall is exactly one mortar line', () => {
    // Side by side: the seam is vertical.
    const side = packWall([{ ratio: 2 }, { ratio: 2 }], 800, 200, { heroShareFloor: 0, minSide: 10 })!;
    const [a, b] = [...side.cells].sort((p, q) => p.x - q.x);
    if (Math.abs(a.y - b.y) < 1) expect(b.x - (a.x + a.w)).toBeCloseTo(MORTAR, 6);
  });

  it('a stack of N pictures pays for exactly N-1 mortar lines, not N and not zero', () => {
    // Three squares in a column at width W: total height = 3*W + 2*MORTAR, and it is height-bound,
    // so the wall solves for the width that makes that exactly H.
    const wall = packWall([{ ratio: 1 }, { ratio: 1 }, { ratio: 1 }], 100, 400, { heroShareFloor: 0, minSide: 10 })!;
    const col = [...wall.cells].sort((p, q) => p.y - q.y);
    const stacked = col.every((c, i) => i === 0 || Math.abs(c.x - col[0].x) < 1e-6);
    if (stacked) {
      expect(col[1].y - (col[0].y + col[0].h)).toBeCloseTo(MORTAR, 6);
      expect(col[2].y - (col[1].y + col[1].h)).toBeCloseTo(MORTAR, 6);
      expect(wall.h).toBeCloseTo(col[0].h * 3 + MORTAR * 2, 6);
    }
  });
});
