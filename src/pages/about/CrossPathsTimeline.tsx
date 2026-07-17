/**
 * CrossPathsTimeline.tsx — how Clay and Daniel crossed paths, drawn as a node graph.
 *
 * This is the built form of the 2026-07-14 geometry rulings (prototype:
 * docs/2026-07-14-geometry-proposals/index.html; holder:
 * docs/2026-07-14-ornament-and-logo-proposals/holder-a-calyx-v2.svg). It keeps the v2 node-graph
 * bones (one spine, short branches, piecewise time axis, plate tiers, packSide, one colour) and
 * replaces the two ends and the connective ornament:
 *
 * THE BEGINNING IS A TWIST-FUSE (redline 2). There is no spine above the junction. Two strands of
 * equal weight come in from off-frame at the top, cross once over-under, and the spine is BORN at
 * the fuse (at 2021). Neither strand reads as "the main one"; the single line is their child.
 *
 * THE FINALE IS AN UNRAVEL INTO THE MARK (redline 1). The old woven bower is retired. The spine
 * leans off its axis over its last stretch, reaches the attach point on the far flank of one Oculus
 * circle, and then WINDS: the last 2*pi*r units of the line carry constant curvature w/r, so at w=1
 * the tail has closed into an exact circle of radius r, tangent to the spine, sitting in its slot in
 * the mark. Arc length is conserved at every w (it is a real unravelling played backwards, not a
 * morph). The mark's stroke equals the spine's weight (k = SPINE_W / 2.8 = 2.679), so the mark is
 * the largest single object at the bottom of the piece. Under it: the "bower" wordmark. Nothing else.
 *
 * NOTHING HOLDS THE PROJECTS (2026-07-16, round 2). The plates used to be BORNE: each forked off the
 * spine on an ornate branch that arrived under it, where a calyx cupped it from below. Daniel:
 * "We had initially tried to have the flowers or the leaves actually holding the projects within the
 * timeline. Scratch that." They now stand ALONGSIDE the line at their year, and their entrance is a
 * fade rather than a bloom. See the decoupling note further down for the full list of what went and
 * the two classes of collision that went with it.
 *
 * THE ORNAMENT READS THE LAYOUT; THE LAYOUT NEVER READS THE ORNAMENT. This direction is the whole
 * lesson of round 1, and it is load-bearing. The old branches were STRUCTURE — they carried plates,
 * so every one of them could collide with a plate, a label, or another branch, and a growing pile of
 * rules existed to arbitrate that. The sub-branches that replace them (see SubBranches) are ORNAMENT:
 * they carry nothing, they grow into whatever negative space the plates leave, and if ornament and
 * layout ever disagree the ornament loses by construction, because it is computed downstream of a
 * layout that cannot see it.
 *
 * ONE COLOUR (INK_SEPIA — re-keyed from INK_BLUE on 2026-07-16; see the constant). TIME IS
 * PIECEWISE (2021 to 2023 compressed, then open). Unchanged.
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useReducedMotion } from '../../ui/useReducedMotion';
import { line as d3line, curveCatmullRom } from 'd3-shape';
import { CENTERS as MARK_CENTERS } from '../../ui/OculusMark';
import { clamp01, lerp } from './growth';
import { useAutoplayVideo } from './useAutoplayVideo';
import { requestGarland } from '../../engine/gongbi/painter';
import { PAGE_SPECIES } from './species';
import {
  cardLineAt,
  GROWN_BY,
  stemDrawAt,
  dashProps,
  growAt,
  ORGAN_DISC_R,
  organAt,
  polyLen,
  UNFURL_SPAN,
} from './reveal';
import type { GarlandOrgan, GarlandStation, GarlandVine } from '../../engine/gongbi/garland';
import { colonize, branches, seededRandom, type Vec2, type Branch } from './spaceColonization';
// The sub-branch colonization baked to disk (round 11, item 5). subBranchPolylines() runs colonize(),
// ~2.2s of blocking work that used to run in useMemo at mount and froze the intro text mid-render. The
// geometry is deterministic under SUB_SEED and reads no DOM, so this JSON is byte-identical to a fresh
// run — enforced by subBranches.generated.test.ts, which fails until it is regenerated (GEN=1 vitest).
import SUB_BRANCHES_PRECOMPUTED from './subBranches.generated.json';
import { CLUSTERS, CLUSTER_GAP_Y, MAX_YEAR, YEAR_TICKS, plateBox, type Plate, type Side } from './clusters';

/* The content and its box now live in `about/clusters.ts` (see the note at the top of that file: the
 * axis reads the content, so the content has to be evaluated first, and an import edge is the only way
 * to say that which cannot be got wrong later). Re-exported here because this module is the page's
 * public face and the contract tests read them from it — moving a file should not rewrite every
 * import in the suite. */
export { CLUSTERS, YEAR_TICKS, plateBox } from './clusters';
export type { Cluster, Plate, PlateTier, Side } from './clusters';

/**
 * The practice's ink: a warm sepia/timber, drawn from the splash hero's own structure.
 *
 * This REPLACED the old INK_BLUE (#3E7CA8) on 2026-07-16. The rationale is the hero: it is warm gold
 * Austin light, timber, green foliage and wisteria purple, and blue appears nowhere in it — so
 * the About page's one colour was the one colour the practice does not actually own. Nothing
 * blue survives on this page.
 *
 * Structure (the spine, branches, the mark, holders, rules) takes INK_SEPIA. SMALL TEXT takes
 * INK_SEPIA_TEXT, exactly as small blue text used to take #2F607F: INK_SEPIA measures 4.70:1 on
 * bare vellum — which passes AA — but the selected list row lays an 8% INK_SEPIA tint under its
 * own sepia glyphs, and on THAT ground it drops to 4.28:1 and fails. The variant is not a
 * second colour; it is the same colour at reading weight. See the contrast test in
 * CrossPathsTimeline.test.ts, which pins both ratios against the real composited grounds.
 *
 * Pigment (Clay's genome palette) is permitted on the BOTANICAL SPECIMENS only — the founder
 * specimens, the discipline frontispieces, and the spine garland's organs. Never on structure,
 * and never to colour-code by person.
 */
export const INK_SEPIA = '#8A6A4A';

/** INK_SEPIA at reading weight: AA on vellum AND on the selected row's tinted ground. */
export const INK_SEPIA_TEXT = '#6F5439';

/** The vellum ground (tailwind `paperVellum`), literal here because SVG halos need a real value. */
export const VELLUM = '#FBF9F3';

/**
 * The checkable ceiling on how many stroked STRUCTURAL paths may be visible at once: the spine plus
 * its two convergence arms. This is a QA contract (screenshot and count), not something the code
 * enforces. It counts structure only — the ornamental sub-branches are deliberately not strands.
 */
export const MAX_CONCURRENT_STRANDS = 3;

/* `Side`, `PlateTier`, `Plate`, `Node`, `Cluster` and the asset path prefixes moved to
 * `about/clusters.ts`. They are imported at the top of this file. */

/* --------------------------------- geometry ------------------------------- */

/** The drawing's world width. Exported because the founders' parenthesis below has to convert this
 *  drawing's world units into CSS px to match its line weight to the spine's — see TIMELINE_W's use
 *  in FounderParenthesis. */
export const TIMELINE_W = 1200;
const W = TIMELINE_W;
const CX = 600;
/** The spine's stroke, in WORLD units — not CSS px. What it renders at depends on the frame's
 *  scale, which is why the parenthesis measures rather than copies the number. */
/**
 * THE SPINE'S WEIGHT — thin, and the SAME weight as the branches and the mark. Item 1a, built on the
 * THIRD ask (2026-07-17). Read the whole note before changing it; it was refused twice for a reason
 * that turned out not to exist.
 *
 * Daniel: "Change the main timeline line to be the same thickness as the other branches and leaves,
 * **including our logo as well**. Include leaves and flowers." Earlier, the same ask: draw it "at a
 * similar (thin) weight" so it reads "as the same organism as the branches around it, not as a rule
 * with plants glued to it".
 *
 * THE COLLISION THAT BLOCKED THIS FOR TWO ROUNDS WAS A CONFLATION, NOT A CONSTRAINT, and this is the
 * page's own "the fix is never a better number" lesson wearing a new hat. The note here used to read:
 * "THIS CONSTANT SETS THE MARK'S SIZE. `MARK_K = SPINE_W / MARK_STROKE`, `MARK_R = 30 * MARK_K`...
 * thin the spine to the sub-branches' 2.2 and the Oculus drops to ~71px, under a third of the size
 * Daniel approved." **Every word of that was true and the conclusion still did not follow.** `MARK_K`
 * was doing TWO jobs: it scaled the mark's SIZE, and it was the ratio that made the mark's rendered
 * stroke come out equal to the spine's. Only the second is a real invariant — the join must not step
 * in width — and it is a statement about two STROKES, not about the mark's diameter. The size was a
 * CONSEQUENCE that Daniel then approved as a fact, and an approved consequence quietly became a
 * constraint on its own input.
 *
 * SO: PIN THE SIZE, FREE THE WEIGHT. `MARK_K` is now the mark's scale, pinned at the 241px he
 * approved; the spine and the mark's stroke are both `SPINE_W`. The join is still seamless — MORE
 * directly than before, because it is now one constant used twice instead of a product that happens
 * to equal it. The mark is still 241px. `MARK_R`, `TAIL_LEN` and every point of the finale's geometry
 * are unchanged; **only the width of the ink changed.** Nothing was traded. There was no triangle.
 *
 * WHAT IS STILL NOT BUILT, AND IT IS THE REST OF THE SENTENCE. He asked for the spine to be "drawn by
 * the same procedural algorithm as the nonflowers stroke". That part DOES collide, and the collision
 * is real: the nonflowers stroke is `drawTube` inside the composer, which paints once into a canvas
 * at fixed geometry (`GarlandOpts.tube` is switched OFF here precisely because "the spine is Daniel's
 * drawn SVG line and must stay the drawn line"). The spine dash-reveals as the card line passes,
 * leans off its axis, and winds the last 2*pi*r units into the mark with arc length conserved at
 * every w. **A bitmap cannot do any of that**, and painting it would cost the finale — the page's
 * climax and the reason the drafts that lost, lost. The honest substitute is an organic width PROFILE
 * in SVG (a filled taper outline with a slight waver, as `taperRuns` in about/parenthesis.ts already
 * does for the founders' arms against this identical complaint), keeping the mean at `SPINE_W`.
 * TODO(Daniel): thinness is what he named three times and it is what shipped. Look at it first — a
 * 2.2 line may already read as growth rather than as a rule, in which case the taper buys nothing.
 */
export const SPINE_W = 2.2;

/**
 * THE TIME AXIS IS A PACKING, NOT A SCALE — and the years are DELIBERATELY UNEQUAL (2026-07-17).
 *
 * Each year's band is exactly as long as its own content needs and no longer. Read this whole note
 * before changing a number here, because it REVERSES two earlier rulings and the dead ones are still
 * quoted in older docs.
 *
 * DANIEL, 2026-07-17, on the drawing that shipped with equal bands: "THERE IS TOO MUCH EMPTY SPACE
 * BETWEEN YEAR BANDS. THE LENGTH OF THE YEAR BAND DOES NOT HAVE TO BE EQUAL TO THE REST, NOR DO THEY
 * HAVE TO BE PROPORTIONATE IN ANY WAY. THEY MUST SIMPLY BE CLOSE TO EACH OTHER, LEAVE ROOM FOR
 * FLOWERS, AND NOT HAVE STRANGE WHITE SPACES OR HUGE WALL OF FLOWERS. CURRENTLY IT IS FAR TOO LONG."
 *
 * WHAT IS DEAD, so nobody restores it from an older comment:
 *  - **EQUAL BANDS are dead.** He asked for them (item 9, "fake our exact timeline to make it seem
 *    like constant growth"), saw them, and rejected them. `SLOPE` is deleted, not retuned.
 *  - **PROPORTIONALITY is dead** — it was already dead, and stays dead. A band's length says nothing
 *    about elapsed time. It never will again.
 *  - **"TIGHTEN THE BANDS" is dead.** He ruled that on a screenshot of `SLOPE` 1150 — a value below
 *    its own floor, crowding 2024 to 15.1px — so the honest answer at the time was LOOSER, and
 *    complying would have made it worse on his own instruction. That refusal was correct and it is
 *    now moot: with equal bands gone, tighter and uncrowded stop being opposites.
 *
 * THE TRIANGLE DISSOLVED RATHER THAN GOT SOLVED, and that is the lesson worth keeping. Round 10 proved
 * EQUAL BANDS + NO CROWDING + LESS PAPER cannot all hold while the years carry 1, 2, 3, 5, 2, 1
 * clusters: a uniform band sized to the densest year hands a one-cluster year the same room as a
 * five-cluster year, and there is nothing to put in it, so the void either fills with vine (a wall of
 * flowers) or stays empty (a strange white space). Both of Daniel's complaints were the SAME defect
 * seen from its two ends. **The proof was sound and the conclusion — "the levers are his" — was
 * wrong**, because a three-way constraint has three levers and only two had been offered back to him.
 * He took the third. When you hand someone an impossibility, hand them ALL of its escapes.
 *
 * SO A UNIFORM SLOPE IS GONE AND THE FLOOR IT WAS SIZED TO WENT WITH IT. `SLOPE` 1300 was
 * `max over years of (that year's need)` — 2024's five clusters — applied to EVERY year. That is
 * precisely the "same room for a one-cluster year as a five-cluster year" defect, and carrying 1300 (or
 * its 1280 floor) forward as a per-band minimum would have rebuilt it under a new name. **The floor is
 * per-band and content-derived. There is no global one.**
 *
 * WHAT IS ACTUALLY INVARIANT, and it is the only thing that was: `packSide`'s measured gap floor of 40
 * (`CLUSTER_GAP_Y`), which the no-crowding test doubles to 80. That number is about two photographs
 * being too close together to read as separate. It is content-independent and axis-independent, which
 * is exactly why it survived a rework that killed everything around it.
 */
/** The fuse: where the two strands lay up and the spine is born. Not a year — the drawing's own top. */
const FUSE_Y = 150;
/**
 * THE AXIS ORIGIN, AND IT IS DELIBERATELY THE LANE'S TOP, NOT THE FUSE.
 *
 * The plates cannot start at the fuse (they need `LANE_TOP`'s clearance below it), so an axis anchored
 * at the fuse puts 2021's tick 120 units ABOVE the band its work can actually occupy, and the band gets
 * clamped. Measured with the origin at the fuse: label gaps of 1030, 1150, 1150, 1150, 1150 — every
 * year even except the first, which came up 120 short.
 *
 * So the axis starts where the work can start. `LANE_TOP` is defined from this rather than the other
 * way round, which keeps the two from disagreeing by construction.
 */
const Y_2021 = FUSE_Y + 120;

/**
 * THE GAP BETWEEN TWO PHOTOGRAPHS — the one number this layout is tuned by, and it is DERIVED.
 *
 * Daniel, same ruling: "the distance between photos in our timeline" is part of the empty-space
 * complaint. Uniform, close, deliberate. So it is one constant for the whole drawing rather than a
 * per-year leftover, which is what it used to be — under equal bands a sparse year's gap WAS its
 * leftover, so 2021 got 974 units between plates and 2023 got 124. That spread is the "strange white
 * space", and it is gone by construction: the band is sized FROM this gap instead of the gap falling
 * out of the band.
 *
 * WHY THREE TIMES `CLUSTER_GAP_Y` AND NOT A NUMBER THAT LOOKED RIGHT. Two plates in ONE cluster sit 40
 * apart; two DIFFERENT clusters must read as separate groups, and proximity is the only thing on the
 * page saying which is which — there is no rule, no box and no label between them. So the between-group
 * gap has to be visibly larger than the within-group gap, and 3x is the ratio that makes the grouping
 * unambiguous rather than arguable. It also clears the no-crowding bar (2 x CLUSTER_GAP_Y = 80) by 40,
 * so the guard has real margin instead of passing by a hair — 1280 cleared it by 0.1px, which is the
 * "calibrated to today's content" trap in a smaller hat.
 *
 * IT IS A FLOOR, NOT THE GAP EVERYWHERE, and that asymmetry is the packing's one honest cost. A band is
 * as tall as its BUSIER side needs, so the busier side gets exactly this and the quieter side shares the
 * difference out evenly (see `spreadSide`). Measured: 2024 left is the busier side at exactly 120.0;
 * 2024 right spreads to 158.9. Close, not equal. Equal on both sides at once is not available without
 * moving a cluster to the other side of the spine, which is Daniel's composition, not ours.
 */
export const BAND_GAP = 3 * CLUSTER_GAP_Y;

/** The least room two year labels may have between them: the glyph box (40) plus air. Below this the
 *  numerals overlap and neither year is legible. It lives here rather than down with the label rules
 *  because it is also a BAND's floor — an empty year would otherwise pack to zero height and print its
 *  numerals on the next year's. The label rule that consumes it is `yearLabelYs`, below. */
const YEAR_LABEL_MIN_GAP = 52;

/**
 * WHAT ONE YEAR'S WORK NEEDS, on one side, in world units. Pure — this is the whole packing.
 *
 * `spreadSide(flushTop)` divides a band's slack over n slots (one between each pair of clusters, one
 * below the last), so a band of `stacks + n * BAND_GAP` pays out at exactly `BAND_GAP` per slot. Invert
 * that and the band's height IS the content's demand. Nothing to sweep, nothing to calibrate, and no
 * value of the content can crowd it — the same lesson as `items-stretch` and the divider's `invisible`
 * cell: **stop asserting a number, let the constraint resolve itself.**
 */
function sideNeed(year: number, side: Side): number {
  const items = CLUSTERS.filter((c) => c.side === side && Math.floor(c.year) === year);
  const stacks = items.reduce((sum, c) => {
    const hs = c.nodes.map((n) => plateBox(n.tier, n.media.ratio).h);
    return sum + hs.reduce((s, h) => s + h, 0) + Math.max(0, hs.length - 1) * CLUSTER_GAP_Y;
  }, 0);
  return stacks + items.length * BAND_GAP;
}

/**
 * EVERY YEAR'S BAND HEIGHT, derived once from the content. Both sides share a band boundary — that
 * register is what keeps a 2023 plate on the left level with 2023's work on the right — so a band is as
 * tall as its BUSIER side and the quieter side spreads into the rest.
 *
 * MEASURED, 2026-07-17: 2021 = 328.2, 2022 = 585.3, 2023 = 1138.5, 2024 = 1359.9, 2025 = 580.3,
 * 2026 = 368.9. Against the equal axis's 1300 x 5. **The ratio between the longest and the shortest
 * band is 4.1x and that is not a defect — it is the shape of the work**, and it is the thing Daniel
 * gave up equality to get.
 *
 * A YEAR WITH NO WORK ON EITHER SIDE would compute 0 and print two numerals on top of each other, so
 * the floor is `YEAR_LABEL_MIN_GAP`. No year exercises it today (every year carries at least one
 * cluster); it is here because the empty-year branch in `yearLabelYs` is live and the moment one is
 * added this is what stops it collapsing.
 */
const BAND_H: ReadonlyMap<number, number> = new Map(
  YEAR_TICKS.map((y) => [y, Math.max(YEAR_LABEL_MIN_GAP, sideNeed(y, 'left'), sideNeed(y, 'right'))]),
);

/** Where each year's band starts: the previous bands, stacked. The bands are unequal, so this is a
 *  running sum rather than a multiplication — which is the entire difference from `SLOPE`. */
const BAND_TOP: ReadonlyMap<number, number> = (() => {
  const out = new Map<number, number>();
  let y = Y_2021;
  for (const year of YEAR_TICKS) {
    out.set(year, y);
    y += BAND_H.get(year)!;
  }
  return out;
})();

/** The foot of the last year's band: where the work ends, and so where the drawing's finale begins.
 *  Under the equal axis the last year's tick WAS the converge point, which put 2026's graduation plate
 *  entirely below it, in the lean — the lane's own "no plate crowds the lean into the mark" rule,
 *  broken by the axis that was supposed to enforce it, and invisible because 2026 has one plate and a
 *  single plate never collides with a sibling. The finale now starts where the work stops.
 *
 *  Exported so the packing contract can be measured rather than restated: the LAST year's band has no
 *  year below it, so its slack is not observable as a gap between two plates. Without this the test
 *  would silently cover five years out of six and report a pass. */
export const LANE_END = BAND_TOP.get(MAX_YEAR)! + BAND_H.get(MAX_YEAR)!;

