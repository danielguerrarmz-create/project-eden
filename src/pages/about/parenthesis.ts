/**
 * parenthesis.ts — the founders' parenthesis: where the one line arrives, and how it opens.
 *
 * Daniel, round 3: "I'd like the main branch — the one that has fallout all throughout — to
 * actually kind of go into some parentheses and go right and left from Clay, and on the right side
 * and left side to start generating those beautiful flowers and sub-branches." And: "The flowers on
 * the left and right side of the founder are quite beautiful but they must connect. The stems at the
 * top must connect with the stem that's unraveling from the bower logo at the top."
 *
 * So: one continuous line, top to bottom. The Oculus unravels, the spine descends the timeline,
 * arrives here, and OPENS — an arm left and an arm right — and those arms carry the flowers.
 *
 * THIS FILE IS ORNAMENT, AND ORNAMENT READS LAYOUT (CLAUDE.md). Everything here is a pure function
 * of a `ParenLayout` that the caller MEASURES off the real DOM. Nothing in it is authored against a
 * page constant, and nothing reads it back. If an arm and a founder ever disagree, the arm loses,
 * because the founders were laid out by CSS before this ran and cannot hear the answer.
 *
 * TWO THINGS THIS DELIBERATELY IS NOT:
 *
 *  1. NOT A DERIVED-GEOMETRY SYSTEM. Daniel: "It doesn't have to be a specific mathematical
 *     pattern. It just has to look pretty." The anchors below are placed BY EYE and tuned by
 *     looking at the page. What is derived — and all that is derived — is where they attach: the
 *     trunk enters on the page's content centre because that is where the timeline's descent
 *     actually exits, and the arms turn outboard of the founder rows' real measured edges. The
 *     retired SeamBridge is the cautionary tale: it drew a plumb line to a page-centre node that
 *     did not exist, because it assumed a centred founders block. The founders' CONTENT is
 *     left-aligned (Clay's portrait sits at the row's left edge), so a plumb line to the page
 *     centre lands in the facts column, on nothing.
 *
 *  2. NOT AUTHORED CONTROL POINTS HANDED STRAIGHT TO THE COMPOSER. `garland.ts` resamples a vine
 *     path at 4px and interpolates LINEARLY, so every authored point it receives becomes a corner
 *     it drives straight through — five hand-placed anchors would render as five visible kinks in
 *     a curve that is supposed to be a growing stem. `sampleCatmullRom` is the fix: the anchors
 *     become a smooth centripetal Catmull-Rom spline, sampled densely, and the composer only ever
 *     sees points close enough together that its straight lines between them are invisible.
 *
 * The SAME sampled points are used for the drawn sepia stem and for the garland's vine path, so the
 * structure and the foliage cannot drift apart — they are not two descriptions of one curve that
 * must be kept in sync, they are one array.
 */

export interface Pt {
  x: number;
  y: number;
}

/** One founder's row, in wrapper-local px, as actually laid out. */
export interface RowBox {
  y0: number;
  y1: number;
}

/**
 * Everything the arms need to know about the page, measured — never assumed.
 * All coordinates are wrapper-local px (the wrapper's top-left is 0,0), 1:1 with screen px.
 */
export interface ParenLayout {
  /** The overlay's own size. */
  w: number;
  h: number;
  /** Where the timeline's descent arrives: the page's CONTENT centre, not w/2. */
  trunkX: number;
  /**
   * Where the timeline's line actually STOPS, measured — usually negative (above the overlay).
   * Not 0: in reduced motion the timeline's drawing runs 80 world units past its own exit, so its
   * line ends ~85px above this overlay's top edge and a trunk starting at 0 leaves a visible gap.
   */
  trunkY0: number;
  /** Where the arms leave the trunk. Above the founders, in the seam's open air. */
  forkY: number;
  /** The outboard turn lines: clear of the founder rows' real left/right edges. */
  leftX: number;
  rightX: number;
  /**
   * THE ROWS' REAL OUTER EDGES — the line the arms must never cross back over while they are
   * alongside the founders. Measured, like everything else here.
   *
   * This exists because the bow was not enough. An arm can turn outboard, clear the portraits, and
   * still cross the text on its way BACK: the tail's inward curl was authored as a fraction of
   * `reach` (the whole trip from the trunk), which is ~620px, so a "small" 22% curl came back 137px
   * and landed at x=235 with the content column starting at 170. It ran straight through
   * "Cofounder · engine & systems". A fraction of a big number is a big number.
   */
  rowLeft: number;
  rowRight: number;
  /** The founder rows, top to bottom. */
  rows: RowBox[];
  /** This overlay's own page y. The reveal's card line is a PAGE coordinate; the arms are drawn in
   *  overlay-local ones. */
  pageTop: number;
  /** The timeline's rendered px-per-world-unit — what the reveal span is converted through so the
   *  founders grow over the same screen distance the timeline does. */
  frameScale: number;
  /**
   * The spine's stroke width where it arrives, in CSS px — MEASURED off the timeline's rendered
   * scale, not copied from its constant.
   *
   * The timeline draws in world units and scales them to fit its frame, so `SPINE_W = 7.5` renders
   * at 5.22 CSS px in motion (a 1200-unit drawing in an 835px frame) and 7.96 in reduced (a 1273px
   * frame) — two different numbers, neither of them 7.5. A trunk with a hardcoded width therefore
   * matches the line's POSITION exactly and still steps at the join (the first cut pinned 2.8 and
   * came out 46% too THIN), which reads as a seam just as clearly as a gap does. One line means one
   * weight.
   */
  trunkW: number;
}

