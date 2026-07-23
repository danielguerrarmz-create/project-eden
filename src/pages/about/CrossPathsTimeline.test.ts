import { describe, it, expect } from 'vitest';
import {
  spreadSide,
  MAX_CONCURRENT_STRANDS,
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
  MARK_K,
  SPINE_W,
  yearToY,
  OFFSET_X,
  computePlates,
  SUB_PLATE_PAD,
  garlandStations,
  garlandPath,
  GARLAND_BOX,
  GARLAND_REACH,
  CONVERGE_Y,
  BAND_GAP,
  MARK_RING_R,
  markGarlandPath,
  markGarlandStations,
  MARK_ORGAN_SCALE,
  GARLAND_SCALE,
  INK_SEPIA,
  INK_SEPIA_TEXT,
  VELLUM,
} from './CrossPathsTimeline';
import { growWild } from '../../engine/botanical';
import { subBranchPolylines, subBranchObstacles, subBranchAttractors, subBranchVines, subBranchWidth, plateBox } from './CrossPathsTimeline';
import { PROJECTS } from './projects';
import { seededRandom } from './spaceColonization';
import { armPts, type ParenLayout } from './parenthesis';

const GAP = 40;

describe('the founders BOWER closes: the two arms MEET at the content centre (round 11 item 7)', () => {
  // Daniel ruled the open parenthesis shut into a closed loop; the two tails must join at the content
  // centre with 0px gap — a CONNECTION, a fact, the same standard as the top fork. Left-aligned
  // content with the trunk in the middle of the rows is the real, non-mirror-symmetric case (see
  // FounderParenthesis.measure), which is exactly where a naive mirror would MISS the join.
  const L: ParenLayout = {
    w: 1200,
    h: 1300,
    trunkX: 600,
    trunkY0: -80,
    forkY: 120,
    leftX: 60,
    rightX: 1140,
    rowLeft: 180,
    rowRight: 1000,
    rows: [
      { y0: 300, y1: 640 },
      { y0: 700, y1: 1040 },
    ],
    pageTop: 0,
    frameScale: 0.7,
    viewH: 860,
    headerH: 84,
    trunkW: 3,
  };
  const lastOf = (a: { x: number; y: number }[]) => a[a.length - 1];
  it('both tails land on EXACTLY one point — a 0px join, not two rails ending near each other', () => {
    const lEnd = lastOf(armPts(L, -1));
    const rEnd = lastOf(armPts(L, 1));
    expect(Math.hypot(lEnd.x - rEnd.x, lEnd.y - rEnd.y)).toBeLessThan(1e-9);
  });
  it('the meeting sits ON the content centre (x = trunkX), not merely between the arms', () => {
    expect(lastOf(armPts(L, -1)).x).toBeCloseTo(L.trunkX, 9);
  });
});

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

  /**
   * RETIRED, 2026-07-17: "ITEM 9: the titled years are evenly spaced, because the axis is a fiction
   * now". It asserted every year-label gap equalled the first (they came out 1150 x 5, exactly), and
   * it passed until the moment it was deleted. **It is not being removed because it failed. It is
   * being removed because Daniel looked at the thing it was guarding and rejected it**, and a test
   * that pins a retired ruling is worse than no test: it is a green check defending a decision nobody
   * holds any more, and the next agent will read it as law.
   *
   * His words, on the drawing that test kept honest: "THE LENGTH OF THE YEAR BAND DOES NOT HAVE TO BE
   * EQUAL TO THE REST, NOR DO THEY HAVE TO BE PROPORTIONATE IN ANY WAY."
   *
   * Recover it: `git show 583b876 -- src/pages/about/CrossPathsTimeline.test.ts`.
   *
   * **It is replaced, not just deleted**, and the replacement guards the property he asked for INSTEAD
   * of equality. That exchange is the point — a contract this file gives up has to be traded for the
   * contract that took its place, or the property quietly stops being guarded at all and nobody
   * notices until he does. This one has now been traded twice: "every gap on a side is equal" ->
   * "equal within a year" + "the years are evenly spaced" (round 10) -> this (2026-07-17).
   */
  it('THE RULING: a band is as long as its own work needs, and no longer', () => {
    /**
     * Daniel, 2026-07-17: "THERE IS TOO MUCH EMPTY SPACE BETWEEN YEAR BANDS... THEY MUST SIMPLY BE
     * CLOSE TO EACH OTHER, LEAVE ROOM FOR FLOWERS, AND NOT HAVE STRANGE WHITE SPACES OR HUGE WALL OF
     * FLOWERS. CURRENTLY IT IS FAR TOO LONG."
     *
     * THE DEFECT, STATED AS A MEASURABLE: a band is PADDED — longer than the work in it requires. That
     * is what a uniform `SLOPE` did to every year that was not the densest, and it is the single cause
     * of both halves of his complaint (the void either sits empty, or the ornament colonises it and
     * becomes the wall of flowers). So: every band's BUSIER side must pay its slack out at exactly
     * `BAND_GAP` — not more. One unit more anywhere is a unit of paper the content did not ask for.
     *
     * WHY THIS IS MEASURED FROM `computePlates()` AND NOT FROM `BAND_H`. Asserting `BAND_H(y) === max
     * over sides of sideNeed(y)` would restate the implementation in the test's own words and pass for
     * any implementation, including a broken one — the same shape as the `p.id` bio guard that checked
     * a field that does not exist and went green. This reads the plates the page actually lays out and
     * measures the paper between them.
     *
     * IT MEASURES THE BAND'S OWN FOOT, NOT THE GAP TO THE NEXT YEAR — AND THE FIRST DRAFT DID THE
     * LATTER AND WAS WRONG IN THE EXACT WAY THIS FILE KEEPS BEING WRONG. Reading a band's slack as
     * "the gap between its last plate and the next year's first plate" needs the next year to HAVE a
     * plate on that side. 2023 has no right-hand work at all, so 2022's right lane — **the busier
     * side, the one sitting exactly on the floor, the whole proof that 2022 is not padded** — produced
     * no observation, and the probe saw only the quieter left side's 409.4 and reported 2022 padded.
     * The filter that skipped "a gap spanning an empty year" (correctly: that is a void, not a
     * spacing) was throwing away the evidence of innocence. **A guard that filters its inputs can
     * always be discarding the proof, and it is not enough to filter by a fact — the fact has to be
     * the right one.** Asking the band directly needs no filter at all: `yearToY(y)` to `yearToY(y+1)`
     * is the band, `yearToY` past the last year clamps to the lane's end, and every year and every
     * side answers.
     */
    const CLUSTER_YEAR = new Map(CLUSTERS.map((c) => [c.id, Math.floor(c.year)]));
    const plates = computePlates();
    /** Per year: how much paper is left at the foot of each side's run, inside that side's own band. */
    const slack = new Map<number, Array<{ side: string; g: number }>>();

    for (const y of YEAR_TICKS) {
      const bandBottom = yearToY(y + 1);
      for (const side of ['left', 'right'] as const) {
        // Filtered by a FACT — which year authored this cluster, and which side it was placed on.
        // Never by a magnitude: the magnitude is the thing under test.
        const mine = plates.filter((p) => p.side === side && CLUSTER_YEAR.get(p.clusterId) === y);
        if (!mine.length) continue; // this side has no work this year: a void, and it is not slack
        const foot = Math.max(...mine.map((p) => p.rect.y + p.rect.h));
        slack.set(y, [...(slack.get(y) ?? []), { side, g: bandBottom - foot }]);
      }
    }

    // COVERAGE, ASSERTED. A year that quietly produced no observation is a year this test says nothing
    // about, and it would pass by saying nothing — which is how the `p.id` bio guard went green while
    // checking a field that does not exist.
    const missing = YEAR_TICKS.filter((y) => !slack.has(y));
    expect(missing, `no slack observed for ${missing.join(', ')} — those bands are unguarded`).toEqual([]);

    const shown = YEAR_TICKS.map(
      (y) => `${y}: ${(slack.get(y) ?? []).map((s) => `${s.side} ${s.g.toFixed(1)}`).join(' / ')}`,
    ).join(' | ');

    for (const y of YEAR_TICKS) {
      // THE BUSIER SIDE LANDS ON THE FLOOR. It is the side that sized the band, so its foot is the
      // band's own definition made visible. One unit more is a unit of paper nobody asked for.
      const tight = Math.min(...slack.get(y)!.map((s) => s.g));
      expect(tight, `${y}'s band is padded — ${shown}`).toBeCloseTo(BAND_GAP, 3);
    }
  });

  it('...and no photograph is nearer its neighbour than the floor, with the floor actually setting the layout', () => {
    /**
     * Daniel, same ruling: "the distance between photos in our timeline" is part of the same
     * complaint. Uniform, close, deliberate.
     *
     * BEFORE (equal bands): the gap between two plates was a year's LEFTOVER, so it ran 974.1 in 2021
     * and 123.8 in 2023 on the same lane — a 7.9x spread with no meaning behind it. That spread IS the
     * "strange white space". Now the band is sized FROM the gap, so the gap cannot vary with how empty
     * a year happens to be.
     *
     * **THIS TEST HAD A CEILING AND THE CEILING WAS A WISH.** It asserted every spacing under
     * `2 * BAND_GAP`, on the strength of one measurement (2024's quieter side at 158.9) generalised
     * into a law — the file's most repeated mistake, committed here while writing the comment that
     * warns about it. It fails at 409.4 (2022's left lane), and 409.4 is CORRECT: a band is as tall as
     * its BUSIER side needs, so the quieter side has that much more paper to share among that many
     * fewer gaps. 2022's right lane carries a two-plate stack and its left lane carries one plate, so
     * the left plate has 409.4 under it and the layout is doing exactly what it promises.
     *
     * **So there is no ceiling to assert, and pinning today's 409.4 as one would only re-arm the same
     * trap.** The quieter side's gap is not a free variable — it is `(bandH - sideSum) / sideN`,
     * decided entirely by content the moment the busier side sets the band. The contract that IS
     * checkable is this test's floor plus "a band is as long as its own work needs" above; together
     * they say no gap is too small and no band is too big, which is the whole of what the layout
     * controls. **Everything left over is content imbalance — a year with more work on one side of the
     * spine than the other — and the only lever on it is moving a cluster across the spine, which is
     * Daniel's composition and not a number anybody here should be tuning.**
     *
     * Measured 2026-07-17, so the next person knows what "left over" costs: open paper at 2021 left
     * (328.2, no left-hand work that year), 2022 left (409.4), 2026 left (761.6) and 2023 right
     * (1258.5, no right-hand work that year). The 1258.5 is the biggest single piece and it is the one
     * worth showing him.
     */
    const CLUSTER_YEAR = new Map(CLUSTERS.map((c) => [c.id, Math.floor(c.year)]));
    const gaps: Array<{ g: number; where: string }> = [];
    for (const side of ['left', 'right'] as const) {
      const ps = computePlates()
        .filter((p) => p.side === side)
        .sort((a, b) => a.rect.y - b.rect.y);
      for (let i = 1; i < ps.length; i++) {
        const prev = ps[i - 1];
        const cur = ps[i];
        if (prev.clusterId === cur.clusterId) continue; // a fact, not a magnitude
        const py = CLUSTER_YEAR.get(prev.clusterId)!;
        const cy = CLUSTER_YEAR.get(cur.clusterId)!;
        gaps.push({ g: cur.rect.y - (prev.rect.y + prev.rect.h), where: `${side} ${py}->${cy}` });
      }
    }
    expect(gaps.length, 'no gaps measured — the probe is measuring nothing').toBeGreaterThan(8);
    const shown = gaps.map((x) => `${x.where} ${x.g.toFixed(1)}`).join(', ');

    // THE FLOOR: no photograph is closer to the next than the derived gap. Same claim the no-crowding
    // test makes against `2 * GAP`, one notch stricter, and content-independent.
    for (const { g, where } of gaps) {
      expect(g, `${where} is below the gap floor — ${shown}`).toBeGreaterThanOrEqual(BAND_GAP - 1e-6);
    }
    // ...AND THE FLOOR IS LIVE. Without this the test passes just as well on a drawing three times too
    // long, which is the defect Daniel is actually complaining about: a floor nothing touches is not
    // setting the layout, it is just failing to stop it.
    expect(Math.min(...gaps.map((x) => x.g)), `nothing sits on the floor — ${shown}`).toBeCloseTo(BAND_GAP, 3);
  });
});