/**
 * THE SPINE RUNS PLUMB TO HERE; below it, the line leans off-axis and winds into the mark.
 *
 * IT IS NOT THE LAST YEAR'S TICK ANY MORE, and that was a real bug rather than a change of taste.
 * `CONVERGE_Y = yearToY(MAX_YEAR)` put the converge point exactly at 2026's tick — and 2026's work
 * hangs BELOW its tick, so the graduation plate sat 249 units into the lean, past `LANE_BOTTOM`, in the
 * stretch the lane exists to keep clear. Nothing caught it: `spreadSide` was handed an INVERTED band
 * (top 6770, bottom 6610) and quietly laid its one item at the top anyway, because `flushTop` starts at
 * `laneTop` and a negative gap has nothing to divide when there is only one cluster. **A single-item
 * container cannot fail a spacing check, so the one year the axis mistreated is the one year no spacing
 * guard could see.** Now the converge follows the work: the finale starts below the last plate, by the
 * same clearance the lane always claimed.
 */
export const CONVERGE_Y = LANE_END + 160;

/**
 * THE AXIS: where a year's band begins. Not a scale any more — a lookup into the packing.
 *
 * It used to be `Y_2021 + (y - 2021) * SLOPE`, and the shape of that expression was the claim Daniel
 * rejected: multiplying a year by a constant is what makes every band equal. A running sum over the
 * content is the same idea with the constant taken out.
 *
 * IT STILL TAKES A YEAR AND STILL RETURNS A WORLD Y, so every call site is unchanged — but it is now
 * only defined on the TITLED years. A fractional year (`c.year` is a true event date like 2023.55, and
 * clusters carry them) floors to its band: the anchor a cluster forks from is its year's tick, which is
 * what it always resolved to in practice once the plates stopped sitting at their true dates (round 3).
 * An out-of-range year clamps to the ends rather than extrapolating off a slope that no longer exists.
 */
export const yearToY = (y: number): number => {
  const year = Math.floor(y);
  const at = BAND_TOP.get(year);
  if (at !== undefined) return at;
  return year < YEAR_TICKS[0] ? Y_2021 : LANE_END;
};

/**
 * WHERE THE YEAR LABELS ACTUALLY GO: beside the work they name.
 *
 * RULED 2026-07-16 (round 8), Daniel. `spreadSide` shares out the lane's slack evenly, so a plate's
 * y stopped meaning its date the moment it landed — a 2023 project can sit beside the "2024" label.
 * The axis therefore stops being METRIC and becomes a SEQUENCE: same order, honest adjacency, no
 * claim about interval. Nobody measures the pixel distance between two years; everybody reads which
 * project a year is next to, and **a label beside the wrong project is a factual error a reader
 * catches**.
 *
 * The rule: a year sits at the TOP of the first plate of that year, so it marks where that year's
 * work begins — across BOTH sides, because the label names the year, not a lane.
 *
 * Two things this has to guarantee, and they are why it is not a one-liner:
 *
 *  - A YEAR WITH NO WORK KEEPS ITS AXIS POSITION: there is no plate to sit beside, so `yearToY` is
 *    the only honest answer left. Falling back is not a special case; it is the same rule reading an
 *    empty set. (This used to say "2026 has no clusters at all" and named it as the example. Round 9
 *    gave 2026 the graduation photograph, so 2026 now follows its plate like every other year. The
 *    branch is still live and still correct — no year currently exercises it, and the moment one is
 *    added between the ticks it will.)
 *  - THE ORDER IS ENFORCED, not hoped for, AND SO IS THE GAP. `spreadSide` lays each side
 *    independently, so the per-year minimum across both sides is neither monotonic nor spaced:
 *    measured, the first plate of 2021 lands at y=450 and the first of 2022 at y=457, and a label's
 *    glyph box is 40 units tall — the two years would print on top of each other. Following the
 *    plates cannot mean landing on another label. `YEAR_LABEL_MIN_GAP` is the floor.
 *
 *    The cost is real and it is the right way round: a year that gets pushed down sits a little
 *    below its first plate instead of level with its top. It is still beside that year's work (a
 *    plate is 200+ units tall), which is the thing the ruling is about — and the alternative is two
 *    numerals in the same place, which is not a date at all.
 */
/* `YEAR_LABEL_MIN_GAP` is declared up with the axis, because the band packing needs it as an empty
 * year's floor and the packing is evaluated first. */

export function yearLabelYs(
  laid: ReadonlyArray<{ year: number; plates: ReadonlyArray<{ y: number }> }>,
  years: readonly number[] = YEAR_TICKS,
): Map<number, number> {
  const out = new Map<number, number>();
  let floor = -Infinity;
  for (const y of years) {
    const tops = laid
      .filter((c) => Math.floor(c.year) === y)
      .flatMap((c) => c.plates.map((p) => p.y));
    // A year with work sits at the first plate of that work; a year without keeps the axis.
    const at = tops.length ? Math.min(...tops) : yearToY(y);
    // ...and never above, or on top of, the year before it.
    const clamped = Math.max(at, floor);
    out.set(y, clamped);
    floor = clamped + YEAR_LABEL_MIN_GAP;
  }
  return out;
}

/**
 * WHICH SIDE A YEAR LABEL SITS ON: THE SIDE OF THE WORK IT NAMES. The exact mirror of `yearLabelYs`
 * above — "a year with work sits at the first plate of that work; a year without keeps the axis" —
 * and it is deliberately the same shape, because it is the same ruling read in the other axis.
 *
 * RULED 2026-07-17, Daniel, item 1: "Move the graduation photograph to the LEFT side of the timeline,
 * NEXT TO THE 2026 TEXT." That is unsatisfiable under the old rule, and this is the interesting part:
 * moving the plate to the left made the label RUN AWAY to the right. Measured, before and after — the
 * plate landed left at x=303 and the 2026 label flipped from left to right, so the photograph and the
 * numerals stayed exactly as far apart as they started, mirrored. **Executing his instruction
 * literally would have satisfied its first clause and defeated its second.**
 *
 * WHY THE OLD RULE COULD NOT STAY: `yearLabelSide` picks THE SIDE WITH MORE ROOM, and its doc said it
 * exists so "the label steps aside to stay clear". **It has not had anything to stay clear OF since
 * the gutter law landed.** A label reaches `YEAR_LABEL_OFFSET + YEAR_LABEL_W` = 102 from the spine and
 * a plate's near edge is `OFFSET_X` = 110, so the two CANNOT touch on either side, at any year, by
 * construction. Measured across every year and BOTH sides: **the minimum label-to-plate clearance is
 * 13.60 and it is never negative.** So "more room" was never buying safety; it was maximising
 * whitespace, and the way it maximised whitespace was by fleeing the only plate the label is *for*.
 * The contract test said this out loud and nobody read it as a finding: *"Keep this true and the side
 * rule has nothing left to fight."* It had already won.
 *
 * This is the page's own recurring shape (`MARK_K`, `heroCrop`): a rule that was load-bearing once,
 * kept its authority after the thing it protected against was designed out, and then quietly worked
 * against the ruling it was written to serve — round 8's "A YEAR SITS BESIDE THE WORK IT NAMES",
 * which this file asserts by name and which the side rule was contradicting in x while honouring in y.
 *
 * THE FALLBACK IS NOT DEAD CODE: a year with no work has no plate to sit beside, so the roomier side
 * is the only honest answer left, exactly as `yearToY` is for its y. No year exercises it today
 * (2026 gained the graduation photograph in round 9); the moment one is added between the ticks, it
 * will.
 *
 * COST, MEASURED AND ACCEPTED, because it is a real composition change and not only 2026's: three of
 * six labels move (2021 to the right, 2023 and 2026 to the left). Every one of them moves TOWARD the
 * work it names, which is the ruling. `qa/` screenshots are in the round-11 handoff.
 */
export function yearLabelSides(
  laid: ReadonlyArray<{ year: number; side: Side; plates: ReadonlyArray<{ y: number }> }>,
  obstacles: readonly LabelObstacle[],
  labelYs: ReadonlyMap<number, number>,
): Map<number, Side> {
  const out = new Map<number, Side>();
  for (const [year, ty] of labelYs) {
    // The cluster that owns the TOP-MOST plate of this year is the work the label is aligned to.
    // Keyed on the authored year (a FACT), never on "the nearest obstacle" (a magnitude — and the
    // magnitude that looks like the own plate can be a neighbour's).
    let best: { y: number; side: Side } | null = null;
    for (const c of laid) {
      if (Math.floor(c.year) !== year) continue;
      for (const p of c.plates) if (!best || p.y < best.y) best = { y: p.y, side: c.side };
    }
    out.set(year, best ? best.side : yearLabelSide(obstacles, ty));
  }
  return out;
}

/** An obstacle a year label must stay clear of: a plate. `computePlates()` returns exactly this
 *  shape, so the rule below scores the REAL layout rather than a parallel model of it.
 *
 *  This used to carry the plate's BRANCH polyline too, and the branch was by far the harder obstacle:
 *  it swept the whole gutter, and a label's vellum halo could cut it in half. The branches are gone
 *  (see the decoupling note below) and that entire class of collision went with them. */
export interface LabelObstacle {
  side: Side;
  rect: { x: number; y: number; w: number; h: number };
}

/** The label's glyph box on side `dir` at tick-y `ty`. The box sits ABOVE the tick
 *  (YEAR_LABEL_CLEAR), which is why a label and its own tick can share an x and not collide. */
export function yearLabelBox(dir: number, ty: number) {
  const x0 = dir === 1 ? CX + YEAR_LABEL_OFFSET : CX - YEAR_LABEL_OFFSET - YEAR_LABEL_W;
  // Glyph box measured live: top = ty - 51, height 40, for baseline ty - YEAR_LABEL_CLEAR.
  return { x0, x1: x0 + YEAR_LABEL_W, y0: ty - YEAR_LABEL_CLEAR - 31, y1: ty - YEAR_LABEL_CLEAR + 9 };
}

/** Clearance from the label box to a rect: 0 or less means they overlap. */
function boxGapToRect(b: ReturnType<typeof yearLabelBox>, r: LabelObstacle['rect']): number {
  const dx = Math.max(r.x - b.x1, b.x0 - (r.x + r.w), 0);
  const dy = Math.max(r.y - b.y1, b.y0 - (r.y + r.h), 0);
  return dx === 0 && dy === 0 ? -1 : Math.hypot(dx, dy);
}

/** How much room a year label has on one side: the tightest clearance to anything on that side. */
export function yearLabelClearance(obstacles: readonly LabelObstacle[], ty: number, side: Side): number {
  const box = yearLabelBox(side === 'right' ? 1 : -1, ty);
  let best = Infinity;
  for (const o of obstacles) {
    if (o.side !== side) continue;
    best = Math.min(best, boxGapToRect(box, o.rect));
  }
  return best;
}

/**
 * Which side of the spine a year label sits on: THE SIDE WITH MORE ROOM, measured against the
 * laid-out plates. Ties (and an empty layout) default right.
 *
 * This used to flip "opposite the nearest cluster within 0.15 of a year", reading the AUTHORED
 * cluster years. That model and the page disagreed, because `packSide` moves plates: a cluster
 * authored at 2022.6 has its plates packed down into 2023's label band, and a rule that only
 * looks at same-year clusters cannot see it.
 *
 * The concept is unchanged (the label steps aside to stay clear); it derives "clear" from where the
 * plates ACTUALLY are, which is the only model that cannot drift from the drawing. See the contract
 * test, which asserts the chosen side against the real layout.
 */
export function yearLabelSide(obstacles: readonly LabelObstacle[], ty: number): Side {
  const right = yearLabelClearance(obstacles, ty, 'right');
  const left = yearLabelClearance(obstacles, ty, 'left');
  return left > right ? 'left' : 'right';
}

/* ----------------------------- the twist-fuse ----------------------------- */

/**
 * THE BEGINNING (redline 2). No spine above the junction. Two equal strands come in from off-frame,
 * run parallel to the spine (a cubic that is already vertical when it touches, so the fuse has no
 * kink), then in the last stretch cross once over-under and lay up into the spine. The junction is
 * at 2021: the spine is born there and nowhere above it.
 */
export const CONV_JUNCTION_Y = FUSE_Y; // 150 — the fuse; the spine is born here (NOT the axis origin: see Y_2021)
const CONV_TOP_Y = -50; // strand tops, above the frame (cut by frame)
const CONV_TWIST = 110; // height of the over-under lay above the junction
const CONV_GATE_Y = CONV_JUNCTION_Y - CONV_TWIST; // 40 — where the wishbone hands off to the twist
const CONV_AMP = 240; // how far off-axis each strand starts
const CONV_OFF = 7.5; // half the lay separation through the twist
/**
 * Root-2 strand weight: each strand is substantial, so neither reads as subordinate — two strands of
 * this weight lay up into ONE spine of `SPINE_W`, and area adds, so each is `SPINE_W / sqrt(2)`.
 *
 * IT WAS THE LITERAL `5.3`, which is exactly `7.5 / sqrt(2)` = 5.3033 — a derived quantity typed out
 * as a constant, so it was correct only while the spine was 7.5 and would have silently kept two fat
 * arms feeding a hairline the moment item 1a landed. **The relationship was in the comment and not in
 * the code, which is the same class as `CLUSTER_GAP_Y` versus `BAND_GAP`.** Now it follows.
 */
const CONV_WEIGHT = SPINE_W / Math.SQRT2;

/** One convergence strand for side `dir` (-1 left, +1 right): wishbone in from off-frame, then a
 *  single over-under crossing that closes onto the spine axis at the junction. */
export function convArmPts(dir: number): Array<{ x: number; y: number }> {
  const pts: Array<{ x: number; y: number }> = [];
  const N = 90;
  // Cubic h with h(0)=0, h'(0)=0.6, h(1)=1, h'(1)=0: enters at ~26 degrees off vertical and is
  // already exactly parallel to the spine at the gate, so the lay-up has no kink.
  const a = -1.4;
  const b = 1.8;
  const c = 0.6;
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    const y = lerp(CONV_TOP_Y, CONV_GATE_Y, u);
    const h = a * u * u * u + b * u * u + c * u;
    pts.push({ x: CX + dir * (CONV_AMP - CONV_OFF) * (1 - h) + dir * CONV_OFF, y });
  }
  const M = 48;
  for (let i = 1; i <= M; i++) {
    const t = i / M;
    const y = lerp(CONV_GATE_Y, CONV_JUNCTION_Y, t);
    // cos runs +1 -> -1 (the crossing at t=0.5) while the envelope closes to zero at the junction,
    // so both strands arrive exactly on the spine axis (x=CX) and become the single line.
    pts.push({ x: CX + dir * CONV_OFF * Math.cos(Math.PI * t) * (1 - t * t), y });
  }
  return pts;
}

/* --------------------------- the unravel finale --------------------------- */

/**
 * THE FINALE (redline 1). The line winds itself into the Bower mark. Variant A: the mark is centred,
 * the spine leans to reach the attach point on the far flank of circle 0.
 *
 * THE MARK'S SIZE AND THE MARK'S STROKE ARE TWO FACTS, AND THIS FILE USED TO MAKE THEM ONE (fixed
 * 2026-07-17, item 1a). It read: "The mark's scale is not a free choice: its stroke is 2.8 at a
 * 100-unit box, and 2.8 * MARK_K = SPINE_W, so the line becomes mark linework with no change in
 * weight. That pins the mark at 90 * MARK_K = 241px wide." The arithmetic was right and it welded the
 * mark's DIAMETER to the spine's WEIGHT — so "make the line thinner" read as "make the logo smaller",
 * and item 1a was refused twice on that basis.
 *
 * The real invariant is only ever THE JOIN DOES NOT STEP IN WIDTH, which is a claim about two strokes
 * being equal. It is now enforced the direct way — the mark is stroked at `SPINE_W`, the same constant
 * the spine is stroked at, so they are equal because they are the same number rather than because a
 * product works out. `MARK_K` keeps its value and loses its second job: it is the SCALE, pinned at the
 * 241px Daniel approved, and the size no longer moves when the weight does.
 *
 * `MARK_STROKE` (2.8) IS DELETED RATHER THAN KEPT FOR REFERENCE. It was the Oculus artwork's own
 * stroke at its native 100-unit box — a true fact about the source geometry, and once the mark is
 * stroked at `SPINE_W` nothing derives from it. A constant that nothing reads is a constant the next
 * person re-derives something from, which is how it got its second job the first time. The fact lives
 * in this sentence, where it cannot be multiplied by anything.
 */
/** The mark's scale, and ONLY its scale. ENLARGED ~1.4x by round 11 item 8: Daniel drew a target
 *  circle concentric with the mark ("scale it, do not move it") measuring ≈1.40x the rendered Oculus,
 *  taking the 241px he had approved to ≈337px. Landed by eye in his 1.36–1.44 band; the exact pixel is
 *  NOT a law (do not re-enshrine one — that was item 1a's whole trap). What IS invariant lives
 *  elsewhere: the mark is stroked at `SPINE_W` (a literal, not `MARK_STROKE * k`), so the ink does NOT
 *  scale with the mark and the join into the mark still does not step in width — the only real
 *  constraint here. The centre does not move either: `MARK_CENTER_X`/`MARK_CENTER_Y` are independent of
 *  this. Everything else that is a fact OF the mark (its circles, the ring, the winding tail, the
 *  finale height) hangs off this scale and grows with it, which is what "scale it" means.
 *  `qa/hero-lockup.mjs` (the lockup + stroke invariant) and the mark-size contract test pin it. */
export const MARK_K = 3.75;
export const MARK_R = 30 * MARK_K; // 112.5 — world radius of one mark circle (scales with MARK_K)
const LEAN_SPAN = 620; // descent the spine spends easing off-axis to the attach point
const MARK_CENTER_X = CX; // variant A: the mark stays on the axis
const MARK_CENTER_Y = CONVERGE_Y + LEAN_SPAN; // 3650 — the mark's centre
const WORDMARK_GAP = 92; // from the mark's bottom edge to the wordmark baseline
const WORDMARK_FONT = 54;

/* THE POST-PIN UNRAVEL + DESCENT (Task 4). Once the mark is fully wound (the PIN, the "first full
 * bower frame"), scrolling on plays a MIRRORED unravel — NOT a rewind of the wind-up. The seven
 * satellites retract, and the tail opens from the closed circle into a single downward ray that
 * curls the OPPOSITE rotational way from the ravel (tailPtsMirror reflects the ravel tail across the
 * mark circle's own vertical axis x=C.x: circle 0 maps to itself so there is no pop at the pin, but
 * the handedness flips and the ray pays out on the mark's OTHER flank). That ray then keeps flowing
 * down and sweeps toward the PAGE centre, exiting the bottom of the frame, where it hands the one
 * line off to the founders' roots below (AboutPage's SeamBridge + FounderRoots). The whole About
 * page still reads as one continuous ink line: spine -> mark -> mirrored unravel -> founders -> work,
 * with the unravel a mirrored continuation rather than the wind-up retraced. */
const TAIL_LEN = 2 * Math.PI * MARK_R; // the winding tail's arc length (~505); the unwound ray's length
const RAY_END_Y = MARK_CENTER_Y + TAIL_LEN; // where the fully-unwound downward ray ends (P.y + L)
const DESC_DROP = 420; // the sweep below the ray that carries the line to page-centre and out the bottom
const DESC_BOTTOM_Y = RAY_END_Y + DESC_DROP; // the exit point's world Y (the frame's bottom at track end)
const H = DESC_BOTTOM_Y + 80; // total drawing height (now runs past the mark, down through the descent)

/**
 * THE SCROLL TRACK, DERIVED FROM THE DRAWING RATHER THAN PINNED AT 1080vh.
 *
 * The track is how much scroll the camera spends crossing the drawing, so track and drawing height
 * are one fact, not two. 1080vh was tuned by eye against a 5300-unit drawing (the piecewise axis:
 * CONVERGE_Y 3675, plus the 1625 of mark, unwound ray and descent below it). Item 9's uniform axis
 * makes the drawing 7645 units. Left at 1080vh the camera would pan **1.44x faster per scroll** —
 * the same page, whipping by, and nothing would fail. The reveal invariant would even survive it:
 * growth is keyed to the camera's frame, not to the scroll rate, so "complete by halfway" holds at
 * any speed. It would just feel wrong, which is the kind of regression only an eye catches.
 *
 * So the RATE is the constant now, and the track follows the drawing. Change the axis again and the
 * scroll re-derives itself instead of quietly re-pacing the page.
 */
const TRACK_VH_PER_UNIT = 1080 / 5300; // the pacing Daniel approved: 1080vh across a 5300-unit drawing
const TRACK_VH = Math.round(H * TRACK_VH_PER_UNIT);

