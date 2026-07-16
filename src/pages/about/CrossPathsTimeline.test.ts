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
  yearLabelClearance,
  yearLabelBox,
  yearToY,
  YEAR_LABEL_W,
  YEAR_LABEL_OFFSET,
  OFFSET_X,
  computePlates,
  garlandStations,
  garlandPath,
  GARLAND_BOX,
  GARLAND_REACH,
  CONVERGE_Y,
  INK_SEPIA,
  INK_SEPIA_TEXT,
  VELLUM,
} from './CrossPathsTimeline';
import { growWild } from '../../engine/botanical';

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
  it('caps concurrent stroked paths at three', () => {
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
      { side: 'right' as const, rect: { x: 710, y: 1404, w: 320, h: 213 } },
    ];
    expect(yearLabelSide(obstacles, 2024)).toBe('left');
  });

  it('always chooses the roomier side — it can never pick the worse one', () => {
    const obstacles = computePlates();
    for (const y of YEARS) {
      const chosen = yearLabelClearance(obstacles, y, yearLabelSide(obstacles, y));
      const other = yearLabelSide(obstacles, y) === 'right' ? 'left' : 'right';
      expect(chosen).toBeGreaterThanOrEqual(yearLabelClearance(obstacles, y, other));
    }
  });

  it('clears everything at EVERY year, 2025 included — the exception died with the branches', () => {
    // Round 1 could not make this true. 2025 measured -2.5 on BOTH sides and no side choice fixed it:
    // `packSide` pushes llo's plate (right) and dougherty's (left) far below their anchor years, so
    // both sides carried a long BRANCH descending through 2025's label band. It shipped grandfathered
    // at > -6 ("must not get WORSE while it waits") and was flagged for Daniel as a composition call.
    //
    // The decoupling deleted the branches, and with them the only obstacle 2025 ever had. There is no
    // exception here any more, and this asserts it rather than leaving the old allowance to rot.
    const obstacles = computePlates();
    for (const y of YEARS) {
      const gap = yearLabelClearance(obstacles, y, yearLabelSide(obstacles, y));
      expect(gap, `year ${y}`).toBeGreaterThan(0);
    }
  });

  it('THE ROOT CAUSE: a year label fits inside the gutter it lives in', () => {
    // The gutter from the spine to a plate's near edge is OFFSET_X (110). A label reaches
    // YEAR_LABEL_OFFSET + YEAR_LABEL_W from the spine. When that exceeded 110 the label poked
    // into the plate lane and NO choice of side could save it — both sides were busy at 2023
    // and 2025. Keep this true and the side rule has nothing left to fight.
    expect(YEAR_LABEL_OFFSET + YEAR_LABEL_W).toBeLessThanOrEqual(OFFSET_X);
  });

  it('never puts a label on top of a plate, on either side, at any year', () => {
    const obstacles = computePlates();
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

describe('the plates, decoupled: they stand beside the timeline and nothing carries them', () => {
  const plates = computePlates();

  it('lays out every plate in the real layout', () => {
    const plateCount = CLUSTERS.reduce((s, c) => s + c.nodes.length, 0);
    expect(plates.length).toBe(plateCount);
    expect(plates.length).toBeGreaterThan(10);
  });

  it('no two plates overlap: one lane still cannot hold two images on the same paper', () => {
    // This is what survives of the old branch no-overlap contract, and it is the ONLY part that was
    // ever about the projects rather than about the ornament that used to carry them. `packSide` is
    // the thing under test.
    for (let i = 0; i < plates.length; i++) {
      for (let j = i + 1; j < plates.length; j++) {
        const a = plates[i].rect;
        const b = plates[j].rect;
        const hit = a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
        expect(hit, `${plates[i].clusterId}[${plates[i].plateIndex}] overlaps ${plates[j].clusterId}[${plates[j].plateIndex}]`).toBe(false);
      }
    }
  });

  it('never lets a plate touch the spine: the drawing and the projects keep their gutter', () => {
    // The plates stand BESIDE the line now rather than hanging off it, so this is the invariant that
    // replaces "a branch never crosses an image". Measured against the spine's real sampled polyline
    // rather than a centreline constant, because the spine leans off-axis over its last stretch.
    for (const pl of plates) {
      for (const p of spinePts()) {
        if (p.y < pl.rect.y || p.y > pl.rect.y + pl.rect.h) continue;
        const gap = pl.side === 'right' ? pl.rect.x - p.x : p.x - (pl.rect.x + pl.rect.w);
        expect(gap, `${pl.clusterId}[${pl.plateIndex}] vs spine at y=${p.y}`).toBeGreaterThan(0);
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
  it('THE TRIPWIRE: the shared botanical module still hands the About page blue paths', () => {
    // src/engine/botanical stamps its own INK_BLUE onto every path it makes, because it still serves
    // pages that want blue. Any About-page surface that borrows it must therefore RE-KEY at its own
    // render register, or the page renders blue while every test passes green. That is not
    // hypothetical: a live computed-style sweep on 2026-07-16 caught FanPainting's underdrawing
    // painting #3E7CA8 on this page for the seconds before each commission lands.
    //
    // This test is the tripwire for that hazard, and `growWild` is the exact call FanPainting makes.
    // If the module ever stops emitting blue, the hazard is gone and this test should be revisited
    // rather than deleted — it is the reason the re-keys downstream exist.
    const { paths } = growWild('regression/blue-tripwire');
    expect(paths.length).toBeGreaterThan(0);
    expect(paths.some((p) => p.stroke.toUpperCase() === '#3E7CA8')).toBe(true);
  });

  // NOTE, 2026-07-16 (round 2): this describe used to assert BOTH halves — that the module hands out
  // blue, and that the render register neutralises it — by running calyxSprig's organs through
  // sprigPathStyle. The decoupling deleted the calyx and sprigPathStyle with it, and FanPainting (now
  // the page's ONLY botanical borrower) re-colours inline in JSX with no pure function to call, so
  // the second half has no unit-testable subject left. It is covered by the live computed-style sweep
  // that found the bug in the first place; see the handoff's Verify section. Flagged rather than
  // quietly dropped: if a third borrower ever appears, give it a pure style function and assert it.
});
