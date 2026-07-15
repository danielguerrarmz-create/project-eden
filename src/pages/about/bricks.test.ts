import { describe, it, expect } from 'vitest';
import { packBricks, brickAspect, type BImage } from './bricks';

/**
 * The plate is a STACKED-BRICK masonry that must FILL its box edge to edge, at every image count,
 * with balanced columns and no dead space (Daniel's brick redesign, 2026-07-14).
 *
 * The frame's real aspect swings with the breakpoint: portrait (~470 x 697..821) when the plate sits
 * BESIDE the text on a wide display, landscape (~743 x 396) when they stack on a medium one. The
 * guarantees that matter hold at BOTH: (1) the columns fill the full frame width; (2) every column is
 * top-aligned and fills the full frame height, so there is no dead band at top, bottom, or sides;
 * (3) nothing is clipped or out of bounds. Bricks are justified to fill, so they sit a little off
 * their image ratio — that nudge is absorbed by object-fit and is only sanity-bounded here, not held
 * tight (a tall portrait frame full of wide plates needs a real stretch to fill, by geometry).
 */

// The real per-project image ratios, in reading order, measured from the assets in projects.ts.
const REAL: Record<string, number[]> = {
  'Archipedia (n=5)': [1.8305, 0.6065, 2.1522, 0.4591, 1.5456],
  'Synthetic Vision (n=4)': [1.2344, 0.7014, 3.7767, 2.9021],
  'Patterns (n=4)': [2.0941, 2.5721, 1.6306, 1.7918],
  'Flowerfield (n=7)': [1.9093, 1.9256, 0.9619, 1.2157, 1.9256, 1.8951, 3.0648],
  'Plentify (n=4)': [1.7778, 1.3214, 1.0, 1.001],
  'Dougherty (n=7)': [1.1998, 1.4997, 1.7778, 1.7778, 1.2225, 1.3072, 1.5504],
  'Robotic Factory (n=4)': [1.9375, 1.6591, 1.7405, 1.913],
  'Origami (n=2)': [1.2795, 1.2125],
  'Robots (n=8)': [1.3333, 0.5625, 1.7937, 1.1123, 1.3333, 1.3333, 0.5746, 1.7926],
  'LLO (n=3)': [1.3389, 0.7498, 0.7498],
  'Resia (n=4)': [1.8397, 1.0, 2.0438, 1.0778],
};

// Synthetic sets to exercise every count 1..8 with mixed portrait/landscape ratios.
const SYNTH: Record<number, number[]> = {
  1: [1.5],
  2: [0.7, 1.9],
  3: [1.6, 0.8, 1.9],
  4: [1.2, 0.7, 3.8, 2.9],
  5: [1.8, 0.6, 2.1, 0.45, 1.5],
  6: [1.2, 1.5, 1.8, 1.8, 1.2, 1.3],
  7: [1.9, 1.9, 0.96, 1.2, 1.9, 1.9, 3.0],
  8: [1.3, 0.56, 1.8, 1.1, 1.3, 1.3, 0.57, 1.8],
};

// The tall portrait frame at the two required QA heights, the wide/stacked frame, and a square.
const FRAMES = [
  { name: 'portrait-tall (vp1000)', w: 470, h: 821 },
  { name: 'portrait (vp876)', w: 470, h: 697 },
  { name: 'landscape', w: 743, h: 396 },
  { name: 'square', w: 560, h: 560 },
];

const toImages = (rs: number[]): BImage[] => rs.map((ratio) => ({ ratio }));
const EPS = 0.75; // px tolerance for float edges

// Group placed bricks into columns keyed by their left edge.
function columnsOf(bricks: { x: number; y: number; w: number; h: number }[]) {
  const byX = new Map<number, typeof bricks>();
  for (const b of bricks) {
    const key = Math.round(b.x);
    if (!byX.has(key)) byX.set(key, []);
    byX.get(key)!.push(b);
  }
  return [...byX.values()].map((col) => col.sort((a, b) => a.y - b.y));
}