/**
 * WHERE THE ONE LINE LEAVES THIS DRAWING, as a fraction of the drawing's height — so the founders'
 * parenthesis below can start exactly where the descent stops, instead of guessing.
 *
 * It is NOT 1. The drawing runs 80 world units PAST the exit (see `H`), so in reduced motion — where
 * the SVG is static and full-height — the line ends ~85 CSS px above the SVG's bottom edge. A trunk
 * that starts at the top of the founders' wrapper therefore starts 85px below the line it is
 * supposed to continue, and the page shows a floating stub over a gap. (It did.)
 *
 * In MOTION this fraction is not needed and must not be used: the SVG is a sticky viewport-height
 * frame with a panning camera, the exit sits on the frame's bottom edge at the end of the track, and
 * a sticky box bottoms out at its track's bottom — so the exit lands exactly on the wrapper's top in
 * page coordinates, and stays there however far you scroll on. See FounderParenthesis.
 */
export const DESCENT_EXIT_FRAC = DESC_BOTTOM_Y / H;

/** The fraction of the track that reaches the PIN (mark fully formed). The wind keeps its original
 *  travel; the unravel + descent are the remaining scroll, added below it. 720vh wind + 360vh past. */
const PIN_FRAC = 720 / 1080;

/** The finale wind begins when the mark has risen to this fraction of the way down the frame, and
 *  completes at the pin (mark centred). Kept below 1 so the whole ravel is watched INSIDE the frame,
 *  never above it. */
const WIND_ENTER = 0.82;

/** Autoplay-on-entry timing. A lead-in lets the entry narration settle, then a slow, CONSTANT-speed
 *  descent runs from the top of the timeline to the finale (linear, never accelerating — it holds the
 *  gentle opening pace the whole way down so the timeline stays readable); a strong gesture
 *  fast-forwards to the reveal. */
const AUTOPLAY_LEAD_IN_MS = 2500;
/** Longer than the old 12000 because the descent is now LINEAR (constant velocity) rather than
 *  ease-in-out: an eased 12s peaked ~2x its average speed mid-descent, which read as "speeding up".
 *  A linear 24s holds the slow beginning pace the whole way, so it never accelerates and stays
 *  observable. Tune by watching #/about; must never feel like it accelerates. */
const AUTOPLAY_MS = 24000;
const AUTOPLAY_FF_MS = 650;

/** Resolve the mark + variant A into world geometry: the attach point P on circle 0's far (right)
 *  flank (phi=0), the spine's heading there (psi0, straight down), and the RAVEL wind direction
 *  (sigma). The wound mark is the ORIGINAL bower logo, unchanged. The post-pin UNRAVEL is a MIRROR of
 *  this ravel (see tailPtsMirror) — a different downward curl — not a flip of the ravel itself. */
export function solveMark() {
  const k = MARK_K;
  const r = MARK_R;
  const [c0x, c0y] = MARK_CENTERS[0]; // [65, 50]
  const C = { x: MARK_CENTER_X + (c0x - 50) * k, y: MARK_CENTER_Y + (c0y - 50) * k };
  const P = { x: C.x + r, y: C.y }; // phi = 0: the right flank
  const psi0 = Math.PI / 2; // heading straight down at P
  return { k, r, C, P, psi0, sigma: 1 };
}

/**
 * THE MECHANISM. The last L = 2*pi*r units of the line carry constant curvature w/r.
 *   w = 0  -> a straight ray from P: the spine, continuing.
 *   w = 1  -> total turn 2*pi: a closed circle of radius r, tangent to the spine at P, centred on C.
 * Arc length is exactly L at every w (midpoint-rule integration closes to ~0.01px at w=1), so this
 * is a real unravelling, not a morph between two shapes.
 */
export function tailPts(w: number, N = 420): Array<{ x: number; y: number }> {
  const g = solveMark();
  const L = 2 * Math.PI * g.r;
  const ds = L / N;
  const kappa = w / g.r;
  const pts = [{ x: g.P.x, y: g.P.y }];
  let x = g.P.x;
  let y = g.P.y;
  let psi = g.psi0;
  for (let i = 0; i < N; i++) {
    const mid = psi + g.sigma * kappa * (ds / 2);
    x += Math.cos(mid) * ds;
    y += Math.sin(mid) * ds;
    psi += g.sigma * kappa * ds;
    pts.push({ x, y });
  }
  return pts;
}

/**
 * The mirror of the ravel tail: reflect it across the mark circle's own vertical axis (x = C.x). At
 * w=1 circle 0 maps onto itself; at w=0 it is the downward ray on the OPPOSITE flank (x = 2*C.x-P.x).
 * Only x flips (mirror shares the ravel's y). This is the fully-mirrored end state; the actual
 * unravel MORPHS to it (tailPtsUnravel) so the top stays attached to the lean the whole way.
 */
export function tailPtsMirror(w: number, N = 420): Array<{ x: number; y: number }> {
  const cx = solveMark().C.x;
  return tailPts(w, N).map((p) => ({ x: 2 * cx - p.x, y: p.y }));
}

/**
 * THE UNRAVEL TAIL (continuous, mirrored — not a rewind). A per-point morph between the ravel tail
 * and its mirror, with the mirror amount tied to how OPEN the tail is (m = 1 - w). Because a tail
 * that both starts at P and is circle 0 at the pin is FORCED to curl left (it is the ravel), you
 * cannot keep the top fixed at P AND flip the curl AND keep circle 0 — so instead the top slides
 * continuously P -> P' as it opens, and the render arrives the lean exactly there each frame.
 *   w = 1 (pin) -> m=0: exactly the ravel circle 0. Identical to the wound mark and the pre-pin line
 *                  (no pop). Top at P.
 *   w -> 0      -> m->1: the mirrored downward ray on the opposite flank. Top at P', bottom at the
 *                  mirror ray end = the descent's start (mirrorRayEndX). It curls the OPPOSITE way as
 *                  it pays out — a true mirror, not the wind-up retraced.
 * Only x morphs (mirror shares the ravel's y), so the line stays a clean downward-flowing curve; at
 * m=0.5 it passes through the mark's own vertical axis, reading as "unwind to straight, then curl the
 * other way". Continuity is structural: the lean is pointed at pts[0] and the descent starts at the
 * w=0 bottom, so spine -> lean -> tail -> descent is one stroke at every w.
 */
export function tailPtsUnravel(w: number, N = 420): Array<{ x: number; y: number }> {
  const a = tailPts(w, N);
  const b = tailPtsMirror(w, N);
  const m = 1 - clamp01(w);
  return a.map((p, i) => ({ x: lerp(p.x, b[i].x, m), y: p.y }));
}

/** How far the descending root wanders off its drift, and over how many soft waves. Daniel's redlines
 *  want this root to read as DRAWN and alive (organic S-curves), not a stiff mechanical lean. */
const LEAN_MEANDER_AMP = 40;
const LEAN_MEANDER_WAVES = 2.25;

/**
 * The spine above the attach point: plumb on the axis, then an organic, gently MEANDERING descent
 * onto an attach point at (targetX, P.y). It leaves the axis at (CX, CONVERGE_Y) vertically and
 * arrives at (targetX, P.y) on a vertical tangent, so it hands off to the plumb spine above and to
 * the winding tail below with no kink; the wander in between is what makes it look drawn by hand.
 *
 * `targetX` is a parameter (not hard-wired to P) so the RENDER can point the lean at the tail's
 * CURRENT top every frame. During the ravel that top is P (the original right-flank attach); through
 * the unravel it slides P -> P' as the tail morphs to its mirror. Arriving the lean exactly at the
 * tail's top is what guarantees the spine -> lean -> tail chain is ONE continuous stroke at every
 * scroll position (no gap where the line meets the mark).
 */
export function spineLeanPtsTo(targetX: number): Array<{ x: number; y: number }> {
  const g = solveMark();
  const dx = targetX - CX;
  const y0 = g.P.y - LEAN_SPAN; // = CONVERGE_Y
  const pts = [{ x: CX, y: y0 }];
  // Base drift is a smoothstep (leaves the axis and reaches the target with zero horizontal slope).
  // The meander is a sine enveloped by sin^2(pi*u), whose value AND slope vanish at both ends, so the
  // wander dies exactly at the plumb spine and at the target: the handoffs stay tangent-clean.
  for (let i = 1; i <= 200; i++) {
    const u = i / 200;
    const s = u * u * (3 - 2 * u);
    const env = Math.sin(Math.PI * u);
    const meander = LEAN_MEANDER_AMP * Math.sin(2 * Math.PI * LEAN_MEANDER_WAVES * u) * env * env;
    pts.push({ x: CX + dx * s + meander, y: lerp(y0, g.P.y, u) });
  }
  return pts;
}

/* ------------------- decoupled: what used to live here -------------------- */

/*
 * DELETED 2026-07-16 (round 2), when Daniel decoupled the projects from the timeline: "We had
 * initially tried to have the flowers or the leaves actually holding the projects within the
 * timeline. Scratch that." Everything below existed only so that a BRANCH could CARRY a PLATE, and a
 * plate that is not carried needs none of it:
 *
 *   SEPAL_DEFS / sepalLen / CALYX_LEAF_PROFILES / calyxSprig / sprigPathStyle / SprigOrgan
 *       — the holder: the three-sepal calyx, and the generated botanical that replaced it, which
 *         cupped each plate from below at its inner-bottom corner.
 *   branchAttachY / branchPts / branchPath / BRANCH_WAVE_AMP / BRANCH_WAVE_WAVES / BRANCH_W
 *       — the ornate root from the spine to that corner, and the enveloped sine wander that made it
 *         read as drawn rather than stamped.
 *   computeBranches
 *       — the no-overlap contract over those branches. Now `computePlates`, which the year labels
 *         still need: a plate is still an obstacle, it just isn't hanging off anything.
 *   unfurl / easeUnfurl
 *       — the bloom-opening entrance, and the "weird initial distortion" Daniel called out with it.
 *
 * TWO WHOLE CLASSES OF PROBLEM LEFT WITH THEM, which is the point rather than a side effect: a branch
 * can no longer cross a plate or another branch, and a year label can no longer be cut in half by a
 * branch passing behind it. The 2025 label collision that round 1 fought to a draw and then flagged
 * for Daniel as a composition call is simply gone — there is no branch at 2025 to cross.
 *
 * The page still has branches; they are ORNAMENT now, not structure (see SubBranches). They carry
 * nothing, so nothing can collide with them: when ornament and layout disagree, the ornament loses by
 * construction. That inversion is the lesson of round 1 — letting ornament dictate layout is what
 * produced every collision it then needed rules to solve.
 *
 * Recover any of it from git: `git show fa87d33 -- src/pages/about/CrossPathsTimeline.tsx`.
 */

/* The plate box (`TIER`, `plateBox`) moved to `about/clusters.ts` with the content it measures:
 * a plate's box is derived from its own image's ratio, so the box and the list of images are one
 * fact. `plateBox` is re-exported below for the contract test. */

/** The fixed perpendicular gap from the spine to a plate's near (inner) edge. */
export const OFFSET_X = 110;
/* `CLUSTER_GAP_Y` (the minimum gap between two stacked siblings in one cluster) is declared in
 * `about/clusters.ts` with the content it measures, because `BAND_GAP` is derived from it and the
 * packing runs before this point in the file. */

/**
 * THE PLATE LANE, and it is now a CONSEQUENCE of the packing rather than a frame the packing fits into.
 *
 * It starts below the fuse (so the twist-fuse reads clean before the first project) and ends above the
 * converge point (so the last plate never crowds the spine's lean into the mark). Both ends used to be
 * pinned against an axis that was pinned against nothing: `LANE_BOTTOM = CONVERGE_Y - 160` where
 * `CONVERGE_Y` was the last year's tick, which is why 2026's plate hung below it (see CONVERGE_Y).
 * `CONVERGE_Y` is `LANE_END + 160` now, so this is `LANE_END` — the two agree by construction instead
 * of by arithmetic that happened to line up.
 *
 * These stay as names because the clamps in `layoutClusters` read them, and a clamp that can never fire
 * is still the thing that says it can never fire.
 */
const LANE_TOP = Y_2021;
const LANE_BOTTOM = CONVERGE_Y - 160;
/* CROSS_GAP (the minimum clearance between two clusters in one lane) was deleted with `packSide` on
 * 2026-07-16. It was the floor a year-anchored layout collided against; an evenly spread lane has no
 * floor to hit, because the gap is what is left over rather than what is fought for. */

/** Year-label treatment: heavy, larger, and never occluded. The side each label sits on is chosen
 *  from the data (opposite whichever cluster shares that year). */
const YEAR_LABEL_FONT = 30;
/**
 * Spine to the label's INNER edge. This is a gutter budget, not a taste value, and it is the
 * constant that decides whether a year label can touch a photograph.
 *
 * The gutter between the spine and a plate's near edge is OFFSET_X (110). A year label is
 * YEAR_LABEL_W wide. At the old 56 the label reached 56+78 = 134 from the spine — 24 units INTO
 * the plate lane — so at every year that had a plate on the label's side (2021/2022/2023/2024/
 * 2025), the numerals sat on the photograph and the label's vellum halo punched a hole through
 * the branch running underneath. It was not a 2021 problem and it was not the twist-fuse: it was
 * arithmetic, and it fired on whichever years happened to have a plate packed into the band.
 *
 * At 24 the label reaches 102 and lives entirely inside the gutter, clearing every plate on every
 * side by 8 units. It also lines the label's inner edge up with YEAR_TICK_INNER, so the numeral
 * and its tick now read as one lockup. The label sits ABOVE its tick (YEAR_LABEL_CLEAR), so the
 * two never share a y band despite sharing an x.
 */
export const YEAR_LABEL_OFFSET = 24;
/** Measured glyph width of a four-digit year at YEAR_LABEL_FONT/700 (live getBBox, 2026-07-16).
 *  Exported so the gutter contract can be asserted rather than eyeballed. */
export const YEAR_LABEL_W = 78;
const YEAR_TICK_INNER = 24; // spine to tick inner end
const YEAR_TICK_LEN = 22;
const YEAR_LABEL_CLEAR = 20; // label baseline sits this far above the tick

/** The foliage reveal line sits at 52% of the frame; a plate opens as it rises past it.
 *  Re-exported from about/reveal.ts, which is where the page's ONE motion lives — the founders and
 *  the coda read the same line against the viewport. Two definitions that agree today are two
 *  definitions that disagree later. */

/** The structural reveal front sits BELOW the fold, so whatever is inside the frame is fully drawn
 *  and the spine runs through the bottom edge at every scroll position. */
const DRAW_AHEAD = 0.35;
/** The spine is top-clipped this far above the top edge, so it never shows a top terminus in frame. */
const TOP_CLIP = 60;
/**
 * ITEM 1c: how far the drawing dissolves at the frame's top, in CSS px.
 *
 * `TOP_CLIP` already keeps the spine's TERMINUS out of the viewBox, and that was never the complaint —
 * the line was being sliced flat by the frame's own top EDGE, which is a different thing and is why
 * `revealProps` could not fix it ("both terminals sit off-frame and the line runs edge to edge" is
 * true of the viewBox and false of the screen). This is in px because it is about the SCREEN: a fade
 * measured in world units would get longer or shorter with the camera's scale, and the reader's eye
 * does not know what a world unit is.
 *
 * 72 rather than a rounder number: the frame's top sits 16px below the header, so the fade has 16px of
 * clearance to finish in and 56 more to work with before it starts eating the drawing. It is deep
 * enough that the sliced edge stops reading as an edge, and shallow enough not to ghost the first
 * plate. This is a look call and it is the one number here Daniel may want to move.
 */
const TOP_FADE_PX = 72;

const lineGen = d3line<{ x: number; y: number }>()
  .x((d) => d.x)
  .y((d) => d.y)
  .curve(curveCatmullRom.alpha(0.5));

/** A plain M/L polyline, for the densely-sampled winding tail where a spline's overshoot would fight
 *  the exact circle. */
const poly = (pts: Array<{ x: number; y: number }>) =>
  pts.map((p, i) => (i ? 'L' : 'M') + p.x.toFixed(2) + ' ' + p.y.toFixed(2)).join(' ');

/* ------------------------------ strand sampling --------------------------- */

/** A sampled strand: its path string, plus per-point y, x and normalised arc-length fraction, so we
 *  can reveal only the middle segment between two Y lines. Monotonic in y. */
interface Strand {
  id: string;
  d: string;
  ys: number[];
  xs: number[];
  fracs: number[];
}

function sample(id: string, pts: Array<{ x: number; y: number }>): Strand {
  const ys = pts.map((p) => p.y);
  const xs = pts.map((p) => p.x);
  const cum: number[] = [0];
  for (let i = 1; i < pts.length; i++) {
    const dx = pts[i].x - pts[i - 1].x;
    const dy = pts[i].y - pts[i - 1].y;
    cum.push(cum[i - 1] + Math.hypot(dx, dy));
  }
  const total = cum[cum.length - 1] || 1;
  const fracs = cum.map((c) => c / total);
  return { id, d: lineGen(pts) ?? '', ys, xs, fracs };
}

/** Interpolate the strand at world Y (binary search over the ascending y array). */
function atY(s: Strand, Y: number): { x: number; frac: number } {
  const { ys, xs, fracs } = s;
  const n = ys.length;
  if (Y <= ys[0]) return { x: xs[0], frac: 0 };
  if (Y >= ys[n - 1]) return { x: xs[n - 1], frac: 1 };
  let lo = 0;
  let hi = n - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (ys[mid] <= Y) lo = mid;
    else hi = mid;
  }
  const t = (Y - ys[lo]) / (ys[hi] - ys[lo] || 1);
  return { x: lerp(xs[lo], xs[hi], t), frac: lerp(fracs[lo], fracs[hi], t) };
}

/** Symmetric ease-in-out (cubic): weight at both ends. Used by the post-pin camera pan and the
 *  unravel so neither snaps. (The autoplay effect keeps its own local copy for the entry descent.) */
const easeInOutCubic = (t: number) => {
  const c = clamp01(t);
  return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2;
};

/* --------------------------------- the graph ------------------------------ */

/* The content graph — every cluster, every plate, every measured ratio — now lives in
 * `about/clusters.ts`, and the move is load-bearing rather than cosmetic: the AXIS reads the
 * content now (each year's band is as long as its own work needs), and the axis is evaluated at
 * module init, above where this list used to sit. See the note at the top of that file. */

/* ------------------------------ strand builders --------------------------- */

/**
 * The spine: one straight line born at the twist-fuse (2021) and running plumb down its axis to
 * 2026, where the lean into the mark begins. There is nothing above the junction.
 */
export function spinePts(): Array<{ x: number; y: number }> {
  const pts: Array<{ x: number; y: number }> = [];
  const N = 120;
  for (let i = 0; i <= N; i++) {
    pts.push({ x: CX, y: lerp(CONV_JUNCTION_Y, CONVERGE_Y, i / N) });
  }
  return pts;
}

/* ----------------------------- the spine garland -------------------------- */

/**
 * THE GARLAND (2026-07-16). Clay's gongbi growth composer, grafted onto Daniel's spine.
 *
 * The composer in engine/gongbi/garland.ts grows a plant along an ARBITRARY polyline — that is
 * its whole point — so it is fed `spinePts()`, THIS page's own geometry. His organs, Daniel's
 * line. The composer's own vine is switched off (`tube: false`): the spine stays the drawn SVG
 * line it has always been, at SPINE_W, and the garland contributes leaves and blossom clusters
 * along it and nothing else. This is ornament ON structure, not a replacement for it.
 *
 * Pigment, not ink: the botanicals are the one place on the page where the genome's own palette
 * is allowed (see INK_SEPIA). The structure underneath stays one colour.
 *
 * The strip is a narrow band centred on the spine and drawn 1:1 in world units. It covers only
 * the plumb run (junction → converge); the lean and the winding tail are re-solved every scroll
 * frame, and a raster cannot follow them.
 */
/**
 * The garland's commission. PINNED to take 2 after a seed sweep on 2026-07-16 (six takes grown
 * onto the real spine and compared side by side) — and the seed is the difference between
 * ornament and a stain, so this is a design review, not a constant:
 *   bower/spine    — the genome aims its organs with a random 3D rotation, and this take lands
 *                    its leaves EDGE-ON: they render as curled grey-green slivers that read as
 *                    a smudge on the line. Rejected.
 *   bower/spine-2  — PINNED. A broad sage leaf with a legible midrib arching off the spine, and
 *                    a small pink blossom below. Reads as botany on structure.
 *   bower/spine-5  — a BLUE bell flower. The page just retired blue; pigment on a botanical is
 *                    not a licence to walk it back in. Rejected.
 * Re-curate with the seed sweep, not by eye on one take.
 */
