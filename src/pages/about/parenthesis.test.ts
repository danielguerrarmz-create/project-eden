import { describe, expect, it } from 'vitest';
import { armPts, sampleCatmullRom, trunkPts, type ParenLayout, type Pt } from './parenthesis';

/** A layout in the shape of the real one, measured at 1440x900 (see qa/founder-parenthesis.mjs).
 *  The overlay is the full page width, so trunkX is the page's content centre (720) and the rows'
 *  edges are their real page x. `trunkY0` is negative: in reduced motion the timeline's line stops
 *  ~85px above this overlay's top. */
const LAYOUT: ParenLayout = {
  w: 1440,
  h: 894,
  trunkX: 720,
  trunkY0: -85,
  trunkW: 7.96, // SPINE_W (7.5 world) as RENDERED at reduced motion's 1273px-for-1200-units frame
  forkY: -40,
  leftX: 85,
  rightX: 1355,
  rows: [
    { y0: 118, y1: 490 },
    { y0: 522, y1: 894 },
  ],
};

/** The turn angle at each interior point, in degrees. 0 = dead straight. */
function turns(pts: Pt[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < pts.length - 1; i++) {
    const a = Math.atan2(pts[i].y - pts[i - 1].y, pts[i].x - pts[i - 1].x);
    const b = Math.atan2(pts[i + 1].y - pts[i].y, pts[i + 1].x - pts[i].x);
    let d = ((b - a) * 180) / Math.PI;
    while (d > 180) d -= 360;
    while (d < -180) d += 360;
    out.push(Math.abs(d));
  }
  return out;
}

describe('sampleCatmullRom', () => {
  it('passes through every anchor it is given — the property that makes them tunable by eye', () => {
    const anchors: Pt[] = [
      { x: 0, y: 0 },
      { x: 100, y: 40 },
      { x: 60, y: 160 },
      { x: 180, y: 220 },
    ];
    const pts = sampleCatmullRom(anchors, 4);
    for (const a of anchors) {
      const near = Math.min(...pts.map((p) => Math.hypot(p.x - a.x, p.y - a.y)));
      expect(near, `anchor (${a.x},${a.y}) is not on the curve`).toBeLessThan(1);
    }
  });

  it('THE COMPOSER TRAP: hand-authored anchors become CORNERS, and sampling is what removes them', () => {
    // This is the whole reason the module exists, so it is pinned as a comparison rather than as a
    // bare threshold. `garland.ts` resamples a vine path at 4px and interpolates LINEARLY, so
    // whatever it is handed IS the curve: five anchors = five corners driven straight through.
    const anchors: Pt[] = [
      { x: 677, y: 150 },
      { x: 480, y: 210 },
      { x: 90, y: 260 },
      { x: 84, y: 620 },
      { x: 200, y: 1000 },
    ];
    const rawWorst = Math.max(...turns(anchors));
    const smoothWorst = Math.max(...turns(sampleCatmullRom(anchors, 6)));

    // The raw anchors really do carry hard corners...
    expect(rawWorst).toBeGreaterThan(45);
    // ...and the sampled curve turns gently everywhere. A stem does not have elbows.
    expect(smoothWorst).toBeLessThan(12);
  });

  it('is dense enough that the composer\'s 4px linear resample cannot find a corner to cut', () => {
    const pts = sampleCatmullRom(
      [
        { x: 0, y: 0 },
        { x: 200, y: 100 },
        { x: 100, y: 300 },
      ],
      6,
    );
    const gaps = pts.slice(1).map((p, i) => Math.hypot(p.x - pts[i].x, p.y - pts[i].y));
    expect(Math.max(...gaps)).toBeLessThanOrEqual(7);
  });

  it('is deterministic: the same layout grows the same arm forever', () => {
    expect(armPts(LAYOUT, -1)).toEqual(armPts(LAYOUT, -1));
  });

  it('degenerate inputs do not throw (a duplicated anchor has a zero-length chord)', () => {
    expect(() =>
      sampleCatmullRom([
        { x: 10, y: 10 },
        { x: 10, y: 10 },
        { x: 50, y: 90 },
      ]),
    ).not.toThrow();
    expect(sampleCatmullRom([{ x: 1, y: 2 }])).toHaveLength(1);
  });
});

describe('the founders parenthesis', () => {
  it('THE JOIN: the trunk starts on the measured exit and the arms root exactly on its end', () => {
    // Both halves of "the stems at the top must connect". The trunk starts where the timeline's line
    // STOPS — which is not this overlay's top edge — and overshoots it so the round caps overlap; a
    // line that stops politely at the boundary leaves the gap this task exists to close. And the
    // arms share the trunk's last point exactly, so the fork is a join, not a near-miss.
    const trunk = trunkPts(LAYOUT);
    expect(trunk[0].y).toBeLessThan(LAYOUT.trunkY0);
    expect(trunk[0].x).toBeCloseTo(LAYOUT.trunkX, 6);

    const end = trunk[trunk.length - 1];
    for (const side of [-1, 1] as const) {
      const root = armPts(LAYOUT, side)[0];
      expect(Math.hypot(root.x - end.x, root.y - end.y), `arm ${side} is not rooted on the trunk`).toBeLessThan(0.001);
    }
  });

  it('reads the layout it is given rather than assuming a centred block — the SeamBridge bug', () => {
    // The retired SeamBridge drew a plumb line to the PAGE centre and landed on nothing, because
    // the founders' content is left-aligned. Move the measured turn lines and the arms must move;
    // if they do not, something is authored against a constant again.
    const shifted: ParenLayout = { ...LAYOUT, leftX: LAYOUT.leftX + 120 };
    const base = armPts(LAYOUT, -1);
    const moved = armPts(shifted, -1);
    const bellyOf = (pts: Pt[]) => Math.min(...pts.map((p) => p.x));
    expect(bellyOf(moved) - bellyOf(base)).toBeGreaterThan(100);
    // ...and the RIGHT arm must not have heard about it.
    expect(armPts(shifted, 1)).toEqual(armPts(LAYOUT, 1));
  });
});