describe('packBricks — fills the frame edge to edge (all counts, all frames)', () => {
  for (const frame of FRAMES) {
    for (let n = 1; n <= 8; n++) {
      it(`n=${n} on ${frame.name}: full width, columns top-aligned and full height, nothing clipped`, () => {
        const bricks = packBricks(toImages(SYNTH[n]), frame.w, frame.h);
        expect(bricks).toHaveLength(n);
        for (const b of bricks) {
          expect(b.w, 'width > 0').toBeGreaterThan(0);
          expect(b.h, 'height > 0').toBeGreaterThan(0);
          expect(b.x).toBeGreaterThanOrEqual(-EPS);
          expect(b.y).toBeGreaterThanOrEqual(-EPS);
          expect(b.x + b.w).toBeLessThanOrEqual(frame.w + EPS);
          expect(b.y + b.h).toBeLessThanOrEqual(frame.h + EPS);
        }
        // The columns reach the right edge (full width) and each column runs from the very top to the
        // very bottom (top-aligned, full height) — no dead band anywhere.
        const right = Math.max(...bricks.map((b) => b.x + b.w));
        expect(right, 'columns fill the width').toBeCloseTo(frame.w, 0);
        for (const col of columnsOf(bricks)) {
          expect(col[0].y, 'column top-aligned').toBeLessThanOrEqual(EPS);
          const colBottom = col[col.length - 1].y + col[col.length - 1].h;
          expect(colBottom, 'column fills the height').toBeCloseTo(frame.h, 0);
        }
      });
    }
  }
});

describe('packBricks — balanced columns, no vertical overlap', () => {
  it('n=8 on the portrait frame lays out in 2+ balanced columns', () => {
    const bricks = packBricks(toImages(SYNTH[8]), 470, 821);
    const cols = columnsOf(bricks);
    expect(cols.length).toBeGreaterThanOrEqual(2);
    // Every column reaches the frame bottom, so no column is left short of the others.
    for (const col of cols) {
      const bottom = col[col.length - 1].y + col[col.length - 1].h;
      expect(bottom).toBeCloseTo(821, 0);
    }
  });

  it('bricks in the same column stack without vertical overlap', () => {
    const bricks = packBricks(toImages(SYNTH[6]), 470, 697);
    for (const col of columnsOf(bricks)) {
      for (let i = 1; i < col.length; i++) {
        expect(col[i].y).toBeGreaterThanOrEqual(col[i - 1].y + col[i - 1].h - EPS);
      }
    }
  });
});

describe('packBricks — distortion stays finite and sanity-bounded', () => {
  // Filling a fixed box off the images' ratios is expected; this only guards against a runaway bug,
  // not a tight ratio match. The real per-project distortion is reported from live QA.
  for (const frame of FRAMES) {
    for (const [name, ratios] of Object.entries(REAL)) {
      it(`${name} on ${frame.name}: every brick within a 3x aspect nudge`, () => {
        const bricks = packBricks(toImages(ratios), frame.w, frame.h);
        for (const [i, b] of bricks.entries()) {
          const x = brickAspect(b) / ratios[i];
          const nudge = Math.max(x, 1 / x);
          expect(Number.isFinite(nudge)).toBe(true);
          expect(nudge, `${name} brick ${i} nudge ${nudge.toFixed(2)}x`).toBeLessThan(3);
        }
      });
    }
  }
});

describe('packBricks — degenerate inputs stay valid', () => {
  it('a single image fills the whole frame', () => {
    const [b] = packBricks(toImages([1.5]), 470, 697);
    expect(b).toEqual({ x: 0, y: 0, w: 470, h: 697 });
  });
  it('empty / zero-size inputs return no bricks', () => {
    expect(packBricks([], 470, 697)).toHaveLength(0);
    expect(packBricks(toImages([1.5, 1.2]), 0, 697)).toHaveLength(0);
    expect(packBricks(toImages([1.5, 1.2]), 470, 0)).toHaveLength(0);
  });
  it('a non-finite ratio is treated as square, never NaN', () => {
    const bricks = packBricks([{ ratio: Number.POSITIVE_INFINITY }, { ratio: 1.5 }], 470, 697);
    for (const b of bricks) {
      expect(Number.isFinite(b.w)).toBe(true);
      expect(Number.isFinite(b.h)).toBe(true);
      expect(b.w).toBeGreaterThan(0);
    }
  });
});