export const GARLAND_SEED = 'bower/spine-2';
/** Half-width of the garland strip in world units: how far an organ may reach off the spine.
 *  Kept inside the gutter (OFFSET_X = 110) so foliage can never touch a plate — and comfortably
 *  wider than the organs actually reach (measured 63 at GARLAND_SCALE), because an organ that
 *  runs off the strip is CLIPPED, and a clipped leaf reads as a broken drawing rather than as
 *  restraint. At 64 the foliage was cut flat against the strip edge. */
export const GARLAND_REACH = 90;
/**
 * Organ scale. NOT 1:1 — the genome's organ sizes are tuned for a whole plant composed on a
 * 1200px canvas, and dropped onto the spine at that scale they measure ~12px: specks. Measured
 * on 2026-07-16 (paintGarland into the real strip, counting visible pixels):
 *   0.62 → reach 26 from the spine, coverage 0.003. Invisible.
 *   1.5  → reach 63,  coverage 0.013. Foliage that reads at the spine's weight.
 *   3+   → reach 64+, clipped by the strip.
 * 1.5 puts the leaves at roughly eight times the spine's width — ornament ON the structure,
 * which is Sai's weight budget, rather than a second plant competing with it.
 */
export const GARLAND_SCALE = 1.5;
/** A station must clear this much y from a branch anchor, so foliage never fouls a fork or the
 *  node dot drawn there. */
const GARLAND_ANCHOR_CLEAR = 46;
/** ...and this much from a year tick, so foliage never crowds a numeral. */
const GARLAND_TICK_CLEAR = 40;

/**
 * Where the garland's organs may grow: the y bands of the spine that the DRAWING itself leaves
 * free. Every branch anchor (a fork, plus its node dot) and every year tick claims a band; the
 * garland takes what is left. Pure and exported — the contract test asserts that no station
 * lands on a fork or a numeral, which is the whole reason the placement is computed rather
 * than sprinkled at even intervals.
 *
 * Returns stations in path-fraction space (0 = the fuse, 1 = the converge point), because that
 * is the coordinate the composer walks.
 */
export function garlandStations(
  clusters: ReadonlyArray<{ year: number }> = CLUSTERS,
  years: readonly number[] = YEAR_TICKS,
): GarlandStation[] {
  const busy: Array<[number, number]> = [];
  for (const c of clusters) {
    const y = yearToY(c.year);
    busy.push([y - GARLAND_ANCHOR_CLEAR, y + GARLAND_ANCHOR_CLEAR]);
  }
  for (const y of years) {
    const ty = yearToY(y);
    // The tick sits at ty and the numeral rides above it; claim both.
    busy.push([ty - GARLAND_TICK_CLEAR - YEAR_LABEL_CLEAR, ty + GARLAND_TICK_CLEAR]);
  }
  busy.sort((a, b) => a[0] - b[0]);

  // Merge the claimed bands, then walk the gaps between them.
  const merged: Array<[number, number]> = [];
  for (const b of busy) {
    const last = merged[merged.length - 1];
    if (last && b[0] <= last[1]) last[1] = Math.max(last[1], b[1]);
    else merged.push([b[0], b[1]]);
  }

  const span = CONVERGE_Y - CONV_JUNCTION_Y;
  const stations: GarlandStation[] = [];
  let cursor = CONV_JUNCTION_Y;
  const ORGANS: GarlandOrgan[] = ['leaf', 'bloom', 'leaf', 'bud', 'leaf', 'bloom'];
  let n = 0;
  const place = (from: number, to: number) => {
    // One organ per ~150 units of free run, centred in its share of the gap, so foliage is
    // spaced by the drawing's own rhythm rather than by a fixed count.
    const room = to - from;
    if (room < 90) return;
    const count = Math.max(1, Math.floor(room / 150));
    for (let i = 0; i < count; i++) {
      const y = from + (room * (i + 0.5)) / count;
      stations.push({ t: (y - CONV_JUNCTION_Y) / span, organ: ORGANS[n % ORGANS.length] });
      n += 1;
    }
  };
  for (const [b0, b1] of merged) {
    if (b0 > cursor) place(cursor, Math.min(b0, CONVERGE_Y));
    cursor = Math.max(cursor, b1);
    if (cursor >= CONVERGE_Y) break;
  }
  if (cursor < CONVERGE_Y) place(cursor, CONVERGE_Y);
  return stations.filter((s) => s.t >= 0 && s.t <= 1);
}

/* ---------------------- the sub-branches (the ornament) ------------------- */

/**
 * THE SUB-BRANCH ENGINE (2026-07-16, round 2). Daniel:
 *
 *   "Now I would like you to make sub-branches to the main timeline. There's a main vertical
 *    timeline that goes from start to finish and then there are leaves and flowers popping out of
 *    the main one. I would like for you to actually create branches that continue and take up the
 *    empty white space that the project images don't fill. These branches will have their own
 *    leaves and flowers... I'd like for you to actually create an engine or an algorithm that
 *    creates the flowers and makes them grow as the timeline continues."
 *
 * THIS DOES NOT REVERSE THE DECOUPLING, and the difference is the whole design. The branches that
 * were deleted were STRUCTURE: they carried the plates, the layout depended on where they went, and
 * `packSide` plus a pile of clearance rules existed to stop them colliding with the things they were
 * holding. These are ORNAMENT: they carry nothing, and they are computed from a layout that is
 * already final. If a branch and a plate ever disagree, the branch loses — not by a rule, but
 * because the plate was placed before `colonize` was called and cannot hear the answer.
 *
 * The growth is space colonization (Runions et al. 2007; see spaceColonization.ts for why that
 * algorithm and not a hand-tuned layout). The short version: attractor points are scattered ONLY in
 * the negative space, and growth is pulled toward them and consumes them as it arrives. Filling the
 * whitespace and avoiding the plates are therefore the same mechanism, not two systems fighting —
 * a plate has no attractors on it, so nothing grows there. There is no collision test in any of this.
 *
 * NOTE on the copy column: the title and the two questions are NOT obstacles here. They render in a
 * sibling flex column OUTSIDE this SVG (see the component's JSX), so they occupy no world-space at
 * all. Modelling them as a rect would carve a hole in the ornament for something that isn't there.
 */

/** The sub-branches' commission. Shares the spine garland's species deliberately — one plant. */
const SUB_SEED = 'bower/spine-2';
/** The colonization parameters. See spaceColonization.ts for what each one means; these are tuned
 *  against the real layout, and the ratios matter more than the values:
 *   - `influence` must exceed the widest attractor-free band a source has to reach across, or growth
 *     never starts. The year-label gutter is the binding one.
 *   - `kill` below ~2*segment makes growth overshoot an attractor and curl back on itself. */
const SUB_SEGMENT = 9;
const SUB_INFLUENCE = 130;
const SUB_KILL = 26;
const SUB_WOBBLE = 0.34;
/** How coarse the attractor scatter is. This is the ornament's density dial: smaller = more, and
 *  the cost is quadratic-ish in the colonize loop, so it is not free. */
const SUB_ATTRACTOR_STEP = 52;
/** Keep attractors (and so growth) off the spine's own band, which the SpineGarland already dresses,
 *  and off the drawn line itself. */
const SUB_SPINE_CLEAR = 30;
/** Breathing room around a plate or a numeral. The ornament grows up to this and stops.
 *  Exported because it is also the honest bound on how far a branch can stray INTO a plate when a
 *  straight segment clips a corner — the contract test measures against this rather than against a
 *  copy of the number. See "THE CONTRACT" in CrossPathsTimeline.test.ts. */
export const SUB_PLATE_PAD = 18;
/**
 * The sub-branch stroke, and it is now the SAME as the spine's — deliberately, on Daniel's ruling:
 * "the main timeline line to be the same thickness as the other branches and leaves".
 *
 * IT USED TO SAY "Thin against SPINE_W (7.5): these read as growth OFF the main line, never as a
 * second spine competing with it." That hierarchy is what he rejected. The line was reading as a rule
 * with plants glued to it, and a trunk 3.4x its own branches is how a rule reads. The weight
 * hierarchy is gone; the ORDER taper below is what still distinguishes a twig from what it forks off
 * (0.72 per order, floored at 0.9), so the drawing keeps its depth without the spine shouting.
 *
 * `SPINE_W` rather than a second `2.2`: two constants that happen to be equal are two constants that
 * disagree later, and this page has been bitten by exactly that (CONV_WEIGHT's 5.3, the trunk with a
 * hardcoded stroke that stepped 46% at the join).
 */
const SUB_BRANCH_W = SPINE_W;
/** The hint line's claimed band: 12px mono, and it overhangs its plate on the outer side. */
const HINT_H = 22;
const HINT_W = 90;
/** Organ scale, below the spine garland's 1.5 — foliage out on a thin twig should not outweigh the
 *  foliage on the trunk. */
const SUB_ORGAN_SCALE = 0.95;

interface WRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const padRect = (r: WRect, p: number): WRect => ({ x: r.x - p, y: r.y - p, w: r.w + 2 * p, h: r.h + 2 * p });
const inRect = (p: Vec2, r: WRect) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;

/**
 * Everything the ornament must not grow into, in world units: every project plate, and every year
 * label that is actually drawn (only the chosen side of each year carries one). This IS the layout —
 * it is read, never written, which is the invariant the whole decoupling rests on.
 */
export function subBranchObstacles(): WRect[] {
  const plates = computePlates();
  const out: WRect[] = [];
  for (const p of plates) {
    out.push(padRect(p.rect, SUB_PLATE_PAD));
    // The HINT line rides just above its cluster's lead plate, in 12px mono at 45% ink. It is the
    // one obstacle here that is neither a plate nor a numeral, and it is easy to miss precisely
    // because it has no box of its own — measured live, foliage grew straight through "LLO: DREAM
    // MACHINE" and "NYC: ROGERS PARTNERS" and left them unreadable. Claim the band it sits in.
    if (p.plateIndex === 0) {
      out.push(
        padRect({ x: p.rect.x - HINT_W, y: p.rect.y - HINT_H - 10, w: p.rect.w + HINT_W * 2, h: HINT_H }, 6),
      );
    }
  }
  // The labels' REAL positions — they follow the plates now, so an obstacle computed off the axis
  // would reserve empty paper and leave the actual numerals open to be grown through. The SIDE has to
  // come from the same source as the render's for the same reason: reserving the mirror of where the
  // numerals actually are protects blank paper and feeds the label to the vine.
  const sides = yearLabelSidePositions();
  for (const [year, ty] of yearLabelPositions()) {
    const side = sides.get(year)!;
    const b = yearLabelBox(side === 'right' ? 1 : -1, ty);
    out.push(padRect({ x: b.x0, y: b.y0, w: b.x1 - b.x0, h: b.y1 - b.y0 }, SUB_PLATE_PAD));
  }
  return out;
}

/**
 * The attractors: a jittered scatter over the drawing's plumb run, minus everything occupied.
 *
 * "MAKES THEM GROW AS THE TIMELINE CONTINUES" is this function's density ramp, and it is an
 * INTERPRETATION of Daniel's phrase that he has not seen yet. Read as: the ornament's own density
 * carries the growth metaphor — sparse at 2021, increasingly lush toward 2026 — so the drawing gets
 * visibly more alive as the practice does. It could instead mean animating the growth on scroll;
 * that is deliberately NOT built (it is a much bigger commitment, and the wrong one to guess at).
 * Show him this, then ask. See the handoff.
 *
 * The scatter is jittered rather than gridded because a grid colonizes into a lattice: growth finds
 * evenly-spaced attractors and lays down evenly-spaced branches that read as a mesh, not a plant.
 */
export function subBranchAttractors(rand: () => number, obstacles: readonly WRect[] = subBranchObstacles()): Vec2[] {
  const out: Vec2[] = [];
  const top = CONV_JUNCTION_Y;
  const bottom = CONVERGE_Y;
  for (let y = top; y < bottom; y += SUB_ATTRACTOR_STEP) {
    for (let x = 0; x < W; x += SUB_ATTRACTOR_STEP) {
      const p = { x: x + rand() * SUB_ATTRACTOR_STEP, y: y + rand() * SUB_ATTRACTOR_STEP };
      if (p.x < 0 || p.x > W || p.y > bottom) continue;
      /*
       * The density ramp: 2021 keeps a twentieth of its candidates, 2026 keeps nearly all of them.
       *
       * STEEPENED 0.18 -> 0.05 BY ITEM 9, and the reason is a genuine interaction between two of
       * Daniel's own asks rather than a tuning whim. The uniform axis hands 2021 and 2022 a full band
       * each for one and two clusters, so the early half of the drawing is now mostly open paper —
       * and open paper is exactly what this scatter fills. Measured after the axis landed and before
       * this change: the late/early branch-point ratio fell to 1.20x, under the 1.5x the "grows as
       * the timeline continues" test asserts. The ornament was quietly colonising the fiction.
       *
       * At 0.05 it is 1.67x, so both asks hold at once: the years are evenly spaced AND the drawing
       * still gets visibly lusher as the practice does. Swept 0.10 (1.41x, still under) and 0.03
       * (1.77x) — 0.05 is the first value that clears with margin rather than the largest available.
       */
      const t = clamp01((p.y - top) / (bottom - top));
      if (rand() > lerp(0.05, 0.95, t)) continue;
      // Off the spine's own band — the SpineGarland already dresses that, and growth started there
      // would just crowd the drawn line.
      if (Math.abs(p.x - CX) < SUB_SPINE_CLEAR) continue;
      if (obstacles.some((r) => inRect(p, r))) continue;
      out.push(p);
    }
  }
  return out;
}

/** Where the sub-branches leave the spine. Regularly spaced down the plumb run; a source with no
 *  attractors within `influence` simply never grows, which is what makes the density ramp above
 *  produce sparse branching at the top without needing a second rule to say so. */
export function subBranchSources(): Vec2[] {
  const out: Vec2[] = [];
  const step = 130;
  for (let y = CONV_JUNCTION_Y + step; y < CONVERGE_Y; y += step) {
    out.push({ x: CX, y });
  }
  return out;
}

/** The grown sub-branches, with their hierarchy, in world space. Deterministic under SUB_SEED. */
export function subBranchPolylines(): Branch[] {
  const rand = seededRandom(`${SUB_SEED}/colonize`);
  const nodes = colonize({
    attractors: subBranchAttractors(seededRandom(`${SUB_SEED}/scatter`)),
    sources: subBranchSources(),
    segment: SUB_SEGMENT,
    influence: SUB_INFLUENCE,
    kill: SUB_KILL,
    wobble: SUB_WOBBLE,
    rand,
    maxNodes: 3000,
  });
  return branches(nodes);
}

/** The sub-branch canvas: the whole plumb run, full width. Unlike the spine's narrow strip this has
 *  to cover everywhere growth can reach, which is everywhere the plates are not. */
export const SUB_BOX = { x: 0, y: CONV_JUNCTION_Y, w: W, h: CONVERGE_Y - CONV_JUNCTION_Y };

/**
 * The organs on the sub-branches, as vines for the garland composer, in STRIP-local px.
 *
 * One request, one canvas, one genome — see GarlandOpts.vines for why this is batched rather than a
 * request per branch (short version: per-branch requests either grow a different species per branch,
 * or restart the same rng and stamp identical organs on every one).
 *
 * `tube: false`, exactly like the spine's graft: the STEMS are drawn in SVG in INK_SEPIA (structure
 * is one colour — see CLAUDE.md), and the composer contributes only pigment foliage. A vine whose
 * tube was painted by the composer would put the genome's own branchColor on the page as structure,
 * which is the one thing the colour law forbids.
 */
/**
 * ORGANS GROW ON TWIGS, NOT ON THE TRUNK (2026-07-16, round 3). Daniel: "Currently the leaves and
 * flowers are immediately on the branch, although realistic, are lacking and they lack more depth
 * and texture that I feel like sub-branches would give it a lot of strength."
 *
 * He is right and it was nearly free: space colonization already grows a hierarchy, and the organs
 * were simply being hung on every tier of it including the trunk. `branches()` now reports each run's
 * `order`, so a run only carries foliage once it is at least `SUB_ORGAN_MIN_ORDER` deep. The trunk
 * runs bare out of the spine, forks, and only the twigs bloom — which is what reads as depth, because
 * it is the structure a real branch has.
 */
const SUB_ORGAN_MIN_ORDER = 1;

export function subBranchVines(runs: readonly Branch[]): GarlandVine[] {
  const rand = seededRandom(`${SUB_SEED}/organs`);
  const ORGANS: GarlandOrgan[] = ['leaf', 'bloom', 'leaf', 'bud', 'leaf', 'leaf', 'bloom'];
  let n = 0;
  const vines: GarlandVine[] = [];
  for (const b of runs) {
    const path = b.pts.map((p) => [p.x - SUB_BOX.x, p.y - SUB_BOX.y] as [number, number]);
    if (b.order < SUB_ORGAN_MIN_ORDER) {
      // The trunk is drawn (its stem is in the SVG) but carries nothing. A vine with no stations
      // paints nothing at all, which is exactly right — and it keeps the vine list aligned 1:1 with
      // the runs, so the caller does not have to reason about which ones were dropped.
      vines.push({ path, stations: [] });
      continue;
    }
    // Length in world units decides how much a twig can carry: a two-segment twig gets one organ, a
    // long arc gets several. Deeper orders carry MORE per unit length — the outermost growth is the
    // youngest and the busiest, which is the other half of what makes a plant read as a plant.
    let length = 0;
    for (let i = 1; i < b.pts.length; i++) {
      length += Math.hypot(b.pts[i].x - b.pts[i - 1].x, b.pts[i].y - b.pts[i - 1].y);
    }
    const per = b.order >= 3 ? 52 : b.order === 2 ? 64 : 84;
    const count = Math.max(1, Math.round(length / per));
    const stations: GarlandStation[] = [];
    for (let i = 0; i < count; i++) {
      const t = clamp01(0.25 + (0.75 * (i + rand())) / count);
      stations.push({ t, organ: ORGANS[n % ORGANS.length] });
      n += 1;
    }
    vines.push({ path, stations });
  }
  return vines;
}

/** A branch's stroke, thinning with order: the trunk carries the weight and a twig is a hair. This
 *  taper is what lets the eye read trunk -> branch -> twig at a glance, and it is why the organs
 *  sitting only on the twigs reads as depth rather than as randomness. */
export function subBranchWidth(order: number): number {
  return Math.max(0.9, SUB_BRANCH_W * Math.pow(0.72, order));
}

/**
 * THE WHOLE ORNAMENT'S stagger, root to deepest twig, in world units of card-line travel — a TOTAL,
 * not a per-order rate. Trunk -> branch -> twig, in that order, rather than a tree that fades in
 * uniformly (which is just a fade). This one is the timeline's own: the founders' arms have no
 * botanical order to stagger by.
 *
 * IT WAS `SUB_GROW_ORDER_LAG = 55`, PER ORDER, AND UNBOUNDED — which is the round 10 defect. Space
 * colonization grows a tree 21 orders deep, so the deepest twigs waited 21 x 55 = 1155 units behind
 * the trunk, against an UNFURL_SPAN of 175. Nobody chose 1155; it fell out of a per-order rate
 * meeting a tree whose depth is an emergent property of the layout. Measured at viewH 1293: 195 of
 * 195 runs unfinished at the halfway mark, median completion 16.4% of the frame, and 64 of them
 * still growing after they had scrolled off the top. The reveal was staggered over most of a screen
 * height and the tail of it played to nobody.
 *
 * A TOTAL cannot run away, and that is the only reason it is one: the depth may change with any
 * layout edit (it is emergent), and the budget must not change with it.
 *
 * 350 is what the motion WANTS: the event then occupies `span + stagger` = 525 units below the
 * halfway mark, ~41% of a 1293-unit frame (a 900px viewport), so growth begins at ~91% of the frame
 * and is over by 50%. The reader watches the whole thing happen in the bottom half of the screen.
 *
 * It is a CEILING, not the value — see `subBranchStagger`. 525 units do not fit a 1000-unit frame
 * (a ~700px viewport), which has only 500 below the halfway mark, and the test caught 350 doing
 * exactly that. An absolute distance measured against a frame that varies is the same mistake
 * CARD_LINE made one constant ago; the answer is the same too, which is to fit it to the frame.
 */
export const SUB_ORDER_STAGGER = 350;

