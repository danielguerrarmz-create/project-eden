import { describe, it, expect } from 'vitest';
import {
  packSide,
  MAX_CONCURRENT_STRANDS,
  yearLabelSide,
  CLUSTERS,
  spinePts,
  convArmPts,
  CONV_JUNCTION_Y,
  tailPts,
  MARK_R,
  sepalLen,
  SEPAL_DEFS,
} from './CrossPathsTimeline';

const GAP = 40;
const CROSS = 48;
const stackHeight = (hs: number[]) => hs.reduce((s, h) => s + h, 0) + Math.max(0, hs.length - 1) * GAP;

describe('packSide: one side lane, stacked with zero overlap', () => {
  it('clears every cluster of the previous one by at least the cross gap, even when years crowd', () => {
    // b sits only 80 units below a but a is 429 tall: without packing they would overlap badly.
    const items = [
      { id: 'a', anchorY: 100, heights: [213, 176] },
      { id: 'b', anchorY: 180, heights: [213] },
      { id: 'c', anchorY: 320, heights: [213, 176] },
    ];
    const tops = packSide(items, GAP, CROSS);
    let prevBottom = -Infinity;
    for (const it of items) {
      const top = tops.get(it.id)!;
      expect(top).toBeGreaterThanOrEqual(prevBottom + CROSS - 1e-6);
      prevBottom = top + stackHeight(it.heights);
    }
  });

  it('centres an uncrowded lead node on its true anchor year', () => {
    const tops = packSide([{ id: 'solo', anchorY: 1000, heights: [213] }], GAP, CROSS);
    expect(tops.get('solo')).toBeCloseTo(1000 - 213 / 2);
  });

  it('only ever pushes a crowded cluster DOWN, never up off its true year', () => {
    const items = [
      { id: 'a', anchorY: 100, heights: [267] },
      { id: 'b', anchorY: 130, heights: [213] }, // crowded: must be pushed below a
    ];
    const tops = packSide(items, GAP, CROSS);
    expect(tops.get('a')).toBeCloseTo(100 - 267 / 2); // uncrowded lead stays centred
    expect(tops.get('b')!).toBeGreaterThanOrEqual(130 - 213 / 2); // never rises above its centre
  });
});

describe('composition contract', () => {
  it('caps concurrent stroked paths at three (the spine plus two branch edges)', () => {
    expect(MAX_CONCURRENT_STRANDS).toBe(3);
  });
});

describe('yearLabelSide: the data-driven flip that keeps heavy year labels off the plates', () => {
  it('flips opposite a cluster that shares the year', () => {
    expect(yearLabelSide([{ year: 2024.05, side: 'right' }], 2024)).toBe('left');
    expect(yearLabelSide([{ year: 2023.9, side: 'left' }], 2024)).toBe('right');
  });

  it('defaults right when no cluster is within the 0.15-year window', () => {
    expect(yearLabelSide([{ year: 2024.2, side: 'right' }], 2024)).toBe('right');
    expect(yearLabelSide([], 2022)).toBe('right');
  });

  it('lets the NEAREST in-window cluster decide when several qualify', () => {
    const clusters = [
      { year: 2024.12, side: 'left' as const },
      { year: 2024.04, side: 'right' as const },
    ];
    expect(yearLabelSide(clusters, 2024)).toBe('left'); // nearest is on the right → flip left
  });

  it('holds against the REAL cluster data: no label shares a side with its same-year cluster', () => {
    for (const y of [2021, 2022, 2023, 2024, 2025, 2026]) {
      const side = yearLabelSide(CLUSTERS, y);
      for (const c of CLUSTERS) {
        if (Math.abs(c.year - y) < 0.15) expect(side).not.toBe(c.side);
      }
    }
  });
});

describe('the twist-fuse beginning: no spine above the junction', () => {
  it('the spine starts exactly at the junction and never rises above it', () => {
    const ys = spinePts().map((p) => p.y);
    expect(Math.min(...ys)).toBeCloseTo(CONV_JUNCTION_Y);
  });

  it('both convergence strands live entirely above the junction (they become the spine there)', () => {
    for (const dir of [-1, 1]) {
      const ys = convArmPts(dir).map((p) => p.y);
      expect(Math.max(...ys)).toBeLessThanOrEqual(CONV_JUNCTION_Y + 1e-6);
    }
  });

  it('both strands close onto the spine axis (x=600) exactly at the junction', () => {
    for (const dir of [-1, 1]) {
      const pts = convArmPts(dir);
      const last = pts[pts.length - 1];
      expect(last.y).toBeCloseTo(CONV_JUNCTION_Y);
      expect(last.x).toBeCloseTo(600);
    }
  });
});

describe('the unravel finale: the winding tail conserves arc length', () => {
  const arcLen = (pts: Array<{ x: number; y: number }>) =>
    pts.reduce((s, p, i) => (i ? s + Math.hypot(p.x - pts[i - 1].x, p.y - pts[i - 1].y) : 0), 0);

  it('the tail is exactly 2*pi*r long at every wind value, so it unravels rather than morphing', () => {
    const L = 2 * Math.PI * MARK_R;
    for (const w of [0, 0.25, 0.5, 0.75, 1]) {
      expect(arcLen(tailPts(w))).toBeCloseTo(L, 2);
    }
  });

  it('at full wind the tail closes back onto its own start: the circle is exact', () => {
    const pts = tailPts(1);
    const a = pts[0];
    const b = pts[pts.length - 1];
    expect(Math.hypot(b.x - a.x, b.y - a.y)).toBeLessThan(0.05);
  });
});

describe('the calyx holder (three-sepal original): sepal length scales with plate height, clamped', () => {
  // The longest sepal, the one pointing toward the spine (phi=225, lenCoef 0.45).
  const toward = SEPAL_DEFS.find((d) => d.phi === 225)!;

  it('has exactly three sepals, none of the strengthened five', () => {
    expect(SEPAL_DEFS.map((d) => d.phi)).toEqual([225, 180, 135]);
  });

  it('grows longer sepals as the plate grows taller (the showcase tier fills out)', () => {
    expect(sepalLen(toward, 150)).toBeCloseTo(67.5, 1); // floor: 0.45*150, unclamped
    expect(sepalLen(toward, 267)).toBeCloseTo(120.15, 1); // showcase: 0.45*267
    expect(sepalLen(toward, 267)).toBeGreaterThan(sepalLen(toward, 176));
    expect(sepalLen(toward, 176)).toBeGreaterThan(sepalLen(toward, 150));
  });

  it('stays modest at tiny plates and never exceeds the clamp ceiling', () => {
    expect(sepalLen(toward, 10)).toBe(60); // floor of the clamp
    expect(sepalLen(toward, 10000)).toBe(150); // ceiling of the clamp
  });
});