describe('composition contract', () => {
  it('caps concurrent stroked paths at three', () => {
    expect(MAX_CONCURRENT_STRANDS).toBe(3);
  });

  /**
   * ITEM 1a's TWO FACTS, PINNED SEPARATELY — because welding them together is what blocked item 1a for
   * two rounds, and NOTHING GUARDED EITHER OF THEM.
   *
   * Changing `SPINE_W` from 7.5 to 2.2 and rewriting `MARK_K`'s definition broke no test. That is the
   * whole reason the conflation survived: the relationship between the spine's weight and the mark's
   * size lived in a COMMENT, and a comment cannot fail. The comment was even correct — "2.8 * MARK_K =
   * SPINE_W, so the line becomes mark linework with no change in weight. That pins the mark at 90 *
   * MARK_K = 241px wide" — and being correct is exactly what made it authoritative enough to refuse a
   * ruling on. **The files most worth distrusting are the ones that explain themselves best.**
   *
   * So the two facts are separated here, in the code, where they can fail:
   */
  it('ITEM 8: the mark carries Daniel\'s ~1.4x enlargement, and the spine\'s weight is not its size', () => {
    // The mark is 90 world units across at MARK_K. It was 241px (MARK_K 2.6786), and round 11 item 8
    // enlarged it: Daniel drew a target circle ≈1.40x the rendered Oculus and said "scale it, do not
    // move it". The ASSERTION is his instruction — a scale factor in his 1.36–1.44 band — NOT a pixel
    // count re-enshrined as law (that literal, `241`, is exactly what item 1a warned against). Landed
    // by eye at 1.40x (≈337px).
    const scaleFromApproved = (90 * MARK_K) / 241;
    expect(scaleFromApproved, 'the mark is not in Daniel\'s ~1.4x band — was item 8 reverted or over/undershot?').toBeGreaterThanOrEqual(1.36);
    expect(scaleFromApproved, 'the mark is not in Daniel\'s ~1.4x band — was item 8 reverted or over/undershot?').toBeLessThanOrEqual(1.44);
    // AND THE SIZE IS STILL NOT THE SPINE'S WEIGHT (item 1a's fact, unchanged by the enlargement). If
    // someone re-derives MARK_K from SPINE_W, MARK_K collapses back toward 2.2/2.8 ≈ 0.79 and the band
    // above fails immediately. The finale's geometry hangs off this scale, so it moves with the size
    // and not with the ink; MARK_R is what TAIL_LEN (2*pi*r, the conserved winding arc) is built from.
    expect(MARK_R).toBeCloseTo(30 * MARK_K, 6);
  });

  it('ITEM 3: the mark flowers ON its own linework, evenly, and small', () => {
    /**
     * Daniel asked for leaves and flowers on the logo, with four constraints: small, balanced, feels
     * part of nature, original logo geometry undeformed, does not obstruct.
     *
     * THE TWO THAT A TEST CAN HOLD are asserted here; the other two are structural and are held by
     * WHERE the code sits, which is worth saying because it is why they are not asserted:
     *  - **undeformed** is by construction — the foliage is a separate <image> and the mark is SVG
     *    circles solved by `solveMark`; nothing in the ornament feeds back into the geometry. There is
     *    no number to check, and a test asserting "the circles did not move" would pass forever while
     *    checking nothing, which is this file's most-repeated defect.
     *  - **does not obstruct** is document order — the garland is painted BEFORE the circles, so the
     *    linework is drawn over its own flowers. Also not a number.
     */
    // ON THE MARK'S OWN STROKE. The path must ride the ring the mark's circles actually reach —
    // `15 * MARK_K` (the artwork's centre-ring, CENTERS orbit (50,50) at r=15) plus `MARK_R`. Derived
    // from the same constants the render uses, so a change to either moves both or fails here.
    expect(MARK_RING_R).toBeCloseTo(15 * MARK_K + MARK_R, 6);
    const path = markGarlandPath();
    expect(path.length, 'the ring path is too coarse to read as a circle').toBeGreaterThan(48);
    const cx = MARK_RING_R + GARLAND_REACH; // the ring's centre in strip coordinates
    for (const [x, y] of path) {
      expect(Math.hypot(x - cx, y - cx), 'an organ path point has left the mark ring').toBeCloseTo(MARK_RING_R, 3);
    }
    // ...and it closes: root and tip meet, so the vine rings the mark rather than ending mid-air.
    expect(Math.hypot(path[0][0] - path[path.length - 1][0], path[0][1] - path[path.length - 1][1])).toBeCloseTo(0, 6);

    /*
     * BALANCED, and by ARITHMETIC rather than by a seed — even spacing on a circle IS the balance,
     * which is why there is no seed here to curate.
     *
     * THE WRAP GAP IS THE ASSERTION THAT MATTERS, AND WITHOUT IT THIS TEST WAS VACUOUS. My own
     * sabotage caught it: bunching every organ into the first 60% of the ring (`t = 0.1 + i*0.6/n`)
     * left the inner gaps EQUAL — 0.6/n each — so "evenly spaced" passed while the foliage sat in an
     * arc and two thirds of the mark was bare. **Equal spacing is a property the failure also has.**
     * On a CLOSED path, balance is only balance if the seam gap matches the rest; that is the whole
     * difference between an even ring and an even clump. Same shape as every filter on this page that
     * screened out its own evidence, arrived at from the opposite direction: not a filter throwing the
     * proof away, but an assertion too weak to tell the two states apart.
     */
    const st = markGarlandStations();
    expect(st.length, 'no stations — the probe would assert nothing below').toBeGreaterThan(2);
    const inner = st.slice(1).map((s, i) => s.t - st[i].t);
    const wrap = 1 - st[st.length - 1].t + st[0].t; // across the seam, where root and tip meet
    const shown = st.map((s) => s.t.toFixed(3)).join(', ');
    for (const g of inner) expect(g, `the mark's foliage is not evenly spaced: ${shown}`).toBeCloseTo(inner[0], 9);
    expect(wrap, `the foliage bunches on one side — it does not ring the mark: ${shown}`).toBeCloseTo(inner[0], 9);
    // No organ on the path's seam, where root and tip meet and an organ reads as a join.
    for (const s of st) {
      expect(s.t).toBeGreaterThan(0);
      expect(s.t).toBeLessThan(1);
    }
    // SMALL: the mark's foliage must never outweigh the trunk's. Pinned as a RELATION to the spine
    // garland, not as a number, so tuning one cannot silently invert the hierarchy.
    expect(MARK_ORGAN_SCALE, "the mark's foliage now outweighs the spine's").toBeLessThan(GARLAND_SCALE);
  });

  it('ITEM 1a: the spine, the branches and the mark are all one weight, so no join steps', () => {
    /**
     * THE ONLY INVARIANT THAT WAS EVER REAL HERE: the line does not change width where it winds into
     * the mark. CLAUDE.md lists the failure as already shipped once — "a trunk with a hardcoded stroke
     * that matched the spine's position exactly and still stepped 46% in width at the join".
     *
     * It is a claim about STROKES being equal. It is not a claim about the mark's diameter, and
     * conflating the two is what cost two rounds. Asserted as identity rather than arithmetic: the
     * render strokes the mark's circles at `SPINE_W` directly now, not at `MARK_STROKE * k`.
     */
    // Daniel: "the same thickness as the other branches and leaves, including our logo as well."
    // The branches' base weight IS the spine's weight now; the taper below it is by ORDER, which is
    // what still tells a twig from what it forks off.
    expect(subBranchWidth(0), 'the spine and its branches have drifted apart in weight').toBeCloseTo(SPINE_W, 6);
    expect(subBranchWidth(1)).toBeLessThan(subBranchWidth(0)); // ...and depth still reads
    // THIN, which is the word he used three times. Pinned as an upper bound rather than an equality:
    // the exact value is a look call and his to move, but a spine at the old 7.5 is the thing he
    // rejected, and it must not come back by way of somebody "restoring" a constant.
    expect(SPINE_W, 'the spine is heavy again — item 1a asked for thin, three times').toBeLessThanOrEqual(3);
  });
});

/* Two describes guarded the year labels here (the side rule, the gutter law, the label-collision
 * floor) until 2026-07-23, when the years came off the timeline. They died with the feature; the
 * rulings they encoded are recorded in the tombstone by the axis in CrossPathsTimeline.tsx, and
 * the tests themselves are in this file's git history. */

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
 * grow in the bands the DRAWING leaves free — a garland that buries a fork is not ornament on
 * structure, it is a second plant fighting the first. (The year ticks and numerals were a second
 * protected class until the years came off the page, 2026-07-23.)
 */
describe('the spine garland: Clay organs on Daniel geometry', () => {
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