/**
 * The stagger this frame can actually afford: what the motion wants, or what fits, whichever is less.
 *
 * The event has `frameH * (1 - GROWN_BY)` of room below the halfway mark and the span is spent first,
 * so the stagger gets the remainder. On a short viewport the ornament staggers less and the whole
 * event compresses — which is the right failure: a flatter trunk-to-twig read is a small loss, and
 * growth beginning below the bottom edge is a total one, because "complete by halfway" would then be
 * true only by being invisible. Degrade the thing the reader can barely see, never the thing the
 * rule is for.
 */
export function subBranchStagger(frameH: number): number {
  return Math.max(0, Math.min(SUB_ORDER_STAGGER, frameH * (1 - GROWN_BY) - UNFURL_SPAN));
}

/**
 * How far behind the root a branch of `order` waits, given the tree's actual depth and the stagger
 * this frame can afford.
 *
 * Normalising by `maxOrder` is what turns a rate into a budget: the depth is EMERGENT (space
 * colonization grows whatever the layout leaves room for, and it reached 21), so a per-order rate
 * hands the reveal's total length to the ornament to decide. That is how it got to 1155 units.
 *
 * Exported because reveal.test.ts measures the real geometry through it. A copy of this arithmetic
 * in the test would pass happily while the page did something else.
 */
export function subBranchOrderLag(order: number, maxOrder: number, stagger: number): number {
  return maxOrder > 0 ? (order / maxOrder) * stagger : 0;
}

/** One organ's reveal disc: where it sits, and which branch's growth it waits on. */
interface OrganMark {
  x: number;
  y: number;
  branch: number;
  t: number;
}

/** Every station's world position, resolved once. Pure, and it reads the SAME vine list the painter
 *  is given, so a disc cannot drift from the organ it uncovers. */
export function subOrganMarks(runs: readonly Branch[]): OrganMark[] {
  const out: OrganMark[] = [];
  subBranchVines(runs).forEach((vine, bi) => {
    const pts = vine.path;
    for (const s of vine.stations) {
      // The painter's own index arithmetic (see paintGarland's station loop), so the disc lands on
      // the organ rather than near it. It resamples at 4px first; over a 9px-segment polyline the
      // difference is under a segment and far under SUB_ORGAN_R.
      const idx = Math.max(1, Math.min(pts.length - 1, Math.round(s.t * (pts.length - 1))));
      out.push({ x: pts[idx][0] + SUB_BOX.x, y: pts[idx][1] + SUB_BOX.y, branch: bi, t: s.t });
    }
  });
  return out;
}

/**
 * The sub-branches: sepia stems drawn in SVG, with the gongbi organs painted once off-thread and
 * hung over them. Ornament only — nothing on this page reads its geometry back.
 *
 * THEY GROW (2026-07-16, round 4). Daniel: "I think it would be very beautiful if... we could
 * actually see the plants and the branches being assembled as it is coming down. Currently
 * everything will appear all at once and it's already existing there, which feels cheap and it
 * doesn't feel like the growing that our projects have done. It kind of fades in or generates
 * alongside our projects and BOTH OF THOSE EMISSIONS SHOULD MATCH EACH OTHER."
 *
 * THE SYNC IS THE REQUIREMENT, and it is what chooses the mechanism. The plates fade on
 * `clamp01((cardLineY - y - 10) / UNFURL_SPAN)` — the camera's own card line, sweeping down the
 * drawing. So the branches reveal on the SAME LINE, with the same span and the same linear ramp,
 * evaluated at their own y. A plate arriving and the branch beside it growing are then not two
 * animations that agree; they are one expression read at two places, and they cannot drift.
 *
 * (An entry-triggered IntersectionObserver was the other candidate and it is the wrong one HERE:
 * the plates are scroll-driven, so an observer would make the branch a DIFFERENT event from the
 * plate beside it, which is the one thing the note rules out. Nor is this the expensive kind of
 * scroll-scrubbing: the camera already re-renders every frame and the plates already do exactly
 * this, so it costs nothing new. Nothing about PAINTING is deferred — the bitmap is still painted
 * once on mount.)
 *
 * THIS DOES NOT REGRESS "fade, don't grow". That rule governs the PLATES, whose objection was a
 * layout-affecting transform distorting the image (`unfurl`'s scale(0.92, 0.64)). A stroke revealing
 * along its own path distorts nothing: the geometry is final before the first frame, and only how
 * much of it is inked changes.
 */
function SubBranches({ reduced, cardLineY, stagger }: { reduced: boolean; cardLineY: number; stagger: number }) {
  // Precomputed at build time, not colonized at render — see subBranches.generated.json. The old
  // `subBranchPolylines()` here was the intro's stagger: it blocked the main thread for ~2.2s while
  // the texts sat frozen. subBranchPolylines() is still the source of truth (the generator + drift
  // guard call it); this render just reads what it already produced.
  const runs = useMemo(() => SUB_BRANCHES_PRECOMPUTED as Branch[], []);
  const lens = useMemo(() => runs.map((b) => polyLen(b.pts)), [runs]);
  const marks = useMemo(() => subOrganMarks(runs), [runs]);
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    requestGarland({
      // ONLY THE SPECIES ROLLS. SUB_SEED still seeds the colonization, the scatter and the
      // stations, so the structure and every growth station are identical on every load — that is
      // the half of the note that says "specific spots". This is the other half: which leaf and
      // which flower grow on those spots. See about/species.ts.
      seed: PAGE_SPECIES,
      voice: 'pigment',
      width: SUB_BOX.w,
      height: SUB_BOX.h,
      vines: subBranchVines(runs),
      scale: SUB_ORGAN_SCALE,
      tube: false, // the stems are drawn below, in sepia; the composer only brings foliage.
    })
      .then((painted) => {
        if (live) setUrl(painted);
      })
      .catch((err: unknown) => {
        // The stems still draw: a failed garland costs the page its flowers, not its drawing. But a
        // broken painting room must never look like a design choice.
        console.error('gongbi sub-branch garland failed:', err);
      });
    // NOTHING TO REVOKE. The object URL belongs to the painter's session cache and is shared by
    // every caller of this garland — revoking it here would hand the next mount a dead URL and the
    // ornament would silently vanish. See requestGarland.
    return () => {
      live = false;
    };
  }, [runs]);

  // THE SAME expression the plates fade on, read at each branch's ROOT — so a branch starts growing
  // exactly when the card line reaches where it leaves its parent, on the plates' own line, span and
  // ramp. The order lag is what keeps the traversal botanical: a twig cannot draw before the branch
  // carrying it.
  //
  // The lag is normalised by the tree's REAL depth (see subBranchOrderLag) rather than being a rate
  // per order, so the whole stagger is a fixed budget the card line can be placed against. The depth
  // is emergent — it comes out of space colonization reading the layout — so a rate here means the
  // reveal's length is decided by whatever the ornament happens to grow into. That is how it reached
  // 1155 units.
  const maxOrder = useMemo(() => runs.reduce((m, b) => Math.max(m, b.order), 0), [runs]);
  const growOf = (b: Branch) =>
    reduced ? 1 : growAt(cardLineY, b.pts[0].y, UNFURL_SPAN, subBranchOrderLag(b.order, maxOrder, stagger));
  const grows = runs.map(growOf);

  /*
   * THE ORGANS' REVEAL — a disc per station, each waiting on ITS OWN BRANCH's draw.
   *
   * The composer paints every organ of a garland into ONE bitmap (one canvas, one genome — see
   * GarlandOpts.vines), so there is no per-organ element to fade and the reveal has to be a mask.
   *
   * The first cut made that mask a soft horizontal WIPE trailing the card line — one rect, cheap,
   * and wrong. It assumed foliage sits below the root it grows from. Space colonization grows in
   * every direction: MEASURED, 195 of 332 organs sit ABOVE their own branch's root, by up to 278
   * world units. So the wipe uncovered blossoms whose twig had not been drawn yet, and the page
   * showed flowers floating on bare paper. No lag value fixes that — a lag big enough to cover 278
   * units detaches the foliage from the growth entirely.
   *
   * A disc per station keyed to its branch's `grow` cannot have that bug by construction: the organ
   * is uncovered by the same number that inks the twig under it. 332 discs, resolved once; only
   * their opacity moves.
   */
  return (
    <g pointerEvents="none">
      <defs>
        {/*
          * Soft-edged, so an organ blooms out of the paper instead of arriving inside a circle — but a
          * RIM FEATHER, not a wash. This is "the strange blur on our flowers" (Daniel, 2026-07-17), and
          * it is the THIRD of three identical copies of this gradient; Edward measured and fixed the
          * other two (`#coda-organ-disc`, `#paren-organ-disc`) in `2a77821`. All three were the same
          * four lines, which is why he said "our flowers" and not "that flower".
          *
          * MASK ALPHA IS LUMINANCE, and that is the whole bug. `offset 0.45 -> #fff` does not mean
          * "feather the last 55%" — it means the disc is fully opaque only inside r = 38.25 of an
          * `ORGAN_DISC_R` of 85, and then ramps to nothing. The painted organs are much bigger than
          * 38.25. Measured independently against THIS disc's own radius: mean applied alpha 0.551, and
          * only 20.3% of the disc's area ever reaches full opacity. **Two thirds of every organ on
          * every twig has been rendering semi-transparent, forever** — not during the reveal, at steady
          * state, with the camera settled and nothing growing.
          *
          * IT IS NOT A TIMING BUG, and that matters because this page has one in the same organ.
          * Round 10 found `organAt` keyed to a growth that saturates at 1 while asking for
          * `t + LAG + FADE`, so 87 of 218 organs could never reach full opacity. That was real, it was
          * fixed, and this survived it: this is a permanent property of the mask, so no reveal change
          * could ever have reached it. Same symptom, different mechanism, and fixing the first made the
          * second look like taste.
          *
          * TWO STOPS, TWO MECHANISMS, BOTH NEEDED (Edward's finding, verified here):
          *   - `0.45 -> 0.9` makes the core opaque out to where the organ actually is (81.0% of the
          *     disc, mean alpha 0.903). A feather at the rim, which is what "soft-edged" meant.
          *   - `stopOpacity=0` on the black stop: the rim was OPAQUE black, and mask children composite
          *     SOURCE-OVER, so a later disc's rim painted over an earlier disc's revealed core. With
          *     332 discs on this layer they overlap constantly, so an organ could be dimmed by a
          *     NEIGHBOUR's edge — nothing to do with its own reveal.
          */}
        <radialGradient id="sub-organ-disc">
          <stop offset="0.9" stopColor="#fff" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </radialGradient>
        <mask id="sub-organ-mask" maskUnits="userSpaceOnUse" x={SUB_BOX.x} y={SUB_BOX.y} width={SUB_BOX.w} height={SUB_BOX.h}>
          {marks.map((m, i) => {
            // The twig reaches the station at grow == t; the organ opens a beat after that.
            const o = organAt(grows[m.branch], m.t);
            if (o <= 0.001) return null;
            return (
              <circle key={i} cx={m.x} cy={m.y} r={ORGAN_DISC_R} fill="url(#sub-organ-disc)" opacity={o} />
            );
          })}
        </mask>
      </defs>
      {runs.map((b, i) => {
        const grow = grows[i];
        if (grow <= 0.001) return null;
        return (
          <path
            key={i}
            // A probe handle, and it is cheap because the state is already legible from the DOM: a
            // stem still growing carries a stroke-dasharray, and a finished one carries none at all
            // (see dashProps, which returns {} at full growth on purpose). So "is anything still
            // growing above the halfway line?" — Daniel's rule, exactly — is answerable from the
            // rendered page without instrumenting the motion. qa/growth-timing.mjs asks it.
            data-sub-branch={b.order}
            d={lineGen(b.pts) ?? ''}
            fill="none"
            stroke={INK_SEPIA}
            strokeOpacity={0.62}
            strokeWidth={subBranchWidth(b.order)}
            strokeLinecap="round"
            strokeLinejoin="round"
            // Root-first pts (see Branch.pts) mean the dash pays out root -> tip: the branch grows
            // OUT of its parent rather than materialising along its whole length.
            //
            // `stemDrawAt`, not `grow`: the stem is fully inked at STEM_SHARE of the branch's
            // progress, and the last third belongs to the tip organs opening. Handing the raw growth
            // to both this and organAt is what left two fifths of the flowers permanently half-open.
            {...dashProps(lens[i], stemDrawAt(grow))}
          />
        );
      })}
      {url && (
        <image
          href={url}
          mask={reduced ? undefined : 'url(#sub-organ-mask)'}
          x={SUB_BOX.x}
          y={SUB_BOX.y}
          width={SUB_BOX.w}
          height={SUB_BOX.h}
          style={{ transition: reduced ? undefined : 'opacity 900ms ease-out' }}
        />
      )}
    </g>
  );
}

/** The garland strip's world-space box: a band hugging the spine over its plumb run. */
export const GARLAND_BOX = {
  x: CX - GARLAND_REACH,
  y: CONV_JUNCTION_Y,
  w: GARLAND_REACH * 2,
  h: CONVERGE_Y - CONV_JUNCTION_Y,
};

/* ------------------------------ item 3: the mark flowers ------------------- */

/**
 * ORNAMENT ON THE BOWER MARK (item 3, 2026-07-17). Daniel: the mark should carry leaves and flowers
 * too — "include leaves and flowers" was said of the spine AND the logo in the same breath.
 *
 * THE RULE QUESTION, VERIFIED HERE RATHER THAN INHERITED. CLAUDE.md forbids overlaying the BowerMark
 * on a painting, and the reason is mechanical: `matRect` (engine/gongbi/quality.ts) crops a whole
 * plant SPECIMEN with `sy = bounds.ymax + padding - side`, which base-anchors it so its densest region
 * sits on the mat's bottom pixel row — so anything at the frame's base collides with it by
 * construction, for every seed. **That is a fact about matting a specimen.** `requestGarland` /
 * `paintGarland` never call `matRect`: a `GarlandVine` is `{ path, stations }` and the composer walks
 * an arbitrary polyline, growing organs at the stations it is given and nothing else. Checked the
 * import graph, not the claim. **No collision — provided this uses the garland mechanism and never
 * composites a specimen behind the mark.** That proviso is the rule; it is not a formality.
 *
 * THE PATH IS THE MARK'S OWN STROKE, which is the whole point of "grown along it" rather than "placed
 * near it". The Oculus is eight circles of `MARK_R` whose centres ring `MARK_CENTER` at 15 * MARK_K,
 * so the rosette's outer envelope is a circle of `MARK_RING_R`. The vine walks that envelope: every
 * organ sits exactly where the mark's own linework runs, and the foliage reads as growing ON the
 * drawn circles rather than floating around them.
 *
 * WHAT KEEPS IT INSIDE DANIEL'S FOUR CONSTRAINTS (small, balanced, part of nature, geometry
 * undeformed, does not obstruct):
 *  - **UNDEFORMED, BY CONSTRUCTION.** This is a separate painted layer under its own <image>. It
 *    cannot move a circle: the mark is SVG `<circle>`s solved by `solveMark`, drawn after this, and
 *    nothing here feeds back into them. The ornament reads the geometry; the geometry never reads the
 *    ornament — the page's oldest rule, and the reason the sub-branches were safe to add.
 *  - **BALANCED**, because the stations are placed by ARITHMETIC and not by a seed: `MARK_STATIONS`
 *    evenly spaced around the ring. A seed would need curating (CLAUDE.md: "a seed is a design review,
 *    not a constant"), and there is nothing to curate here — even spacing on a circle IS the balance.
 *  - **SMALL**: `MARK_ORGAN_SCALE` sits below the spine garland's 1.5, so the mark's foliage never
 *    outweighs the trunk's.
 *  - **DOES NOT OBSTRUCT**: it is painted BEFORE the mark's circles in document order, so the linework
 *    is always on top of its own flowers. If an organ ever lands over a stroke, the stroke wins.
 *  - **PART OF NATURE**: `PAGE_SPECIES`, the same roll the spine and the sub-branches use, so it is
 *    the same plant. A second species here would read as decoration stuck onto the logo, which is the
 *    exact complaint ("not a rule with plants glued to it") one organ down.
 */
/** The rosette's outer envelope: the ring the mark's circles actually reach. 15 * MARK_K is the
 *  circle-centre ring (CENTERS orbit (50,50) at radius 15 in the artwork's own 100-unit box). */
export const MARK_RING_R = 15 * MARK_K + MARK_R;
/** How many organs ring the mark. Small and even — Daniel asked for "a small balanced number". Six on
 *  a circle reads as deliberate rather than scattered, and leaves the ring mostly bare linework. */
const MARK_STATIONS = 6;
/** Below the spine garland's GARLAND_SCALE (1.5): the mark is the page's smallest structure and its
 *  foliage must not out-shout the trunk's. */
export const MARK_ORGAN_SCALE = 0.85;
/** The fraction of the wind at which the mark starts to flower. Late, so the ring closes and blooms as
 *  one event rather than the foliage arriving on a circle that is still an arc. */
const MARK_BLOOM_FROM = 0.75;
/** The strip the mark's garland paints into: the rosette plus the reach its organs need. */
export const MARK_GARLAND_BOX = {
  x: MARK_CENTER_X - MARK_RING_R - GARLAND_REACH,
  y: MARK_CENTER_Y - MARK_RING_R - GARLAND_REACH,
  w: 2 * (MARK_RING_R + GARLAND_REACH),
  h: 2 * (MARK_RING_R + GARLAND_REACH),
};

/** The mark's envelope as a root-first polyline in strip px. Pure and exported: the contract test
 *  asserts it closes on the ring the mark's circles actually reach, rather than trusting the radius. */
export function markGarlandPath(): Array<[number, number]> {
  const N = 96;
  const pts: Array<[number, number]> = [];
  for (let i = 0; i <= N; i++) {
    const a = (i / N) * 2 * Math.PI - Math.PI / 2; // start at the top, walk clockwise
    pts.push([
      MARK_CENTER_X + MARK_RING_R * Math.cos(a) - MARK_GARLAND_BOX.x,
      MARK_CENTER_Y + MARK_RING_R * Math.sin(a) - MARK_GARLAND_BOX.y,
    ]);
  }
  return pts;
}

/**
 * Where the organs sit along that ring, and which ones: evenly, by arithmetic. Exported so the
 * contract test can assert the balance rather than eyeball it. `t` is position along the path,
 * 0 (root) to 1 (tip).
 *
 * THE ORGAN CYCLE IS THE SPINE GARLAND'S OWN, deliberately: `garlandStations` walks
 * `['leaf', 'bloom', 'leaf', 'bud', 'leaf', 'bloom']`, so the mark ends up dressed in the same rhythm
 * as the line that winds into it — leaf-heavy, blooms apart. A different mix here would read as a
 * logo decorated to match a drawing rather than as the end of one plant.
 */
export function markGarlandStations(n: number = MARK_STATIONS): GarlandStation[] {
  const ORGANS: GarlandOrgan[] = ['leaf', 'bloom', 'leaf', 'bud', 'leaf', 'bloom'];
  // Offset by half a step so no organ lands exactly on the path's own seam at t=0/1, where the
  // composer's root and tip meet and an organ would read as a join rather than as growth.
  return Array.from({ length: n }, (_, i) => ({ t: (i + 0.5) / n, organ: ORGANS[i % ORGANS.length] }));
}

/** The spine's polyline in STRIP-local pixels (the composer paints into its own canvas). */
export function garlandPath(): Array<[number, number]> {
  return spinePts().map((p) => [p.x - GARLAND_BOX.x, p.y - GARLAND_BOX.y] as [number, number]);
}

/**
 * The garland, painted once off-thread and hung on the spine as an <image>. It is deliberately
 * NOT part of the scroll-reveal choreography: the reveal gates the STRUCTURE (the spine draws
 * itself as you descend), and a raster cannot be dash-offset. It fades in when it arrives.
 */
/**
 * The mark's foliage. Painted like every other garland; revealed by the WIND, not by a clock.
 *
 * `windW` IS THE GATE, AND THAT IS DELIBERATE RATHER THAN CONVENIENT. The mark does not exist until
 * the line has wound itself into it — at `windW` < 1 the tail is still a partial arc, so foliage on a
 * finished ring would be flowers on a circle that has not closed. It opens over the last of the wind
 * (`MARK_BLOOM_FROM` → 1) so the mark finishes and flowers as one event, and it closes again on the
 * unravel because `windW` runs backwards there — the ornament unwinds with the thing it grows on
 * instead of hanging in the air over an opening ray.
 *
 * IT IS NOT ON A TIMER, AND THE ONE NEXT DOOR TAUGHT ME WHY. `SpineGarland` fades on
 * `transition: opacity 900ms` — which is DEAD: its `opacity: url ? 1 : 0` sits after `if (!url) return
 * null`, so `url` is always truthy, opacity is always 1, and a freshly-mounted element has nothing to
 * fade from. The whole spine garland therefore appears the instant its bitmap finishes painting
 * (~7.7s), independent of scroll and of where the camera is. **A CSS transition cannot reveal
 * something on scroll; only a scroll-driven value can.** So this one takes `windW` as a prop.
 */