/* ------------------------------- the spline ------------------------------- */

const dist = (a: Pt, b: Pt) => Math.hypot(b.x - a.x, b.y - a.y);

/**
 * Centripetal Catmull-Rom (alpha = 0.5), sampled to a dense polyline.
 *
 * Centripetal rather than uniform because uniform Catmull-Rom cusps and self-intersects when the
 * anchor spacing is uneven — and these anchors are deliberately uneven (a long sweep out of the
 * fork, then short ones around the bow). Alpha 0.5 is also what the timeline's own `lineGen`
 * already uses (`curveCatmullRom.alpha(0.5)`), so the arms and the spine are drawn by the same
 * hand.
 *
 * The curve passes THROUGH every anchor, which is the property that makes the anchors tunable by
 * eye: move one, and the curve goes where you put it.
 *
 * `step` is the target spacing in px. It is a fidelity dial, not a look dial: the curve is the
 * same shape at any step, but the composer draws straight lines between the points it is handed,
 * so the step must stay well under the radius of the tightest bow. 6px is comfortably under.
 */
export function sampleCatmullRom(anchors: Pt[], step = 6): Pt[] {
  if (anchors.length < 2) return anchors.slice();
  if (anchors.length === 2) {
    const n = Math.max(1, Math.ceil(dist(anchors[0], anchors[1]) / step));
    return Array.from({ length: n + 1 }, (_, i) => ({
      x: anchors[0].x + (anchors[1].x - anchors[0].x) * (i / n),
      y: anchors[0].y + (anchors[1].y - anchors[0].y) * (i / n),
    }));
  }

  // Phantom endpoints, reflected, so the spline actually reaches the first and last anchors
  // instead of starting at the second one.
  const p = [
    { x: 2 * anchors[0].x - anchors[1].x, y: 2 * anchors[0].y - anchors[1].y },
    ...anchors,
    {
      x: 2 * anchors[anchors.length - 1].x - anchors[anchors.length - 2].x,
      y: 2 * anchors[anchors.length - 1].y - anchors[anchors.length - 2].y,
    },
  ];

  const out: Pt[] = [];
  for (let i = 1; i < p.length - 2; i++) {
    const [p0, p1, p2, p3] = [p[i - 1], p[i], p[i + 1], p[i + 2]];
    // Knot spacing by chord^alpha — this is the "centripetal" part.
    const t0 = 0;
    const t1 = t0 + Math.pow(dist(p0, p1), 0.5) || t0 + 1e-6;
    const t2 = t1 + Math.pow(dist(p1, p2), 0.5) || t1 + 1e-6;
    const t3 = t2 + Math.pow(dist(p2, p3), 0.5) || t2 + 1e-6;

    const n = Math.max(2, Math.ceil(dist(p1, p2) / step));
    for (let j = 0; j < n; j++) {
      const t = t1 + ((t2 - t1) * j) / n;
      const a1 = mix(p0, p1, (t1 - t) / (t1 - t0), (t - t0) / (t1 - t0));
      const a2 = mix(p1, p2, (t2 - t) / (t2 - t1), (t - t1) / (t2 - t1));
      const a3 = mix(p2, p3, (t3 - t) / (t3 - t2), (t - t2) / (t3 - t2));
      const b1 = mix(a1, a2, (t2 - t) / (t2 - t0), (t - t0) / (t2 - t0));
      const b2 = mix(a2, a3, (t3 - t) / (t3 - t1), (t - t1) / (t3 - t1));
      out.push(mix(b1, b2, (t2 - t) / (t2 - t1), (t - t1) / (t2 - t1)));
    }
  }
  out.push(anchors[anchors.length - 1]);
  return out;
}

