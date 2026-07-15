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
  computeBranches,
  branchAttachY,
} from './CrossPathsTimeline';

type Pt = { x: number; y: number };
type Rect = { x: number; y: number; w: number; h: number };

/** Do segments ab and cd cross? (Proper orientation test; collinear-overlap counts as a cross.) */
function segsCross(a: Pt, b: Pt, c: Pt, d: Pt): boolean {
  const o = (p: Pt, q: Pt, r: Pt) => Math.sign((q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x));
  const on = (p: Pt, q: Pt, r: Pt) =>
    Math.min(p.x, q.x) - 1e-9 <= r.x &&
    r.x <= Math.max(p.x, q.x) + 1e-9 &&
    Math.min(p.y, q.y) - 1e-9 <= r.y &&
    r.y <= Math.max(p.y, q.y) + 1e-9;
  const o1 = o(a, b, c);
  const o2 = o(a, b, d);
  const o3 = o(c, d, a);
  const o4 = o(c, d, b);
  if (o1 !== o2 && o3 !== o4) return true;
  if (o1 === 0 && on(a, b, c)) return true;
  if (o2 === 0 && on(a, b, d)) return true;
  if (o3 === 0 && on(c, d, a)) return true;
  if (o4 === 0 && on(c, d, b)) return true;
  return false;
}

/** Does the polyline enter the (slightly shrunk) rect: either a vertex inside, or a segment that
 *  crosses a rect edge? The shrink lets a branch touch a plate's edge at its own attach point without
 *  counting as an overlap. */
function polyHitsRect(pts: Pt[], r: Rect, eps = 0.75): boolean {
  const x0 = r.x + eps;
  const y0 = r.y + eps;
  const x1 = r.x + r.w - eps;
  const y1 = r.y + r.h - eps;
  const inside = (p: Pt) => p.x > x0 && p.x < x1 && p.y > y0 && p.y < y1;
  const corners = [
    { x: x0, y: y0 },
    { x: x1, y: y0 },
    { x: x1, y: y1 },
    { x: x0, y: y1 },
  ];
  for (let i = 0; i < pts.length; i++) {
    if (inside(pts[i])) return true;
    if (i > 0) {
      for (let e = 0; e < 4; e++) {
        if (segsCross(pts[i - 1], pts[i], corners[e], corners[(e + 1) % 4])) return true;
      }
    }
  }
  return false;
}

function poly2Cross(a: Pt[], b: Pt[]): boolean {
  for (let i = 1; i < a.length; i++)
    for (let j = 1; j < b.length; j++)
      if (segsCross(a[i - 1], a[i], b[j - 1], b[j])) return true;
  return false;
}

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

describe('the branch no-overlap contract (redline 2): a connection never crosses an image or another branch', () => {
  const branches = computeBranches();

  it('draws a branch for every plate in the real layout', () => {
    const plateCount = CLUSTERS.reduce((s, c) => s + c.nodes.length, 0);
    expect(branches.length).toBe(plateCount);
    expect(branches.length).toBeGreaterThan(10);
  });

  it('leaves the spine near perpendicular (a big interior angle, not a steep near-vertical dive)', () => {
    for (const b of branches) {
      const dx = b.pts[1].x - b.pts[0].x;
      const dy = b.pts[1].y - b.pts[0].y;
      // The cubic departs on a horizontal tangent; across the first step it has bent well under 30°
      // off horizontal. (The old pedicel dove to the plate's bottom corner at a near-vertical slant.)
      expect(Math.abs(dx)).toBeGreaterThan(1);
      expect(Math.abs(dy) / Math.abs(dx)).toBeLessThan(0.577); // < 30° from perpendicular-to-spine
    }
  });

  it('arrives UNDER each plate at its inner-bottom corner, so the calyx can cup from below', () => {
    for (const b of branches) {
      const last = b.pts[b.pts.length - 1];
      expect(last.y).toBeCloseTo(b.rect.y + b.rect.h, 3); // the plate's bottom edge
      const innerX = b.side === 'right' ? b.rect.x : b.rect.x + b.rect.w;
      expect(last.x).toBeCloseTo(innerX, 3); // the near (inner) edge
    }
  });

  it('never overlaps ANY plate image except touching its own plate at the attach point', () => {
    for (let i = 0; i < branches.length; i++) {
      for (let j = 0; j < branches.length; j++) {
        if (i === j) continue; // its own plate: it legitimately meets the near edge there
        expect(polyHitsRect(branches[i].pts, branches[j].rect)).toBe(false);
      }
    }
  });

  it('never crosses another branch (branches that share a fork on the spine excepted)', () => {
    for (let i = 0; i < branches.length; i++) {
      for (let j = i + 1; j < branches.length; j++) {
        // Siblings in one cluster share the fork origin on the spine; that is a shared endpoint, not
        // a crossing. Every other pair must be strictly disjoint.
        const sameFork =
          branches[i].pts[0].x === branches[j].pts[0].x &&
          branches[i].pts[0].y === branches[j].pts[0].y;
        if (sameFork) continue;
        expect(poly2Cross(branches[i].pts, branches[j].pts)).toBe(false);
      }
    }
  });

  it('branchAttachY routes the branch to the plate bottom (cup from below), independent of the anchor', () => {
    expect(branchAttachY(500, 400, 200)).toBe(600); // bottom = y + h, whatever the anchor
    expect(branchAttachY(300, 400, 200)).toBe(600);
    expect(branchAttachY(999, 400, 200)).toBe(600);
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