function MarkGarland({ reduced, windW }: { reduced: boolean; windW: number }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    requestGarland({
      // The same roll as the spine and the sub-branches: one page, one plant.
      seed: PAGE_SPECIES,
      voice: 'pigment',
      width: MARK_GARLAND_BOX.w,
      height: MARK_GARLAND_BOX.h,
      path: markGarlandPath(),
      stations: markGarlandStations(),
      scale: MARK_ORGAN_SCALE,
      tube: false, // the mark's circles ARE the stem, and they are drawn in SVG over this.
    })
      .then((painted) => {
        if (live) setUrl(painted);
      })
      .catch((err: unknown) => {
        // The mark is the page's climax and it is SVG: a failed garland costs it flowers, not itself.
        console.error('gongbi mark garland failed:', err);
      });
    // NOTHING TO REVOKE — the URL belongs to the painter's session cache. See requestGarland.
    return () => {
      live = false;
    };
  }, []);

  if (!url) return null;
  const bloom = reduced ? 1 : clamp01((windW - MARK_BLOOM_FROM) / (1 - MARK_BLOOM_FROM));
  if (bloom <= 0.001) return null;
  return (
    <image
      href={url}
      x={MARK_GARLAND_BOX.x}
      y={MARK_GARLAND_BOX.y}
      width={MARK_GARLAND_BOX.w}
      height={MARK_GARLAND_BOX.h}
      opacity={bloom}
      style={{ pointerEvents: 'none' }}
    />
  );
}

function SpineGarland({ reduced }: { reduced: boolean }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    requestGarland({
      // THE SPECIES VARIES PER LOAD; the stations do not. GARLAND_SEED still pins WHERE the
      // foliage sits (garlandStations is seeded off it) — only which plant grows there is rolled.
      // See about/species.ts.
      seed: PAGE_SPECIES,
      voice: 'pigment',
      width: GARLAND_BOX.w,
      height: GARLAND_BOX.h,
      path: garlandPath(),
      stations: garlandStations(),
      scale: GARLAND_SCALE,
      tube: false, // Daniel's spine is the stem; the composer only brings foliage.
    })
      .then((painted) => {
        if (live) setUrl(painted);
      })
      .catch((err: unknown) => {
        // A failed garland must leave the page intact — the spine is the load-bearing thing and
        // it is drawn in SVG — but a broken painting room must not look like a design choice.
        console.error('gongbi spine garland failed:', err);
      });
    // NOTHING TO REVOKE. The object URL belongs to the painter's session cache and is shared by
    // every caller of this garland — revoking it here would hand the next mount a dead URL and the
    // ornament would silently vanish. See requestGarland.
    return () => {
      live = false;
    };
  }, []);

  if (!url) return null;
  return (
    <image
      href={url}
      x={GARLAND_BOX.x}
      y={GARLAND_BOX.y}
      width={GARLAND_BOX.w}
      height={GARLAND_BOX.h}
      style={{
        opacity: url ? 1 : 0,
        transition: reduced ? undefined : 'opacity 900ms ease-out',
        pointerEvents: 'none',
      }}
    />
  );
}

/* ------------------------------- the layout ------------------------------- */

/** Per-cluster layout result: the shared branch anchor on the spine, and each plate's box. */
interface LaidCluster {
  id: string;
  /** The AUTHORED year. Kept through the layout because the year labels follow the plates now
   *  (see yearLabelYs) and need to know which year a laid-out plate belongs to. */
  year: number;
  side: Side;
  dir: number;
  hint: string;
  spineX: number;
  anchorY: number;
  /** The plates' near edge on this side: the lane the projects stand in, beside the spine. */
  edgeX: number;
  plates: Array<{ x: number; y: number; w: number; h: number; media: Plate }>;
}

/**
 * Spread one side's clusters EVENLY down its lane. Pure and deterministic (exported for tests).
 *
 * THE PLATES NO LONGER SIT AT THEIR TRUE YEAR (2026-07-16, round 3), and that is a licence Daniel
 * gave explicitly: "I would go ahead and add more white space in between project images. At some
 * point it gets really convoluted and difficult to read. I think just spreading them more evenly all
 * throughout, even if it distorts our accuracy when it comes to the timeline, is fine as long as it
 * is displayed better."
 *
 * This replaces `packSide`, which anchored each cluster on its true year and only pushed it down when
 * it collided with the one above. That model produced exactly the complaint, and it measured: on the
 * left lane the gaps ran 48, 48, 48, 333, 48, 40, 48 — five at the hard minimum and one void of 333.
 * The lane had 1133 units of slack in it; the year axis just happened to dump all of it in one place,
 * because the projects are not evenly distributed in TIME (three left clusters sit inside 2023.0 to
 * 2023.55, and their plates are 200-350 tall each).
 *
 * So the axis stops deciding where plates go. What survives is ORDER — clusters are laid out in year
 * sequence, which is the part that makes it a timeline at all — and the year labels still sit at their
 * true `yearToY`. What is given up is the metric claim that a plate's y means its date. That is the
 * distortion he authorised, and it buys roughly 3x the breathing room in the crowded stretches, plus
 * the negative space the sub-branches then colonize (which is the same lever, not a second one).
 *
 * The gap is DERIVED, not a constant: whatever slack the lane has left after the stacks, shared out
 * evenly — including above the first cluster and below the last, so a lane reads as evenly set rather
 * than top-aligned with a hole at the bottom.
 */
export function spreadSide(
  items: Array<{ id: string; heights: number[] }>,
  laneTop: number,
  laneBottom: number,
  gapWithinCluster: number,
  /**
   * Start the first cluster AT `laneTop` instead of one gap below it, paying the slack out between
   * the clusters and below the last one only.
   *
   * Round 10, item 9: a year's band uses this so its first plate lands exactly on the year's tick,
   * which is what makes the titled years come out evenly spaced BY CONSTRUCTION. Without it, the top
   * margin is a share of that year's own leftover, so a sparse year's first plate sits further below
   * its tick than a dense year's and the labels drift apart again — measured at up to ~300 units,
   * which is better than the 22.7x it replaced and still not "equal".
   *
   * Defaults false, so the even-end-to-end behaviour every other caller relies on is untouched.
   */
  flushTop = false,
): Map<string, number> {
  const stackHeight = (heights: number[]) =>
    heights.reduce((s, h) => s + h, 0) + Math.max(0, heights.length - 1) * gapWithinCluster;
  const sum = items.reduce((s, it) => s + stackHeight(it.heights), 0);
  // n + 1 gaps: one above each cluster, and one below the last. Flush-top has no gap above the
  // first, so the same slack is shared between n instead.
  const slots = flushTop ? Math.max(1, items.length) : items.length + 1;
  const gap = (laneBottom - laneTop - sum) / slots;
  const tops = new Map<string, number>();
  let y = flushTop ? laneTop : laneTop + gap;
  for (const it of items) {
    tops.set(it.id, y);
    y += stackHeight(it.heights) + gap;
  }
  return tops;
}

function layoutClusters(spine: Strand): LaidCluster[] {
  const tops = new Map<string, number>();
  /*
   * EACH YEAR OWNS A BAND AS LONG AS ITS OWN WORK NEEDS (2026-07-17). Daniel, after seeing the equal
   * bands he had asked for: the bands "DO NOT HAVE TO BE EQUAL... NOR PROPORTIONATE IN ANY WAY. THEY
   * MUST SIMPLY BE CLOSE TO EACH OTHER, LEAVE ROOM FOR FLOWERS, AND NOT HAVE STRANGE WHITE SPACES."
   *
   * THIS FUNCTION BARELY CHANGED, AND THAT IS THE POINT. It still lays each year's side flush to its
   * band's top and spreads the leftover below. What changed is upstream: `yearToY` reads a packing
   * instead of multiplying by `SLOPE`, so the band it asks for is already the size of the content. The
   * previous two axes both died here without this code moving — which is the argument for keeping the
   * band boundary and the band CONTENT in different files.
   *
   * FLUSH TO THE BAND'S TOP is still the trick, for a different reason each time. Under equal bands it
   * kept the labels exactly SLOPE apart. Now it is what makes the gap UNIFORM: `spreadSide` pays the
   * band's slack out over n slots, `BAND_H` sizes the band at `stacks + n * BAND_GAP` for the busier
   * side, so that side's slots come out at exactly `BAND_GAP` and the gap between the last plate of one
   * year and the first plate of the next is the same `BAND_GAP` — the band boundary is invisible in the
   * spacing, which is what "close to each other" means. It is not a special case at the seam; it falls
   * out of the arithmetic.
   *
   * THE CLAMPS BELOW CAN NO LONGER FIRE and are kept anyway. `bandTop` cannot precede `LANE_TOP` (the
   * packing starts there) and `bandBottom` cannot pass `LANE_BOTTOM` (the packing ends there and the
   * converge is derived from it). They used to be load-bearing and they used to be WRONG: 2026's band
   * came out INVERTED (top 6770, bottom 6610) because the converge sat on the last year's tick, and
   * `spreadSide` laid the graduation plate at the top of an impossible band without complaining.
   */
  (['left', 'right'] as Side[]).forEach((side) => {
    for (const year of YEAR_TICKS) {
      const items = CLUSTERS.filter((c) => c.side === side && Math.floor(c.year) === year)
        // Sorted by YEAR within the band, so the sequence inside a year is still the year's own. The
        // heights are the DERIVED ones, not the tier's reference box — that is what a plate actually
        // occupies now that the box comes from the image (see plateBox).
        .sort((a, b) => a.year - b.year)
        .map((c) => ({
          id: c.id,
          heights: c.nodes.map((n) => plateBox(n.tier, n.media.ratio).h),
        }));
      if (!items.length) continue;
      // The band is this year's tick to the next one. `yearToY(year + 1)` past the last titled year
      // clamps to the lane's end, which is where the last band stops.
      const bandTop = Math.max(LANE_TOP, yearToY(year));
      const bandBottom = Math.min(LANE_BOTTOM, yearToY(year + 1));
      spreadSide(items, bandTop, bandBottom, CLUSTER_GAP_Y, true).forEach((v, k) => tops.set(k, v));
    }
  });

  return CLUSTERS.map((c) => {
    const anchorY = yearToY(c.year);
    const spineX = atY(spine, anchorY).x;
    const dir = c.side === 'left' ? -1 : 1;
    const edgeX = spineX + dir * OFFSET_X; // the plates' near edge: the lane beside the spine
    let y = tops.get(c.id)!;
    const plates = c.nodes.map((n) => {
      const { w, h } = plateBox(n.tier, n.media.ratio);
      const x = dir === 1 ? edgeX : edgeX - w;
      const box = { x, y, w, h, media: n.media };
      y += h + CLUSTER_GAP_Y;
      return box;
    });
    return { id: c.id, year: c.year, side: c.side, dir, hint: c.hint, spineX, anchorY, edgeX, plates };
  });
}

/**
 * THE LAID-OUT PLATES — every plate resolved to its rect and its side.
 *
 * This is the page's layout, and it is the INPUT to everything ornamental: the year labels dodge it,
 * and the sub-branch engine grows into the space it leaves. Nothing here reads the ornament back, and
 * that direction is deliberate and load-bearing (see the decoupling note above).
 *
 * Was `computeBranches`, which also sampled each branch's polyline for a no-overlap contract; the
 * branches are gone and the contract with them.
 */
/**
 * WHERE THE YEAR LABELS ARE, resolved off the real layout — the counterpart to `computePlates()`.
 *
 * One entry point on purpose. The labels' positions are needed in three places (the render, the
 * sub-branches' no-go rects, and the tests), and three call sites re-deriving them is how one of
 * them quietly keeps using the old axis while the page uses the new one.
 */
export function yearLabelPositions(): Map<number, number> {
  return yearLabelYs(layoutClusters(sample('spine', spinePts())));
}

/** WHICH SIDE EACH YEAR LABEL SITS ON, resolved off the same layout — the x-axis counterpart to
 *  `yearLabelPositions()`, and one entry point for the same reason: the render and the sub-branches'
 *  no-go rects both need it, and two call sites re-deriving a side is how the ornament ends up
 *  dodging a label that is no longer there. */
export function yearLabelSidePositions(): Map<number, Side> {
  const laid = layoutClusters(sample('spine', spinePts()));
  return yearLabelSides(laid, computePlates(), yearLabelYs(laid));
}

export function computePlates(): Array<{
  clusterId: string;
  plateIndex: number;
  side: Side;
  rect: { x: number; y: number; w: number; h: number };
}> {
  const spine = sample('spine', spinePts());
  const laid = layoutClusters(spine);
  const out: Array<{
    clusterId: string;
    plateIndex: number;
    side: Side;
    rect: { x: number; y: number; w: number; h: number };
  }> = [];
  laid.forEach((c) =>
    c.plates.forEach((pl, i) =>
      out.push({
        clusterId: c.id,
        plateIndex: i,
        side: c.side,
        rect: { x: pl.x, y: pl.y, w: pl.w, h: pl.h },
      }),
    ),
  );
  return out;
}

/* ------------------------------- the graphic ------------------------------ */

/**
 * The frame's aspect AND its height in CSS px. The height is what item 1b needs: the drawing bleeds
 * below the frame, and converting that bleed from px into world units needs the frame's real scale
 * (`viewH / frameH`), which an aspect alone cannot give.
 */
function useFrameBox(ref: React.RefObject<HTMLElement>): { aspect: number; h: number; bleed: number } {
  const [box, setBox] = useState({ aspect: 16 / 9, h: 0, bleed: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width <= 0 || height <= 0) return;
      /*
       * HOW FAR THE DRAWING MUST BLEED TO REACH THE SCREEN — MEASURED, NOT THE NUMBER 136.
       *
       * The frame is `flex-1` inside a row that is exactly the viewport below the header, so the paper
       * between the frame's bottom and the screen's IS that row's bottom padding. Reading it back is
       * what makes the two one fact: the padding is `calc(var(--header-h) + 3.25rem)`, `--header-h` is
       * re-measured at runtime by SplashHeader, and `3.25rem` is a lockup value Daniel tuned by eye and
       * may tune again. **Hardcoding today's 136 would pin a measurement as a law and go quietly wrong
       * the first time the header changed height** — which is this page's most repeated bug, and
       * `min-h-[302px]` is the round-10 example of it shipping.
       *
       * The parent, not the window: `window.innerHeight - rect.bottom` is the same distance while the
       * row is STUCK and a different one before and after, so it would make the bleed a function of
       * scroll. The padding is the same at every scroll position, which is what the bleed has to be.
       */
      const row = el.parentElement;
      const pad = row ? parseFloat(getComputedStyle(row).paddingBottom) || 0 : 0;
      setBox({ aspect: width / height, h: height, bleed: pad });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return box;
}

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);