/** Barycentric blend of two points — the Barry-Goldman rung the Catmull-Rom pyramid is built from. */
function mix(a: Pt, b: Pt, wa: number, wb: number): Pt {
  return { x: a.x * wa + b.x * wb, y: a.y * wa + b.y * wb };
}

/* -------------------------------- the arms -------------------------------- */

/**
 * How far an arm stays off the founders' text, px. Not zero: Daniel's note is "it does not sit
 * extremely close to the founder texts", so a stroke that merely misses the glyphs still reads as a
 * collision. qa/founder-frame.mjs asserts the same number against the real laid-out glyph runs.
 */
export const TEXT_CLEARANCE = 16;

/** The trunk: the timeline's line, continuing. Straight down the content centre to the fork. */
export function trunkPts(L: ParenLayout): Pt[] {
  // Starts where the timeline's line STOPS (`trunkY0`, measured, normally above this overlay) and
  // overshoots it by 2px so the two round caps overlap. The timeline's SVG is a different element
  // with its own box, so the lines can only meet if this one runs INTO it rather than stopping
  // politely at the boundary — the overlap the retired SeamBridge used (y1=-1). A one-pixel gap here
  // reads as a broken drawing, which is the whole thing this task exists to fix.
  return sampleCatmullRom(
    [
      { x: L.trunkX, y: L.trunkY0 - 2 },
      { x: L.trunkX, y: L.forkY },
    ],
    6,
  );
}

/**
 * One arm, rooted at the fork, opening outward and bowing around the founders.
 *
 * `side` is -1 for the left arm, +1 for the right. The two are NOT mirror images: they are the same
 * anchor recipe read against the layout's own measured left/right turn lines, which are not
 * symmetric about the trunk (the founders' content is left-aligned, and the page's content centre
 * is not the row's centre). Mirroring would put one arm through the specimens.
 */
export function armPts(L: ParenLayout, side: -1 | 1): Pt[] {
  const turnX = side < 0 ? L.leftX : L.rightX;
  const reach = turnX - L.trunkX; // signed: how far out this arm has to travel
  const top = L.rows.length ? L.rows[0].y0 : L.forkY;
  const bottom = L.rows.length ? L.rows[L.rows.length - 1].y1 : L.h;
  const span = Math.max(1, bottom - top);
  /** The only vertical room the crossing gets. See the swag note below. */
  const band = Math.max(1, top - L.forkY);

  /**
   * KEEP THE ARM OFF THE FOUNDERS' TEXT. Daniel: "Make sure none of the vines are overlapping the
   * text", and "so it does not sit extremely close to the founder texts" — so this is a CLEARANCE,
   * not a non-overlap: grazing a caption reads as a collision even when the pixels miss.
   *
   * The rule is one line and it is absolute: while an arm is alongside the founders it lives
   * outboard of their real measured edge, whatever the anchor arithmetic wanted. Expressed as a
   * clamp rather than as tuned constants because the constants were what got this wrong — every
   * anchor is a fraction of `reach`, and `reach` is ~620px, so every "small" fraction is tens of
   * pixels and the margin here is only ~70.
   */
  const limit = side < 0 ? L.rowLeft - TEXT_CLEARANCE : L.rowRight + TEXT_CLEARANCE;
  const keepOut = (x: number) => (side < 0 ? Math.min(x, limit) : Math.max(x, limit));

  // THE BOW'S BELLY sits at the founders' vertical middle — the gap between the two rows, not the
  // middle of the overlay, which also carries the seam above and the tails below.
  const bellyY = (top + bottom) / 2;

  /*
   * WHY THIS IS A SWAG AND NOT A V, and why that is forced rather than chosen.
   *
   * The founder rows span the whole content column and the trunk lands in the MIDDLE of them (the
   * page's content centre is inside the row, not beside it). So an arm has no way out to the margin
   * except across the row's x-range, and the only place it can do that without crossing a portrait
   * is the band ABOVE the first row — which is the seam plus the kicker, and no more. Measured at
   * 1440x900 that is ~118px in reduced motion and ~236px in full, for ~645px of travel.
   *
   * That ratio IS the shape: a line that leaves a point, runs out mostly sideways, and turns down at
   * the end is a hanging garland swag, and it is the only graceful thing this band can hold. The
   * first cut tried to leave the fork sideways immediately and read as a coat hanger — two straight
   * diagonals meeting at a hard peak. The fix is the tangents, not the room:
   *
   *   - leave the fork going DOWN, the way the trunk was going, and turn out gradually (anchor 2 is
   *     close under the fork, so the spline's tangent there is near-vertical);
   *   - arrive at the turn line going DOWN again, so the descent begins with no corner (anchor 4 is
   *     directly under anchor 3).
   *
   * Between those the curve is free to be as shallow as the band forces. A swag is allowed to be
   * shallow; what it is not allowed to be is kinked.
   */
  const anchors: Pt[] = [
    // The root. Shared EXACTLY with the trunk's last point, so the fork is a join, not a near-miss.
    { x: L.trunkX, y: L.forkY },
    // Still under the trunk, barely out. THIS ANCHOR IS THE FORK'S SHOULDER: the spline's tangent at
    // the root points straight at it, so its direction IS the direction the arm leaves in. At
    // reach*0.08 the arms left at ~42 degrees each and met in an 84-degree notch — a coat hanger,
    // not a branch. Near-vertical here, and the two arms peel apart out of the trunk's own line.
    { x: L.trunkX + reach * 0.03, y: L.forkY + band * 0.26 },
    // The turn: still high, already committed outward. Between this and the shoulder the arm does
    // all of its bending, which is what keeps the bend off the fork itself.
    { x: L.trunkX + reach * 0.28, y: L.forkY + band * 0.62 },
    // The swag's low point, out across the page.
    { x: L.trunkX + reach * 0.72, y: L.forkY + band * 0.93 },
    // Arriving on the turn line, still above the founders. Clamped like the rest: these two sit
    // INSIDE the rows' y-span, so if the measured turn line ever lands inboard of the text (a
    // narrower page, a wider founders block) they would put the arm straight through a portrait.
    // Today's numbers happen to miss; that is luck, not a rule.
    { x: keepOut(turnX), y: top + span * 0.02 },
    // Directly below the arrival, so the curve is already heading straight down when it gets there
    // and the swag becomes the descent without a corner.
    { x: keepOut(turnX), y: top + span * 0.16 },
    // The bow's belly, easing outward around the two of them.
    { x: keepOut(turnX - reach * 0.06), y: bellyY },
    // Tucking back in, the way a parenthesis closes — but STILL OUTBOARD, and held there until the
    // founders are behind us. This anchor used to sit at `bottom - span * 0.12`, which put the start
    // of the inward curl a tenth of a row ABOVE the last caption, so the curve was already heading
    // back across the text by the time it reached it.
    { x: keepOut(turnX - reach * 0.02), y: bottom + 8 },
    // The tail, curling back toward the centre and running out BELOW the founders. This is the only
    // anchor allowed inboard, because there is nothing down here to cross. It ends inboard of the
    // turn line so the pair reads as a closing bracket rather than two parallel rails.
    { x: turnX - reach * 0.22, y: bottom + span * 0.16 },
  ];
  return sampleCatmullRom(anchors, 6);
}

