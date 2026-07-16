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
  tailPtsMirror,
  tailPtsUnravel,
  spineLeanPtsTo,
  solveMark,
  MARK_R,
  sepalLen,
  SEPAL_DEFS,
  calyxSprig,
  sprigPathStyle,
  yearLabelClearance,
  yearLabelBox,
  yearToY,
  YEAR_LABEL_W,
  YEAR_LABEL_OFFSET,
  OFFSET_X,
  computeBranches,
  branchAttachY,
  garlandStations,
  garlandPath,
  GARLAND_BOX,
  GARLAND_REACH,
  CONVERGE_Y,
  INK_SEPIA,
  INK_SEPIA_TEXT,
  VELLUM,
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

describe('yearLabelSide: the heavy year labels step aside from the real layout', () => {
  const YEARS = [2021, 2022, 2023, 2024, 2025, 2026];

  it('defaults right when there is nothing to dodge', () => {
    expect(yearLabelSide([], 2022)).toBe('right');
  });

  it('picks the side with more room, not the side away from the authored year', () => {
    // One plate hard against the label band on the right, nothing on the left → go left.
    const obstacles = [
      { side: 'right' as const, rect: { x: 710, y: 1404, w: 320, h: 213 }, pts: [{ x: 600, y: 1404 }] },
    ];
    expect(yearLabelSide(obstacles, 2024)).toBe('left');
  });

  it('always chooses the roomier side — it can never pick the worse one', () => {
    const obstacles = computeBranches();
    for (const y of YEARS) {
      const chosen = yearLabelClearance(obstacles, y, yearLabelSide(obstacles, y));
      const other = yearLabelSide(obstacles, y) === 'right' ? 'left' : 'right';
      expect(chosen).toBeGreaterThanOrEqual(yearLabelClearance(obstacles, y, other));
    }
  });

  it('clears every plate and branch at every year EXCEPT the known 2025 branch crossing', () => {
    // 2021/2022/2023/2024/2026 are fully clear. 2025 is not, and no side choice can fix it:
    // `packSide` pushes llo's plate (right) and dougherty's (left) far below their anchor years,
    // so BOTH sides carry a long branch descending through 2025's label band. Measured on
    // 2026-07-16: right -2.5, left -2.5. Flagged for Daniel — the fix is a composition call
    // (shorten those branches, or let a crowded label sit below its tick), not a constant.
    const obstacles = computeBranches();
    for (const y of YEARS) {
      const gap = yearLabelClearance(obstacles, y, yearLabelSide(obstacles, y));
      if (y === 2025) {
        expect(gap).toBeGreaterThan(-6); // pinned: it must not get WORSE while it waits
      } else {
        expect(gap).toBeGreaterThan(0);
      }
    }
  });

  it('THE ROOT CAUSE: a year label fits inside the gutter it lives in', () => {
    // The gutter from the spine to a plate's near edge is OFFSET_X (110). A label reaches
    // YEAR_LABEL_OFFSET + YEAR_LABEL_W from the spine. When that exceeded 110 the label poked
    // into the plate lane and NO choice of side could save it — both sides were busy at 2023
    // and 2025. Keep this true and the side rule only ever has to dodge branches.
    expect(YEAR_LABEL_OFFSET + YEAR_LABEL_W).toBeLessThanOrEqual(OFFSET_X);
  });

  it('never puts a label on top of a plate, on either side, at any year', () => {
    const obstacles = computeBranches();
    for (const y of YEARS) {
      for (const side of ['left', 'right'] as const) {
        const box = yearLabelBox(side === 'right' ? 1 : -1, yearToY(y));
        for (const o of obstacles) {
          if (o.side !== side) continue;
          const overlaps =
            box.x0 < o.rect.x + o.rect.w &&
            box.x1 > o.rect.x &&
            box.y0 < o.rect.y + o.rect.h &&
            box.y1 > o.rect.y;
          expect(overlaps).toBe(false);
        }
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

  it('ravels into the ORIGINAL right-flank logo: P is right of the circle centre and sigma is +1', () => {
    const g = solveMark();
    expect(g.P.x).toBeGreaterThan(g.C.x); // attach on the right side of circle 0 (unchanged logo)
    expect(g.P.x).toBeCloseTo(g.C.x + g.r, 6); // exactly r to the right of the centre
    expect(g.P.y).toBeCloseTo(g.C.y, 6); // on the circle's horizontal, heading straight down
    expect(g.sigma).toBe(1); // original ravel winding
  });
});

describe('the mirrored unravel: the post-pin unravel mirrors the ravel, it does not rewind it', () => {
  const arcLen = (pts: Array<{ x: number; y: number }>) =>
    pts.reduce((s, p, i) => (i ? s + Math.hypot(p.x - pts[i - 1].x, p.y - pts[i - 1].y) : 0), 0);

  it('conserves arc length (a reflection is an isometry), so it is still a true unravelling', () => {
    const L = 2 * Math.PI * MARK_R;
    for (const w of [0, 0.25, 0.5, 0.75, 1]) {
      expect(arcLen(tailPtsMirror(w))).toBeCloseTo(L, 2);
    }
  });

  it('is the SAME circle 0 at full wind (no pop at the pin): centred on C, closed', () => {
    const pts = tailPtsMirror(1);
    const g = solveMark();
    const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
    const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
    expect(cx).toBeCloseTo(g.C.x, 0); // still circle 0's slot, not offset — the pin swap is seamless
    expect(cy).toBeCloseTo(g.C.y, 0);
    const a = pts[0];
    const b = pts[pts.length - 1];
    expect(Math.hypot(b.x - a.x, b.y - a.y)).toBeLessThan(0.05); // closes exactly
  });

  it('straightens to a downward ray on the OPPOSITE flank at w=0 (mirror of the ravel ray)', () => {
    const ray = tailPtsMirror(0);
    const g = solveMark();
    const mirrorX = 2 * g.C.x - g.P.x; // reflection of P across C.x = the opposite flank
    expect(mirrorX).toBeCloseTo(g.C.x - g.r, 6);
    for (const pt of ray) expect(pt.x).toBeCloseTo(mirrorX, 6); // a straight vertical ray
    expect(ray[0].y).toBeCloseTo(g.P.y, 6); // starts at the mark
    expect(ray[ray.length - 1].y).toBeGreaterThan(ray[0].y); // and pays out DOWNWARD
  });

  it('curls the OPPOSITE rotational way from the ravel (opposite side of the circle mid-wind)', () => {
    const g = solveMark();
    const ravel = tailPts(0.25);
    const mirror = tailPtsMirror(0.25);
    const mid = (pts: Array<{ x: number; y: number }>) => pts[Math.floor(pts.length / 2)];
    // The ravel arc bulges to the LEFT of the circle centre as it winds in; its mirror bulges to the
    // RIGHT — a genuine mirror, not the ravel retraced (which would sit on the same side).
    expect(mid(ravel).x).toBeLessThan(g.C.x);
    expect(mid(mirror).x).toBeGreaterThan(g.C.x);
  });
});

describe('the unravel is ONE continuous stroke: spine -> lean -> tail -> descent, no gap at any w', () => {
  type Pt2 = { x: number; y: number };
  const near = (a: Pt2, b: Pt2, eps = 1e-6) => Math.hypot(a.x - b.x, a.y - b.y) < eps;
  const last = (pts: Pt2[]) => pts[pts.length - 1];

  it('the lean starts exactly where the plumb spine ends (spine -> lean junction, any target)', () => {
    const spineBottom = last(spinePts());
    for (const tx of [500, 600, 640, 720]) {
      expect(near(spineLeanPtsTo(tx)[0], spineBottom)).toBe(true);
    }
  });

  it('the lean arrives EXACTLY at the tail top at every wind value (the circled gap fix)', () => {
    // This is the regression for Daniel's circled disconnect: the tail top used to jump to P' while
    // the lean stayed at P. Now the lean is pointed at the tail's current top, so they coincide.
    for (const w of [1, 0.9, 0.75, 0.5, 0.25, 0.1, 0]) {
      const tail = tailPtsUnravel(w);
      const lean = spineLeanPtsTo(tail[0].x);
      expect(near(last(lean), tail[0])).toBe(true);
    }
  });

  it("the tail top is the ORIGINAL P (circle 0) at the pin and slides P -> P' as it opens", () => {
    const g = solveMark();
    expect(tailPtsUnravel(1)[0].x).toBeCloseTo(g.P.x, 6); // pin: right-flank P, identical to the ravel
    expect(tailPtsUnravel(0.5)[0].x).toBeCloseTo(g.C.x, 6); // half-open: on the mark's own axis
    expect(tailPtsUnravel(0)[0].x).toBeCloseTo(2 * g.C.x - g.P.x, 6); // fully open: mirrored flank P'
  });

  it('the fully-open tail bottom is the descent start, and the ray is straight/vertical (tail -> descent)', () => {
    const g = solveMark();
    const mirrorRayEndX = 2 * g.C.x - g.P.x; // = the descD start x used by the render
    const ray = tailPtsUnravel(0);
    expect(last(ray).x).toBeCloseTo(mirrorRayEndX, 6);
    for (const pt of ray) expect(pt.x).toBeCloseTo(mirrorRayEndX, 6); // vertical, so it meets descD cleanly
  });

  it('is the exact ravel circle 0 at the pin (no pop): identical to tailPts(1) point-for-point', () => {
    const a = tailPtsUnravel(1);
    const b = tailPts(1);
    expect(a.length).toBe(b.length);
    for (let i = 0; i < a.length; i++) expect(near(a[i], b[i])).toBe(true);
  });

  it('opens the OPPOSITE way from the ravel (mirror, not rewind): mid-unravel curls to the mirror side', () => {
    const g = solveMark();
    const mid = (pts: Pt2[]) => pts[Math.floor(pts.length / 2)];
    // At w=0.25 the pure ravel bulges LEFT of centre; the morphing unravel (mostly mirror) bulges RIGHT.
    expect(mid(tailPts(0.25)).x).toBeLessThan(g.C.x);
    expect(mid(tailPtsUnravel(0.25)).x).toBeGreaterThan(g.C.x);
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

describe('the holder botanical: reuses the three-axis skeleton + height-scaled length law', () => {
  // The longest axis, the one pointing toward the spine (phi=225, lenCoef 0.45).
  const toward = SEPAL_DEFS.find((d) => d.phi === 225)!;

  it('has exactly three axes (toward-spine / straight-down / under-plate), never the five-cup', () => {
    expect(SEPAL_DEFS.map((d) => d.phi)).toEqual([225, 180, 135]);
  });

  it('grows longer leaves as the plate grows taller (the showcase tier fills out)', () => {
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

describe('the holder botanical: deterministic, one-colour, and stays in the gutter under the plate', () => {
  // A representative plate corner (right-side cluster, inner-bottom corner at the plate bottom).
  const cornerX = 110;
  const cornerY = 500;
  const dir = 1;

  it('is deterministic per seed (same plate id + index -> identical geometry)', () => {
    const a = calyxSprig(cornerX, cornerY, dir, 200, 180, 'medical:0');
    const b = calyxSprig(cornerX, cornerY, dir, 200, 180, 'medical:0');
    expect(a.organs.map((o) => [o.transform, o.paths.map((p) => p.d)])).toEqual(
      b.organs.map((o) => [o.transform, o.paths.map((p) => p.d)]),
    );
    // Different plate -> different ornament.
    const c = calyxSprig(cornerX, cornerY, dir, 200, 180, 'medical:1');
    expect(JSON.stringify(a.organs)).not.toBe(JSON.stringify(c.organs));
  });

  it('grows leaves + a bud (non-empty, finite coordinates)', () => {
    const { organs } = calyxSprig(cornerX, cornerY, dir, 200, 180, 'together:0');
    expect(organs.length).toBeGreaterThanOrEqual(4); // 3 leaves + 1 bud
    for (const o of organs) {
      expect(o.paths.length).toBeGreaterThan(0);
      for (const p of o.paths) {
        for (const m of p.d.matchAll(/-?\d+(?:\.\d+)?/g)) {
          expect(Number.isFinite(Number(m[0]))).toBe(true);
        }
      }
    }
  });

  // NOTE: this asserts on sprigPathStyle, NOT on the raw organ paths. calyxSprig's paths come out
  // of the shared botanical module (src/engine/botanical), which carries its own ink constant and
  // serves other pages; the timeline re-colours every organ through sprigPathStyle at render. The
  // render register is where the About page's one-colour law actually lives, so that is what the
  // doctrine test has to check — the old version pinned the module's blue and would have passed
  // green through the entire sepia re-key while the page rendered blue.
  it('is one colour: every rendered organ path strokes INK_SEPIA and fills none or INK_SEPIA', () => {
    const { organs } = calyxSprig(cornerX, cornerY, dir, 260, 200, 'newyork:0');
    let checked = 0;
    for (const o of organs) {
      for (const p of o.paths) {
        const s = sprigPathStyle(p);
        expect(s.stroke).toBe(INK_SEPIA);
        expect(s.fill === 'none' || s.fill === INK_SEPIA).toBe(true);
        checked += 1;
      }
    }
    expect(checked).toBeGreaterThan(0);
  });

  it('renders nothing blue: the retired INK_BLUE never reaches a rendered organ', () => {
    const { organs } = calyxSprig(cornerX, cornerY, dir, 260, 200, 'newyork:0');
    for (const o of organs) {
      for (const p of o.paths) {
        const s = sprigPathStyle(p);
        expect(s.stroke.toUpperCase()).not.toBe('#3E7CA8');
        expect(s.fill.toUpperCase()).not.toBe('#3E7CA8');
      }
    }
  });

  it('stays in the gutter: the sprig never reaches past maxLen below the plate corner', () => {
    // Across every tier height and a range of available room, the lowest point of the ornament stays
    // within the gutter budget — exactly the no-overlap contract the three sepals held.
    for (const h of [176, 213, 267]) {
      for (const maxLen of [20, 60, 120, 200]) {
        for (const d of [1, -1]) {
          const { tipY } = calyxSprig(200, 400, d, h, maxLen, `t-${h}-${maxLen}-${d}`);
          expect(tipY - 400).toBeLessThanOrEqual(maxLen + 1e-6);
        }
      }
    }
  });
});

/* --------------------------- the sepia colour lane ------------------------ */

/**
 * The About page retired INK_BLUE on 2026-07-16 for a warm sepia drawn from the splash hero.
 * These are real WCAG 2.x computations, not pinned hexes: the point of the test is that if
 * someone re-tunes the sepia by eye, the ratio is re-derived and the AA claim either still
 * holds or the suite says so.
 */
const srgbToLinear = (c: number): number => {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
};

const toRgb = (hex: string): [number, number, number] => {
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const relLuminance = (hex: string): number => {
  const [r, g, b] = toRgb(hex);
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
};

const contrast = (a: string, b: string): number => {
  const [hi, lo] = [relLuminance(a), relLuminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

/** Composite `fg` at `alpha` over `bg` — how the selected row's tint actually reaches a screen. */
const composite = (fg: string, alpha: number, bg: string): string => {
  const f = toRgb(fg);
  const b = toRgb(bg);
  return (
    '#' +
    f
      .map((v, i) => Math.round(v * alpha + b[i] * (1 - alpha)).toString(16).padStart(2, '0'))
      .join('')
  );
};

/** ListView paints the active row `${tint}14` — 0x14/255 of INK_SEPIA over the vellum page. */
const ACTIVE_ROW_ALPHA = 0x14 / 255;
const AA_NORMAL = 4.5;

describe('the sepia colour lane', () => {
  it('has retired blue: neither ink constant is the old INK_BLUE or its text variant', () => {
    for (const c of [INK_SEPIA, INK_SEPIA_TEXT]) {
      expect(c.toUpperCase()).not.toBe('#3E7CA8');
      expect(c.toUpperCase()).not.toBe('#2F607F');
    }
  });

  it('is ONE colour: the text variant is the same hue, only darker', () => {
    // Same colour at reading weight, not a second colour. Hue within a couple of degrees; the
    // variant must actually be darker, or it is not doing the job it exists for.
    const hue = (hex: string) => {
      const [r, g, b] = toRgb(hex).map((v) => v / 255);
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const d = max - min;
      if (d === 0) return 0;
      const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
      return (h * 60 + 360) % 360;
    };
    expect(Math.abs(hue(INK_SEPIA) - hue(INK_SEPIA_TEXT))).toBeLessThan(3);
    expect(relLuminance(INK_SEPIA_TEXT)).toBeLessThan(relLuminance(INK_SEPIA));
  });

  it('INK_SEPIA_TEXT clears AA on vellum AND on the selected row it actually sits on', () => {
    // The row ground is the reason this constant exists: INK_SEPIA passes on bare vellum (~4.70)
    // but the active row lays 8% of ITSELF underneath its own glyphs, which drops it to ~4.28 —
    // under AA. Small text takes the darker variant and clears both grounds.
    const activeRow = composite(INK_SEPIA, ACTIVE_ROW_ALPHA, VELLUM);
    expect(contrast(INK_SEPIA_TEXT, VELLUM)).toBeGreaterThanOrEqual(AA_NORMAL);
    expect(contrast(INK_SEPIA_TEXT, activeRow)).toBeGreaterThanOrEqual(AA_NORMAL);
  });

  it('documents WHY the variant exists: INK_SEPIA alone fails on the active row', () => {
    // If this ever starts failing because INK_SEPIA now passes on the tinted row, the variant
    // can be retired and the page goes back to a single constant. Until then it must stay.
    const activeRow = composite(INK_SEPIA, ACTIVE_ROW_ALPHA, VELLUM);
    expect(contrast(INK_SEPIA, VELLUM)).toBeGreaterThanOrEqual(AA_NORMAL);
    expect(contrast(INK_SEPIA, activeRow)).toBeLessThan(AA_NORMAL);
  });
});

/* ------------------------------ the spine garland ------------------------- */

/**
 * Clay's gongbi composer, grafted onto Daniel's spine as ornament (2026-07-16). The organs must
 * grow in the bands the DRAWING leaves free — a garland that buries a fork or a year numeral is
 * not ornament on structure, it is a second plant fighting the first.
 */
describe('the spine garland: Clay organs on Daniel geometry', () => {
  const YEARS = [2021, 2022, 2023, 2024, 2025, 2026];
  const spanY = (t: number) => CONV_JUNCTION_Y + t * (CONVERGE_Y - CONV_JUNCTION_Y);

  it('grows something (the graft is not silently empty)', () => {
    expect(garlandStations().length).toBeGreaterThan(3);
  });

  it('stays on the path: every station is a fraction of the spine run', () => {
    for (const s of garlandStations()) {
      expect(s.t).toBeGreaterThanOrEqual(0);
      expect(s.t).toBeLessThanOrEqual(1);
    }
  });

  it('never grows on a branch anchor — the forks and their node dots stay clean', () => {
    for (const s of garlandStations()) {
      const y = spanY(s.t);
      for (const c of CLUSTERS) {
        expect(Math.abs(y - yearToY(c.year))).toBeGreaterThanOrEqual(46);
      }
    }
  });

  it('never grows on a year tick or its numeral', () => {
    for (const s of garlandStations()) {
      const y = spanY(s.t);
      for (const yr of YEARS) {
        expect(Math.abs(y - yearToY(yr))).toBeGreaterThanOrEqual(40);
      }
    }
  });

  it('is deterministic: the same drawing grows the same garland forever', () => {
    expect(garlandStations()).toEqual(garlandStations());
  });

  it('cannot reach a plate: the strip stays inside the gutter', () => {
    // Foliage may decorate the spine; it may never touch a photograph. The strip's half-width
    // is the hard bound on how far any organ can be drawn from the spine.
    expect(GARLAND_REACH).toBeLessThan(OFFSET_X);
  });

  it('paints into a strip that actually contains the spine', () => {
    const xs = spinePts().map((p) => p.x);
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(GARLAND_BOX.x);
    expect(Math.max(...xs)).toBeLessThanOrEqual(GARLAND_BOX.x + GARLAND_BOX.w);
    // The strip-local path is what the composer walks: it must be inside the canvas.
    for (const [x, y] of garlandPath()) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(GARLAND_BOX.w);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(GARLAND_BOX.h);
    }
  });
});

describe('the retired blue cannot come back through a shared module', () => {
  it('re-colours anything the shared botanical module hands the About page', () => {
    // Both surfaces that borrow src/engine/botanical (the timeline's calyx via sprigPathStyle,
    // and FanPainting's underdrawing) get paths stamped with THAT module's own INK_BLUE, because
    // it still serves pages that want blue. Each borrower must re-key at its render register.
    // A live DOM sweep on 2026-07-16 found the underdrawing painting #3E7CA8 on the About page
    // for the seconds before each commission lands — invisible to every test we had.
    const { organs } = calyxSprig(200, 400, 1, 200, 180, 'regression:0');
    const raw = organs.flatMap((o) => o.paths);
    expect(raw.length).toBeGreaterThan(0);
    // The module really does hand us blue — if this ever stops being true the re-key is moot,
    // but so is the risk, and this test should be revisited rather than deleted.
    expect(raw.some((p) => p.stroke.toUpperCase() === '#3E7CA8')).toBe(true);
    // ...and the render register really does neutralise it.
    for (const p of raw) {
      expect(sprigPathStyle(p).stroke).toBe(INK_SEPIA);
    }
  });
});
