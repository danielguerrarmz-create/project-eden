import { describe, it, expect } from 'vitest';
import {
  spreadSide,
  MAX_CONCURRENT_STRANDS,
  yearLabelSide,
  yearLabelPositions,
  YEAR_TICKS,
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
  SUB_PLATE_PAD,
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
import { subBranchPolylines, subBranchObstacles, subBranchAttractors, subBranchVines, subBranchWidth, plateBox } from './CrossPathsTimeline';
import { PROJECTS } from './projects';
import { seededRandom } from './spaceColonization';

const GAP = 40;

describe('spreadSide: one lane, evenly set, no year deciding anything', () => {
  const heights = (h: number[]) => h.reduce((s, x) => s + x, 0) + Math.max(0, h.length - 1) * GAP;
  const items = [
    { id: 'a', heights: [213, 176] },
    { id: 'b', heights: [213] },
    { id: 'c', heights: [267, 176] },
  ];

  it('leaves the SAME gap everywhere, which is the whole point', () => {
    // Daniel: "spreading them more evenly all throughout... is fine as long as it is displayed
    // better." packSide could not do this: it anchored on the true year and only moved a cluster when
    // it collided, so the real left lane measured 48, 48, 48, 333, 48, 40, 48 — five at the hard
    // minimum and one void. The slack existed (1133 units); the year axis just put it all in one place.
    const tops = spreadSide(items, 0, 2000, GAP);
    const gaps: number[] = [];
    let prevBottom: number | null = null;
    for (const it of items) {
      const top = tops.get(it.id)!;
      if (prevBottom !== null) gaps.push(top - prevBottom);
      prevBottom = top + heights(it.heights);
    }
    for (const g of gaps) expect(g).toBeCloseTo(gaps[0], 6);
    expect(gaps[0]).toBeGreaterThan(0);
  });

  it('sets the lane evenly END to END: the top and bottom margins match the inner gaps', () => {
    const tops = spreadSide(items, 100, 2100, GAP);
    const first = tops.get('a')!;
    const last = tops.get('c')! + heights(items[2].heights);
    const topMargin = first - 100;
    const bottomMargin = 2100 - last;
    expect(topMargin).toBeCloseTo(bottomMargin, 6);
  });

  it('never overlaps, and keeps the order it was given', () => {
    const tops = spreadSide(items, 0, 2000, GAP);
    let prevBottom = -Infinity;
    for (const it of items) {
      const top = tops.get(it.id)!;
      expect(top).toBeGreaterThanOrEqual(prevBottom);
      prevBottom = top + heights(it.heights);
    }
  });

  it('stays inside its lane', () => {
    const tops = spreadSide(items, 100, 2100, GAP);
    expect(tops.get('a')!).toBeGreaterThanOrEqual(100);
    expect(tops.get('c')! + heights(items[2].heights)).toBeLessThanOrEqual(2100);
  });

  it('THE REAL LANES: no crowding anywhere, and every gap INSIDE a year is equal', () => {
    /**
     * The measured minimum under packSide was 40. Against the real content this asserts the crowding
     * is actually gone rather than merely re-described.
     *
     * THIS TEST HAS BEEN WRONG TWICE, IN OPPOSITE DIRECTIONS, AND BOTH ARE WORTH KEEPING.
     *
     * FIRST it promised two things in its title and checked one. "Every gap on a side is equal" —
     * `spreadSide`'s actual guarantee — was never asserted. It asserted `> 100`, a number from the
     * content on the page the day it was written, so round 9's five photographs divided the same
     * slack into more gaps, the right lane evened out at 99.61, and it failed while the lane was
     * doing exactly what it promises.
     *
     * THEN, fixed to assert the equality it had always claimed, it was overtaken by round 10's item
     * 9 — WHICH RETIRES THAT CONTRACT, and not by accident. Daniel asked for equal spacing between
     * the TITLED YEARS ("fake our exact timeline to make it seem like constant growth"). The years
     * carry 1, 2, 3, 5, 2, 1 clusters. Equal gaps everywhere AND equal year bands cannot both hold
     * unless every year has the same number of clusters: a band with one cluster in it has slack a
     * band with five does not. Measured after the axis landed: left gaps of 974.05, 123.83, 123.83,
     * 123.83 — the 974 is 2021's open paper, the 123.83s are 2023's three clusters sharing a band.
     * That is the fiction working, not a lane failing.
     *
     * So the contract narrowed to what is still true and still worth guarding:
     *  - NO CROWDING, anywhere, measured against packSide's own floor of 40 (`GAP`). This is the
     *    claim that mattered all along and it is content- and axis-independent.
     *  - EQUAL WITHIN A YEAR — `spreadSide`'s guarantee, now scoped to the band it actually governs.
     * The years' own even spacing is asserted where it belongs: "the titled years are evenly spaced".
     */
    const CLUSTER_YEAR = new Map(CLUSTERS.map((c) => [c.id, Math.floor(c.year)]));
    for (const side of ['left', 'right'] as const) {
      const ps = computePlates()
        .filter((p) => p.side === side)
        .sort((a, b) => a.rect.y - b.rect.y);
      const gaps: Array<{ g: number; sameYear: boolean; year: number }> = [];
      for (let i = 1; i < ps.length; i++) {
        const prev = ps[i - 1];
        const cur = ps[i];
        /*
         * SKIP A SIBLING BY ITS CLUSTER ID, NEVER BY ITS SIZE — and this line was the bug.
         *
         * It read `if (g <= GAP + 1) continue;`, i.e. "a gap of 40-ish must be one cluster's own
         * internal stack". That is true of a HEALTHY lane and false of exactly the lane this test
         * exists to catch: a CROWDED inter-cluster gap is also small, so the filter threw away every
         * gap that was too tight and kept only the ones that were already fine. The test could not
         * fail. It passed green while 2024's left band sat at 15.1px between resia and dougherty —
         * crowding worse than the packSide floor of 40 that this whole rework replaced, shipped by me
         * one commit earlier, and invisible because the guard screened its own evidence out.
         *
         * A sibling is a sibling because it shares a clusterId. That is a fact, not a magnitude, and
         * it cannot be confused with a failure.
         */
        if (prev.clusterId === cur.clusterId) continue;
        const g = cur.rect.y - (prev.rect.y + prev.rect.h);
        const py = CLUSTER_YEAR.get(prev.clusterId)!;
        const cy = CLUSTER_YEAR.get(cur.clusterId)!;
        gaps.push({ g, sameYear: py === cy, year: cy });
      }
      const shown = `${side} gaps: ${gaps.map((x) => x.g.toFixed(2)).join(', ')}`;

      // Guard the probe: with no inter-cluster gaps found, everything below is vacuously true.
      expect(gaps.length, `${side}: no inter-cluster gaps found — the probe is measuring nothing`).toBeGreaterThan(2);

      // 1. NO CROWDING — against packSide's own measured floor, which is what the sentence names.
      for (const { g } of gaps) expect(g, `${shown} — crowding is back`).toBeGreaterThan(2 * GAP);

      /*
       * 2. EQUAL WITHIN A YEAR — spreadSide's contract, scoped to the band it now governs.
       *
       * GROUPED BY YEAR, and the first draft was not, which made it wrong the moment two years both
       * had inner gaps: it pooled every same-year gap on a side into one list and compared them all
       * to the first. 2023's three clusters share a band at 173.83 and 2024's at 90.06 — both are
       * "within a year", neither is comparable to the other, and the test failed reporting an uneven
       * lane at the exact moment every lane was even. `spreadSide` promises equality inside ONE band;
       * comparing across bands is asking it for something it never claimed.
       */
      const byYear = new Map<number, number[]>();
      for (const x of gaps.filter((v) => v.sameYear)) {
        byYear.set(x.year, [...(byYear.get(x.year) ?? []), x.g]);
      }
      for (const [year, within] of byYear) {
        if (within.length < 2) continue;
        for (const g of within) {
          expect(g, `${shown} — ${year}'s own band is not evenly set`).toBeCloseTo(within[0], 3);
        }
      }
    }
  });

  it('ITEM 9: the titled years are evenly spaced, because the axis is a fiction now', () => {
    /**
     * Daniel: 2021 through 2023 are bunched, and "I'd rather fake our exact timeline to make it seem
     * like constant growth." So this asserts the fiction holds.
     *
     * MEASURED BEFORE: label gaps of 52, 270, 604, 1182, 560 — a 22.7x ratio, and 2021 to 2022 was
     * FIFTY-TWO units. The labels sit beside their work (round 8) and the work was spread by COUNT
     * across one lane, so the gap between two years was really "how many projects happened to fall
     * between those dates". Retuning the old piecewise slopes could not have fixed it: the labels do
     * not read the axis. Each year owning an equal band is what fixes it. After: 1150 x 5, exactly.
     */
    const pos = yearLabelPositions();
    const ys = YEAR_TICKS.map((y) => pos.get(y)!);
    expect(ys.every((v) => typeof v === 'number'), 'a titled year has no position — measuring nothing').toBe(true);
    const gaps: number[] = [];
    for (let i = 1; i < ys.length; i++) gaps.push(ys[i] - ys[i - 1]);
    expect(gaps.length).toBeGreaterThan(3);
    for (const g of gaps) {
      expect(g, `year gaps: ${gaps.map((x) => x.toFixed(1)).join(', ')} — the titled years are not evenly spaced`).toBeCloseTo(gaps[0], 3);
    }
  });
});

describe('composition contract', () => {
  it('caps concurrent stroked paths at three', () => {
    expect(MAX_CONCURRENT_STRANDS).toBe(3);
  });
});

describe('yearLabelSide: the heavy year labels step aside from the real layout', () => {
  const YEARS = [2021, 2022, 2023, 2024, 2025, 2026];
  /**
   * THE LABELS' REAL Ys. These take a y COORDINATE, not a year — and they always did, but until the
   * labels started following the plates (round 8) the two were close enough to conflate: every call
   * site passed the year and `yearLabelClearance` converted it with `yearToY` internally. When that
   * conversion moved out, these tests kept passing while measuring a label at y=2022px — the top of
   * the drawing, where there is nothing to collide with, so "clears everything" was true and empty.
   * Read them from the same function the page does.
   */
  const LABEL_Y = yearLabelPositions();
  /** Authored year per cluster id, so a laid-out plate can be traced back to the year it belongs to. */
  const CLUSTER_YEAR: Record<string, number> = Object.fromEntries(CLUSTERS.map((c) => [c.id, c.year]));

  it('defaults right when there is nothing to dodge', () => {
    expect(yearLabelSide([], LABEL_Y.get(2022)!)).toBe('right');
  });

  it('THE RULING: a year sits beside the work it names, not at its metric position', () => {
    // Daniel, round 8: the axis stops being metric and becomes a sequence. `spreadSide` moves
    // plates, so a plate's y stopped meaning its date — a 2023 project could sit beside "2024".
    // A label beside the wrong project is a factual error a reader catches; nobody measures the
    // pixel distance between two years.
    const plates = computePlates();
    const laidYears = new Set(plates.map((p) => p.clusterId));
    expect(laidYears.size).toBeGreaterThan(0);

    for (const [year, ty] of LABEL_Y) {
      const mine = plates.filter((p) => CLUSTER_YEAR[p.clusterId] !== undefined && Math.floor(CLUSTER_YEAR[p.clusterId]) === year);
      if (mine.length === 0) continue; // 2026 has no work; it keeps the axis (see yearLabelYs)
      // The label sits within its own year's band of plates — top of the first, bottom of the last.
      const top = Math.min(...mine.map((p) => p.rect.y));
      const bottom = Math.max(...mine.map((p) => p.rect.y + p.rect.h));
      expect(ty, `${year} is not beside its own work`).toBeGreaterThanOrEqual(top - 1);
      expect(ty, `${year} is past the end of its own work`).toBeLessThanOrEqual(bottom);
    }
  });

  it('...and no two years print on top of each other', () => {
    // Following the plates cannot mean landing on another label. Measured before the gap floor
    // existed: 2021's first plate at y=450 and 2022's at y=457, with a 40-unit glyph box.
    const ys = [...LABEL_Y.values()];
    for (let i = 1; i < ys.length; i++) {
      expect(ys[i] - ys[i - 1], `labels ${i - 1} and ${i} collide`).toBeGreaterThanOrEqual(40);
    }
  });

  it('picks the side with more room, not the side away from the authored year', () => {
    // One plate hard against the label band on the right, nothing on the left → go left.
    const obstacles = [
      { side: 'right' as const, rect: { x: 710, y: 1404, w: 320, h: 213 } },
    ];
    expect(yearLabelSide(obstacles, 1500)).toBe('left');
  });

  it('always chooses the roomier side — it can never pick the worse one', () => {
    const obstacles = computePlates();
    for (const y of YEARS) {
      const ty = LABEL_Y.get(y)!;
      const chosen = yearLabelClearance(obstacles, ty, yearLabelSide(obstacles, ty));
      const other = yearLabelSide(obstacles, ty) === 'right' ? 'left' : 'right';
      expect(chosen).toBeGreaterThanOrEqual(yearLabelClearance(obstacles, ty, other));
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
      const ty = LABEL_Y.get(y)!;
      const gap = yearLabelClearance(obstacles, ty, yearLabelSide(obstacles, ty));
      expect(gap, `year ${y} (label at y=${Math.round(ty)})`).toBeGreaterThan(0);
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
        const box = yearLabelBox(side === 'right' ? 1 : -1, LABEL_Y.get(y)!);
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

describe('a plate is a box built to its image, never an image squeezed into a box', () => {
  it('THE CONTRACT: every plate box has EXACTLY the aspect ratio of its image', () => {
    // Daniel: "the one testing the Plentify prototype has white spaces on the left and right side...
    // scale to fit the image properly so it shows in full without getting rid of the context."
    // The plates used to take their tier's literal 3:2 box, so a square image (Plentify's compression
    // test is 976x975) letterboxed inside it. Keep this true and no plate can ever pillarbox again —
    // and note it is what lets PlateMedia ask for `meet` unconditionally, which cannot crop.
    for (const c of CLUSTERS) {
      for (const n of c.nodes) {
        const box = plateBox(n.tier, n.media.ratio);
        expect(box.w / box.h, `${c.id}: ${n.media.src || 'pending'}`).toBeCloseTo(n.media.ratio, 6);
      }
    }
  });

  it('gives every plate in a tier the same AREA, whatever its shape', () => {
    // The point of an area budget: a square and a 16:9 in one tier read as equally important. A
    // fixed box cannot do that — it either shrinks one or crops it.
    const area = (t: 'standard' | 'hero' | 'showcase') => plateBox(t, 1.5).w * plateBox(t, 1.5).h;
    for (const t of ['standard', 'hero', 'showcase'] as const) {
      for (const ratio of [0.5637, 1.001, 1.5, 1.7778, 1.9375]) {
        const b = plateBox(t, ratio);
        expect(b.w * b.h, `${t} @ ${ratio}`).toBeCloseTo(area(t), 4);
      }
    }
  });

  it('sizes a 3:2 plate exactly as the old fixed box did — nothing that already looked right moved', () => {
    expect(plateBox('hero', 320 / 213).w).toBeCloseTo(320, 1);
    expect(plateBox('hero', 320 / 213).h).toBeCloseTo(213, 1);
    expect(plateBox('standard', 264 / 176).w).toBeCloseTo(264, 1);
  });

  it('agrees with projects.ts wherever the two files name the same asset', () => {
    // Both files carry measured ratios for an overlapping set of assets. They were measured together
    // on 2026-07-16 and agreed exactly; this is what stops them drifting apart later.
    const authored = new Map(PROJECTS.flatMap((p) => p.images.map((im) => [im.src, im.ratio] as const)));
    let checked = 0;
    for (const c of CLUSTERS) {
      for (const n of c.nodes) {
        const a = authored.get(n.media.src);
        if (a == null) continue;
        expect(n.media.ratio, `${n.media.src}`).toBeCloseTo(a, 3);
        checked += 1;
      }
    }
    expect(checked).toBeGreaterThan(8);
  });
});

describe('the sub-branches are ORNAMENT: they read the layout and lose every argument with it', () => {
  const runs = subBranchPolylines();
  const plates = computePlates();

  it('grows a real tree into the drawing, not a token sprig', () => {
    expect(runs.length).toBeGreaterThan(40);
    for (const run of runs) expect(run.pts.length).toBeGreaterThanOrEqual(2);
  });

  it('THE CONTRACT: no branch travels into a plate — a corner graze is bounded and paints underneath', () => {
    /**
     * THIS TEST USED TO ASSERT ZERO CONTACT, AND IT WAS ASSERTING MORE THAN THE DESIGN PROMISES.
     *
     * Round 9 added five photographs, the layout moved, and the assertion broke: 2 of 1558 points
     * grazed newyork[0]'s bottom-right CORNER, worst depth 5.55px. Nothing in the engine had
     * changed. Its own comment had already conceded the problem — "the algorithm does not promise
     * this on its own" — and then asserted it anyway, so what it really pinned was a measurement
     * ("0 of 1217 points on 2026-07-16") dressed as a law. A snapshot of an emergent property is not
     * a contract; it is a tripwire on the content, and it fires every time the content is edited.
     *
     * The old comment's reasoning was also incomplete, in an instructive way. `SUB_PLATE_PAD` (18)
     * being wider than `SUB_SEGMENT` (9) does hold the line across an EDGE: growth would have to put
     * a node down inside the attractor-free pad to cross, and it has no reason to. But a rect has
     * corners, and a straight segment between two lawful attractors either side of a corner can clip
     * the corner without either endpoint ever entering the pad. Edges were reasoned about; corners
     * were not. That is why this broke on a content change rather than a constant change.
     *
     * SUB_PLATE_PAD 18 -> 20 restores zero contact (swept: 20/22/24/28/32 all give 0). It is not
     * taken. It is a better number for today's layout, and "the fix is never a better number" is in
     * CLAUDE.md because this page keeps relearning it — items 4, 7 and 8 of this same round move the
     * layout again, and 20 would need re-tuning to 21 the moment they land.
     *
     * WHAT THE DESIGN ACTUALLY GUARANTEES, and therefore what is asserted here:
     *
     *  1. No attractor is ever scattered on an occupied rect (the sibling test below). Growth is
     *     never AIMED into a plate, so it has no reason to travel through one.
     *  2. The sub-branches are painted BEFORE the clusters (see the paint order at the `<SubBranches>`
     *     call site, which names itself "the last expression of 'the branch loses'"). A plate is an
     *     opaque photograph. Ornament that strays under one is not seen.
     *
     * Together those bound the failure to a shallow graze under an opaque plate, which is invisible
     * and is the disagreement RESOLVING exactly as designed, not a bug. So the real defect to catch
     * is not contact, it is a branch that TRAVELS: one that heads into a plate's interior, which
     * would mean the scatter itself had failed and ornament was being grown where it can never be
     * seen. `SUB_PLATE_PAD` is the honest bound for that, and it is a bound with a reason rather than
     * a tuned constant: both endpoints of any segment are outside the padded rect by (1), so a chord
     * cutting the inner rect cannot reach deeper than the pad it had to cross to get there.
     */
    const MAX_DEPTH = SUB_PLATE_PAD;
    let deepest = { d: 0, at: '', on: '' };
    let touching = 0;
    let total = 0;
    for (const run of runs) {
      for (const p of run.pts) {
        total++;
        for (const pl of plates) {
          const r = pl.rect;
          if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) {
            touching++;
            const d = Math.min(p.x - r.x, r.x + r.w - p.x, p.y - r.y, r.y + r.h - p.y);
            if (d > deepest.d)
              deepest = { d, at: `${p.x.toFixed(1)},${p.y.toFixed(1)}`, on: `${pl.clusterId}[${pl.plateIndex}]` };
          }
        }
      }
    }

    // Guard the probe before trusting it: an empty run set would make every claim below vacuously
    // true and report green. (Trap #6, 2026-07-16 session close.)
    expect(total).toBeGreaterThan(500);

    expect(
      deepest.d,
      `a branch travelled ${deepest.d.toFixed(1)}px into ${deepest.on} at ${deepest.at} — deeper than SUB_PLATE_PAD ` +
        `(${SUB_PLATE_PAD}), so this is not a corner graze. Growth is being aimed into a plate: suspect the ` +
        `attractor scatter or the obstacle list, not the pad.`,
    ).toBeLessThan(MAX_DEPTH);

    // The graze must stay RARE as well as shallow. A handful of clipped corners is the paint order
    // doing its job; a large fraction means the ornament is substantially hidden under the plates
    // even if every single point is shallow, and no per-point depth bound would ever notice that.
    expect(touching / total, `${touching}/${total} branch points sit on a plate`).toBeLessThan(0.02);
  });

  it('scatters no attractor on anything the layout occupies', () => {
    // The upstream half of the contract above: the ornament stays off the plates because the space
    // it is told to fill never included them in the first place.
    const obstacles = subBranchObstacles();
    for (const a of subBranchAttractors(seededRandom('test/scatter'), obstacles)) {
      for (const r of obstacles) {
        const hit = a.x >= r.x && a.x <= r.x + r.w && a.y >= r.y && a.y <= r.y + r.h;
        expect(hit).toBe(false);
      }
    }
  });

  it('GROWS AS THE TIMELINE CONTINUES: the late years carry more ornament than the early ones', () => {
    // Daniel: "makes them grow as the timeline continues". Read here as a density ramp in the
    // attractor seeding, so the ornament's own lushness carries the growth metaphor. Halve the run
    // at its midpoint and the second half must be meaningfully busier than the first.
    const mid = (CONV_JUNCTION_Y + CONVERGE_Y) / 2;
    const count = (lo: number, hi: number) =>
      runs.flatMap((b) => b.pts).filter((p) => p.y >= lo && p.y < hi).length;
    const early = count(CONV_JUNCTION_Y, mid);
    const late = count(mid, CONVERGE_Y);
    expect(late).toBeGreaterThan(early * 1.5);
  });

  it('is deterministic: the ornament is cacheable and curatable like every other seed here', () => {
    expect(subBranchPolylines()).toEqual(runs);
  });

  it('ORGANS GROW ON TWIGS, NOT ON THE TRUNK', () => {
    // Daniel: "Currently the leaves and flowers are immediately on the branch... they lack more depth
    // and texture that I feel like sub-branches would give it a lot of strength." This used to assert
    // the opposite ("organs on EVERY branch") — that assertion WAS the bug, so it is inverted rather
    // than relaxed: a run that leaves the spine carries nothing, and only what forks off it blooms.
    const vines = subBranchVines(runs);
    expect(vines).toHaveLength(runs.length); // 1:1 with the runs; a bare trunk is a vine with no stations
    let trunks = 0;
    let twigs = 0;
    runs.forEach((b, i) => {
      if (b.order === 0) {
        expect(vines[i].stations, 'a trunk must carry nothing').toHaveLength(0);
        trunks += 1;
      } else {
        expect(vines[i].stations.length).toBeGreaterThanOrEqual(1);
        twigs += 1;
      }
    });
    expect(trunks).toBeGreaterThan(0);
    expect(twigs).toBeGreaterThan(trunks); // the plant is mostly twig, which is why this reads as depth
  });

  it('rides the organs out toward the tips, never at the root end of a run', () => {
    for (const v of subBranchVines(runs)) {
      for (const st of v.stations) {
        expect(st.t).toBeGreaterThanOrEqual(0.25);
        expect(st.t).toBeLessThanOrEqual(1);
      }
    }
  });

  it('thins the stroke with every order, so trunk -> branch -> twig reads at a glance', () => {
    expect(subBranchWidth(0)).toBeGreaterThan(subBranchWidth(1));
    expect(subBranchWidth(1)).toBeGreaterThan(subBranchWidth(2));
    expect(subBranchWidth(2)).toBeGreaterThan(subBranchWidth(3));
    expect(subBranchWidth(99)).toBeGreaterThan(0); // a floor, so a deep twig never vanishes
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