export function CrossPathsTimeline({
  title,
  questions,
}: {
  title: ReactNode;
  questions: Array<{ label: string; text: string }>;
}) {
  const reduced = useReducedMotion();
  const trackRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const [p, setP] = useState(0); // 0 to 1, the SMOOTHED camera progress
  // The scroll cue (round 11, item 2) shows only when the reader has STOPPED. This is the "has the
  // scroll gone quiet" half; the "is the mark finished" half is a fact of the finale (windW/p), not a
  // clock — see the cue's render. Stillness alone cannot tell "not started" from "finished", so it is
  // never the gate on its own; it only decides whether an already-finished mark has been left sitting.
  const [scrollIdle, setScrollIdle] = useState(false);
  const { aspect, h: frameH, bleed: BLEED_PX } = useFrameBox(frameRef);
  // Page-centre expressed in the frame's viewBox-x (see the descD comment). The frame sits in the
  // right column, so its axis (CX=600) is NOT the page centre; this measures the gap so the finale's
  // descending line can exit exactly above the founders' node below.
  const [pageCenterVX, setPageCenterVX] = useState(305);
  useEffect(() => {
    const measure = () => {
      const f = frameRef.current;
      const main = f?.closest('main');
      if (!f || !main) return;
      const fr = f.getBoundingClientRect();
      if (fr.width <= 0) return;
      const mr = main.getBoundingClientRect();
      const cs = getComputedStyle(main);
      const padL = parseFloat(cs.paddingLeft) || 0;
      const padR = parseFloat(cs.paddingRight) || 0;
      const contentCenter = mr.left + padL + (mr.width - padL - padR) / 2;
      setPageCenterVX(((contentCenter - fr.left) / fr.width) * W);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);
  // Persists across effect re-runs (StrictMode double-invoke, a reduced-motion media change) so the
  // entry autoplay fires AT MOST ONCE per page load and can never snap the finished descent back up.
  const autoplayedRef = useRef(false);

  // Scroll smoothing without a dependency: raw progress read from the track, camera driven by a
  // lerped value so it has weight and no jitter. The rAF idles once caught up.
  useEffect(() => {
    if (reduced) return;
    const el = trackRef.current;
    if (!el) return;
    let raf = 0;
    let running = false;
    let target = 0;
    let current = 0;

    const readTarget = () => {
      const r = el.getBoundingClientRect();
      const travel = r.height - window.innerHeight;
      target = travel <= 0 ? 0 : clamp01(-r.top / travel);
    };
    const tick = () => {
      current += (target - current) * 0.1;
      if (Math.abs(target - current) < 0.0005) {
        current = target;
        running = false;
        setP(current);
        return;
      }
      setP(current);
      raf = requestAnimationFrame(tick);
    };
    const kick = () => {
      readTarget();
      if (!running) {
        running = true;
        raf = requestAnimationFrame(tick);
      }
    };

    readTarget();
    current = target;
    setP(current);
    window.addEventListener('scroll', kick, { passive: true });
    window.addEventListener('resize', kick);
    return () => {
      window.removeEventListener('scroll', kick);
      window.removeEventListener('resize', kick);
      cancelAnimationFrame(raf);
    };
  }, [reduced]);

  // SCROLL IDLE — "the reader has stopped". Any scroll clears it and a short quiet restores it; the
  // autoplay drives real scroll, so idle stays false through the whole descent and only turns true
  // once the page is genuinely parked. Motion only: reduced motion has no held pin to sit at, and
  // adding an appearing hint there would be the motion prefers-reduced-motion is meant to spare. The
  // 1.1s quiet outlasts the camera's own settle (a ~0.7s rAF lerp), so the cue never appears mid-glide.
  useEffect(() => {
    if (reduced) return;
    let t = 0;
    const onScroll = () => {
      setScrollIdle(false);
      clearTimeout(t);
      t = window.setTimeout(() => setScrollIdle(true), 1100);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      clearTimeout(t);
    };
  }, [reduced]);

  // AUTOPLAY ON ENTRY. Exactly once per page load, after a lead-in that lets the entry narration
  // settle, the page auto-scrolls SMOOTHLY (rAF-eased, not stepped) from the top of the timeline all
  // the way down to the finale, where the mark winds up and composes. This drives the REAL scroll
  // position, so the scroll-driven camera above follows for free: one continuous cinematic descent.
  // Control is handed to the user exactly at the reveal (the pin, p=1). A strong gesture never traps
  // the user: mid-descent it FAST-FORWARDS to the reveal; before the descent begins it cancels it
  // outright. Reduced motion skips the whole thing and lands directly in the controllable state.
  useEffect(() => {
    if (reduced) return;
    const el = trackRef.current;
    if (!el) return;

    let raf = 0;
    let phase: 'idle' | 'playing' | 'done' = 'idle';
    let startTs = 0;
    let startY = 0;
    let endY = 0;
    let duration = AUTOPLAY_MS;

    const playInputs = ['wheel', 'touchstart', 'keydown', 'pointerdown'] as const;
    const detachPlayInputs = () => playInputs.forEach((e) => window.removeEventListener(e, onGesture));
    const detachEarlyInputs = () => playInputs.forEach((e) => window.removeEventListener(e, onEarly));

    const finish = () => {
      phase = 'done';
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      detachPlayInputs();
    };
    const frame = (ts: number) => {
      if (phase !== 'playing') return;
      if (!startTs) startTs = ts;
      const t = clamp01((ts - startTs) / duration);
      // LINEAR: constant scroll velocity, so the descent never accelerates (Daniel: "it should not
      // increase in speed"). The old easeInOut sped up through the middle; this holds one slow pace.
      window.scrollTo(0, Math.round(lerp(startY, endY, t)));
      if (t >= 1) return finish();
      raf = requestAnimationFrame(frame);
    };
    // Mid-descent: a strong gesture fast-forwards to the reveal from wherever it is now, so the user
    // reaches the controllable state quickly rather than being yanked or frozen mid-timeline.
    const onGesture = () => {
      if (phase !== 'playing') return;
      startY = window.scrollY;
      startTs = 0;
      duration = AUTOPLAY_FF_MS;
      detachPlayInputs(); // one gesture is enough; let the fast-forward run to the reveal
    };
    // Before the descent even begins: the user took control, so honour it and skip the set-piece.
    const onEarly = () => {
      if (phase !== 'idle') return;
      phase = 'done';
      autoplayedRef.current = true; // taken over: no later instance may start a descent either
      window.clearTimeout(leadIn);
      detachEarlyInputs();
    };

    const begin = () => {
      if (phase !== 'idle' || autoplayedRef.current) return;
      autoplayedRef.current = true;
      detachEarlyInputs();
      const rect = el.getBoundingClientRect();
      const travel = rect.height - window.innerHeight;
      if (travel <= 0) {
        phase = 'done';
        return;
      }
      // Snap to the very top of the timeline so the descent always starts from the beginning, even if
      // the narration ran a touch long, then ease down to the pin.
      startY = window.scrollY + rect.top;
      // Land the entry descent at the PIN (the full bower frame), not the end of the track: the
      // post-pin unravel + descent is the user's to drive by scrolling on.
      endY = startY + travel * PIN_FRAC;
      window.scrollTo(0, Math.round(startY));
      phase = 'playing';
      playInputs.forEach((e) =>
        window.addEventListener(e, onGesture, e === 'keydown' ? undefined : { passive: true }),
      );
      raf = requestAnimationFrame(frame);
    };

    playInputs.forEach((e) =>
      window.addEventListener(e, onEarly, e === 'keydown' ? undefined : { passive: true }),
    );
    const leadIn = window.setTimeout(begin, AUTOPLAY_LEAD_IN_MS);
    return () => {
      window.clearTimeout(leadIn);
      detachEarlyInputs();
      finish();
    };
  }, [reduced]);

  // The spine, sampled once. Everything else anchors onto it.
  const spine = useMemo(() => sample('spine', spinePts()), []);
  const laid = useMemo(() => layoutClusters(spine), [spine]);
  /** What the year labels must dodge: every plate, as actually laid out. The layout is static, so
   *  this is computed once per mount, not per scroll frame. */
  const labelObstacles = useMemo(() => computePlates(), []);
  /** Where the year labels sit: beside the work they name (see yearLabelYs). Static layout, so it is
   *  resolved once per mount rather than per camera frame. */
  const labelYs = useMemo(() => yearLabelYs(laid), [laid]);
  /** ...and which side each one sits on: the side of the work it names (see yearLabelSides). Same
   *  layout, same lifetime. */
  const labelSides = useMemo(
    () => yearLabelSides(laid, labelObstacles, labelYs),
    [laid, labelObstacles, labelYs],
  );

  // The two convergence strands (the twist-fuse). Sampled for a smooth over-under lay-up; drawn
  // solid because they ARE the structure, not a whisper. The viewBox pan clips their off-frame tops.
  const conv = useMemo(
    () => ({ left: sample('conv-clay', convArmPts(-1)), right: sample('conv-daniel', convArmPts(1)) }),
    [],
  );
  const viewH = clamp(W / aspect, 480, H);
  // THE PIN. At full progress (p=1, the end of the track) the camera sits so the mark's centre is at
  // the frame's vertical centre, which is where the left text block is centred too, so the mark and
  // the words compose as one still. The natural un-sticky past the track then carries that still up
  // and out as the user scrolls on. (Reduced motion shows the whole drawing at once instead.)
  const pinCamY = Math.max(MARK_CENTER_Y - viewH / 2, 0);
  // TWO PHASES along the track. p in [0, PIN_FRAC]: the wind into the mark (camera 0 -> pin), exactly
  // as before, just remapped onto the first two-thirds of the (now longer) track. p past PIN_FRAC:
  // the unravel + descent — the camera HOLDS on the pin while the mark opens (so the user watches it
  // ravel out in place), then follows the descending line down and out the bottom of the frame.
  const p1 = clamp01(p / PIN_FRAC); // wind-phase progress (0..1), preserving the original pacing
  const q = clamp01((p - PIN_FRAC) / (1 - PIN_FRAC)); // unravel-phase progress (0..1)
  const camYEnd = Math.max(DESC_BOTTOM_Y - viewH, pinCamY); // exit lands at the frame's bottom edge
  const camY = reduced
    ? 0
    : p <= PIN_FRAC
      ? lerp(0, pinCamY, p1)
      : lerp(pinCamY, camYEnd, easeInOutCubic(clamp01((q - 0.4) / 0.6)));
  const frontY = camY + viewH * (1 + DRAW_AHEAD);
  const topY = camY - TOP_CLIP;
  // THE STAGGER AND THE LINE COME FROM THE SAME viewH, IN ONE PLACE, ON PURPOSE. The line is placed
  // to finish the most-lagged thing by the halfway mark, so it is only correct if it is placed
  // against the SAME stagger the branches are actually lagged by. Computing them apart is how they
  // drift, and the drift would be silent — the ornament would simply finish at the wrong height.
  // `stagger` is handed to SubBranches rather than recomputed there for exactly that reason.
  const stagger = subBranchStagger(viewH);
  // Placed so the LAST thing in this frame to finish — the deepest twig, carrying the full stagger —
  // is done by the halfway mark. The plates, which carry no lag, finish earlier and are still
  // mid-event with the twigs, which is "both of those emissions should match each other" holding.
  const cardLineY = reduced ? H : cardLineAt(camY, viewH, UNFURL_SPAN, stagger);

  /**
   * ITEM 1b: THE LINE GROWS IN FROM BELOW THE SCREEN, AND THE CAMERA DOES NOT MOVE TO ALLOW IT.
   *
   * Daniel: "Make sure our timeline is rendered flushed with the bottom of the screen (currently not)
   * so it creates continuity." Measured before: the SVG's rect is top 100, **bottom 764 in a 900px
   * viewport** — the line stops 136px above the screen and shows a terminus, which is the "abrupt
   * stop". Reproduced identically at 1280/1440/1728, because the gap is not a rounding error:
   *
   * **THE 136px IS THE HERO LOCKUP'S LIFT.** It is `lg:pb-[calc(var(--header-h)+3.25rem)]` on the row,
   * and it exists so the words come to rest 18px proud of the screen's centre — a position Daniel
   * called "perfectly aligned", which makes it a FIXED POINT, not a leftover. `qa/hero-lockup.mjs`
   * drives a real scroll to the pin and pins both halves. So "just remove the bottom padding" trades
   * one of his rulings for another, and "make the frame taller" re-frames the camera (`viewH` is the
   * camera's window; `pinCamY = MARK_CENTER_Y - viewH/2`), which moves the mark out of that lockup.
   * **Both were correctly refused. The way out is that neither is necessary.**
   *
   * THE FRAME WAS DOING TWO JOBS — the same shape as `MARK_K` setting the mark's size, and it hid for
   * the same reason. The frame box is (1) the CAMERA's window, which decides `viewH`, `pinCamY` and so
   * the mark's place in the lockup, and (2) the CLIP region, which decides where the ink stops. Only
   * the first is load-bearing. So the camera keeps its frame, and the CANVAS bleeds past it: the SVG
   * element grows `BLEED` px downward on a negative margin (taking no layout space, so nothing above
   * it moves), and the viewBox grows by the SAME distance converted to world units.
   *
   * WHY THE SCALE AND THE MARK CANNOT MOVE, which is the whole reason this is safe: the element and
   * the viewBox grow by the same physical distance, so `worldPerPx` is unchanged —
   * `(viewH + bleedWorld) / (frameH + BLEED)` = `viewH / frameH` by construction. The viewBox's TOP
   * edge is still `camY` at the element's top, so every world point renders at the pixel it already
   * did. **`viewH`, `pinCamY`, the camera and the lockup are all untouched: strictly more drawing is
   * visible below, and nothing that was visible moved.**
   */
  const bleedWorld = frameH > 0 ? BLEED_PX * (viewH / frameH) : 0;
  const viewBox = reduced ? `0 0 ${W} ${H}` : `0 ${camY} ${W} ${viewH + bleedWorld}`;

  /** The middle-segment reveal for the spine: draw only from the top clip to the draw-ahead front,
   *  so both terminals sit off-frame and the line runs edge to edge.
   *
   *  "EDGE TO EDGE" IS TRUE OF THE viewBox AND FALSE OF THE SCREEN, which is round 10's item 1b/1c
   *  and is TODO(Daniel) — see the note on SPINE_W. MEASURED live at 1440x900: the SVG element's own
   *  rect is top 100, bottom 764, inside a 900px viewport. Both terminals do sit outside the viewBox,
   *  exactly as this comment says, and the line still visibly stops 136px above the bottom of the
   *  screen and cuts 16px below the header, because the FRAME is not the SCREEN. Daniel: "it stops
   *  abruptly a little above the bottom. That abrupt stop is the bug."
   *
   *  This is the session's own measurement trap pointed outward: a container's rect tells you about
   *  the container. Here the comment was right about the container and the reader is looking at the
   *  page. Nothing in the reveal is wrong; the frame is inset. Do not "fix" this in revealProps. */
  const revealProps = (s: Strand) => {
    if (reduced) return { strokeDasharray: undefined, strokeDashoffset: undefined, hidden: false };
    const fTop = atY(s, topY).frac;
    const fBot = atY(s, frontY).frac;
    const len = fBot - fTop;
    if (len <= 0.0005) return { strokeDasharray: '0 1', strokeDashoffset: 0, hidden: true };
    return { strokeDasharray: `${len} 1`, strokeDashoffset: -fTop, hidden: false };
  };

  // THE FINALE WIND. Timed off the CAMERA so the whole ravel plays while the mark is well inside the
  // frame: it starts when the mark has risen to WIND_ENTER of the way down and completes exactly at
  // the pin, with the mark centred. The user watches the line wind itself up, never a pre-assembled
  // mark sliding in from below.
  const windStartCamY = MARK_CENTER_Y - WIND_ENTER * viewH;
  // Wind phase: driven by the camera as before. Unravel phase: play the wind backwards over the first
  // 40% of q (so the mark is fully open BEFORE the camera starts descending past it), then hold at 0.
  const windW = reduced
    ? 1
    : p <= PIN_FRAC
      ? clamp01((camY - windStartCamY) / (pinCamY - windStartCamY || 1))
      : 1 - easeInOutCubic(clamp01(q / 0.4));
  const g = useMemo(() => solveMark(), []);
  // THE SCROLL CUE (round 11, item 2). The finale mark reads as an ENDING, but ~a third of the page —
  // the founders and the work — is still below it, so a reader who lands on the wound mark and stops
  // can think the page is over. Show a quiet cue then, and ONLY then. The gate is the THING, not a
  // timer: `windW > 0.9` is true only within a few percent of the pin (windW falls the instant the
  // unravel begins), so this fires when the mark is actually shut, not merely when the scroll is old.
  // `p >= PIN_FRAC` keeps it off the wind-UP, where windW also climbs past 0.9 just before the pin.
  // `scrollIdle` is the only clock, and it cannot mistake "not started" for "finished" because the two
  // windW/p terms have already established the mark is finished. It fades out the instant the reader
  // scrolls again (scrollIdle → false), which is also when they no longer need it.
  const scrollCueVisible = !reduced && p >= PIN_FRAC && windW > 0.9 && scrollIdle;
  // The RAVEL (wind, p <= PIN_FRAC) uses the original right-flank tail; the UNRAVEL (post-pin) uses
  // the morphing tail so it opens with the OPPOSITE curl rather than retracing the wind-up. Both are
  // the identical circle 0 at windW=1, so the swap at the pin is seamless (no pop).
  const unraveling = !reduced && p > PIN_FRAC;
  const tail = useMemo(
    () => (unraveling ? tailPtsUnravel(windW) : tailPts(windW)),
    [windW, unraveling],
  );
  // CONTINUITY GUARANTEE: point the lean at the tail's CURRENT top point every frame. Pre-pin that is
  // P (the original right-flank ravel lean); through the unravel it slides P -> P' as the tail morphs
  // to its mirror, and the lean follows, so the plumb spine -> lean -> tail is one unbroken stroke and
  // the line never detaches from the mark. (This is the fix for the circled gap: the tail top used to
  // jump to P' while the lean stayed at P.)
  const leanPts = useMemo(() => spineLeanPtsTo(tail[0].x), [tail]);
  // Where the mirrored unwound ray ends: the opposite flank of circle 0 (reflection of P across C.x).
  // At windW=0 the morph is fully mirrored, so the tail's bottom lands exactly here — the descent's
  // start — closing the spine -> mark -> descent -> founders line with no gap at the bottom either.
  const mirrorRayEndX = 2 * g.C.x - g.P.x;
  // The wordmark fades IN with the wind, and back OUT as the unravel begins: it belongs to the held
  // pin, not to the line flowing on past it (and it clears the descending line's path).
  const wordmarkOpacity = reduced ? 1 : clamp01((windW - 0.86) / 0.14) * (1 - clamp01((q - 0.05) / 0.25));
  // Where the PAGE centre falls in the frame's viewBox-x. The mark/spine sit on the frame-column axis
  // (CX=600), but the founders below are centred on the PAGE; the descending line sweeps from the mark
  // to this x so it exits directly above the founders' node. Measured (see the effect) so the seam is
  // pixel-accurate at any width; the ~305 default is a sane pre-measurement estimate.
  const descD = reduced
    ? // static: from the attach point on the mark, straight down and over to page-centre, exiting.
      `M ${g.P.x.toFixed(2)} ${g.P.y.toFixed(2)} C ${g.P.x.toFixed(2)} ${(g.P.y + (DESC_BOTTOM_Y - g.P.y) * 0.5).toFixed(2)}, ${pageCenterVX.toFixed(2)} ${(DESC_BOTTOM_Y - (DESC_BOTTOM_Y - g.P.y) * 0.5).toFixed(2)}, ${pageCenterVX.toFixed(2)} ${DESC_BOTTOM_Y.toFixed(2)}`
    : // animated: continues the MIRRORED unwound ray (which ends at RAY_END_Y on the mark's opposite
      // flank, x = mirrorRayEndX) straight down, then sweeps over to page centre. The exit (page
      // centre, DESC_BOTTOM_Y) is unchanged; only the start flank mirrors with the unravel.
      `M ${mirrorRayEndX.toFixed(2)} ${RAY_END_Y.toFixed(2)} C ${mirrorRayEndX.toFixed(2)} ${(RAY_END_Y + DESC_DROP * 0.5).toFixed(2)}, ${pageCenterVX.toFixed(2)} ${(DESC_BOTTOM_Y - DESC_DROP * 0.5).toFixed(2)}, ${pageCenterVX.toFixed(2)} ${DESC_BOTTOM_Y.toFixed(2)}`;

  return (
    /* `-mt-8` CANCELS the 2rem of `main`'s pt-[calc(var(--header-h)+2rem)], and it is a bug fix, not
       a spacing tweak (2026-07-16, round 4).

       Daniel: "when the 'we've been chasing it for five years' positions itself on its right-left
       placements, it actually glitches out because there's already an existing 'we've been chasing it
       for five years' that is slightly not aligned to the brother one."

       Measured: the intro's flying title landed at y=262.2 while the persistent title sat at y=230.2
       — dx 0, dw 0, dy EXACTLY 32. The 32 is this padding. The sticky child below pins at
       `top-[var(--header-h)]`, but the track started 2rem BELOW that pin point, so at scrollY=0 the
       column sat unpinned 32px low, and the moment anything scrolled (the autoplay starts on mount,
       behind the veil) the sticky engaged and the whole copy column jumped up by 2rem. The intro had
       measured the title before that, so it flew to a position the title had already left.

       Starting the track AT the pin point means the sticky is engaged from scrollY=0 and the title
       never moves. The two titles then agree by construction rather than by two measurements racing a
       scroll — and the copy column stops popping when the camera starts, which was the same bug
       wearing its everyday clothes. */
    <div
      ref={trackRef}
      data-timeline-track
      className={reduced ? 'relative' : 'relative -mt-8'}
      style={{ height: reduced ? 'auto' : `${TRACK_VH}vh` }}
    >
      {/* `data-timeline-frame` is the founders' parenthesis's handle on this row. It needs the row's
          bottom edge to find where the descent's exit lands on the page — see FounderParenthesis's
          `padBelow`, and note that this row's own bottom padding is what puts the exit above the
          track's bottom rather than on it. */}
      <div
        data-timeline-frame
        className={
          reduced
            ? 'flex flex-col gap-12'
            : // THE LIFT LIVES ON THE ROW, NOT ON ONE COLUMN (2026-07-16, round 4). `items-stretch`
              // is what makes this work: padding here shrinks BOTH columns, so the words and the
              // mark move together. See the copy column below, `pinCamY`, and qa/hero-lockup.mjs.
              'sticky top-[var(--header-h)] flex h-[calc(100svh-var(--header-h))] flex-col gap-8 py-4 lg:flex-row lg:items-stretch lg:gap-12 lg:pb-[calc(var(--header-h)+3.25rem)] xl:gap-16'
        }
      >
        {/* THE SCROLL CUE (item 2). Anchored to this sticky row, so it holds at the bottom of the
            viewport while the mark is pinned. Sepia, no bounce — the ONLY motion is an opacity fade,
            which is why it is safe past the `!reduced` gate already on `scrollCueVisible`. It never
            takes pointer events, so it cannot interrupt the finale or the scroll it is asking for.
            THE CHEVRON IS CSS, NOT AN `<svg>`, ON PURPOSE: FounderParenthesis and three qa harnesses
            all reach the finale camera with `querySelector('[data-timeline-track] svg')`, which returns
            the FIRST svg in the track. An svg here would be that first match, and it made the founders'
            trunk read `SPINE_W * (18/1200) = 0.033px` — the whole bower went invisible in motion. A
            rotated bordered box is the same glyph with nothing for that selector to grab. */}
        {!reduced && (
          <div
            aria-hidden
            className="pointer-events-none absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-2 transition-opacity duration-500"
            style={{ opacity: scrollCueVisible ? 0.85 : 0, color: INK_SEPIA_TEXT }}
          >
            <span className="font-mono text-[0.66rem] uppercase tracking-[0.22em]">scroll</span>
            <span
              className="block h-2 w-2 -translate-y-1 rotate-45"
              style={{ borderRight: '1.5px solid currentColor', borderBottom: '1.5px solid currentColor' }}
            />
          </div>
        )}
        {/* THE HERO LOCKUP'S HEIGHT — round 2, corrected in round 4.
            Round 2, Daniel: "the entire thing should be lifted up slightly to be on centre on my
            screen." Arithmetic, not taste: this column is `justify-center` inside a box that starts
            BELOW the fixed header, so it centred on that band's middle — exactly `--header-h / 2`
            below the middle of the SCREEN. Measured then at 1440x900: centre 492 vs screen centre
            450. The correction buys back `--header-h` plus an optical nudge, doubled because
            `justify-center` splits padding, and written against the token because SplashHeader
            re-measures --header-h at runtime.

            ROUND 4: THE PADDING MOVED TO THE ROW, and that is the actual fix, not a tidy-up. Round 2
            put it on this column ALONE, which lifted the words and left the mark where it was —
            Daniel, round 4: "The text 'we've been chasing it for five years' is now on center,
            perfectly aligned, but the bower is still slightly below." Measured at the pin: the words
            at 432, the mark at 492, 60px adrift. The mark sits at the SVG frame's centre, and
            padding on this column moves only this column's CONTENT — the frame never heard about it.

            The `pinCamY` comment had ASSERTED the thing round 2 broke — "the mark's centre is at the
            frame's vertical centre, which is where the left text block is centred too, so the mark
            and the words compose as one still." On the ROW, `items-stretch` shrinks both columns, so
            the frame's centre and this column's centre move as one and that sentence is true again.

            WHY 3.25rem AND NOT ROUND 2's 2.25: the lift is pb/2, and moving the padding from the
            column to the row changes what it acts on, so the same value is no longer the same nudge
            — at 2.25rem the words came to rest 10px proud of the screen centre, not the 18 they had
            been. But 18 is the position Daniel called "perfectly aligned", so it is a FIXED POINT,
            not a leftover: the mark had to come up to the words, not the words down to the mark.
            +1rem of padding buys the missing 8px (measured 2.25 -> 10 proud, 2.75 -> 14, 3.25 -> 18).
            Both halves are pinned by qa/hero-lockup.mjs, which drives a real scroll to the pin. */}
        <div className="flex shrink-0 flex-col justify-center gap-10 lg:w-[clamp(19rem,26vw,24rem)]">
          {title}
          <dl className="flex flex-col gap-8">
            {questions.map((q, i) => {
              const at = reduced ? 1 : clamp01((p1 - (i === 0 ? 0.04 : 0.42)) / 0.12);
              return (
                <div
                  key={q.label}
                  style={{
                    opacity: at,
                    transform: `translateY(${(1 - at) * 14}px)`,
                    transition: 'opacity 500ms ease-out, transform 500ms ease-out',
                  }}
                >
                  <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-inkBlack/40">
                    {q.label}
                  </dt>
                  <dd className="mt-2.5 font-serifDisplay text-[clamp(1.15rem,1.55vw,1.5rem)] leading-[1.35] text-inkBlack">
                    {q.text}
                  </dd>
                </div>
              );
            })}
          </dl>
        </div>

        {/* THE CAMERA'S WINDOW, and since item 1b it is NO LONGER THE SVG ELEMENT'S BOX — which is why
            it needs a handle of its own. This div is what `viewH` and `pinCamY` are computed from, so
            its centre is where the mark comes to rest at the pin; the <svg> inside it now bleeds
            `BLEED_PX` further down (item 1b), so the ELEMENT's centre sits BLEED_PX/2 = 68px below the
            camera's. Measured at 1440x900: this box is 100..764 (centre 432, where the mark and the
            words both are), the svg element is 100..900 (centre 500, where nothing is).

            `qa/hero-lockup.mjs` guards the pin by asserting the mark sits on "the frame's centre" and
            reads that off the <svg>, so it must read this instead or it measures a box the camera does
            not use. NAMED `-viewport`, NOT `-frame`: `data-timeline-frame` is ALREADY TAKEN by the
            sticky row above (the founders' parenthesis needs the row's bottom edge), and
            `querySelector` returns the FIRST match — the same near-miss `data-timeline-camera` records.
            Grepped before claiming it. */}
        <div ref={frameRef} data-timeline-viewport className="min-h-0 min-w-0 flex-1">
          <svg
            viewBox={viewBox}
            preserveAspectRatio="xMidYMid meet"
            className="w-full"
            style={
              reduced
                ? undefined
                : {
                    /* ITEM 1b + 1c — the drawing's two ends, and they are DELIBERATELY ASYMMETRIC.
                       Daniel wants the bottom to come out of the screen and the top to dissolve.

                       THE BLEED (1b): the canvas grows past the camera's frame on a NEGATIVE MARGIN,
                       so it takes no layout space and nothing above it moves — the hero lockup, which
                       is the thing this padding exists for, never hears about it. Paired with the
                       viewBox's matching growth (see `bleedWorld`), the scale is identical and the
                       line simply keeps going, through the bottom of the screen, with no terminus in
                       frame. `DRAW_AHEAD` (0.35 of viewH) already draws well past this, so the reveal
                       front is never what the viewer sees down there. */
                    height: `calc(100% + ${BLEED_PX}px)`,
                    marginBottom: -BLEED_PX,
                    /* THE TOP FADE (1c): the line dissolves rather than showing a cut end, and it is
                       finished well before the header. Daniel: the top should fade, not cut, and stay
                       clear of the header. `TOP_CLIP` already puts the terminus off-frame — but "off
                       the viewBox" is not "off the screen" (the frame is inset 100px), so what he sees
                       is the line being sliced flat by the frame's own edge. A mask cannot be undone
                       by the frame being inset: it is measured from the element's own top, which IS
                       where the slice was happening. */
                    maskImage: `linear-gradient(to bottom, transparent 0, black ${TOP_FADE_PX}px)`,
                    WebkitMaskImage: `linear-gradient(to bottom, transparent 0, black ${TOP_FADE_PX}px)`,
                  }
            }
            /* THE CAMERA'S ONLY HANDLE. `viewBox`'s y IS camY, so this element is the one place the
               camera's ACTUAL position is observable from outside React — which is what
               qa/growth-timing.mjs must wait on. It cannot wait on `scrollY`: scrollY lands instantly
               while camY is a rAF lerp (`current += (target-current)*0.1`, ~72 frames to settle), so a
               harness that guards the scroll is guarding a proxy and will measure a camera that has not
               arrived. It did exactly that, and reported a confident PASS on a stalled camera.

               NAMED `-camera`, NOT `-frame`, AND THE NEAR-MISS IS WORTH THE LINE: this first shipped as
               `data-timeline-frame`, which is ALREADY TAKEN by the founders' parenthesis on the row div
               above. `querySelector` returns the FIRST match, so the probe silently got that div, which
               has no viewBox, and read camY as null. My own smoke check (`!!querySelector(...)`) said
               "frame: true" while matching the WRONG ELEMENT — a presence check that cannot say WHICH
               thing it found is not a check. Grep before you claim a data attribute. */
            data-timeline-camera
            role="img"
            aria-label="A timeline from 2021 to 2026 that travels downward as you scroll. At the top, two strands, Clay and Daniel, come in from off the frame and twist together into one line: the spine is born where they fuse in 2021. Each later event branches off the spine to a picture held in a small calyx: a medical device, startups, buildings grown in place, computational design research, fabrication, robotics, a lamp, and a year in New York. At the end the line leans off its axis and winds itself up into the Bower mark, with the wordmark, Bower, beneath it."
          >
            {/* THE TWIST-FUSE. Two equal strands cross once over-under and become the spine at 2021.
                The right strand is painted last through the crossing (a vellum halo opens the gap
                that makes the over-under legible), so it reads as one lay-up, not a flat X. */}
            <g style={{ pointerEvents: 'none' }}>
              <path
                d={conv.left.d}
                fill="none"
                stroke={INK_SEPIA}
                strokeWidth={CONV_WEIGHT}
                strokeLinecap="butt"
                strokeLinejoin="round"
              />
              <path
                d={conv.right.d}
                fill="none"
                stroke={VELLUM}
                strokeWidth={CONV_WEIGHT + 6}
                strokeLinecap="butt"
              />
              <path
                d={conv.right.d}
                fill="none"
                stroke={INK_SEPIA}
                strokeWidth={CONV_WEIGHT}
                strokeLinecap="butt"
                strokeLinejoin="round"
              />
            </g>

            {/* THE SPINE. The only long line: heavy, full opacity, born at the fuse and running edge
                to edge to 2026. */}
            {(() => {
              const r = revealProps(spine);
              return (
                <path
                  d={spine.d}
                  fill="none"
                  stroke={INK_SEPIA}
                  strokeWidth={SPINE_W}
                  strokeLinecap="round"
                  pathLength={1}
                  strokeDasharray={r.strokeDasharray}
                  strokeDashoffset={r.strokeDashoffset}
                  opacity={r.hidden ? 0 : 1}
                />
              );
            })()}

            {/* THE SUB-BRANCHES. Sepia stems grown into the drawing's negative space by space
                colonization, carrying their own gongbi foliage. Ornament: it reads the plate layout
                and never feeds back into it. Painted BEFORE the clusters, so that if the ornament and
                a project ever do disagree, the project is simply drawn on top — the paint order is
                the last expression of "the branch loses". */}
            <SubBranches reduced={reduced} cardLineY={cardLineY} stagger={stagger} />

            {/* THE GARLAND. Clay's gongbi organs grown along the spine's own polyline, in full
                pigment. Painted after the spine so foliage sits ON the line, and before the
                clusters so a plate stays on top of it. */}
            <SpineGarland reduced={reduced} />

            {/* Every cluster: its plates, standing alongside the line at their year. */}
            {laid.map((c) => (
              <ClusterGroup key={c.id} cluster={c} cardLineY={cardLineY} reduced={reduced} />
            ))}

            {/* Year labels: heavy, painted AFTER the clusters (numerals never blocked), with a vellum
                halo (paint-order stroke) so they stay legible over any adjacent-year plate. The side
                (yearLabelSides, unit-tested) puts each label on the side of the WORK IT NAMES — it
                used to take whichever side had more room, which meant fleeing its own plate. The
                gutter law is what makes sitting beside the work safe; see the note on yearLabelSides. */}
            {YEAR_TICKS.map((y) => {
              // Beside the work it names, not at its metric position. See yearLabelYs.
              const ty = labelYs.get(y) ?? yearToY(y);
              const vis = reduced ? 1 : clamp01((camY + viewH + 40 - ty) / 60) * clamp01((ty - camY + 120) / 80);
              if (vis <= 0.01) return null;
              const drawSide = labelSides.get(y) ?? yearLabelSide(labelObstacles, ty);
              const dir = drawSide === 'right' ? 1 : -1;
              return (
                <g key={y} opacity={vis}>
                  <line
                    x1={CX + dir * YEAR_TICK_INNER}
                    y1={ty}
                    x2={CX + dir * (YEAR_TICK_INNER + YEAR_TICK_LEN)}
                    y2={ty}
                    stroke="currentColor"
                    className="text-inkBlack"
                    strokeWidth={2}
                    opacity={0.32}
                  />
                  <text
                    x={CX + dir * YEAR_LABEL_OFFSET}
                    y={ty - YEAR_LABEL_CLEAR}
                    textAnchor={dir === 1 ? 'start' : 'end'}
                    className="fill-inkBlack/70 font-mono"
                    style={{
                      fontSize: YEAR_LABEL_FONT,
                      fontWeight: 700,
                      letterSpacing: '0.05em',
                      fontVariantNumeric: 'tabular-nums',
                      paintOrder: 'stroke',
                      stroke: VELLUM,
                      strokeWidth: 8,
                      strokeLinejoin: 'round',
                      strokeLinecap: 'round',
                    }}
                  >
                    {y}
                  </text>
                </g>
              );
            })}

            {/* THE DATUM Daniel named, made measurable. Round 4: "the center of the middle circle
                and the bower is exactly at the middle point between the top of that 'we've been
                chasing it' and the bottom of the reshape that we can make."

                The Oculus is eight circles ringing (50,50), and the lens they overlap into at that
                centre is his "middle circle" — so its centre is exactly (MARK_CENTER_X,
                MARK_CENTER_Y), the ring's own centre. There is no element there to measure, and the
                spec is geometric, so this zero-radius, unstroked point is one: it draws nothing and
                lets qa/hero-lockup.mjs read the datum's real screen position instead of inferring it
                from the mark's bounding box (which is NOT the same point, and is what "not the mark's
                bbox" in his spec rules out). */}
            <circle data-mark-center cx={MARK_CENTER_X} cy={MARK_CENTER_Y} r={0} fill="none" stroke="none" />

            {/* ITEM 3: THE MARK FLOWERS. Painted HERE — before the circles — on purpose: document
                order is the whole of "does not obstruct". The linework is drawn over its own foliage,
                so if an organ ever lands on a stroke the stroke wins, without a mask, a z-index or a
                clearance rule to maintain. The satellites bloom across windW 0.58..0.94, so
                MARK_BLOOM_FROM (0.75) opens the foliage inside that same event rather than after it. */}
            <MarkGarland reduced={reduced} windW={windW} />

            {/* THE UNRAVEL. The other seven circles bloom outward from the wound one as the tail
                closes; circle 0 is NOT drawn here because the winding tail below IS circle 0. */}
            {MARK_CENTERS.map(([mx, my], j) => {
              if (j === 0) return null;
              const n = MARK_CENTERS.length;
              const ring = Math.min(Math.abs(j), n - Math.abs(j));
              const s = 0.58 + (ring - 1) * 0.06;
              const o = clamp01((windW - s) / 0.16);
              if (o <= 0.001) return null;
              return (
                <circle
                  key={j}
                  data-mark-circle
                  cx={MARK_CENTER_X + (mx - 50) * g.k}
                  cy={MARK_CENTER_Y + (my - 50) * g.k}
                  r={g.r}
                  fill="none"
                  stroke={INK_SEPIA}
                  // THE MARK IS STROKED AT THE SPINE'S OWN WEIGHT, and that is now literal rather
                  // than arithmetical. It was `MARK_STROKE * g.k`, which equalled SPINE_W only
                  // because MARK_K was DEFINED as SPINE_W / MARK_STROKE — true, circular, and the
                  // reason thinning the line appeared to shrink the logo. Daniel: "the same
                  // thickness as the other branches and leaves, including our logo as well."
                  strokeWidth={SPINE_W}
                  strokeLinecap="round"
                  opacity={o}
                />
              );
            })}

            {/* THE LINE INTO THE MARK: the plumb spine hands off to the organic meandering lean, and
                the lean hands off to the winding tail. All at SPINE_W, which is ALSO what the mark's
                circles are stroked at — the same constant, not a product that evaluates to it — so the
                one root ravels itself into the mark with no change in weight. This used to read
                "MARK_STROKE * k = SPINE_W... a single heavy line"; the identity is now direct and the
                line is no longer heavy (item 1a). */}
            <g>
              <path
                d={poly(leanPts)}
                fill="none"
                stroke={INK_SEPIA}
                strokeWidth={SPINE_W}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                data-spine-stroke
                d={poly(tail)}
                fill="none"
                stroke={INK_SEPIA}
                strokeWidth={SPINE_W}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* THE UNRAVEL EXIT (Task 4). Below the unwound ray, the one line keeps flowing down and
                  sweeps to the page centre, exiting the bottom of the frame to hand off to the
                  founders' roots. It sits below the frame during the wind (the camera only reveals it
                  as it descends past the pin), so it is safe to draw always. */}
              <path
                d={descD}
                fill="none"
                stroke={INK_SEPIA}
                strokeWidth={SPINE_W}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={reduced ? 1 : clamp01((0.08 - windW) / 0.08)}
              />
              {/* WHERE THE ONE LINE LEAVES THIS DRAWING, as a zero-radius datum on the exact point
                  `descD` ends on. The founders' parenthesis below has to start precisely here or the
                  page shows a floating stub over a gap — which it did — and this lets
                  qa/founder-parenthesis.mjs measure the join instead of recomputing it from
                  constants and agreeing with itself. Draws nothing. */}
              <circle data-descent-exit cx={pageCenterVX} cy={DESC_BOTTOM_Y} r={0} fill="none" stroke="none" />
            </g>

            {/* The wordmark, under the mark, once the ring has closed. Nothing else at the end. */}
            <text
              x={MARK_CENTER_X}
              y={MARK_CENTER_Y + 45 * g.k + WORDMARK_GAP}
              textAnchor="middle"
              className="font-mono lowercase"
              style={{
                fontSize: WORDMARK_FONT,
                fontWeight: 600,
                letterSpacing: '0.1em',
                fill: INK_SEPIA,
                opacity: wordmarkOpacity,
              }}
            >
              bower
            </text>
          </svg>
        </div>
      </div>
    </div>
  );
}