/** An SVG `d` for a dense polyline. Dense enough that straight segments read as a curve. */
export function polyD(pts: Pt[]): string {
  return pts.map((p, i) => (i ? 'L' : 'M') + p.x.toFixed(2) + ' ' + p.y.toFixed(2)).join(' ');
}

/**
 * Split a polyline into `n` overlapping runs, so the caller can stroke each at its own width and
 * the line TAPERS from root to tip.
 *
 * SVG cannot taper a stroke — `stroke-width` is constant per path — so a drawn arm ends in a blunt
 * round cap of full width, hanging in open paper. That is what a cut line looks like, and it is
 * what the composer's own vines never do: `tube: true` tapers root → tip, which is why they read as
 * growing rather than as being cut off. The arms have to stroke their own stem (structure is sepia,
 * see FounderParenthesis), so they have to do their own tapering.
 *
 * The runs OVERLAP by one point on purpose: abutting runs leave a hairline seam at every join where
 * the two widths meet. With round caps and one shared point, each run's cap sits inside its
 * neighbour and the line reads continuous.
 */
export interface TaperRun {
  d: string;
  /** Midpoint fraction along the whole arm — drives the stroke's taper. */
  t: number;
  /** The run's own points, root-first. The reveal needs its ROOT y (where the card line reaches it)
   *  and its LENGTH (to dash it), and deriving both from the same slice that draws it is what stops
   *  the dash and the stroke describing different curves. */
  pts: Pt[];
}

export function taperRuns(pts: Pt[], n = 10): TaperRun[] {
  if (pts.length < 2) return [];
  const runs: TaperRun[] = [];
  const per = Math.max(1, Math.floor((pts.length - 1) / n));
  for (let i = 0; i < pts.length - 1; i += per) {
    const end = Math.min(pts.length, i + per + 1); // +1 = the shared point
    if (end - i < 2) break;
    const slice = pts.slice(i, end);
    runs.push({ d: polyD(slice), t: (i + (end - i) / 2) / pts.length, pts: slice });
  }
  return runs;
}