/* --------------------------- plates and clusters -------------------------- */

/** One inline video plate, drawn in SVG via a foreignObject so an HTML <video> can play in the
 *  panning viewBox. Reduced motion gets the poster still instead. */
function VineVideo({ plate, x, y, w, h, reduced }: { plate: Plate; x: number; y: number; w: number; h: number; reduced: boolean }) {
  const { ref, start } = useAutoplayVideo(plate.video?.rate ?? 1);
  const clip = `cptl-v-${plate.src.replace(/[^a-z0-9]/gi, '')}`;
  if (reduced) {
    return (
      <>
        <clipPath id={clip}>
          <rect x={x} y={y} width={w} height={h} />
        </clipPath>
        <image href={plate.src} x={x} y={y} width={w} height={h} preserveAspectRatio="xMidYMid slice" clipPath={`url(#${clip})`}>
          <title>{plate.alt}</title>
        </image>
      </>
    );
  }
  return (
    <foreignObject x={x} y={y} width={w} height={h}>
      <video
        ref={ref}
        autoPlay
        loop
        muted
        playsInline
        poster={plate.src}
        aria-label={plate.alt}
        onLoadedData={start}
        onCanPlay={start}
        style={{ width: '100%', height: '100%', display: 'block', objectFit: plate.fit === 'contain' ? 'contain' : 'cover', background: plate.fit === 'contain' ? '#fff' : undefined }}
      >
        {plate.video?.webm && <source src={plate.video.webm} type="video/webm" />}
        <source src={plate.video?.mp4} type="video/mp4" />
      </video>
    </foreignObject>
  );
}

/** One plate: a still image (clipped, cover or contain) or a video, with a hairline border. */
function PlateMedia({ plate, x, y, w, h, reduced }: { plate: Plate; x: number; y: number; w: number; h: number; reduced: boolean }) {
  if (plate.pending) {
    return (
      <g>
        <rect x={x} y={y} width={w} height={h} fill={INK_SEPIA} fillOpacity={0.04} stroke={INK_SEPIA} strokeOpacity={0.3} strokeWidth={1} strokeDasharray="6 6" />
        <text x={x + w / 2} y={y + h / 2 + 4} textAnchor="middle" className="fill-inkBlack/35 font-mono" style={{ fontSize: 11, letterSpacing: '0.18em' }}>
          IMAGE TO COME
        </text>
      </g>
    );
  }
  // `meet`, ALWAYS, and it costs nothing: the box IS the image's ratio (see plateBox), so meet and
  // slice resolve to the same pixels and neither letterboxes nor crops. `meet` is the honest one to
  // ask for — it can only ever fail safe, by showing the whole picture.
  //
  // `fit` no longer chooses between them (a box built to the image has nothing to fit); it now only
  // says whether the plate wants a white ground under it, which paper figures and line drawings do
  // where photographs do not. The clipPath is gone with the crop it existed to make.
  return (
    <g>
      {plate.fit === 'contain' && <rect x={x} y={y} width={w} height={h} fill="#fff" />}
      {plate.video ? (
        <VineVideo plate={plate} x={x} y={y} w={w} h={h} reduced={reduced} />
      ) : (
        <image href={plate.src} x={x} y={y} width={w} height={h} preserveAspectRatio="xMidYMid meet">
          <title>{plate.alt}</title>
        </image>
      )}
      <rect x={x} y={y} width={w} height={h} fill="none" stroke={INK_SEPIA} strokeOpacity={0.25} strokeWidth={1} />
    </g>
  );
}

/**
 * One cluster: its plates, standing ALONGSIDE the timeline at their year.
 *
 * DECOUPLED 2026-07-16 (Daniel: "We had initially tried to have the flowers or the leaves actually
 * holding the projects within the timeline. Scratch that."). A plate is no longer BORNE by anything:
 * the branch that forked off the spine to carry it, the calyx that cupped it from below, and the node
 * dot that marked the fork are all gone. The spine and its ornament are the drawing; the projects keep
 * pace beside it. Nothing in the layout depends on the ornament any more, and the ornament reads the
 * layout rather than producing it — see SubBranches.
 *
 * THE ENTRANCE IS A FADE, NOT A GROWTH (Daniel: "Right now it expands from the bottom up. I like for
 * it to fade in better so the entire thing is already there and doesn't have that weird initial
 * distortion"). The plate is laid out at full size from the first frame and only its opacity moves.
 * The old `unfurl()` WAS the distortion he was describing: it opened every plate from
 * `scale(0.92, 0.64)` about the branch junction, which squashed the image to 64% of its height and
 * then stretched it back — on landscape photographs, in a page whose whole complaint this round was
 * pictures at the wrong aspect.
 */
function ClusterGroup({ cluster, cardLineY, reduced }: { cluster: LaidCluster; cardLineY: number; reduced: boolean }) {
  const { dir, plates, hint } = cluster;

  return (
    <g>
      {plates.map((pl, i) => {
        // Composite opacity ONLY: no scale, no rotate, no pivot, no clip. Reduced motion is fully
        // present from the start, as before.
        const opacity = reduced ? 1 : growAt(cardLineY, pl.y, UNFURL_SPAN);
        if (opacity <= 0.001) return null;

        return (
          <g key={i} style={{ opacity }}>
            {i === 0 && hint && (
              <text
                x={dir === 1 ? pl.x : pl.x + pl.w}
                y={pl.y - 10}
                textAnchor={dir === 1 ? 'start' : 'end'}
                className="fill-inkBlack/45 font-mono"
                style={{ fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase' }}
              >
                {hint}
              </text>
            )}
            <PlateMedia plate={pl.media} x={pl.x} y={pl.y} w={pl.w} h={pl.h} reduced={reduced} />
          </g>
        );
      })}
    </g>
  );
}
